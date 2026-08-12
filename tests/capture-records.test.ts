import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  JsonlProvider,
  filterAndOrderCaptures,
  mergeCaptureRecords,
  captureRecordId,
  type CaptureRecord,
} from "../src/storage-provider/src/index";

vi.mock("@medicine-wheel/storage-provider", async () => {
  return await import("../src/storage-provider/src/index");
});

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
const ORIGINAL_MW_STORAGE_PROVIDER = process.env.MW_STORAGE_PROVIDER;

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-captures-"));
  process.env.MW_DATA_DIR = tempDir;
  delete process.env.MW_STORAGE_PROVIDER;
});

afterEach(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) {
    delete process.env.MW_DATA_DIR;
  } else {
    process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  }

  if (ORIGINAL_MW_STORAGE_PROVIDER === undefined) {
    delete process.env.MW_STORAGE_PROVIDER;
  } else {
    process.env.MW_STORAGE_PROVIDER = ORIGINAL_MW_STORAGE_PROVIDER;
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("captureRecordId", () => {
  it("binds to an episode when one is named, and stands alone when not", () => {
    expect(captureRecordId("take-01.wav", "2026-08-01-episode-200-example")).toBe(
      "capture:2026-08-01-episode-200-example:take-01.wav",
    );
    expect(captureRecordId("take-01.wav")).toBe("capture:take-01.wav");
  });
});

describe("Capture storage provider", () => {
  it("maps JSONL storage to captures.jsonl and upserts by id", async () => {
    const provider = new JsonlProvider(tempDir);
    await provider.connect();

    // Registered with NEITHER belonging — an inbox take, whole and waiting
    // for a choice (capture-vocabulary.spec.md §5).
    const initial = captureRecord({
      id: "capture:episode-a:take-01.wav",
      sha256: "abc123",
      device: "pixel-belt",
      registered_at: "2026-08-01T00:00:00Z",
      future_field: "preserved",
    });
    await provider.registerCapture(initial);

    // A later registration that learned less must not erase provenance an
    // earlier one knew, and the first registration timestamp survives.
    const merged = await provider.registerCapture(
      captureRecord({
        id: initial.id,
        sha256: undefined,
        device: undefined,
        composition: "morning-song",
        registered_at: "2026-08-08T00:00:00Z",
      }),
    );

    expect(merged.sha256).toBe("abc123");
    expect(merged.device).toBe("pixel-belt");
    expect(merged.composition).toBe("morning-song");
    expect(merged.registered_at).toBe("2026-08-01T00:00:00Z");
    expect(merged.future_field).toBe("preserved");

    const records = await provider.listCaptures();
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(merged);

    const filePath = path.join(tempDir, "captures.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, "utf-8").trim().split("\n")).toHaveLength(1);

    await expect(provider.getCapture(initial.id)).resolves.toEqual(merged);
    await expect(provider.getCapture("capture:missing")).resolves.toBeNull();
  });

  it("filters by episode, composition, kind, origin, device, and filename", async () => {
    const provider = new JsonlProvider(tempDir);
    await provider.connect();

    // Both belongings at once — legal, tested, real: the belonging algebra is
    // 0/1/2, never xor (capture-vocabulary.spec.md §5).
    const capturedTake = captureRecord({
      id: "capture:episode-a:take-01.wav",
      filename: "take-01.wav",
      kind: "audio",
      origin: "captured",
      device: "pixel-belt",
      episode_path: "episode-a",
      episode_number: 200,
      composition: "morning-song",
    });
    const derivedMidi = captureRecord({
      id: "capture:episode-b:take-01.mid",
      filename: "take-01.mid",
      kind: "midi",
      origin: "derived",
      device: "studio-render",
      episode_path: "episode-b",
      episode_number: 201,
      composition: "evening-song",
      source_artifact: "take-01.wav",
    });
    await provider.registerCapture(capturedTake);
    await provider.registerCapture(derivedMidi);

    await expect(provider.listCaptures({ episode_path: "episode-a" })).resolves.toEqual([
      capturedTake,
    ]);
    await expect(provider.listCaptures({ episode_number: 201 })).resolves.toEqual([derivedMidi]);
    await expect(provider.listCaptures({ composition: "morning-song" })).resolves.toEqual([
      capturedTake,
    ]);
    await expect(provider.listCaptures({ kind: "midi" })).resolves.toEqual([derivedMidi]);
    await expect(provider.listCaptures({ origin: "captured" })).resolves.toEqual([capturedTake]);
    await expect(provider.listCaptures({ device: "pixel-belt" })).resolves.toEqual([
      capturedTake,
    ]);
    await expect(provider.listCaptures({ filename: "take-01.mid" })).resolves.toEqual([
      derivedMidi,
    ]);
    await expect(provider.listCaptures({ episode_path: "missing" })).resolves.toEqual([]);
  });
});

describe("Capture filtering and merge semantics", () => {
  it("drops rows that did not survive the read and orders newest registration first", () => {
    const older = captureRecord({
      id: "capture:a",
      registered_at: "2026-08-01T00:00:00Z",
    });
    const newer = captureRecord({
      id: "capture:b",
      registered_at: "2026-08-08T00:00:00Z",
    });

    // A Postgres payload that fails to parse reaches the filter as null.
    expect(filterAndOrderCaptures([older, null, newer, undefined])).toEqual([newer, older]);
  });

  it("lets the incoming record win wherever it speaks", () => {
    const existing = captureRecord({
      id: "capture:a",
      uri: "file:///old/take-01.wav",
      registered_at: "2026-08-01T00:00:00Z",
    });
    const incoming = captureRecord({
      id: "capture:a",
      uri: "https://capture.example/take-01.wav",
      registered_at: "2026-08-08T00:00:00Z",
    });

    const merged = mergeCaptureRecords(existing, incoming);
    expect(merged.uri).toBe("https://capture.example/take-01.wav");
    expect(merged.registered_at).toBe("2026-08-01T00:00:00Z");
  });
});

describe("Capture REST route", () => {
  it("registers, lists with filters, and refuses what it cannot honestly answer", async () => {
    const route = await import("../app/api/captures/route");

    const posted = await route.POST(
      new Request("http://localhost/api/captures", {
        method: "POST",
        body: JSON.stringify({
          filename: "take-01.wav",
          kind: "audio",
          origin: "captured",
          uri: "file:///captures/take-01.wav",
          device: "pixel-belt",
          episode_path: "2026-08-01-episode-200-example",
          episode_number: 200,
          source: "gmtermux",
          future_field: "survives",
        }),
      }),
    );
    expect(posted.status).toBe(201);
    const postedBody = await posted.json();
    // The id derives from filename + episode_path when the caller omits it.
    expect(postedBody.capture.id).toBe(
      "capture:2026-08-01-episode-200-example:take-01.wav",
    );
    expect(postedBody.capture.registered_at).toBeTruthy();
    expect(postedBody.capture.future_field).toBe("survives");

    const listed = await route.GET(
      new Request(
        "http://localhost/api/captures?episode_path=2026-08-01-episode-200-example&kind=audio",
      ),
    );
    expect(listed.status).toBe(200);
    const listedBody = await listed.json();
    expect(listedBody.count).toBe(1);
    expect(listedBody.captures[0].filename).toBe("take-01.wav");
    // Deprecated echo: the same array under the old key, kept until
    // forgewright's fetchRecordingRecords targets /api/captures.
    expect(listedBody.recordings).toEqual(listedBody.captures);
    expect(listedBody.filters).toEqual({
      episode_path: "2026-08-01-episode-200-example",
      kind: "audio",
    });

    const empty = await route.GET(new Request("http://localhost/api/captures?device=missing"));
    expect(empty.status).toBe(200);
    await expect(empty.json()).resolves.toMatchObject({ count: 0, captures: [] });

    const unknownParam = await route.GET(
      new Request("http://localhost/api/captures?kinds=audio"),
    );
    expect(unknownParam.status).toBe(400);
    const unknownParamBody = await unknownParam.json();
    expect(unknownParamBody.accepted).toContain("kind");

    const unknownKind = await route.GET(
      new Request("http://localhost/api/captures?kind=holograph"),
    );
    expect(unknownKind.status).toBe(400);
    const unknownKindBody = await unknownKind.json();
    expect(unknownKindBody.accepted).toEqual(["audio", "video", "midi", "other"]);

    const badNumber = await route.GET(
      new Request("http://localhost/api/captures?episode_number=abc"),
    );
    expect(badNumber.status).toBe(400);

    const invalid = await route.POST(
      new Request("http://localhost/api/captures", {
        method: "POST",
        body: JSON.stringify({ filename: "take-02.wav", kind: "audio", origin: "captured" }),
      }),
    );
    expect(invalid.status).toBe(400);
    const invalidBody = await invalid.json();
    expect(invalidBody.issues.join("\n")).toContain("uri");
  });

  it("keeps /api/recordings answering as a deprecated alias of the same handlers", async () => {
    const canonical = await import("../app/api/captures/route");
    const alias = await import("../app/api/recordings/route");

    // Same handler, not a copy: the strangler alias re-exports the canonical
    // functions, so the two paths can never drift apart silently.
    expect(alias.GET).toBe(canonical.GET);
    expect(alias.POST).toBe(canonical.POST);

    // A registration through the alias is visible through the canonical path,
    // and the alias's GET body still carries the `recordings` key forgewright's
    // fail-closed fetchRecordingRecords reads.
    const posted = await alias.POST(
      new Request("http://localhost/api/recordings", {
        method: "POST",
        body: JSON.stringify({
          filename: "take-02.wav",
          kind: "audio",
          origin: "captured",
          uri: "file:///captures/take-02.wav",
        }),
      }),
    );
    expect(posted.status).toBe(201);
    const postedBody = await posted.json();
    expect(postedBody.capture.id).toBe("capture:take-02.wav");

    const listed = await alias.GET(new Request("http://localhost/api/recordings"));
    expect(listed.status).toBe(200);
    const listedBody = await listed.json();
    expect(listedBody.recordings.map((record: CaptureRecord) => record.id)).toContain(
      "capture:take-02.wav",
    );
  });
});

function captureRecord(overrides: Partial<CaptureRecord> = {}): CaptureRecord {
  return {
    id: "capture:episode-a:take-01.wav",
    filename: "take-01.wav",
    kind: "audio",
    origin: "captured",
    uri: "file:///captures/take-01.wav",
    registered_at: "2026-08-01T00:00:00Z",
    source: "gmtermux",
    ...overrides,
  };
}
