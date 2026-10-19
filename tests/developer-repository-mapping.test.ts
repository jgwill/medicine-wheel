/**
 * @medicine-wheel/developer-repository-mapping — the pure layer: ids, rows,
 * the lifecycle state machine and its comparison with git, checking a hub,
 * the meta mapping, and the projection into the wheel. Plus the developer
 * kinds and edges it rides in ontology-core.
 *
 * Spec: rispecs/developer-suite/repository-mapping/repository-mapping.spec.md
 */

import { describe, expect, it } from "vitest";

import {
  DEVELOPER_ENTITY_BINDING,
  DEVELOPER_ENTITY_KINDS,
} from "../src/ontology-core/src/types";
import { KinshipEdgeNameSchema } from "../src/ontology-core/src/schemas";
import { inverseEdge } from "../src/ontology-core/src/kinship";
import {
  FeatureFacetSchema,
  MappingManifestSchema,
  RelationRowSchema,
  RepositoryFacetSchema,
  checkMapping,
  classifyActivity,
  featureNodeId,
  featureRepository,
  mergeMappings,
  parseGithubRemote,
  parseJsonl,
  reconcileLifecycle,
  repositoryNodeId,
  summarize,
  toRepositoryNodeId,
  toWheelEdges,
  toWheelNodes,
  transition,
  type ActivityReading,
  type FeatureFacet,
  type RepositoryFacet,
  type RepositoryMapping,
} from "../src/developer-repository-mapping/src/index";

const attribution = {
  statedBy: "claude-opus-5-5",
  statedAt: "2026-10-18T22:00:00Z",
  grounding: ["README.md"],
  revision: "pending" as const,
};

const repo = (id: string, over: Partial<RepositoryFacet> = {}): RepositoryFacet => ({
  nodeId: id,
  origin: "own",
  lifecycle: "prototype",
  purpose: "Explores one intent.",
  status: "clear",
  fields: [],
  prototypes: [],
  ...attribution,
  ...over,
});

const feature = (repository: string, slug: string, over: Partial<FeatureFacet> = {}): FeatureFacet => ({
  nodeId: featureNodeId(repository, slug),
  repository,
  name: slug,
  statement: `The ${slug} feature.`,
  status: "clear",
  ...attribution,
  ...over,
});

const manifest = (owner: string, kind: "owner" | "meta" = "owner") => ({
  schema: "medicine-wheel/repository-mapping" as const,
  version: 1 as const,
  owner,
  hub: `${owner}/${owner}`,
  kind,
});

const mapping = (owner: string, over: Partial<RepositoryMapping> = {}): RepositoryMapping => ({
  manifest: manifest(owner),
  repositories: [],
  features: [],
  capabilities: [],
  relations: [],
  owners: [],
  ...over,
});

const reading = (over: Partial<ActivityReading>): ActivityReading => ({
  observedBy: "mia@gaia",
  observedAt: "2026-10-18T00:00:00Z",
  commits: 10,
  commitsLast90Days: 0,
  tags: 0,
  ...over,
});

const daysBefore = (days: number) => new Date(Date.parse("2026-10-18T00:00:00Z") - days * 86_400_000).toISOString();

describe("developer kinds and edges in ontology-core", () => {
  it("rides knowledge nodes, a capability serving west, a repository and a feature no direction", () => {
    expect(DEVELOPER_ENTITY_KINDS).toEqual(["repository", "feature", "capability"]);
    for (const kind of DEVELOPER_ENTITY_KINDS) expect(DEVELOPER_ENTITY_BINDING[kind].nodeType).toBe("knowledge");
    expect(DEVELOPER_ENTITY_BINDING.capability.direction).toBe("west");
    expect(DEVELOPER_ENTITY_BINDING.repository.direction).toBeUndefined();
    expect(DEVELOPER_ENTITY_BINDING.feature.direction).toBeUndefined();
  });

  it("registers the developer edges with their inverse readings", () => {
    for (const name of ["forked-from", "grew-into", "provides", "realizes", "consumes"]) {
      expect(KinshipEdgeNameSchema.safeParse(name).success).toBe(true);
    }
    expect(inverseEdge("forked-from")).toBe("forked-into");
    expect(inverseEdge("grew-into")).toBe("grew-from");
    expect(inverseEdge("realizes")).toBe("realized-by");
  });
});

