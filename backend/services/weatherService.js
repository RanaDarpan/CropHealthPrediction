/**
 * Weather Service — OpenWeather API integration
 */
const axios = require('axios');
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';

async function getCurrentWeather(lat, lng) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey || apiKey === 'your_openweather_api_key_here') {
        return generateSyntheticWeather(lat, lng);
    }
    try {
        const { data } = await axios.get(`${OPENWEATHER_BASE}/weather`, {
            params: { lat, lon: lng, appid: apiKey, units: 'metric' }
        });
        return {
            temperature: data.main.temp, feelsLike: data.main.feels_like,
            humidity: data.main.humidity, pressure: data.main.pressure,
            windSpeed: data.wind.speed, windDirection: data.wind.deg,
            cloudCover: data.clouds.all, visibility: data.visibility,
            description: data.weather[0].description, icon: data.weather[0].icon,
            rainfall: data.rain ? data.rain['1h'] || data.rain['3h'] || 0 : 0,
            sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
            sunset: new Date(data.sys.sunset * 1000).toISOString(),
            source: 'openweather'
        };
    } catch (error) {
        console.error('OpenWeather error:', error.message);
        return generateSyntheticWeather(lat, lng);
    }
}

async function getWeatherForecast(lat, lng) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey || apiKey === 'your_openweather_api_key_here') {
        return generateSyntheticForecast(lat, lng);
    }
    try {
        const { data } = await axios.get(`${OPENWEATHER_BASE}/forecast`, {
            params: { lat, lon: lng, appid: apiKey, units: 'metric' }
        });
        const dailyMap = {};
        data.list.forEach(item => {
            const date = item.dt_txt.split(' ')[0];
            if (!dailyMap[date]) dailyMap[date] = { date, temps: [], humidity: [], rainfall: 0, windSpeed: [], desc: [], icons: [] };
            dailyMap[date].temps.push(item.main.temp);
            dailyMap[date].humidity.push(item.main.humidity);
            dailyMap[date].rainfall += item.rain ? item.rain['3h'] || 0 : 0;
            dailyMap[date].windSpeed.push(item.wind.speed);
            dailyMap[date].desc.push(item.weather[0].description);
            dailyMap[date].icons.push(item.weather[0].icon);
        });
        const forecast = Object.values(dailyMap).map(d => ({
            date: d.date,
            tempMin: Math.min(...d.temps), tempMax: Math.max(...d.temps),
            tempAvg: +(d.temps.reduce((a, b) => a + b, 0) / d.temps.length).toFixed(1),
            humidity: Math.round(d.humidity.reduce((a, b) => a + b, 0) / d.humidity.length),
            rainfall: +(d.rainfall).toFixed(1),
            windSpeed: +(d.windSpeed.reduce((a, b) => a + b, 0) / d.windSpeed.length).toFixed(1),
            description: d.desc[Math.floor(d.desc.length / 2)],
            icon: d.icons[Math.floor(d.icons.length / 2)]
        }));
        return { forecast: forecast.slice(0, 7), source: 'openweather' };
    } catch (error) {
        console.error('Forecast error:', error.message);
        return generateSyntheticForecast(lat, lng);
    }
}

function generateWeatherAdvisory(weather, cropType) {
    const advisories = [];
    if (weather.temperature > 40) advisories.push({ type: 'heat_stress', priority: 'urgent', message: `Extreme heat (${weather.temperature}°C). Increase irrigation.` });
    else if (weather.temperature > 35) advisories.push({ type: 'heat_warning', priority: 'warning', message: `High temp (${weather.temperature}°C). Monitor for heat stress.` });
    if (weather.temperature < 5) advisories.push({ type: 'frost_risk', priority: 'urgent', message: `Frost risk (${weather.temperature}°C). Protect crops.` });
    if (weather.humidity > 85) advisories.push({ type: 'fungal_risk', priority: 'warning', message: `High humidity (${weather.humidity}%). Fungal disease risk.` });
    if (weather.rainfall > 50) advisories.push({ type: 'heavy_rain', priority: 'urgent', message: `Heavy rain (${weather.rainfall}mm). Waterlogging risk.` });
    else if (weather.rainfall === 0 && weather.humidity < 40) advisories.push({ type: 'drought_risk', priority: 'warning', message: 'No rain, low humidity. Irrigate.' });
    if (weather.windSpeed > 15) advisories.push({ type: 'wind_damage', priority: 'warning', message: `Strong winds (${weather.windSpeed} m/s). Lodging risk.` });
    if (advisories.length === 0) advisories.push({ type: 'favorable', priority: 'info', message: 'Weather conditions are favorable.' });
    return advisories;
}

function generateSyntheticWeather(lat, lng) {
    const absLat = Math.abs(lat);
    let baseTemp = absLat < 23.5 ? 28 : absLat < 35 ? 22 : absLat < 55 ? 15 : 5;
    const seed = Math.abs(Math.sin(lat + lng)) % 1;
    const temp = +(baseTemp + (seed - 0.5) * 10).toFixed(1);
    return {
        temperature: temp, feelsLike: +(temp - 2).toFixed(1),
        humidity: Math.round(55 + seed * 35), pressure: 1013,
        windSpeed: +(3 + seed * 8).toFixed(1), windDirection: Math.round(seed * 360),
        cloudCover: Math.round(20 + seed * 60), visibility: 10000,
        description: seed > 0.7 ? 'partly cloudy' : 'clear sky', icon: '02d',
        rainfall: seed > 0.8 ? +(seed * 15).toFixed(1) : 0,
        source: 'synthetic', note: 'Configure OPENWEATHER_API_KEY for real data.'
    };
}

function generateSyntheticForecast(lat, lng) {
    const base = generateSyntheticWeather(lat, lng);
    const forecast = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        const v = Math.sin(i * 1.5) * 3;
        forecast.push({
            date: d.toISOString().split('T')[0],
            tempMin: +(base.temperature - 4 + v).toFixed(1),
            tempMax: +(base.temperature + 4 + v).toFixed(1),
            tempAvg: +(base.temperature + v).toFixed(1),
            humidity: Math.min(100, Math.max(20, base.humidity + Math.round(v * 5))),
            rainfall: i % 3 === 0 ? +(Math.random() * 10).toFixed(1) : 0,
            windSpeed: +(base.windSpeed + v).toFixed(1),
            description: i % 3 === 0 ? 'light rain' : 'partly cloudy', icon: i % 3 === 0 ? '10d' : '02d'
        });
    }
    return { forecast, source: 'synthetic' };
}

module.exports = { getCurrentWeather, getWeatherForecast, generateWeatherAdvisory };
