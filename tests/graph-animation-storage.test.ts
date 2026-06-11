import { describe, expect, it } from "vitest";

import {
  DEFAULT_GRAPH_ANIMATION_ENABLED,
  GRAPH_ANIMATION_STORAGE_KEY,
  GRAPH_ANIMATION_STORAGE_VERSION,
  loadStoredGraphAnimationPreference,
  parseGraphAnimationPreference,
  persistGraphAnimationPreference,
} from "../lib/graph-animation-storage";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("graph animation storage", () => {
  it("defaults to animation enabled for absent or invalid storage", () => {
    expect(parseGraphAnimationPreference(null)).toBe(
      DEFAULT_GRAPH_ANIMATION_ENABLED,
    );
    expect(parseGraphAnimationPreference("{bad json")).toBe(
      DEFAULT_GRAPH_ANIMATION_ENABLED,
    );
    expect(parseGraphAnimationPreference(JSON.stringify({ version: 0 }))).toBe(
      DEFAULT_GRAPH_ANIMATION_ENABLED,
    );
  });

  it("loads and persists the animation preference", () => {
    const storage = createMemoryStorage();

    expect(persistGraphAnimationPreference(false, storage)).toBe(true);
    expect(loadStoredGraphAnimationPreference(storage)).toBe(false);

    const raw = storage.getItem(GRAPH_ANIMATION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({
      version: GRAPH_ANIMATION_STORAGE_VERSION,
      animationsEnabled: false,
    });
  });
});