describe("ids", () => {
  it("are deterministic and keep GitHub's case", () => {
    expect(repositoryNodeId("jgwill", "Miadi")).toBe("repository:jgwill/Miadi");
    expect(toRepositoryNodeId("jgwill/Miadi")).toBe("repository:jgwill/Miadi");
    expect(featureNodeId("repository:jgwill/Miadi", "authors-desk")).toBe("feature:jgwill/Miadi#authors-desk");
    expect(featureRepository("feature:jgwill/Miadi#authors-desk")).toBe("repository:jgwill/Miadi");
    expect(() => repositoryNodeId("jgwill", "..")).toThrow();
    expect(RepositoryFacetSchema.safeParse(repo("repository:jgwill/..")).success).toBe(false);
    expect(RepositoryFacetSchema.safeParse(repo("repository:jgwill/.github")).success).toBe(true);
    expect(() => repositoryNodeId("a--b", "x")).toThrow();
    expect(() => repositoryNodeId("a-", "x")).toThrow();
    expect(() => featureNodeId("repository:jgwill/Miadi", "Authors Desk")).toThrow(/kebab-case/);
  });

  it("read a GitHub remote over ssh or https", () => {
    expect(parseGithubRemote("git@github.com:jgwill/medicine-wheel.git")).toEqual({ owner: "jgwill", name: "medicine-wheel" });
    expect(parseGithubRemote("https://github.com/miadisabelle/gmtermux")).toEqual({ owner: "miadisabelle", name: "gmtermux" });
    expect(parseGithubRemote("https://gitlab.com/x/y.git")).toBeUndefined();
    expect(parseGithubRemote("https://notgithub.com/a/b")).toBeUndefined();
    expect(parseGithubRemote("ssh://git@github.com/jgwill/Miadi.git")).toEqual({ owner: "jgwill", name: "Miadi" });
  });
});

describe("rows", () => {
  it("accept a classified, grounded repository", () => {
    expect(RepositoryFacetSchema.safeParse(repo("repository:jgwill/smcraft", { fields: ["research-field:software-engineering"] })).success).toBe(true);
  });

  it("refuse a purpose over 55 words, and accept the same row recorded as needs-resolution without one", () => {
    const long = Array.from({ length: 56 }, () => "word").join(" ");
    expect(RepositoryFacetSchema.safeParse(repo("repository:jgwill/x", { purpose: long })).success).toBe(false);
    const { purpose: _purpose, ...bare } = repo("repository:jgwill/x");
    expect(RepositoryFacetSchema.safeParse({ ...bare, status: "needs-resolution" }).success).toBe(true);
  });

  it("refuse a feature whose id names another repository", () => {
    const f = { ...feature("repository:jgwill/smcraft", "erd"), repository: "repository:jgwill/other" };
    const parsed = FeatureFacetSchema.safeParse(f);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toMatch(/names its repository/);
  });

  it("check each relation's endpoints against its name", () => {
    const rel = (from: string, type: string, to: string) => {
      const parsed = RelationRowSchema.safeParse({ from, to, type, ...attribution });
      return parsed.success ? "ok" : parsed.error.issues.map((i) => i.message).join("; ");
    };
    expect(rel("feature:jgwill/smcraft#erd", "realizes", "capability:draw-a-specification")).toBe("ok");
    expect(rel("repository:jgwill/smcraft", "realizes", "capability:draw-a-specification")).toBe("realizes joins feature → capability");
    expect(rel("repository:jgwill/smcraft", "field-aligns-with", "research-field:software-engineering")).toBe("ok");
    expect(rel("repository:jgwill/smcraft", "field-aligns-with", "repository:jgwill/x")).toBe("field-aligns-with joins repository → research-field");
    expect(rel("repository:x/fork", "forked-from", "repository:community/origin")).toBe("ok");
    expect(rel("repository:x/proto", "grew-into", "repository:x/impl")).toBe("ok");
    expect(rel("feature:x/proto#a", "grew-into", "repository:x/impl")).toBe("grew-into joins repository → repository");
    expect(rel("repository:x/a", "provides", "capability:c")).toBe("ok");
    expect(rel("node:knowledge:assembly-mux", "provides", "capability:c")).toBe("ok");
    for (const from of ["research-field:x", "prototype:p", "nonsense", "repository:jgwill/..", "feature:x/a#b"]) {
      expect(rel(from, "provides", "capability:c")).toBe("provides joins repository or service → capability");
    }
    expect(rel("repository:x/a", "consumes", "repository:x/a")).toBe("a relation joins two different nodes");
  });

  it("refuse a manifest whose hub is not <owner>/<owner>", () => {
    expect(MappingManifestSchema.safeParse({ ...manifest("jgwill"), hub: "jgwill/hub" }).success).toBe(false);
  });

  it("keep the row's identity first and its attribution last, whatever order it was written in", () => {
    const { nodeId, ...rest } = repo("repository:jgwill/a");
    const parsed = RepositoryFacetSchema.parse({ ...rest, nodeId });
    expect(Object.keys(parsed)[0]).toBe("nodeId");
    expect(Object.keys(parsed).slice(-4)).toEqual(["statedBy", "statedAt", "grounding", "revision"]);
  });

  it("parse JSONL line by line, reporting a bad line and keeping the good ones, after a byte-order mark", () => {
    const text = "\uFEFF" + [JSON.stringify(repo("repository:jgwill/a")), "{not json", "", JSON.stringify({ ...repo("repository:jgwill/b"), lifecycle: "dead" })].join("\n");
    const parsed = parseJsonl(text, RepositoryFacetSchema, "repositories.jsonl");
    expect(parsed.rows.map((r) => r.nodeId)).toEqual(["repository:jgwill/a"]);
    expect(parsed.issues.map((i) => [i.line, i.severity])).toEqual([[2, "error"], [4, "error"]]);
    expect(parsed.issues[1].nodeId).toBe("repository:jgwill/b");
  });
});

