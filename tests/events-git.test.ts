/**
 * The event log carried by git (#164): the wheel commits `events.jsonl` —
 * that file only — and pushes; a follower elsewhere pulls and handles what it
 * has not seen. Run against a bare remote and two clones in a temp directory;
 * nothing leaves this machine.
 */
import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/storage-provider", async () => await import("../src/storage-provider/src/index"));
vi.mock("@medicine-wheel/events", async () => await import("../src/events/src/index"));
vi.mock("@medicine-wheel/events/log", async () => await import("../src/events/src/log"));
vi.mock("@medicine-wheel/events/publish", async () => await import("../src/events/src/publish"));
vi.mock("@medicine-wheel/events/git", async () => await import("../src/events/src/git"));

import { buildEvent, type WheelEvent } from "../src/events/src/index";
import { appendEvent } from "../src/events/src/log";
import { commitEventLog, followEventLog } from "../src/events/src/git";

const IDENTITY = { GIT_AUTHOR_NAME: "wheel", GIT_AUTHOR_EMAIL: "wheel@test", GIT_COMMITTER_NAME: "wheel", GIT_COMMITTER_EMAIL: "wheel@test" };
const ORIGINAL = { ...process.env };
let root: string;
let remote: string;
let wheel: string; // the wheel's data repository
let elsewhere: string; // a follower's clone
let logFile: string;
let stateDir: string;

const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();
const event = (id: string) =>
  buildEvent({ name: "cycle.opened", subject: { kind: "cycle", id }, correlation_id: id, payload: { current_direction: "east" } });

beforeAll(() => {
  Object.assign(process.env, IDENTITY);
  root = fs.mkdtempSync(path.join(os.tmpdir(), "mw-events-git-"));
  remote = path.join(root, "mw-data.git");
  wheel = path.join(root, "wheel");
  elsewhere = path.join(root, "elsewhere");
  stateDir = path.join(root, "state");
  git(root, "init", "--bare", "-q", "-b", "main", remote);
  git(root, "clone", "-q", remote, wheel);
  fs.mkdirSync(path.join(wheel, "miadi-chronicle", "store"), { recursive: true });
  fs.writeFileSync(path.join(wheel, "miadi-chronicle", "store", "beats.jsonl"), '{"id":"b0"}\n');
  git(wheel, "add", "miadi-chronicle/store/beats.jsonl");
  git(wheel, "commit", "-q", "-m", "data");
  git(wheel, "push", "-q", "-u", "origin", "main");
  git(root, "clone", "-q", remote, elsewhere);
  logFile = path.join(wheel, "miadi-chronicle", "store", "events.jsonl");
});
afterAll(() => {
  for (const key of Object.keys(IDENTITY)) if (!(key in ORIGINAL)) delete process.env[key];
  for (const key of ["MW_DATA_DIR", "MW_EVENTS_GIT_SYNC"]) {
    if (ORIGINAL[key] === undefined) delete process.env[key]; else process.env[key] = ORIGINAL[key];
  }
  fs.rmSync(root, { recursive: true, force: true });
});

