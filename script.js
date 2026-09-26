// ==================================================
// WeatherFlow — Weather Dashboard Logic
// Uses Open-Meteo's free geocoding + forecast APIs
// (no API key required: https://open-meteo.com)
// ==================================================

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_CITY = "Coimbatore";

const form = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const errorMessage = document.getElementById("errorMessage");
const loading = document.getElementById("loading");
const dashboard = document.getElementById("weatherDashboard");

const el = {
    cityName: document.getElementById("cityName"),
    country: document.getElementById("country"),
    weatherIcon: document.getElementById("weatherIcon"),
    temperature: document.getElementById("temperature"),
    description: document.getElementById("description"),
    feelsLike: document.getElementById("feelsLike"),
    humidity: document.getElementById("humidity"),
    windSpeed: document.getElementById("windSpeed"),
    pressure: document.getElementById("pressure"),
    visibility: document.getElementById("visibility"),
    sunrise: document.getElementById("sunrise"),
    sunset: document.getElementById("sunset")
};

// ---------- Weather code → description/icon mapping ----------
// Codes follow the WMO weather interpretation codes used by Open-Meteo.

const WEATHER_CODES = {
    0: { desc: "Clear sky", icon: "sunny" },
    1: { desc: "Mainly clear", icon: "sunny" },
    2: { desc: "Partly cloudy", icon: "cloudy" },
    3: { desc: "Overcast", icon: "cloudy" },
    45: { desc: "Fog", icon: "fog" },
    48: { desc: "Depositing rime fog", icon: "fog" },
    51: { desc: "Light drizzle", icon: "rain" },
    53: { desc: "Moderate drizzle", icon: "rain" },
    55: { desc: "Dense drizzle", icon: "rain" },
    56: { desc: "Light freezing drizzle", icon: "rain" },
    57: { desc: "Dense freezing drizzle", icon: "rain" },
    61: { desc: "Slight rain", icon: "rain" },
    63: { desc: "Moderate rain", icon: "rain" },
    65: { desc: "Heavy rain", icon: "rain" },
    66: { desc: "Light freezing rain", icon: "rain" },
    67: { desc: "Heavy freezing rain", icon: "rain" },
    71: { desc: "Slight snow fall", icon: "snow" },
    73: { desc: "Moderate snow fall", icon: "snow" },
    75: { desc: "Heavy snow fall", icon: "snow" },
    77: { desc: "Snow grains", icon: "snow" },
    80: { desc: "Slight rain showers", icon: "rain" },
    81: { desc: "Moderate rain showers", icon: "rain" },
    82: { desc: "Violent rain showers", icon: "rain" },
    85: { desc: "Slight snow showers", icon: "snow" },
    86: { desc: "Heavy snow showers", icon: "snow" },
    95: { desc: "Thunderstorm", icon: "storm" },
    96: { desc: "Thunderstorm with slight hail", icon: "storm" },
    99: { desc: "Thunderstorm with heavy hail", icon: "storm" }
};

function describeWeather(code) {
    return WEATHER_CODES[code] || { desc: "Unknown", icon: "cloudy" };
}

// ---------- Inline SVG icons (no external image requests) ----------

