import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JsonlProvider } from "../src/storage-provider/src/index";
import {
  createDiaryEntry,
  createIntentionEntry,
  createReflectionEntry,
  createWalkingEntry,
  queryDiaryEntries,
  getLastDiaryEntry,
  getEntriesByPhase,
  getDiaryStatistics,
  findDiaryPatterns,
  entryToMarkdown,
  exportToMarkdown,
  createJourneySummary,
  projectEntryToWheel,
  diaryNodeId,
  chronicleNodeId,
} from "../src/ceremonial-diary/src/index";

let tempDir: string;
let store: JsonlProvider;

beforeEach(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-ceremonial-diary-"));
  store = new JsonlProvider(tempDir);
  await store.connect();
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("diary CRUD", () => {
  it("creates an intention entry with opening ceremony stage", async () => {
    const entry = await createIntentionEntry(store, {
      intention: "Hold space for the film-production ceremony",
      participant: "mia",
      agent: "ava",
    });

    expect(entry.phase).toBe("miigwechiwendam");
    expect(entry.entryType).toBe("intention");
    expect(entry.metadata.ceremonyStage).toBe("opening");
    expect(entry.participant).toBe("mia");
    expect(entry.agent).toBe("ava");

    const fetched = await store.getDiaryEntry(entry.id);
    expect(fetched).toEqual(entry);
  });

  it("lists, filters by tag, and orders entries oldest → newest", async () => {
    await createDiaryEntry(store, {
      content: "First observation",
      participant: "mia",
      phase: "nindokendaan",
      entryType: "observation",
      metadata: { tags: ["land", "research"] },
      timestamp: "2026-07-20T09:00:00.000Z",
    });
    await createDiaryEntry(store, {
      content: "Second observation",
      participant: "mia",
      phase: "ningwaab",
      entryType: "synthesis",
      metadata: { tags: ["code"] },
      timestamp: "2026-07-20T11:00:00.000Z",
    });

    const all = await queryDiaryEntries(store, { participant: "mia" });
    expect(all).toHaveLength(2);
    expect(all[0].content).toBe("First observation");
    expect(all[1].content).toBe("Second observation");

    const tagged = await queryDiaryEntries(store, { tags: ["code"] });
    expect(tagged).toHaveLength(1);
    expect(tagged[0].content).toBe("Second observation");

    const byPhase = await getEntriesByPhase(store, "mia", "nindokendaan");
    expect(byPhase).toHaveLength(1);

    const last = await getLastDiaryEntry(store, "mia");
    expect(last?.content).toBe("Second observation");
  });

  it("updates via upsert and deletes by id", async () => {
    const entry = await createReflectionEntry(store, {
      reflection: "Grateful for the walk",
      participant: "miette",
    });
    expect(entry.phase).toBe("migwech");

    const updated = await store.registerDiaryEntry({
      ...entry,
      content: "Grateful for the walk and the river",
    });
    const refetched = await store.getDiaryEntry(entry.id);
    expect(refetched?.content).toBe("Grateful for the walk and the river");
    expect(updated.content).toBe("Grateful for the walk and the river");
    expect(await store.listDiaryEntries({ participant: "miette" })).toHaveLength(1);

    await store.deleteDiaryEntry(entry.id);
    expect(await store.getDiaryEntry(entry.id)).toBeNull();
    expect(await store.listDiaryEntries({ participant: "miette" })).toHaveLength(0);
  });

  it("records a walking entry as creative expression with location", async () => {
    const entry = await createWalkingEntry(store, {
      content: "The maples are turning",
      participant: "ava",
      location: { lat: 46.56, lon: -72.74, name: "Shawinigan" },
    });
    expect(entry.phase).toBe("nindoodam");
    expect(entry.entryType).toBe("observation");
    expect(entry.agent).toBe("ava");
    expect(entry.metadata.activity).toBe("walking");
    expect(entry.metadata.location?.name).toBe("Shawinigan");
  });
});

describe("diary statistics and patterns", () => {
  it("counts entries by phase and entry type", async () => {
    await createIntentionEntry(store, { intention: "Begin", participant: "mia" });
    await createReflectionEntry(store, { reflection: "Close", participant: "mia" });
    await createReflectionEntry(store, { reflection: "Close again", participant: "mia" });

    const stats = await getDiaryStatistics(store, "mia");
    expect(stats.totalEntries).toBe(3);
    expect(stats.byPhase.miigwechiwendam).toBe(1);
    expect(stats.byPhase.migwech).toBe(2);
    expect(stats.byEntryType.reflection).toBe(2);

    const patterns = await findDiaryPatterns(store, "mia");
    expect(patterns.mostActivePhase).toBe("migwech");
    expect(patterns.mostCommonEntryType).toBe("reflection");
  });
});

describe("diary markdown export", () => {
  it("renders frontmatter, phase name, and content", async () => {
    const entry = await createIntentionEntry(store, {
      intention: "Set the sacred container",
      participant: "mia",
      agent: "ava",
      metadata: { tags: ["ceremony"] },
    });

    const md = entryToMarkdown(entry);
    expect(md).toContain('participant: "mia"');
    expect(md).toContain('phase: "miigwechiwendam"');
    expect(md).toContain('phaseName: "Sacred Space Creation"');
    expect(md).toContain("Set the sacred container");
    expect(md).toContain("- ceremony");

    const doc = exportToMarkdown([entry]);
    expect(doc).toContain("# Ceremonial Diary Entries");
    expect(doc).toContain("Total Entries: 1");

    const summary = createJourneySummary([entry]);
    expect(summary).toContain("# Ceremonial Journey Summary");
    expect(summary).toContain("## Sacred Space Creation");
  });
});

describe("chronicle projection into the wheel", () => {
  it("draws participant → entry → chronicle episode edges (with chronicle ref)", async () => {
    const chronicle = chronicleNodeId(
      "2026-07-20-episode-074-medicine-wheel-org-webhook",
    );
    const entry = await createIntentionEntry(store, {
      intention: "Bring the diary home to the wheel",
      participant: "mia",
      chronicle,
    });
    expect(entry.chronicle).toBe(chronicle);

    const result = await projectEntryToWheel(store, entry, {
      ensureChronicleNode: true,
    });
    expect(result.projected).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.edges).toHaveLength(2);

    const entryNode = await store.getNode(diaryNodeId(entry));
    expect(entryNode).not.toBeNull();
    expect(entryNode?.direction).toBe("east"); // miigwechiwendam → east

    const chronicleNode = await store.getNode(chronicle);
    expect(chronicleNode).not.toBeNull();

    const authoredEdge = await store.getEdge("participant:mia", diaryNodeId(entry));
    expect(authoredEdge?.relationship_type).toBe("authored");

    const recordedEdge = await store.getEdge(diaryNodeId(entry), chronicle);
    expect(recordedEdge?.relationship_type).toBe("recorded_in");
  });

  it("projects an entry without a chronicle ref (still valid, one edge)", async () => {
    const entry = await createIntentionEntry(store, {
      intention: "No episode yet",
      participant: "seraphine",
    });
    expect(entry.chronicle).toBeUndefined();

    const result = await projectEntryToWheel(store, entry);
    expect(result.projected).toBe(true);
    expect(result.edges).toHaveLength(1);
  });
});