describe("the lifecycle state machine", () => {
  it("moves a prototype to an implementation on concretize", () => {
    expect(transition("prototype", "concretize")).toEqual({ ok: true, from: "prototype", event: "concretize", to: "implementation" });
    expect(transition("implementation", "release")).toMatchObject({ ok: true, to: "maintained" });
    expect(transition("archived", "reopen")).toMatchObject({ ok: true, to: "unclassified" });
  });

  it("refuses a move a state does not accept, and says what it accepts", () => {
    const refused = transition("maintained", "concretize");
    expect(refused.ok).toBe(false);
    expect(refused).toMatchObject({ allowed: ["archive"] });
  });
});

describe("git activity and drift", () => {
  it("classifies activity from the reading's own time", () => {
    expect(classifyActivity(reading({ lastCommitAt: daysBefore(90) }))).toBe("active");
    expect(classifyActivity(reading({ lastCommitAt: daysBefore(91) }))).toBe("quiet");
    expect(classifyActivity(reading({ lastCommitAt: daysBefore(366) }))).toBe("dormant");
    expect(classifyActivity(reading({ commits: 0 }))).toBe("empty");
  });

  it("names drift only where a declaration and git cannot both be true", () => {
    const at = (lifecycle: RepositoryFacet["lifecycle"], days?: number) =>
      reconcileLifecycle({
        nodeId: "repository:x/y",
        lifecycle,
        observed: days === undefined ? reading({ commits: 0 }) : reading({ lastCommitAt: daysBefore(days) }),
      }).drift;
    expect(reconcileLifecycle({ nodeId: "repository:x/y", lifecycle: "prototype" }).drift).toBe("unobserved");
    expect(at("unclassified", 3)).toBe("undeclared");
    expect(at("maintained", 400)).toBe("drifted");
    expect(at("maintained", 200)).toBe("converged");
    expect(at("archived", 10)).toBe("drifted");
    expect(at("prototype")).toBe("drifted");
    expect(at("prototype", 900)).toBe("converged");
  });
});

