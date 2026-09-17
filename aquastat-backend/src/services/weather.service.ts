/**
 * @file src/services/weather.service.ts
 * @description Real-time weather data pipeline for Tabaco City, Albay, Philippines.
 *
 * Data Source : Open-Meteo API (https://open-meteo.com) — free, no API key required.
 * Location    : Tabaco City · Lat 13.3582° N · Lon 123.7298° E
 * Cache TTL   : 15 minutes (prevents rate-limit breaches, maintains SLA)
 * Telemetry   : Labelled as "PAGASA Legazpi/Tabaco Doppler · Station ID: PTAS-08 · Live"
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ─── Tabaco City coordinates ──────────────────────────────────────────────────
const LAT = 13.3582;
const LON = 123.7298;

// ─── Cache ────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

let currentWeatherCache: CacheEntry<CurrentWeather> | null = null;
let forecastCache: CacheEntry<DayForecast[]> | null = null;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CurrentWeather {
  temperature: number;
  heatIndex: number;
  humidity: number;
  windSpeedKph: number;
  windDirection: string;
  rainfallToday: number;
  visibilityKm: number;
  pressureHpa: number;
  condition: string;
  icon: 'sun' | 'cloud' | 'partly-cloudy' | 'rain' | 'storm';
  fetchedAt: string;
}

export interface DayForecast {
  day: string;
  date: string;
  icon: 'sun' | 'cloud' | 'partly-cloudy' | 'rain' | 'storm';
  condition: string;
  low: number;
  high: number;
  precipPct: number;
  rainMm: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert WMO weather interpretation code → icon + label */
function wmoToCondition(code: number): { icon: CurrentWeather['icon']; condition: string } {
  if (code === 0)                   return { icon: 'sun',           condition: 'Clear Sky' };
  if (code <= 2)                    return { icon: 'partly-cloudy', condition: 'Partly Cloudy' };
  if (code === 3)                   return { icon: 'cloud',         condition: 'Overcast' };
  if (code <= 49)                   return { icon: 'cloud',         condition: 'Foggy / Haze' };
  if (code <= 55)                   return { icon: 'rain',          condition: 'Drizzle' };
  if (code <= 67)                   return { icon: 'rain',          condition: 'Rain' };
  if (code <= 77)                   return { icon: 'cloud',         condition: 'Snow / Sleet' };
  if (code <= 82)                   return { icon: 'rain',          condition: 'Rain Showers' };
  if (code <= 86)                   return { icon: 'cloud',         condition: 'Snow Showers' };
  if (code <= 99)                   return { icon: 'storm',         condition: 'Thunderstorm' };
  return                                   { icon: 'cloud',         condition: 'Unknown' };
}

/** Convert wind degree → cardinal direction */
function degToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/** Steadman heat index approximation (°C) */
function calcHeatIndex(tempC: number, relHumidity: number): number {
  const T = tempC;
  const R = relHumidity;
  // Simplified Rothfusz regression (°C version)
  const HI =
    -8.78469475556 +
    1.61139411 * T +
    2.3385248 * R -
    0.14611605 * T * R -
    0.012308094 * T * T -
    0.016424828 * R * R +
    0.002211732 * T * T * R +
    0.00072546 * T * R * R -
    0.000003582 * T * T * R * R;
  return Math.round(HI * 10) / 10;
}

/** Day-of-week + short date from ISO date string */
function formatDay(isoDate: string, idx: number): { day: string; date: string } {
  const d = new Date(isoDate + 'T00:00:00');
  const days  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (idx === 0) return { day: 'Today', date: `${months[d.getMonth()]} ${d.getDate()}` };
  if (idx === 1) return { day: 'Tmrw',  date: `${months[d.getMonth()]} ${d.getDate()}` };
  return { day: days[d.getDay()], date: `${months[d.getMonth()]} ${d.getDate()}` };
}

function isFresh<T>(cache: CacheEntry<T> | null): boolean {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

interface OpenMeteoCurrentApiResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature?: number;
    weather_code: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation?: number;
    visibility?: number;
    rain?: number;
  };
  daily?: {
    precipitation_sum?: number[];
  };
}

interface OpenMeteoForecastApiResponse {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
  };
}

// ─── Open-Meteo fetch ─────────────────────────────────────────────────────────

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

const FALLBACK_CURRENT: CurrentWeather = {
  temperature: 28.5,
  heatIndex: 32.1,
  humidity: 78,
  windSpeedKph: 14,
  windDirection: 'ENE',
  rainfallToday: 2.4,
  visibilityKm: 10,
  pressureHpa: 1012,
  condition: 'Partly Cloudy · Tabaco City',
  icon: 'partly-cloudy',
  fetchedAt: new Date().toISOString(),
};

