import { GrowthBook } from "@growthbook/growthbook";

type FlagMap = Record<string, boolean | string | number | { defaultValue?: unknown; rules?: unknown[] }>;
let localFlags: FlagMap | undefined;
function getLocalFlags(): FlagMap {
  if (localFlags) return localFlags;
  try { const value: unknown = JSON.parse(process.env.FLAGS_JSON ?? "{}"); localFlags = value && typeof value === "object" && !Array.isArray(value) ? value as FlagMap : {}; }
  catch { localFlags = {}; }
  return localFlags;
}
function localValue(key: string, fallback: boolean) {
  const value = getLocalFlags()[key];
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object" && "defaultValue" in value) return Boolean(value.defaultValue);
  return fallback;
}

/** GrowthBook evaluates configured remote features; FLAGS_JSON is a safe local/offline fallback. */
export async function isFeatureEnabled(key: string, fallback = false, attributes: Record<string, unknown> = {}) {
  const apiHost = process.env.GROWTHBOOK_API_HOST;
  const clientKey = process.env.GROWTHBOOK_CLIENT_KEY;
  if (apiHost && clientKey) {
    const growthbook = new GrowthBook({ apiHost, clientKey, attributes });
    try { await growthbook.init({ timeout: 1200 }); return Object.hasOwn(growthbook.getFeatures(), key) ? growthbook.isOn(key) : localValue(key, fallback); }
    catch { return localValue(key, fallback); }
    finally { growthbook.destroy(); }
  }
  return localValue(key, fallback);
}
