export type FeatureVisibilityMap = Record<string, boolean>;

const FEATURE_KEY_ALLOWED = /^[a-z0-9][a-z0-9._:-]{0,127}$/;

function normalizeFeatureKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  const normalized = key.trim().toLowerCase().replace(/\s+/g, '_');
  if (!normalized || !FEATURE_KEY_ALLOWED.test(normalized)) return null;
  return normalized;
}

export function normalizeFeatureVisibilityInput(input: unknown): FeatureVisibilityMap {
  const output: FeatureVisibilityMap = {};

  if (Array.isArray(input)) {
    for (const raw of input) {
      const key = normalizeFeatureKey(raw);
      if (key) output[key] = true;
    }
    return output;
  }

  if (!input || typeof input !== 'object') {
    return output;
  }

  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const key = normalizeFeatureKey(rawKey);
    if (!key || typeof rawValue !== 'boolean') continue;
    output[key] = rawValue;
  }

  return output;
}

export function parseFeatureVisibilityJson(raw: string | null | undefined): FeatureVisibilityMap {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return normalizeFeatureVisibilityInput(parsed);
  } catch {
    return {};
  }
}

export function buildFeatureVisibilityResponse(raw: string | null | undefined): {
  featureVisibility: FeatureVisibilityMap;
  enabledFeatureKeys: string[];
  featureKeys: string[];
} {
  const featureVisibility = parseFeatureVisibilityJson(raw);
  const featureKeys = Object.keys(featureVisibility).sort();
  return {
    featureVisibility,
    enabledFeatureKeys: featureKeys.filter((key) => featureVisibility[key]),
    featureKeys,
  };
}

export function serializeFeatureVisibility(input: unknown): string {
  const normalized = normalizeFeatureVisibilityInput(input);
  const ordered = Object.keys(normalized)
    .sort()
    .reduce<FeatureVisibilityMap>((acc, key) => {
      acc[key] = normalized[key];
      return acc;
    }, {});
  return JSON.stringify(ordered);
}