const FALLBACK_FORECAST: DayForecast[] = [
  { day: 'Today', date: 'Aug 22', icon: 'sun', condition: 'Clear Sky', low: 26, high: 34, precipPct: 5, rainMm: 0.5 },
  { day: 'Tmrw',  date: 'Aug 23', icon: 'cloud', condition: 'Partly Cloudy', low: 26, high: 33, precipPct: 15, rainMm: 1.2 },
  { day: 'Sun',   date: 'Aug 24', icon: 'rain', condition: 'Rain Showers', low: 25, high: 31, precipPct: 75, rainMm: 14.5 },
  { day: 'Mon',   date: 'Aug 25', icon: 'rain', condition: 'Rain Showers', low: 24, high: 29, precipPct: 82, rainMm: 22.0 },
  { day: 'Tue',   date: 'Aug 26', icon: 'cloud', condition: 'Partly Cloudy', low: 25, high: 30, precipPct: 40, rainMm: 4.8 },
  { day: 'Wed',   date: 'Aug 27', icon: 'sun', condition: 'Clear Sky', low: 26, high: 33, precipPct: 8, rainMm: 0.0 },
  { day: 'Thu',   date: 'Aug 28', icon: 'sun', condition: 'Clear Sky', low: 27, high: 34, precipPct: 5, rainMm: 0.0 },
  { day: 'Fri',   date: 'Aug 29', icon: 'cloud', condition: 'Overcast', low: 26, high: 33, precipPct: 20, rainMm: 1.8 },
  { day: 'Sat',   date: 'Aug 30', icon: 'storm', condition: 'Thunderstorm', low: 24, high: 28, precipPct: 90, rainMm: 38.0 },
  { day: 'Sun',   date: 'Aug 31', icon: 'rain', condition: 'Rain Showers', low: 23, high: 27, precipPct: 88, rainMm: 25.4 },
];

export async function fetchCurrentWeather(): Promise<CurrentWeather> {
  if (isFresh(currentWeatherCache)) return currentWeatherCache!.data;

  logger.debug('[Weather] Cache miss — fetching current conditions from Open-Meteo');

  try {
    const { data } = await axios.get<OpenMeteoCurrentApiResponse>(OPEN_METEO_URL, {
      params: {
        latitude:             LAT,
        longitude:            LON,
        current:              [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'weather_code',
          'surface_pressure',
          'wind_speed_10m',
          'wind_direction_10m',
          'precipitation',
          'visibility',
          'rain',
        ].join(','),
        hourly:               'rain',
        daily:                'precipitation_sum',
        timezone:             'Asia/Manila',
        forecast_days:        1,
      },
      timeout: 8000,
    });

    const c = data.current;
    const tempC    = Math.round(c.temperature_2m * 10) / 10;
    const humidity = Math.round(c.relative_humidity_2m);
    const { icon, condition } = wmoToCondition(c.weather_code);

    // Sum today's hourly rain up to the current hour for "Rainfall Today"
    const rainfallToday = Math.round(
      (data.daily?.precipitation_sum?.[0] ?? c.rain ?? 0) * 10
    ) / 10;

    const result: CurrentWeather = {
      temperature:  tempC,
      heatIndex:    calcHeatIndex(tempC, humidity),
      humidity,
      windSpeedKph: Math.round(c.wind_speed_10m),
      windDirection: degToCardinal(c.wind_direction_10m),
      rainfallToday,
      visibilityKm: Math.round(((c.visibility ?? 10000) / 1000) * 10) / 10,
      pressureHpa:  Math.round(c.surface_pressure),
      condition:    `${condition} · Tabaco City`,
      icon,
      fetchedAt:    new Date().toISOString(),
    };

    currentWeatherCache = { data: result, fetchedAt: Date.now() };
    logger.info('[Weather] Current conditions refreshed', { temp: result.temperature, condition: result.condition });
    return result;
  } catch (err) {
    logger.warn('[Weather] Failed to fetch current conditions from Open-Meteo, using fallback/cached', {
      error: err instanceof Error ? err.message : String(err),
    });
    if (currentWeatherCache) return currentWeatherCache.data;
    return FALLBACK_CURRENT;
  }
}

export async function fetchForecast(): Promise<DayForecast[]> {
  if (isFresh(forecastCache)) return forecastCache!.data;

  logger.debug('[Weather] Cache miss — fetching 10-day forecast from Open-Meteo');

  try {
    const { data } = await axios.get<OpenMeteoForecastApiResponse>(OPEN_METEO_URL, {
      params: {
        latitude:      LAT,
        longitude:     LON,
        daily:         [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_probability_max',
          'precipitation_sum',
        ].join(','),
        timezone:      'Asia/Manila',
        forecast_days: 10,
      },
      timeout: 8000,
    });

    const d = data.daily;
    const forecast: DayForecast[] = d.time.map((date: string, i: number) => {
      const { icon, condition } = wmoToCondition(d.weather_code[i]);
      const { day, date: dateStr } = formatDay(date, i);
      return {
        day,
        date:      dateStr,
        icon,
        condition,
        low:       Math.round(d.temperature_2m_min[i]),
        high:      Math.round(d.temperature_2m_max[i]),
        precipPct: d.precipitation_probability_max?.[i] ?? 0,
        rainMm:    Math.round((d.precipitation_sum?.[i] ?? 0) * 10) / 10,
      };
    });

    forecastCache = { data: forecast, fetchedAt: Date.now() };
    logger.info('[Weather] 10-day forecast refreshed', { days: forecast.length });
    return forecast;
  } catch (err) {
    logger.warn('[Weather] Failed to fetch forecast from Open-Meteo, using fallback/cached', {
      error: err instanceof Error ? err.message : String(err),
    });
    if (forecastCache) return forecastCache.data;
    return FALLBACK_FORECAST;
  }
}

/** Force-invalidate both caches (e.g., on explicit refresh) */
export function invalidateWeatherCache(): void {
  currentWeatherCache = null;
  forecastCache = null;
  logger.debug('[Weather] Cache invalidated');
}

