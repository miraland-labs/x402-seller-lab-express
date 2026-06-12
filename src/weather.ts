/**
 * Illustration only — replace with your own web2 handler (geo, text, finance, …).
 * Open-Meteo: free, no API key.
 */
export const DEMO_CITY = "Atlanta";

export type WeatherResult = {
  city: string;
  country: string;
  temperature_c: number;
  windspeed_kmh: number;
};

type GeocodeHit = {
  name: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
};

async function geocodeCity(city: string): Promise<GeocodeHit | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: GeocodeHit[] };
  return data.results?.[0] ?? null;
}

export async function getWeather(cityInput: string | undefined): Promise<WeatherResult> {
  const city = (cityInput ?? DEMO_CITY).trim();
  if (!city) {
    throw new WeatherError("city_required", "Query parameter city is required");
  }

  const hit = await geocodeCity(city);
  if (!hit) {
    throw new WeatherError("city_not_found", `No result for "${city}"`);
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(hit.latitude));
  url.searchParams.set("longitude", String(hit.longitude));
  url.searchParams.set("current", "temperature_2m,wind_speed_10m");
  url.searchParams.set("wind_speed_unit", "kmh");

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new WeatherError("upstream_error", `forecast HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; wind_speed_10m?: number };
  };
  const cur = data.current;
  if (cur?.temperature_2m == null || cur?.wind_speed_10m == null) {
    throw new WeatherError("upstream_error", "forecast missing current fields");
  }

  return {
    city: hit.name,
    country: hit.country ?? hit.country_code ?? "unknown",
    temperature_c: cur.temperature_2m,
    windspeed_kmh: cur.wind_speed_10m,
  };
}

export class WeatherError extends Error {
  constructor(
    readonly code: "city_required" | "city_not_found" | "upstream_error",
    message: string,
  ) {
    super(message);
    this.name = "WeatherError";
  }
}