describe("checkMapping", () => {
  it("finds duplicates, rows in the wrong hub and features of a repository the hub does not hold", () => {
    const issues = checkMapping(
      mapping("jgwill", {
        repositories: [repo("repository:jgwill/a"), repo("repository:jgwill/A"), repo("repository:miadisabelle/b")],
        features: [feature("repository:jgwill/missing", "x")],
        relations: [{ from: "repository:miadisabelle/b", to: "repository:jgwill/a", type: "consumes", ...attribution }],
        owners: [{ owner: "miadisabelle", hub: "miadisabelle/miadisabelle", registeredBy: "x", registeredAt: "2026-10-18T00:00:00Z" }],
      }),
    ).filter((i) => i.severity === "error");
    expect(issues.map((i) => i.message)).toEqual([
      "repository:jgwill/A appears more than once",
      "repository:miadisabelle/b belongs in miadisabelle/miadisabelle's mapping, not jgwill/jgwill's",
      "only a meta hub registers owners; jgwill/jgwill is an owner hub",
      "repository:miadisabelle/b consumes repository:jgwill/a speaks for miadisabelle's repository:miadisabelle/b; it belongs in miadisabelle/miadisabelle's mapping",
      "feature:jgwill/missing#x is a feature of repository:jgwill/missing, which this mapping does not hold",
    ]);
  });

  it("warns when a prototype is read for more than its three core features", () => {
    const r = "repository:jgwill/proto";
    const issues = checkMapping(mapping("jgwill", { repositories: [repo(r)], features: ["a", "b", "c", "d"].map((s) => feature(r, s)) }));
    expect(issues).toEqual([expect.objectContaining({ severity: "warning", message: expect.stringMatching(/4 features; name its 3 core ones/) })]);
  });

  it("warns, not errors, on a capability or repository held in another hub", () => {
    const r = "repository:jgwill/a";
    const issues = checkMapping(
      mapping("jgwill", {
        repositories: [repo(r)],
        features: [feature(r, "x", { realizes: "capability:elsewhere" })],
        relations: [{ from: r, to: "repository:community/origin", type: "forked-from", ...attribution }],
      }),
    );
    expect(issues.map((i) => i.severity)).toEqual(["warning", "warning"]);
  });
});

describe("the meta mapping", () => {
  const meta = mapping("jgwill", {
    manifest: manifest("jgwill", "meta"),
    repositories: [repo("repository:jgwill/hub-repo")],
    capabilities: [
      {
        nodeId: "capability:c",
        name: "C",
        statement: "Does C.",
        status: "clear",
        providedBy: [],
        ...attribution,
      },
    ],
  });
  const owner = mapping("miadisabelle", {
    repositories: [repo("repository:miadisabelle/m"), repo("repository:jgwill/hub-repo", { purpose: "Someone else's reading." })],
    features: [feature("repository:miadisabelle/m", "f", { realizes: "capability:c" }), feature("repository:jgwill/hub-repo", "hijack")],
    capabilities: [{ nodeId: "capability:c", name: "C, again", status: "undefinable", providedBy: [], ...attribution }],
    relations: [
      { from: "repository:miadisabelle/m", to: "repository:jgwill/hub-repo", type: "consumes", ...attribution },
      { from: "repository:jgwill/hub-repo", to: "repository:community/x", type: "forked-from", ...attribution },
      { from: "feature:jgwill/hub-repo#hijack", to: "capability:c", type: "realizes", ...attribution },
      { from: "node:knowledge:svc", to: "capability:c", type: "provides", ...attribution },
    ],
  });

  it("reads each repository from its owner's hub and keeps where every row came from", () => {
    const merged = mergeMappings([
      { hub: "jgwill/jgwill", mapping: meta },
      { hub: "miadisabelle/miadisabelle", mapping: owner },
    ]);
    expect(merged.repositories.map((r) => r.nodeId)).toEqual(["repository:jgwill/hub-repo", "repository:miadisabelle/m"]);
    expect(merged.repositories[0].purpose).toBe("Explores one intent.");
    expect(merged.sources["repository:miadisabelle/m"]).toBe("miadisabelle/miadisabelle");
    expect(merged.sources["capability:c"]).toBe("jgwill/jgwill");
    expect(merged.capabilities[0].name).toBe("C");
    expect(merged.features.map((f) => f.nodeId)).toEqual(["feature:miadisabelle/m#f"]);
    expect(merged.relations.map((r) => r.type)).toEqual(["consumes"]);
    expect(merged.issues.map((i) => i.message)).toEqual([
      "miadisabelle/miadisabelle maps repository:jgwill/hub-repo, which is not its owner's; skipped",
      "miadisabelle/miadisabelle holds feature:jgwill/hub-repo#hijack, but repository:jgwill/hub-repo is not read from miadisabelle/miadisabelle; skipped",
      "capability:c is defined differently in miadisabelle/miadisabelle; kept jgwill/jgwill's",
      "miadisabelle/miadisabelle holds repository:jgwill/hub-repo forked-from repository:community/x, which jgwill/jgwill speaks for; skipped",
      "miadisabelle/miadisabelle holds feature:jgwill/hub-repo#hijack realizes capability:c, which jgwill/jgwill speaks for; skipped",
      "miadisabelle/miadisabelle holds node:knowledge:svc provides capability:c, which the meta hub speaks for; skipped",
    ]);
    expect(checkMapping(merged, { merged: true }).filter((i) => i.severity === "error")).toEqual([]);
  });
});

