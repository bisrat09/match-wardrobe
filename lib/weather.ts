import * as Location from "expo-location";
import type { Weather } from "./types";

export async function getLocationOrAsk() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission denied.");
  const loc = await Location.getCurrentPositionAsync({});
  return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}

export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&daily=precipitation_probability_max&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather API error");
  const data = await res.json();

  const tempC = data?.current?.temperature_2m ?? 20;
  const windKph = data?.current?.wind_speed_10m ?? 8;
  const chanceOfRain = ((data?.daily?.precipitation_probability_max?.[0] ?? 0) / 100);
  const isSnow = false;

  return { tempC, windKph, chanceOfRain, isSnow };
}