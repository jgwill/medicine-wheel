import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JsonlProvider } from "../src/storage-provider/src/index";
import {
  isCeremonialEvent,
  extractCeremonialPhase,
  extractParticipants,
  extractRelationshipImpacts,
  buildIssueCeremony,
  buildPRCeremony,
  buildMergeCeremony,
  buildCommitCeremonies,
  processGitHubEvent,
} from "../src/github-ceremony/src/index";

const REPO = "jgwill/medicine-wheel";

let tempDir: string;
let store: JsonlProvider;

beforeEach(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-github-ceremony-"));
  store = new JsonlProvider(tempDir);
  await store.connect();
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function ceremonialIssue(overrides: Record<string, unknown> = {}) {
  return {
    number: 506,
    title: "Ceremony spiral for the chronicle",
    body: "This affects: the relational ledger\nresearch integration needed",
    labels: [{ name: "ceremony" }],
    user: { login: "jgwill" },
    ...overrides,
  };
}

describe("ceremony detection", () => {
  it("recognizes ceremonial labels and keywords", () => {
    expect(
      isCeremonialEvent({ type: "issues", payload: { issue: ceremonialIssue() } }),
    ).toBe(true);

    expect(
      isCeremonialEvent({
        type: "issues",
        payload: {
          issue: {
            title: "Fix typo",
            body: "small change",
            labels: [{ name: "bug" }],
            user: { login: "x" },
          },
        },
      }),
    ).toBe(false);
  });

  it("extracts phase, participants, and relationship impacts", () => {
    expect(extractCeremonialPhase([{ name: "migwech" }])).toBe("migwech");
    expect(extractCeremonialPhase([], "time for the closing")).toBe("migwech");
    expect(extractCeremonialPhase([], "just some research")).toBe("nindokendaan");

    const participants = extractParticipants(ceremonialIssue() as any, ["miette"]);
    expect(participants[0]).toEqual({
      name: "jgwill",
      role: "Creator",
      perspective: "both",
    });
    expect(participants[1].name).toBe("miette");

    expect(extractRelationshipImpacts("affects: the ledger")).toEqual(["the ledger"]);
    expect(extractRelationshipImpacts("nothing here")).toEqual([
      "General system impact",
    ]);
  });
});

describe("record building (pure)", () => {
  it("builds an issue ceremony with direction bridge and spiral key", () => {
    const record = buildIssueCeremony({ issue: ceremonialIssue() }, REPO);
    expect(record.id).toBe("issue-506");
    expect(record.kind).toBe("issue");
    expect(record.source).toBe("github");
    expect(record.repository).toBe(REPO);
    expect(record.reference).toBe(506);
    expect(record.participants[0].name).toBe("jgwill");
    expect(record.relationshipImpacts).toContain("the relational ledger");
    expect(record.direction).toBeDefined();
    expect(record.spiralKey).toMatch(/^Ceremony\.issue\./);
  });

  it("builds a PR ceremony and a closing merge ceremony", () => {
    const pr = {
      number: 42,
      title: "Weave the ceremony spiral",
      body: "consensus needed; impacts: the graph",
      head: { ref: "feat" },
      base: { ref: "main" },
      labels: [{ name: "ceremonial" }],
      user: { login: "mia" },
    };

    const opened = buildPRCeremony({ pull_request: pr }, REPO);
    expect(opened.id).toBe("pr-42");
    expect(opened.kind).toBe("pr");

    const merged = buildMergeCeremony({ pull_request: pr }, REPO);
    expect(merged.id).toBe("merge-42");
    expect(merged.kind).toBe("merge");
    expect(merged.phase).toBe("migwech");
    expect(merged.direction).toBe("north");
  });

  it("builds ceremonies only for commits mentioning ceremony", () => {
    const payload = {
      commits: [
        {
          id: "abcdef1234567890",
          message: "feat: ordinary work",
          author: { name: "Guillaume", username: "jgwill" },
          timestamp: "2026-07-20T10:00:00.000Z",
        },
        {
          id: "1234567abcdef890",
          message: "feat(ceremony): open the spiral",
          author: { name: "Mia", username: "mia" },
          timestamp: "2026-07-20T10:05:00.000Z",
        },
      ],
    };

    const records = buildCommitCeremonies(payload, REPO);
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("commit-1234567");
    expect(records[0].kind).toBe("commit");
    expect(records[0].phase).toBe("nindoodam");
    expect(records[0].participants[0].name).toBe("mia");
  });
});

describe("processing + persistence", () => {
  it("persists an issue-opened ceremony and reads it back", async () => {
    const result = await processGitHubEvent(
      { type: "issues", payload: { action: "opened", issue: ceremonialIssue() } },
      REPO,
      store,
    );
    expect(Array.isArray(result)).toBe(false);
    const record = result as Awaited<ReturnType<typeof buildIssueCeremony>>;
    expect(record.id).toBe("issue-506");

    const fetched = await store.getCeremonyEvent("issue-506");
    expect(fetched?.kind).toBe("issue");

    const listed = await store.listCeremonyEvents({ kind: "issue" });
    expect(listed).toHaveLength(1);
  });

  it("persists a merged PR and returns null for reviews and non-ceremonial events", async () => {
    const pr = {
      number: 7,
      title: "Ceremony merge",
      body: "relational impacts",
      head: { ref: "f" },
      base: { ref: "main" },
      merged: true,
      user: { login: "mia" },
    };

    const merged = await processGitHubEvent(
      { type: "pull_request", payload: { action: "closed", pull_request: pr } },
      REPO,
      store,
    );
    expect((merged as { id: string }).id).toBe("merge-7");
    expect(await store.getCeremonyEvent("merge-7")).not.toBeNull();

    const review = await processGitHubEvent(
      {
        type: "pull_request_review",
        payload: { action: "submitted", pull_request: pr, review: { state: "approved", user: { login: "x" } } },
      },
      REPO,
      store,
    );
    expect(review).toBeNull();

    const nonCeremonial = await processGitHubEvent(
      {
        type: "issues",
        payload: {
          action: "opened",
          issue: { number: 1, title: "typo", body: "x", labels: [], user: { login: "y" } },
        },
      },
      REPO,
      store,
    );
    expect(nonCeremonial).toBeNull();
  });

  it("persists ceremonies from a push of ceremonial commits", async () => {
    const result = await processGitHubEvent(
      {
        type: "push",
        payload: {
          commits: [
            {
              id: "cafebabe0000000",
              message: "chore(ceremony): close the circle",
              author: { name: "Ava", username: "ava" },
              timestamp: "2026-07-20T12:00:00.000Z",
            },
          ],
        },
      },
      REPO,
      store,
    );
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(1);
    expect(await store.listCeremonyEvents({ kind: "commit" })).toHaveLength(1);
  });
});
