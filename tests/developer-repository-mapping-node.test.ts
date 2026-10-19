/**
 * @medicine-wheel/developer-repository-mapping/node — a mapping folder on
 * disk, a clone's history read into an activity reading, a meta hub reading
 * owner hubs from a path and over https, and the small web server.
 *
 * Spec: rispecs/developer-suite/repository-mapping/repository-mapping.spec.md
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as http from "node:http";
import * as net from "node:net";
import type { AddressInfo } from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  LOOPBACK_HOSTS,
  createMappingServer,
  findMappingDir,
  initMappingDir,
  originRepository,
  readActivity,
  readHub,
  readMappingDir,
  writeMappingDir,
} from "../src/developer-repository-mapping/src/node/index";
import type { RepositoryFacet } from "../src/developer-repository-mapping/src/index";

let root: string;

const attribution = {
  statedBy: "claude-opus-5-5",
  statedAt: "2026-10-18T22:00:00Z",
  grounding: ["README.md"],
  revision: "pending" as const,
};

const repo = (id: string): RepositoryFacet => ({
  nodeId: id,
  origin: "own",
  lifecycle: "prototype",
  purpose: "Explores one intent.",
  status: "clear",
  fields: [],
  prototypes: [],
  ...attribution,
});

const manifest = (owner: string, kind: "owner" | "meta" = "owner") => ({
  schema: "medicine-wheel/repository-mapping" as const,
  version: 1 as const,
  owner,
  hub: `${owner}/${owner}`,
  kind,
});

const hubDir = (owner: string) => path.join(root, owner, ".miadi", "repository-mapping");

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "mw-repomap-"));
  await initMappingDir(hubDir("jgwill"), manifest("jgwill", "meta"));
  await initMappingDir(hubDir("miadisabelle"), manifest("miadisabelle"));
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("a mapping folder on disk", () => {
  it("is found at a hub clone or at the folder itself", async () => {
    expect(await findMappingDir(path.join(root, "jgwill"))).toBe(hubDir("jgwill"));
    expect(await findMappingDir(hubDir("jgwill"))).toBe(hubDir("jgwill"));
    expect(await findMappingDir(root)).toBeUndefined();
  });

  it("is not mistaken for a clone's own manifest.json", async () => {
    const clone = path.join(root, "pwa");
    fs.mkdirSync(clone);
    fs.writeFileSync(path.join(clone, "manifest.json"), JSON.stringify({ name: "An app", start_url: "/" }));
    expect(await findMappingDir(clone)).toBeUndefined();
    await initMappingDir(path.join(clone, ".miadi", "repository-mapping"), manifest("pwa"));
    expect(await findMappingDir(clone)).toBe(path.join(clone, ".miadi", "repository-mapping"));
  });

  it("refuses a second init, and an init over rows that lost their manifest", async () => {
    await expect(initMappingDir(hubDir("jgwill"), manifest("jgwill", "meta"))).rejects.toThrow(/already holds manifest.json/);
    const orphan = path.join(root, "orphan");
    fs.mkdirSync(orphan);
    fs.writeFileSync(path.join(orphan, "repositories.jsonl"), JSON.stringify(repo("repository:jgwill/kept")) + "\n");
    await expect(initMappingDir(orphan, manifest("jgwill"))).rejects.toThrow(/already holds repositories.jsonl/);
    expect(fs.readFileSync(path.join(orphan, "repositories.jsonl"), "utf8")).toContain("repository:jgwill/kept");
  });

  it("writes nothing when a row would not read back", async () => {
    const dir = hubDir("miadisabelle");
    const before = fs.readFileSync(path.join(dir, "repositories.jsonl"), "utf8");
    const read = await readMappingDir(dir);
    const broken = { ...repo("repository:miadisabelle/broken"), observed: { observedBy: "", observedAt: "2026-10-18T00:00:00Z", commits: 1, commitsLast90Days: 1, tags: 0 } };
    await expect(writeMappingDir(dir, { ...read.mapping!, repositories: [broken] })).rejects.toThrow(/nothing written; these rows would not read back/);
    expect(fs.readFileSync(path.join(dir, "repositories.jsonl"), "utf8")).toBe(before);
  });

  it("writes rows sorted, one per line, and reads them back", async () => {
    const dir = hubDir("miadisabelle");
    const read = await readMappingDir(dir);
    await writeMappingDir(dir, { ...read.mapping!, repositories: [repo("repository:miadisabelle/z"), repo("repository:miadisabelle/a")] });
    const lines = fs.readFileSync(path.join(dir, "repositories.jsonl"), "utf8").trim().split("\n");
    expect(lines.map((l) => JSON.parse(l).nodeId)).toEqual(["repository:miadisabelle/a", "repository:miadisabelle/z"]);
    expect(lines.every((l) => l.startsWith('{"nodeId":'))).toBe(true);
    expect(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    const again = await readMappingDir(dir);
    expect(again.issues).toEqual([]);
    expect(again.mapping?.repositories).toHaveLength(2);
    expect(fs.existsSync(path.join(dir, "owners.jsonl"))).toBe(false);
  });

  it("reports a folder with no manifest instead of reading it as empty", async () => {
    const read = await readMappingDir(path.join(root, "nowhere"));
    expect(read.mapping).toBeUndefined();
    expect(read.issues[0].message).toMatch(/no manifest.json/);
  });
});

describe("reading a clone", () => {
  const git = (cwd: string, env: Record<string, string>, ...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false", ...args], {
      cwd,
      env: { ...process.env, ...env },
      encoding: "utf-8",
    }).trim();

  it("counts commits and tags and finds the latest commit date, not the first line of the log, measured from the reading's time", async () => {
    const clone = path.join(root, "clone");
    fs.mkdirSync(clone);
    git(clone, {}, "init", "-q", "-b", "main");
    // The newer date is committed first, so the log's first line is the older date.
    for (const date of ["2026-09-30T12:00:00Z", "2025-01-10T12:00:00Z"]) {
      fs.writeFileSync(path.join(clone, "f"), date);
      git(clone, {}, "add", "f");
      git(clone, { GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date }, "commit", "-q", "-m", date);
    }
    git(clone, {}, "tag", "v0.1.0");
    git(clone, {}, "remote", "add", "origin", "git@github.com:jgwill/clone-test.git");

    const reading = await readActivity(clone, { observedBy: "test", now: new Date("2026-10-18T00:00:00Z") });
    expect(reading).toMatchObject({ observedBy: "test", observedAt: "2026-10-18T00:00:00.000Z", commits: 2, commitsLast90Days: 1, tags: 1, branch: "main" });
    expect(Date.parse(reading.lastCommitAt!)).toBe(Date.parse("2026-09-30T12:00:00Z"));
    expect(Date.parse(reading.firstCommitAt!)).toBe(Date.parse("2025-01-10T12:00:00Z"));
    expect(reading.head).toMatch(/^[0-9a-f]{40}$/);
    expect(await originRepository(clone)).toBe("repository:jgwill/clone-test");
  });

  it("reads a signed history the same as an unsigned one, whatever log.showSignature says", async () => {
    const clone = path.join(root, "signed");
    fs.mkdirSync(clone);
    git(clone, {}, "init", "-q", "-b", "main");
    const key = path.join(root, "signing-key");
    try {
      execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", key]);
    } catch {
      return; // no ssh-keygen on this host: nothing to sign with
    }
    fs.writeFileSync(path.join(clone, "f"), "x");
    git(clone, {}, "add", "f");
    git(clone, {}, "-c", "gpg.format=ssh", "-c", `user.signingkey=${key}.pub`, "-c", "commit.gpgsign=true", "commit", "-q", "-m", "signed");
    git(clone, {}, "config", "log.showSignature", "true");
    const reading = await readActivity(clone, { observedBy: "test" });
    expect(reading.commits).toBe(1);
    expect(reading.lastCommitAt).toBeDefined();
  });

  it("reads an empty repository as zero commits, and refuses a folder that is not a clone", async () => {
    const empty = path.join(root, "empty");
    fs.mkdirSync(empty);
    git(empty, {}, "init", "-q", "-b", "main");
    expect(await readActivity(empty, { observedBy: "test" })).toMatchObject({ commits: 0, tags: 0 });
    await expect(readActivity(path.join(root, "nowhere"), { observedBy: "test" })).rejects.toThrow(/not a git clone/);
  });
});

describe("a meta hub", () => {
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    // An owner hub served over http, as GitHub would serve it: 404 for a file it does not hold.
    const served = path.join(root, "served");
    await initMappingDir(served, manifest("avadisabelle"));
    await writeMappingDir(served, {
      manifest: manifest("avadisabelle"),
      repositories: [repo("repository:avadisabelle/ava")],
      features: [],
      capabilities: [],
      relations: [],
      owners: [],
    });
    fs.rmSync(path.join(served, "features.jsonl"));
    server = http.createServer((req, res) => {
      const file = path.join(served, path.basename(new URL(req.url!, "http://x").pathname));
      if (!fs.existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200).end(fs.readFileSync(file));
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hub`;

    const meta = await readMappingDir(hubDir("jgwill"));
    await writeMappingDir(hubDir("jgwill"), {
      ...meta.mapping!,
      repositories: [repo("repository:jgwill/medicine-wheel")],
      // Not alphabetical, on purpose: hubs are read in the order owners.jsonl holds them.
      owners: [
        { owner: "miadisabelle", hub: "miadisabelle/miadisabelle", source: "../../../miadisabelle", registeredBy: "test", registeredAt: "2026-10-18T00:00:00Z" },
        { owner: "irisdisabelle", hub: "irisdisabelle/irisdisabelle", source: "../../../irisdisabelle", registeredBy: "test", registeredAt: "2026-10-18T00:00:00Z" },
        { owner: "avadisabelle", hub: "avadisabelle/avadisabelle", source: base, registeredBy: "test", registeredAt: "2026-10-18T00:00:00Z" },
      ],
    });
  });

  afterAll(() => {
    server.close();
  });

  it("reads registered hubs from a path and over http, in the order owners.jsonl holds them, and reports the one it cannot read", async () => {
    const lines = fs.readFileSync(path.join(hubDir("jgwill"), "owners.jsonl"), "utf8").trim().split("\n");
    expect(lines.map((l) => JSON.parse(l).owner)).toEqual(["miadisabelle", "irisdisabelle", "avadisabelle"]);
    const read = await readHub(hubDir("jgwill"));
    expect(read.hubs.map((h) => [h.hub, h.read, h.repositories])).toEqual([
      ["jgwill/jgwill", true, 1],
      ["miadisabelle/miadisabelle", true, 2],
      ["irisdisabelle/irisdisabelle", false, 0],
      ["avadisabelle/avadisabelle", true, 1],
    ]);
    expect(read.merged?.repositories.map((r) => r.nodeId).sort()).toEqual([
      "repository:avadisabelle/ava",
      "repository:jgwill/medicine-wheel",
      "repository:miadisabelle/a",
      "repository:miadisabelle/z",
    ]);
    expect(read.merged?.sources["repository:avadisabelle/ava"]).toBe("avadisabelle/avadisabelle");
    expect(read.issues.filter((i) => i.severity === "error").map((i) => i.file)).toEqual(["irisdisabelle/irisdisabelle/manifest.json"]);
  });

  it("reads only its own rows when asked", async () => {
    const read = await readHub(hubDir("jgwill"), { local: true });
    expect(read.hubs).toHaveLength(1);
    expect(read.merged?.repositories).toHaveLength(1);
  });

  it("refuses a source that holds another hub's mapping", async () => {
    const meta = await readMappingDir(hubDir("jgwill"));
    const dir = path.join(root, "wrong", ".miadi", "repository-mapping");
    await writeMappingDir(dir, {
      ...meta.mapping!,
      owners: [{ owner: "miadisabelle", hub: "miadisabelle/miadisabelle", source: base, registeredBy: "test", registeredAt: "2026-10-18T00:00:00Z" }],
    });
    const read = await readHub(dir);
    expect(read.hubs[1]).toMatchObject({ hub: "miadisabelle/miadisabelle", read: false });
    expect(read.hubs[1].issues[0].message).toMatch(/holds avadisabelle\/avadisabelle's mapping, not miadisabelle\/miadisabelle's/);
  });

  it("is served read-only: the page, the merged reading, 405 for anything but GET or HEAD, 400 for a path that does not parse", async () => {
    const app = createMappingServer(() => readHub(hubDir("jgwill")), { allowedHosts: LOOPBACK_HOSTS });
    await new Promise<void>((r) => app.listen(0, "127.0.0.1", () => r()));
    const url = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
    try {
      const page = await fetch(`${url}/`);
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("<title>Repository mapping</title>");
      const view = await (await fetch(`${url}/api/mapping`)).json();
      expect(view.manifest.hub).toBe("jgwill/jgwill");
      expect(view.repositories).toHaveLength(4);
      expect(view.summary.byDrift.unobserved).toBe(4);
      expect(view.hubs).toHaveLength(4);
      expect((await fetch(`${url}/api/mapping`, { method: "POST" })).status).toBe(405);
      expect((await fetch(`${url}/api/health`, { method: "HEAD" })).status).toBe(200);
      expect((await fetch(`${url}/elsewhere`)).status).toBe(404);

      const raw = (request: string) =>
        new Promise<string>((resolve) => {
          const socket = net.connect((app.address() as AddressInfo).port, "127.0.0.1", () => socket.end(request));
          let answer = "";
          socket.on("data", (chunk) => (answer += chunk));
          socket.on("close", () => resolve(answer));
          socket.on("error", () => resolve(answer));
        });
      expect(await raw("GET http://[ HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n")).toMatch(/^HTTP\/1\.1 400/);
      expect(await raw("GET /api/health HTTP/1.1\r\nHost: rebound.example\r\n\r\n")).toMatch(/^HTTP\/1\.1 421/);
      expect((await fetch(`${url}/api/health`)).status).toBe(200);
    } finally {
      app.close();
    }
  });
});
