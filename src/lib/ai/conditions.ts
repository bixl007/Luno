// Live time and weather for a place, from Open-Meteo (free, no key, built for servers). A web search cannot answer
// "what is the weather in X right now": scraped pages are stale or unrelated, so this is its own tool.
import axios from "axios";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 6000;

// WMO weather interpretation codes, as Open-Meteo reports them.
const WEATHER: Record<number, string> = {
  0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "freezing fog",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 56: "light freezing drizzle", 57: "freezing drizzle",
  61: "light rain", 63: "rain", 65: "heavy rain", 66: "light freezing rain", 67: "freezing rain",
  71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
  80: "light rain showers", 81: "rain showers", 82: "violent rain showers", 85: "light snow showers", 86: "heavy snow showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with heavy hail",
};

export type Place = { name: string; latitude: number; longitude: number; timezone: string; country?: string; country_code?: string; admin1?: string; population?: number };
export type Conditions = { place: string; local_time: string; weather: string; weather_observed_at: string; source: string };

/** "Bengaluru, India" gives the name to look up and a hint (country or region) to choose between places of that name. */
export function splitPlace(input: string): { name: string; hint: string } {
  const [name, ...rest] = input.split(",");
  return { name: name.trim(), hint: rest.join(",").trim().toLowerCase() };
}

/** The place the user most likely means: matching the hint when there is one, then the most populous ("Bangalore" is the Indian city, not a town in Pakistan). */
export function pickPlace(places: Place[], hint: string): Place | undefined {
  const named = hint ? places.filter((p) => [p.country, p.country_code, p.admin1].some((v) => v?.toLowerCase() === hint)) : places;
  return [...(named.length ? named : places)].sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0];
}

/** Current local time and weather for a place name; null if the place is unknown or a service is down. */
export async function placeConditions(input: string, now = new Date()): Promise<Conditions | null> {
  const { name, hint } = splitPlace(input);
  if (!name) return null;
  try {
    const geo = await axios.get(GEO_URL, { params: { name, count: 10, language: "en", format: "json" }, timeout: TIMEOUT_MS });
    const place = pickPlace(geo.data?.results ?? [], hint);
    if (!place) return null;
    const forecast = await axios.get(FORECAST_URL, {
      params: {
        latitude: place.latitude,
        longitude: place.longitude,
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
        timezone: "auto",
      },
      timeout: TIMEOUT_MS,
    });
    const c = forecast.data?.current;
    if (!c || typeof c.temperature_2m !== "number") return null;

    const rain = c.precipitation > 0 ? `, ${c.precipitation} mm of precipitation` : "";
    return {
      place: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
      // The clock is the server's, converted to the place's timezone, so it is exact to the minute.
      local_time: new Intl.DateTimeFormat("en-US", {
        timeZone: place.timezone, weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      }).format(now),
      weather: `${WEATHER[c.weather_code] ?? "unknown conditions"}, ${c.temperature_2m}°C (feels like ${c.apparent_temperature}°C), humidity ${c.relative_humidity_2m}%, wind ${c.wind_speed_10m} km/h${rain}`,
      weather_observed_at: `${c.time} local time (updated every 15 minutes)`,
      source: "Open-Meteo",
    };
  } catch (error: any) {
    console.warn("Place conditions failed:", error?.response?.status ?? error?.code ?? error?.message);
    return null;
  }
}
