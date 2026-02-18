/**
 * Analysis Engine — Crop health, soil, pest risk assessment
 */
const { computeAllIndices } = require('../utils/sentinel2Bands');

function analyzeCropHealth(bandData, weatherData, cropType) {
    const indices = computeAllIndices(bandData);
    const healthScore = calculateHealthScore(indices, weatherData, cropType);
    const problems = identifyProblems(indices, weatherData);
    const recommendations = generateCropRecommendations(indices, weatherData, cropType, problems);

    return {
        indices, healthScore, problems, recommendations,
        status: healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'moderate' : healthScore >= 25 ? 'poor' : 'critical'
    };
}

function calculateHealthScore(indices, weather, cropType) {
    let score = 50;
    // NDVI contribution (0-35 points)
    if (indices.ndvi > 0.6) score += 35;
    else if (indices.ndvi > 0.4) score += 25;
    else if (indices.ndvi > 0.2) score += 15;
    else score += 5;
    // Moisture (NDMI) contribution (0-15 points)
    if (indices.ndmi > 0.2) score += 15;
    else if (indices.ndmi > 0) score += 10;
    else score += 3;
    // Weather penalty
    if (weather) {
        if (weather.temperature > 40 || weather.temperature < 5) score -= 10;
        if (weather.humidity > 90 || weather.humidity < 20) score -= 5;
    }
    // Bare soil penalty
    if (indices.bsi > 0.2) score -= 10;
    return Math.max(0, Math.min(100, Math.round(score)));
}

function identifyProblems(indices, weather) {
    const problems = [];
    if (indices.ndvi < 0.2) problems.push({ type: 'low_ndvi', severity: 'high', message: 'Very low vegetation activity. Possible crop failure or bare field.' });
    else if (indices.ndvi < 0.4) problems.push({ type: 'low_ndvi', severity: 'medium', message: 'Below-average vegetation. Check for nutrient deficiency or disease.' });
    if (indices.ndmi < -0.1) problems.push({ type: 'water_stress', severity: 'high', message: 'Severe water stress detected. Immediate irrigation needed.' });
    else if (indices.ndmi < 0.1) problems.push({ type: 'water_stress', severity: 'medium', message: 'Moderate water stress. Consider increasing irrigation.' });
    if (indices.bsi > 0.3) problems.push({ type: 'bare_soil', severity: 'high', message: 'Significant bare soil. Low crop coverage.' });
    if (weather && weather.humidity > 85 && weather.temperature > 20) {
        problems.push({ type: 'disease_risk', severity: 'medium', message: 'Warm humid conditions. Fungal disease risk elevated.' });
    }
    return problems;
}

function generateCropRecommendations(indices, weather, cropType, problems) {
    const recs = [];
    const hasWaterStress = problems.some(p => p.type === 'water_stress');
    const hasLowNdvi = problems.some(p => p.type === 'low_ndvi');
    if (hasWaterStress) {
        recs.push('Increase irrigation frequency. Consider drip irrigation for water efficiency.');
        recs.push('Apply mulch to retain soil moisture.');
    }
    if (hasLowNdvi) {
        recs.push('Conduct field inspection for disease or pest damage.');
        recs.push('Consider foliar application of balanced NPK fertilizer.');
    }
    if (indices.ndvi > 0.6 && indices.ndmi > 0.2) recs.push('Crop is healthy. Maintain current management practices.');
    if (weather && weather.rainfall > 30) recs.push('Heavy rainfall expected. Ensure proper field drainage.');
    if (weather && weather.temperature > 35) recs.push('Heat stress risk. Schedule irrigation during cooler hours.');
    const cropRecs = getCropSpecificRecs(cropType, indices);
    recs.push(...cropRecs);
    return recs;
}

function getCropSpecificRecs(cropType, indices) {
    const recs = [];
    switch (cropType) {
        case 'wheat': case 'rice':
            if (indices.ndvi < 0.5) recs.push(`${cropType}: Consider nitrogen top-dressing to boost growth.`);
            break;
        case 'cotton':
            if (indices.ndmi < 0.1) recs.push('Cotton: Ensure consistent moisture during boll development.');
            break;
        case 'sugarcane':
            if (indices.ndvi > 0.7) recs.push('Sugarcane: Good canopy development. Monitor for borer infestation.');
            break;
        case 'potato': case 'tomato': case 'onion':
            if (indices.bsi > 0.2) recs.push(`${cropType}: Sparse canopy detected. Check for nutrient deficiency.`);
            break;
    }
    return recs;
}

function analyzeSoil(bandData, existingSoilData) {
    const indices = computeAllIndices(bandData);
    const satelliteSoil = {
        moistureIndex: indices.ndmi,
        baresoilIndex: indices.bsi,
        vegetationCover: Math.max(0, Math.min(100, Math.round((indices.ndvi + 1) / 2 * 100))),
        estimatedMoisture: Math.max(0, Math.min(100, Math.round((indices.ndmi + 0.5) * 80)))
    };
    const merged = { ...(existingSoilData || {}), ...satelliteSoil };
    const recommendations = [];
    if (satelliteSoil.estimatedMoisture < 30) recommendations.push('Soil appears dry. Increase irrigation.');
    if (indices.bsi > 0.3) recommendations.push('High bare soil exposure. Consider cover cropping.');
    if (existingSoilData) {
        if (existingSoilData.ph < 5.5) recommendations.push('Soil is acidic. Consider liming.');
        else if (existingSoilData.ph > 8.0) recommendations.push('Soil is alkaline. Consider adding sulfur.');
        if (existingSoilData.nitrogen < 150) recommendations.push('Low nitrogen. Apply urea or ammonium sulfate.');
        if (existingSoilData.phosphorus < 20) recommendations.push('Low phosphorus. Apply superphosphate.');
        if (existingSoilData.potassium < 150) recommendations.push('Low potassium. Apply muriate of potash.');
        if (existingSoilData.organicMatter < 2) recommendations.push('Low organic matter. Add compost or green manure.');
    }
    const healthScore = calculateSoilHealthScore(merged);
    return { soilMetrics: merged, indices, recommendations, healthScore };
}