describe("the wheel commits its log, and only its log", () => {
  it("commits events.jsonl beside someone's work in progress, leaves that work as it was, and pushes", async () => {
    appendEvent(logFile, event("c1"));
    appendEvent(logFile, event("c2"));
    // Someone's unfinished data work: one file changed and staged, one changed.
    fs.appendFileSync(path.join(wheel, "miadi-chronicle", "store", "beats.jsonl"), '{"id":"b1"}\n');
    git(wheel, "add", "miadi-chronicle/store/beats.jsonl");
    fs.writeFileSync(path.join(wheel, "miadi-chronicle", "store", "nodes.jsonl"), '{"id":"n1"}\n');

    const result = await commitEventLog(logFile, { push: true, instance: "ilex:8040" });
    expect(result).toMatchObject({ committed: true, events: 2, pushed: true, unpushed: 0 });
    expect(result.error).toBeUndefined();
    expect(git(wheel, "show", "--name-only", "--format=%s", "HEAD")).toBe(
      "events: 2 from ilex:8040 — cycle.opened ×2\n\nmiadi-chronicle/store/events.jsonl",
    );
    expect(git(wheel, "diff", "--cached", "--name-only")).toBe("miadi-chronicle/store/beats.jsonl");
    expect(git(wheel, "status", "--porcelain", "--", "miadi-chronicle/store/nodes.jsonl")).toBe("?? miadi-chronicle/store/nodes.jsonl");
    expect(git(remote, "log", "--format=%s", "-1", "main")).toMatch(/^events: 2 from ilex:8040/);
  });

  it("has nothing to do when nothing new was written, and counts only what is new", async () => {
    expect(await commitEventLog(logFile, { push: true })).toMatchObject({ committed: false, pushed: false, unpushed: 0 });
    appendEvent(logFile, event("c3"));
    expect(await commitEventLog(logFile, { push: false })).toMatchObject({ committed: true, events: 1, pushed: false, unpushed: 1 });
    expect(await commitEventLog(logFile, { push: true })).toMatchObject({ committed: false, pushed: true, unpushed: 0 });
  });

  it("a failure is a result, never a throw", async () => {
    // The temp directory may itself sit inside a checkout (on ilex, ~/tmp is in home-old).
    const ceiling = process.env.GIT_CEILING_DIRECTORIES;
    process.env.GIT_CEILING_DIRECTORIES = root;
    try {
      const outside = path.join(root, "not-a-repo", "events.jsonl");
      appendEvent(outside, event("x"));
      const result = await commitEventLog(outside, { push: true });
      expect(result.committed).toBe(false);
      expect(result.error).toMatch(/not a git repository/i);
    } finally {
      if (ceiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES; else process.env.GIT_CEILING_DIRECTORIES = ceiling;
    }
  });

  it("a log the repository ignores is an error, not a silence", async () => {
    const repo = path.join(root, "ignoring");
    git(root, "init", "-q", "-b", "main", repo);
    fs.writeFileSync(path.join(repo, ".gitignore"), "*.jsonl\n");
    appendEvent(path.join(repo, "events.jsonl"), event("i"));
    const result = await commitEventLog(path.join(repo, "events.jsonl"), { push: true });
    expect(result.committed).toBe(false);
    expect(result.error).toMatch(/is ignored by/);
  });

  it("never pushes someone else's commit: it holds the push and says why", async () => {
    fs.writeFileSync(path.join(wheel, "miadi-chronicle", "store", "nodes.jsonl"), '{"id":"n2"}\n');
    git(wheel, "add", "miadi-chronicle/store/nodes.jsonl");
    git(wheel, "commit", "-q", "-m", "data by hand", "--", "miadi-chronicle/store/nodes.jsonl");
    appendEvent(logFile, event("c3b"));
    const result = await commitEventLog(logFile, { push: true });
    expect(result).toMatchObject({ committed: true, pushed: false, unpushed: 2 });
    expect(result.held).toMatch(/1 unpushed commit\(s\) touch more than miadi-chronicle\/store\/events.jsonl/);
    expect(git(remote, "log", "--format=%s", "-1", "main")).not.toBe("data by hand");
    // Once the person pushes their own, the carriage pushes again.
    git(wheel, "push", "-q");
    expect(await commitEventLog(logFile, { push: true })).toMatchObject({ unpushed: 0 });
  });
});

describe("a follower elsewhere", () => {
  it("pulls, handles each event it has not seen, once, and stops on a handler that fails", async () => {
    const seen: string[] = [];
    const first = await followEventLog({ repo: elsewhere, stateDir, handle: async (e: WheelEvent) => (seen.push(e.subject.id), true) });
    expect(first).toMatchObject({ arrived: 4, pending: 0, stopped: false });
    expect(first.file).toBe(path.join(elsewhere, "miadi-chronicle", "store", "events.jsonl"));
    expect(seen).toEqual(["c1", "c2", "c3", "c3b"]);
    expect(git(elsewhere, "status", "--porcelain")).toBe("");

    appendEvent(logFile, event("c4"));
    appendEvent(logFile, event("c5"));
    await commitEventLog(logFile, { push: true });
    let calls = 0;
    const stopped = await followEventLog({ repo: elsewhere, stateDir, handle: async (e) => (seen.push(e.subject.id), ++calls < 2) });
    expect(stopped).toMatchObject({ arrived: 1, pending: 1, stopped: true });
    const again = await followEventLog({ repo: elsewhere, stateDir, handle: async (e) => (seen.push(e.subject.id), true) });
    expect(again).toMatchObject({ arrived: 1, pending: 0 });
    expect(seen).toEqual(["c1", "c2", "c3", "c3b", "c4", "c5", "c5"]);
  });

  it("mw-events follow runs a command per event with the event on stdin and in the environment", () => {
    const cli = path.join(__dirname, "..", "src", "events", "dist", "cli.js");
    if (!fs.existsSync(cli)) return; // built by the package's build
    appendEvent(logFile, event("c6"));
    execFileSync("git", ["add", "--", "miadi-chronicle/store/events.jsonl"], { cwd: wheel });
    execFileSync("git", ["commit", "-q", "--only", "-m", "events", "--", "miadi-chronicle/store/events.jsonl"], { cwd: wheel });
    execFileSync("git", ["push", "-q"], { cwd: wheel });
    const out = path.join(root, "handled.txt");
    const run = spawnSync(process.execPath, [cli, "follow", elsewhere, "--state-dir", stateDir, "--exec", `printf '%s %s ' "$MW_EVENT_TYPE" "$MW_EVENT_SUBJECT_ID" >> ${out}; cat >> ${out}`], { encoding: "utf-8" });
    expect(run.status).toBe(0);
    expect(run.stderr).toMatch(/1 handled, 0 waiting/);
    const handled = fs.readFileSync(out, "utf-8");
    expect(handled.startsWith("medicine-wheel.cycle.opened c6 {")).toBe(true);
    expect(JSON.parse(handled.slice(handled.indexOf("{"))).subject.id).toBe("c6");
  });
});

describe("the wheel's carriage", () => {
  it("off unless MW_EVENTS_GIT_SYNC is set; set, the door commits and pushes what the routes recorded", async () => {
    process.env.MW_DATA_DIR = path.join(wheel, "miadi-chronicle", "store");
    delete process.env.MW_EVENTS_GIT_SYNC;
    const { GET, POST } = await import("../app/api/events/git/route");
    expect((await GET()).status).toBe(409);

    process.env.MW_EVENTS_GIT_SYNC = "push";
    const { recordEvent } = await import("../lib/event-log");
    recordEvent({ name: "cycle.opened", subject: { kind: "cycle", id: "c7" }, payload: { current_direction: "east" } });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ committed: true, events: 1, pushed: true });
    expect((await (await GET()).json())).toMatchObject({ mode: "push", last: { committed: true, pushed: true } });
  });
});
