import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const ORIGINAL_MW_DATA_DIR = process.env.MW_DATA_DIR;
let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-beats-witness-"));
  process.env.MW_DATA_DIR = tempDir;
});

afterEach(() => {
  if (ORIGINAL_MW_DATA_DIR === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = ORIGINAL_MW_DATA_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("a turn in a talking circle: speaker and witnesses on a beat (0.14.0)", () => {
  it("stores the speaker on creation and adds witnesses as a set on PATCH", async () => {
    const { POST } = await import("../app/api/narrative/beats/route");
    const created = await POST(
      new Request("http://wheel/api/narrative/beats", {
        method: "POST",
        body: JSON.stringify({ direction: "east", title: "Guillaume speaks", description: "first turn", ceremonies: ["cer-1"], speaker: "node:human:g" }),
      }),
    );
    expect(created.status).toBe(201);
    const beat = await created.json();
    expect(beat.speaker).toBe("node:human:g");

    const { PATCH, GET } = await import("../app/api/narrative/beats/[id]/route");
    const ctx = { params: Promise.resolve({ id: beat.id }) };
    const once = await PATCH(new Request("http://wheel", { method: "PATCH", body: JSON.stringify({ witnesses: ["node:human:m", "node:human:a"] }) }), ctx);
    expect(once.status).toBe(200);
    const twice = await PATCH(new Request("http://wheel", { method: "PATCH", body: JSON.stringify({ witnesses: ["node:human:m"] }) }), ctx);
    const after = await twice.json();
    expect(after.witnesses).toEqual(["node:human:m", "node:human:a"]);
    expect(after.speaker).toBe("node:human:g");

    const read = await (await GET(new Request("http://wheel"), ctx)).json();
    expect(read.witnesses).toHaveLength(2);

    const empty = await PATCH(new Request("http://wheel", { method: "PATCH", body: JSON.stringify({}) }), ctx);
    expect(empty.status).toBe(400);
    const missing = await PATCH(new Request("http://wheel", { method: "PATCH", body: JSON.stringify({ witnesses: ["x"] }) }), { params: Promise.resolve({ id: "ghost" }) });
    expect(missing.status).toBe(404);
  });
});
