import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { pickPlace, placeConditions, splitPlace, type Place } from "@/lib/ai/conditions";

afterEach(() => mock.restoreAll());

const place = (over: Partial<Place>): Place => ({ name: "X", latitude: 1, longitude: 2, timezone: "UTC", ...over });
const bengaluru = place({ name: "Bengaluru", admin1: "Karnataka", country: "India", country_code: "IN", timezone: "Asia/Kolkata", population: 8_495_492 });
const forecast = { current: { time: "2026-11-03T23:15", temperature_2m: 21.2, apparent_temperature: 24.2, relative_humidity_2m: 92, precipitation: 0, weather_code: 61, wind_speed_10m: 5.2 } };

test("a place with a country is split into the name to look up and a hint", () => {
  assert.deepEqual(splitPlace("Bengaluru, India"), { name: "Bengaluru", hint: "india" });
  assert.deepEqual(splitPlace(" Paris "), { name: "Paris", hint: "" });
});

test("the most populous match wins, and a country hint narrows it down", () => {
  const town = place({ name: "Bangalore Town", country: "Pakistan", country_code: "PK", population: 0 });
  const dallas = place({ name: "Springfield", country: "United States", country_code: "US", population: 100 });
  const london = place({ name: "Springfield", country: "United Kingdom", country_code: "GB", population: 50 });

  assert.equal(pickPlace([town, bengaluru], "")?.name, "Bengaluru");
  assert.equal(pickPlace([dallas, london], "gb")?.country, "United Kingdom");
  assert.equal(pickPlace([dallas, london], "narnia")?.country, "United States", "an unknown hint is ignored, not fatal");
  assert.equal(pickPlace([], ""), undefined);
});

function stub(geo: unknown, current: unknown = forecast) {
  const calls: string[] = [];
  mock.method(axios, "get", async (url: string) => {
    calls.push(url);
    return { data: url.includes("geocoding") ? geo : current };
  });
  return calls;
}

test("conditions give the exact local time in the place's timezone and the live weather", async () => {
  const calls = stub({ results: [bengaluru] });

  const result = await placeConditions("Bengaluru", new Date("2026-11-03T17:46:00Z"));

  assert.equal(result?.place, "Bengaluru, Karnataka, India");
  assert.match(result!.local_time, /Tuesday, November 3, 2026/);
  assert.match(result!.local_time, /11:16 PM/, "17:46 UTC is 23:16 in India");
  assert.equal(result?.weather, "light rain, 21.2°C (feels like 24.2°C), humidity 92%, wind 5.2 km/h");
  assert.equal(result?.weather_observed_at, "2026-11-03T23:15 local time (updated every 15 minutes)");
  assert.equal(calls.length, 2);
});

test("rain amounts are only mentioned when it is raining", async () => {
  stub({ results: [bengaluru] }, { current: { ...forecast.current, precipitation: 1.4 } });

  assert.match((await placeConditions("Bengaluru"))!.weather, /1\.4 mm of precipitation/);
});

test("an unknown place, an empty name or a failing service gives null instead of throwing", async () => {
  stub({});
  assert.equal(await placeConditions("xyzzyplace"), null);
  assert.equal(await placeConditions("  , India"), null);

  mock.restoreAll();
  mock.method(axios, "get", async () => {
    throw Object.assign(new Error("down"), { code: "ECONNABORTED" });
  });
  assert.equal(await placeConditions("Bengaluru"), null);

  mock.restoreAll();
  stub({ results: [bengaluru] }, { current: null });
  assert.equal(await placeConditions("Bengaluru"), null);
});