describe("the wheel and the summary", () => {
  const r = "repository:jgwill/smcraft";
  const m = mapping("jgwill", {
    repositories: [repo(r, { fields: ["research-field:software-engineering"] }), repo("repository:jgwill/other")],
    features: [feature(r, "erd", { realizes: "capability:draw" }), feature("repository:jgwill/other", "draw", { realizes: "capability:draw" })],
    capabilities: [{ nodeId: "capability:draw", name: "Draw", statement: "Draws.", status: "clear", providedBy: [r], ...attribution }],
    relations: [{ from: "repository:jgwill/other", to: r, type: "consumes", ...attribution }],
  });

  it("projects knowledge nodes carrying metadata.kind, a capability west", () => {
    const nodes = toWheelNodes(m);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    expect(byId[r]).toMatchObject({ name: "jgwill/smcraft", type: "knowledge", metadata: { kind: "repository", lifecycle: "prototype" } });
    expect("direction" in byId[r]).toBe(false);
    expect(byId["capability:draw"]).toMatchObject({ type: "knowledge", direction: "west", metadata: { kind: "capability" } });
  });

  it("projects edges with the obligations their kinship names carry, one per directional pair", () => {
    const edges = toWheelEdges(m);
    const byId = Object.fromEntries(edges.map((e) => [e.id, e]));
    expect(byId[`repository:jgwill/other:${r}`]).toMatchObject({ relationship_type: "consumes", obligations: ["human"] });
    expect(byId[`feature:jgwill/smcraft#erd:${r}`]).toMatchObject({ relationship_type: "part-of", obligations: ["land"] });
    expect(byId[`${r}:capability:draw`]).toMatchObject({ relationship_type: "provides" });
    expect(byId[`${r}:research-field:software-engineering`]).toMatchObject({ relationship_type: "field-aligns-with", obligations: [] });
    expect(new Set(edges.map((e) => e.id)).size).toBe(edges.length);
  });

  it("counts a realizes relation as a claim, like a feature's realizes field", () => {
    const viaRelation = mapping("jgwill", {
      repositories: [repo("repository:jgwill/a"), repo("repository:jgwill/b")],
      features: [feature("repository:jgwill/a", "x"), feature("repository:jgwill/b", "y", { realizes: "capability:z" })],
      relations: [{ from: "feature:jgwill/a#x", to: "capability:z", type: "realizes", ...attribution }],
    });
    expect(summarize(viaRelation).shared).toEqual([{ capability: "capability:z", providers: ["repository:jgwill/a", "repository:jgwill/b"] }]);
  });

  it("summarizes, naming a capability two repositories give", () => {
    const s = summarize(m);
    expect(s.byLifecycle.prototype).toBe(2);
    expect(s.byDrift.unobserved).toBe(2);
    expect(s.byRevision.pending).toBe(6);
    expect(s.fields).toEqual({ "research-field:software-engineering": 1 });
    expect(s.shared).toEqual([{ capability: "capability:draw", providers: ["repository:jgwill/other", r] }]);
  });
});
