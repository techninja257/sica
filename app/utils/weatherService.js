/**
 * weatherService.js
 * Geocodes city name → lat/lng, then fetches temperature from Open-Meteo.
 * Caches result for 30 minutes.
 */

let cache = null;
let cacheTime = null;
const CACHE_DURATION = 30 * 60 * 1000;

export const geocodeCity = async (cityName) => {
  try {
    const query = encodeURIComponent(cityName.trim());
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`
    );
    const data = await res.json();
    if (data?.results?.length > 0) {
      const { latitude, longitude, name } = data.results[0];
      return { latitude, longitude, name };
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const getCurrentTemperature = async (latitude, longitude) => {
  try {
    const now = Date.now();
    if (cache !== null && cacheTime && now - cacheTime < CACHE_DURATION) {
      return cache;
    }
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`
    );
    const data = await res.json();
    const temp = data?.current?.temperature_2m ?? null;
    cache = temp;
    cacheTime = now;
    return temp;
  } catch (e) {
    return null;
  }
};

export const isHotDay = (temp) => temp !== null && temp !== undefined && temp > 30;