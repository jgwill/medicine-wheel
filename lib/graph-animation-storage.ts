export const GRAPH_ANIMATION_STORAGE_VERSION = 1;
export const GRAPH_ANIMATION_STORAGE_KEY = "medicine-wheel:graph-animation:v1";
export const DEFAULT_GRAPH_ANIMATION_ENABLED = true;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface GraphAnimationPreference {
  version: typeof GRAPH_ANIMATION_STORAGE_VERSION;
  animationsEnabled: boolean;
}

function safeStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function serializeGraphAnimationPreference(
  animationsEnabled: boolean,
): string {
  const value: GraphAnimationPreference = {
    version: GRAPH_ANIMATION_STORAGE_VERSION,
    animationsEnabled,
  };

  return JSON.stringify(value);
}

export function parseGraphAnimationPreference(raw: string | null): boolean {
  if (!raw) return DEFAULT_GRAPH_ANIMATION_ENABLED;

  try {
    const parsed = JSON.parse(raw) as Partial<GraphAnimationPreference>;

    if (
      parsed.version === GRAPH_ANIMATION_STORAGE_VERSION &&
      typeof parsed.animationsEnabled === "boolean"
    ) {
      return parsed.animationsEnabled;
    }
  } catch {
    return DEFAULT_GRAPH_ANIMATION_ENABLED;
  }

  return DEFAULT_GRAPH_ANIMATION_ENABLED;
}

export function loadStoredGraphAnimationPreference(
  storage: StorageLike | null = safeStorage(),
): boolean {
  if (!storage) return DEFAULT_GRAPH_ANIMATION_ENABLED;

  try {
    return parseGraphAnimationPreference(
      storage.getItem(GRAPH_ANIMATION_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_GRAPH_ANIMATION_ENABLED;
  }
}

export function persistGraphAnimationPreference(
  animationsEnabled: boolean,
  storage: StorageLike | null = safeStorage(),
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(
      GRAPH_ANIMATION_STORAGE_KEY,
      serializeGraphAnimationPreference(animationsEnabled),
    );
    return true;
  } catch {
    return false;
  }
}