const ICON_SVGS = {
    sunny: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="14" fill="#fbbf24"/>
        <g stroke="#fbbf24" stroke-width="4" stroke-linecap="round">
            <line x1="32" y1="4" x2="32" y2="14"/>
            <line x1="32" y1="50" x2="32" y2="60"/>
            <line x1="4" y1="32" x2="14" y2="32"/>
            <line x1="50" y1="32" x2="60" y2="32"/>
            <line x1="12" y1="12" x2="19" y2="19"/>
            <line x1="45" y1="45" x2="52" y2="52"/>
            <line x1="52" y1="12" x2="45" y2="19"/>
            <line x1="19" y1="45" x2="12" y2="52"/>
        </g>
    </svg>`,
    cloudy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <path fill="#94a3b8" d="M46 44H18a10 10 0 0 1-1-19.9A14 14 0 0 1 44 22a10 10 0 0 1 2 22Z"/>
    </svg>`,
    rain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <path fill="#94a3b8" d="M46 36H18a10 10 0 0 1-1-19.9A14 14 0 0 1 44 14a10 10 0 0 1 2 22Z"/>
        <g stroke="#38bdf8" stroke-width="3" stroke-linecap="round">
            <line x1="22" y1="46" x2="19" y2="56"/>
            <line x1="32" y1="46" x2="29" y2="56"/>
            <line x1="42" y1="46" x2="39" y2="56"/>
        </g>
    </svg>`,
    snow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <path fill="#94a3b8" d="M46 36H18a10 10 0 0 1-1-19.9A14 14 0 0 1 44 14a10 10 0 0 1 2 22Z"/>
        <g stroke="#bae6fd" stroke-width="3" stroke-linecap="round">
            <line x1="22" y1="46" x2="22" y2="56"/>
            <line x1="18" y1="51" x2="26" y2="51"/>
            <line x1="42" y1="46" x2="42" y2="56"/>
            <line x1="38" y1="51" x2="46" y2="51"/>
        </g>
    </svg>`,
    storm: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <path fill="#64748b" d="M46 34H18a10 10 0 0 1-1-19.9A14 14 0 0 1 44 12a10 10 0 0 1 2 22Z"/>
        <polygon fill="#fbbf24" points="34,38 24,52 30,52 27,60 40,44 33,44"/>
    </svg>`,
    fog: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <g stroke="#cbd5e1" stroke-width="4" stroke-linecap="round">
            <line x1="10" y1="24" x2="54" y2="24"/>
            <line x1="6" y1="32" x2="58" y2="32"/>
            <line x1="10" y1="40" x2="54" y2="40"/>
            <line x1="14" y1="48" x2="50" y2="48"/>
        </g>
    </svg>`
};

function iconDataUri(type) {
    const svg = ICON_SVGS[type] || ICON_SVGS.cloudy;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ---------- UI state helpers ----------

function showLoading() {
    errorMessage.hidden = true;
    dashboard.hidden = true;
    loading.hidden = false;
}

function showError(message) {
    loading.hidden = true;
    dashboard.hidden = true;
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function showDashboard() {
    loading.hidden = true;
    errorMessage.hidden = true;
    dashboard.hidden = false;
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---------- API calls ----------

async function geocodeCity(city) {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error("network");
    }

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("not_found");
    }

    return data.results[0];
}

async function fetchWeather(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure",
        hourly: "visibility",
        daily: "sunrise,sunset",
        timezone: "auto"
    });

    const res = await fetch(`${FORECAST_URL}?${params.toString()}`);

    if (!res.ok) {
        throw new Error("network");
    }

    return res.json();
}

function findCurrentVisibility(weatherData) {
    const currentTime = weatherData.current?.time;
    const hourlyTimes = weatherData.hourly?.time || [];
    const hourlyVisibility = weatherData.hourly?.visibility || [];

    const index = hourlyTimes.indexOf(currentTime);
    const meters = index !== -1 ? hourlyVisibility[index] : hourlyVisibility[0];

    return typeof meters === "number" ? (meters / 1000).toFixed(1) : "--";
}

// ---------- Main flow ----------

async function loadWeather(city) {
    showLoading();

    try {
        const place = await geocodeCity(city);
        const weatherData = await fetchWeather(place.latitude, place.longitude);

        const current = weatherData.current;
        const weatherInfo = describeWeather(current.weather_code);

        el.cityName.textContent = place.name;
        el.country.textContent = [place.admin1, place.country].filter(Boolean).join(", ");

        el.weatherIcon.src = iconDataUri(weatherInfo.icon);
        el.weatherIcon.alt = weatherInfo.desc;

        el.temperature.textContent = Math.round(current.temperature_2m);
        el.description.textContent = weatherInfo.desc;
        el.feelsLike.textContent = Math.round(current.apparent_temperature);

        el.humidity.textContent = current.relative_humidity_2m;
        el.windSpeed.textContent = current.wind_speed_10m.toFixed(1);
        el.pressure.textContent = Math.round(current.surface_pressure);
        el.visibility.textContent = findCurrentVisibility(weatherData);

        el.sunrise.textContent = formatTime(weatherData.daily.sunrise[0]);
        el.sunset.textContent = formatTime(weatherData.daily.sunset[0]);

        showDashboard();
    } catch (err) {
        if (err.message === "not_found") {
            showError(`Couldn't find "${city}". Try a different city name.`);
        } else {
            showError("Something went wrong fetching the weather. Please try again.");
        }
    }
}

// ---------- Event listeners ----------

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        return;
    }

    loadWeather(city);
});

// ---------- Init: load the default city shown in the markup ----------

loadWeather(DEFAULT_CITY);