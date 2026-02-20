import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { farmData, analysisType } = body;

        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        let systemPrompt = `You are AgriSense AI, an expert agricultural advisor powered by satellite data analysis. 
You analyze farm data including NDVI, EVI, SAVI vegetation indices, soil metrics, weather conditions, and pest risk data.
Always provide actionable, specific recommendations for Indian farmers.
Format responses with clear sections and bullet points.
Be concise but comprehensive. Use emojis for visual appeal.`;

        let userPrompt = '';

        if (analysisType === 'advisory') {
            userPrompt = `Based on this farm data, generate a comprehensive agricultural advisory:

Farm: ${farmData.name || 'Unknown'}
Crop: ${farmData.cropType || 'General'}
Area: ${farmData.area || 'N/A'} hectares
Soil Type: ${farmData.soilType || 'N/A'}
Health Score: ${farmData.healthScore || 'N/A'}/100
NDVI: ${farmData.ndvi || 'N/A'}
Temperature: ${farmData.temperature || 'N/A'}°C
Humidity: ${farmData.humidity || 'N/A'}%
Season: ${farmData.season || getCurrentSeason()}

Generate exactly 4 advisory items in this JSON format. IMPORTANT: All string values including emojis must be properly quoted and escaped:
[
  {
    "title": "Advisory Title",
    "icon": "💧",
    "description": "1-2 sentence specific recommendation",
    "priority": "high",
    "category": "irrigation"
  }
]

CRITICAL: Return ONLY valid JSON array with no markdown, no code blocks, no explanations. All emojis must be inside double quotes. Ensure the JSON is valid and can be parsed directly.`;
        } else if (analysisType === 'report') {
            userPrompt = `Generate a comprehensive farm health report analysis for:

Farm: ${farmData.name || 'Unknown'}
Crop: ${farmData.cropType || 'General'} 
Area: ${farmData.area || 'N/A'} hectares
Health Score: ${farmData.healthScore || 'N/A'}/100
NDVI: ${farmData.ndvi || 'N/A'}
Soil: ${farmData.soilType || 'N/A'}
Weather: ${farmData.temperature || 'N/A'}°C, ${farmData.humidity || 'N/A'}% humidity

Provide a detailed analysis with:
1. Overall Health Assessment (2-3 sentences)
2. Key Findings (3-4 bullet points)  
3. Risk Factors (2-3 items)
4. Recommendations (4-5 specific actions)
5. Forecast for next 30 days

Be specific and actionable for Indian agriculture context.`;
        } else if (analysisType === 'weather-advisory') {
            userPrompt = `Based on this weather data, provide agricultural weather advisory:

Farm: ${farmData.name || 'Unknown'}
Crop: ${farmData.cropType || 'General'}
Current Temp: ${farmData.temperature || 'N/A'}°C
Humidity: ${farmData.humidity || 'N/A'}%
Condition: ${farmData.condition || 'N/A'}
Wind: ${farmData.windSpeed || 'N/A'} m/s
Forecast: ${JSON.stringify(farmData.forecast || [])}

Provide:
1. Current Weather Impact on Crops
2. 7-Day Agricultural Outlook
3. Irrigation Recommendations
4. Frost/Heat Stress Warnings (if applicable)
5. Best Activities for This Week`;
        } else {
            userPrompt = `Analyze this farm data and provide comprehensive insights:
${JSON.stringify(farmData, null, 2)}

Provide detailed agricultural analysis with actionable recommendations.`;
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Groq API error:', errText);
            return NextResponse.json({ error: 'Groq API request failed', details: errText }, { status: 500 });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        return NextResponse.json({ success: true, response: content, model: data.model });
    } catch (error) {
        console.error('Groq route error:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}

function getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 5 && month <= 9) return 'Kharif (Monsoon)';
    if (month >= 10 || month <= 1) return 'Rabi (Winter)';
    return 'Zaid (Summer)';
}