function calculateSoilHealthScore(soil) {
    let score = 50;
    if (soil.estimatedMoisture >= 30 && soil.estimatedMoisture <= 70) score += 15;
    else score -= 5;
    if (soil.vegetationCover > 60) score += 10;
    if (soil.ph >= 6.0 && soil.ph <= 7.5) score += 10;
    if (soil.organicMatter > 3) score += 10;
    if (soil.nitrogen >= 200) score += 5;
    return Math.max(0, Math.min(100, Math.round(score)));
}

function assessPestRisk(healthData, weatherData, cropType, cropStage) {
    let riskScore = 20;
    if (weatherData) {
        if (weatherData.temperature >= 25 && weatherData.temperature <= 35) riskScore += 15;
        if (weatherData.humidity > 70) riskScore += 15;
        if (weatherData.humidity > 85) riskScore += 10;
        if (weatherData.rainfall > 20) riskScore += 5;
    }
    if (healthData && healthData.indices) {
        if (healthData.indices.ndvi < 0.3) riskScore += 15;
        else if (healthData.indices.ndvi < 0.5) riskScore += 8;
    }
    if (['flowering', 'fruiting'].includes(cropStage)) riskScore += 10;
    const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
    const pestTypes = getPredictedPests(cropType, weatherData, riskLevel);
    const preventionTips = getPreventionTips(cropType, riskLevel);
    const treatments = getTreatments(cropType, riskLevel);
    return {
        riskLevel, riskScore: Math.min(100, riskScore),
        confidence: Math.min(100, 60 + Math.round(riskScore / 5)),
        pestTypes, preventionTips, treatments, cropStage,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
}

function getPredictedPests(cropType, weather, riskLevel) {
    const pests = {
        wheat: [{ name: 'Aphids', probability: 45, description: 'Common in warm weather' }, { name: 'Rust', probability: 35, description: 'Fungal disease in humid conditions' }],
        rice: [{ name: 'Stem Borer', probability: 50, description: 'Major rice pest' }, { name: 'Brown Plant Hopper', probability: 40, description: 'Sap-sucking insect' }],
        cotton: [{ name: 'Bollworm', probability: 55, description: 'Major cotton pest' }, { name: 'Whitefly', probability: 40, description: 'Vector for leaf curl virus' }],
        corn: [{ name: 'Fall Armyworm', probability: 50, description: 'Destructive larval pest' }, { name: 'Corn Borer', probability: 35, description: 'Stem-boring pest' }],
        tomato: [{ name: 'Fruit Borer', probability: 50, description: 'Damages fruits directly' }, { name: 'Leaf Miner', probability: 35, description: 'Creates tunnels in leaves' }],
        default: [{ name: 'General Insects', probability: 30, description: 'Monitor for pest presence' }]
    };
    const base = pests[cropType] || pests.default;
    const multiplier = riskLevel === 'high' ? 1.3 : riskLevel === 'medium' ? 1.0 : 0.6;
    return base.map(p => ({ ...p, probability: Math.min(95, Math.round(p.probability * multiplier)) }));
}

function getPreventionTips(cropType, riskLevel) {
    const tips = ['Regular field scouting for early detection.', 'Maintain field hygiene — remove crop residues.', 'Use pheromone traps for insect monitoring.'];
    if (riskLevel === 'high') {
        tips.push('Consider preventive insecticide application.');
        tips.push('Install light traps for nocturnal pests.');
    }
    if (riskLevel === 'medium') tips.push('Monitor pest population thresholds before spraying.');
    return tips;
}

function getTreatments(cropType, riskLevel) {
    const treatments = [
        { method: 'cultural', description: 'Crop rotation and intercropping.', timing: 'Pre-season planning' },
        { method: 'biological', description: 'Release beneficial insects (ladybugs, parasitoid wasps).', timing: 'Early infestation' }
    ];
    if (riskLevel !== 'low') {
        treatments.push({ method: 'organic', description: 'Neem oil spray (1500 ppm).', timing: 'At threshold levels' });
    }
    if (riskLevel === 'high') {
        treatments.push({ method: 'chemical', description: 'Apply recommended insecticide per local agricultural advisory.', timing: 'When economic threshold is crossed' });
    }
    return treatments;
}

function generateAlerts(farmId, userId, analysisResults) {
    const alerts = [];
    if (analysisResults.healthScore < 25) {
        alerts.push({ farmId, userId, type: 'health', priority: 'urgent', title: 'Critical Crop Health', message: `Health score is critically low (${analysisResults.healthScore}/100). Immediate attention needed.`, expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) });
    } else if (analysisResults.healthScore < 50) {
        alerts.push({ farmId, userId, type: 'health', priority: 'warning', title: 'Low Crop Health', message: `Health score is below average (${analysisResults.healthScore}/100).`, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    }
    if (analysisResults.problems) {
        analysisResults.problems.filter(p => p.severity === 'high').forEach(p => {
            alerts.push({ farmId, userId, type: p.type === 'water_stress' ? 'soil' : 'health', priority: 'urgent', title: `Alert: ${p.type.replace(/_/g, ' ')}`, message: p.message, expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) });
        });
    }
    return alerts;
}

module.exports = { analyzeCropHealth, analyzeSoil, assessPestRisk, generateAlerts };
