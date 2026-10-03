/**
 * `GET /api/episodes/[id]/files` — an episode's folder, read from the wheel.
 *
 * The wheel has no signed-in reader, so it must show no more of a folder than
 * Miadi's public room does. What these tests hold, in order of what would hurt
 * most if it broke:
 *
 *  1. **A community episode stays closed** — no listing, no read, and none of
 *     its text in any answer.
 *  2. **The room rule holds** — `ceremonies/` (a circle's notes and
 *     participants) and `captures/` (recordings) are neither listed nor read,
 *     including through a linked directory under another name.
 *  3. **Containment** — a path that climbs out of the folder, or an id that is
 *     not exactly one folder name, is refused.
 *  4. **Three empties are told apart** — no chronicle on this host, an episode
 *     not on this host, and an open room with files are different answers.
 *
 * The rules themselves are `@miadi/episode-vessel`'s; these tests prove the
 * wheel applies them, not that the package is right.
 *
 * @see app/api/episodes/[id]/files/route.ts
 * @see lib/episode-files.ts
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "../app/api/episodes/[id]/files/route";

const PUBLIC_EPISODE = "2026-09-17-episode-349-a-circle-its-people-can-enter";
const COMMUNITY_EPISODE = "2026-09-18-episode-350-held-for-the-community";
const COMMUNITY_SECRET = "words only the circle should read";

const ORIGINAL_ROOT = process.env.MIADI_CHRONICLE_ROOT;
let root: string;

function write(relative: string, content: string) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

async function get(id: string, file?: string) {
  const url = new URL(`http://localhost/api/episodes/${encodeURIComponent(id)}/files`);
  if (file !== undefined) url.searchParams.set("path", file);
  const res = await GET(new Request(url), { params: Promise.resolve({ id: encodeURIComponent(id) }) });
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text), text };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "mw-episode-files-"));
  process.env.MIADI_CHRONICLE_ROOT = root;

  write(`${PUBLIC_EPISODE}/episode.yaml`, "title: A circle its people can enter\n");
  write(`${PUBLIC_EPISODE}/review-claude-1.md`, "# Review\n\nThe pages hold.\n");
  write(`${PUBLIC_EPISODE}/held/issue-draft.md`, "draft\n");
  write(`${PUBLIC_EPISODE}/AGENTS.md`, "guidance\n");
  write(`${PUBLIC_EPISODE}/ceremonies/c63c657a/notes.md`, "participants: Mia, William\n");
  write(`${PUBLIC_EPISODE}/captures/260920/transcript.txt`, "a recording's words\n");
  fs.symlinkSync("ceremonies", path.join(root, PUBLIC_EPISODE, "circle"));

  write(`${COMMUNITY_EPISODE}/episode.yaml`, "title: Held for the community\naudience: community\n");
  write(`${COMMUNITY_EPISODE}/notes.md`, `${COMMUNITY_SECRET}\n`);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  if (ORIGINAL_ROOT === undefined) delete process.env.MIADI_CHRONICLE_ROOT;
  else process.env.MIADI_CHRONICLE_ROOT = ORIGINAL_ROOT;
});

describe("a community episode", () => {
  it("is not listed", async () => {
    const res = await get(`chronicle:${COMMUNITY_EPISODE}`);
    expect(res.status).toBe(403);
    expect(res.body.state).toBe("community");
    expect(res.body.files).toBeUndefined();
  });

  it("is not read, and its words appear in no answer", async () => {
    const res = await get(`chronicle:${COMMUNITY_EPISODE}`, "notes.md");
    expect(res.status).toBe(403);
    expect(res.body.state).toBe("community");
    expect(res.text).not.toContain(COMMUNITY_SECRET);
  });
});

describe("the room", () => {
  it("lists the episode's work and leaves ceremonies/ and captures/ out", async () => {
    const res = await get(`chronicle:${PUBLIC_EPISODE}`);
    expect(res.status).toBe(200);
    expect(res.body.state).toBe("open");
    const listed = res.body.files.map((f: { relativePath: string }) => f.relativePath).sort();
    expect(listed).toContain("review-claude-1.md");
    expect(listed).toContain("held/issue-draft.md");
    expect(listed.some((p: string) => p.startsWith("ceremonies/") || p.startsWith("captures/"))).toBe(false);
    expect(listed).not.toContain("episode.yaml");
  });

  it("marks guidance documents as guidance, not episode content", async () => {
    const res = await get(`chronicle:${PUBLIC_EPISODE}`);
    const agents = res.body.files.find((f: { relativePath: string }) => f.relativePath === "AGENTS.md");
    expect(agents?.guidance).toBe(true);
  });

  it("reads a text file whole, with its revision", async () => {
    const res = await get(`chronicle:${PUBLIC_EPISODE}`, "review-claude-1.md");
    expect(res.status).toBe(200);
    expect(res.body.content).toBe("# Review\n\nThe pages hold.\n");
    expect(res.body.revision.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses a ceremony's notes", async () => {
    const res = await get(`chronicle:${PUBLIC_EPISODE}`, "ceremonies/c63c657a/notes.md");
    expect(res.status).toBe(403);
    expect(res.body.state).toBe("outside-the-room");
    expect(res.text).not.toContain("participants");
  });

  it("refuses a capture", async () => {
    const res = await get(`chronicle:${PUBLIC_EPISODE}`, "captures/260920/transcript.txt");
    expect(res.status).toBe(403);
    expect(res.text).not.toContain("a recording's words");
  });

  it("refuses a ceremony's notes reached through a linked directory", async () => {
    const res = await get(`chronicle:${PUBLIC_EPISODE}`, "circle/c63c657a/notes.md");
    expect(res.status).toBe(403);
    expect(res.text).not.toContain("participants");
  });
});

describe("containment", () => {
  it("refuses a path that climbs out of the folder", async () => {
    const res = await get(`chronicle:${PUBLIC_EPISODE}`, `../${COMMUNITY_EPISODE}/notes.md`);
    expect(res.status).toBe(400);
    expect(res.text).not.toContain(COMMUNITY_SECRET);
  });

  it("refuses an id that is not exactly one episode folder", async () => {
    for (const id of [PUBLIC_EPISODE, `chronicle:${COMMUNITY_EPISODE}/.`, "chronicle:../etc", "chronicle:"]) {
      const res = await get(id);
      expect(res.status, id).toBe(400);
      expect(res.body.state).toBe("not-an-episode");
    }
  });

  it("answers a missing file with 404", async () => {
    const res = await get(`chronicle:${PUBLIC_EPISODE}`, "nothing-here.md");
    expect(res.status).toBe(404);
  });
});

describe("the three empties", () => {
  it("says when the episode is not on this host", async () => {
    const res = await get("chronicle:2026-10-03-episode-1000-not-on-this-host");
    expect(res.status).toBe(404);
    expect(res.body.state).toBe("absent");
  });

  it("says when this host has no chronicle", async () => {
    delete process.env.MIADI_CHRONICLE_ROOT;
    const res = await get(`chronicle:${PUBLIC_EPISODE}`);
    expect(res.status).toBe(503);
    expect(res.body.state).toBe("no-root");
  });

  it("says the same when the named root does not exist", async () => {
    process.env.MIADI_CHRONICLE_ROOT = path.join(root, "no-such-chronicle");
    const res = await get(`chronicle:${PUBLIC_EPISODE}`);
    expect(res.status).toBe(503);
    expect(res.body.state).toBe("no-root");
  });
});
