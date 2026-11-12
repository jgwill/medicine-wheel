/**
 * Capabilities, pure: what a git repository provides, read from its own files.
 * Its packages (package.json), its CLIs (a package's `bin`) and its skills
 * (SKILL.md, or a reader written for a file that defines them in code) become
 * `capability` nodes of @medicine-wheel/capabilities, and the repository
 * `provides` each one. A row states what the files say, never what a model
 * guesses: a description over 55 words is not cut, the row is
 * `needs-resolution` without a statement. Every row is pending until a person
 * reads it.
 */

import { checkStatement, type CapabilityFacet } from "@medicine-wheel/capabilities";

export type CapabilityKind = "package" | "cli" | "skill";

export const CAPABILITY_KINDS: readonly CapabilityKind[] = ["package", "cli", "skill"];

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** `capability:<kind>-<slug>`: `@miadi/inquiry-weave` → `capability:package-miadi-inquiry-weave`. */
export function capabilityId(kind: CapabilityKind, name: string): string {
  return `capability:${kind}-${slug(name)}`;
}

/** The kind a capability id names, or undefined for a capability no scan wrote. */
export function kindOf(nodeId: string): CapabilityKind | undefined {
  const m = /^capability:(package|cli|skill)-/.exec(nodeId);
  return m ? (m[1] as CapabilityKind) : undefined;
}

/** One thing a repository's files say it provides. */
export interface Artefact {
  kind: CapabilityKind;
  name: string;
  /** what the files say it is, uncut */
  description?: string;
  /** the file that says so, relative to the repository */
  path: string;
  /** for a CLI: the package that ships it */
  package?: string;
}

/** The fields of a package.json the scan reads. Never throws: an unreadable manifest has no name. */
export function parsePackageJson(text: string): {
  name?: string;
  version?: string;
  description?: string;
  bins: string[];
  /** runtime dependencies (dependencies, peerDependencies, optionalDependencies): name → range */
  dependsOn: Record<string, string>;
  /** `"private": true`: never published, so not offered to others */
  private?: boolean;
} {
  try {
    const p = JSON.parse(text) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    const name = str(p.name);
    const version = str(p.version);
    const description = str(p.description);
    let bins: string[] = [];
    if (typeof p.bin === "string" && name) bins = [name.replace(/^@[^/]+\//, "")];
    else if (p.bin && typeof p.bin === "object") bins = Object.keys(p.bin as Record<string, unknown>);
    const dependsOn: Record<string, string> = {};
    for (const key of ["optionalDependencies", "peerDependencies", "dependencies"]) {
      const deps = p[key];
      if (deps && typeof deps === "object") {
        for (const [dep, range] of Object.entries(deps as Record<string, unknown>)) if (typeof range === "string") dependsOn[dep] = range;
      }
    }
    return { ...(name ? { name } : {}), ...(version ? { version } : {}), ...(description ? { description } : {}), bins, dependsOn, ...(p.private === true ? { private: true } : {}) };
  } catch {
    return { bins: [], dependsOn: {} };
  }
}

/** `name` and `description` from a SKILL.md front matter, plain, quoted or folded (`>`, `|`). */
export function parseSkillFrontMatter(text: string): { name?: string; description?: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const lines = m[1].split(/\r?\n/);
  const field = (key: string): string | undefined => {
    const i = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
    if (i < 0) return undefined;
    let value = lines[i].slice(key.length + 1).trim();
    if (/^[>|][+-]?$/.test(value)) {
      const folded: string[] = [];
      for (const l of lines.slice(i + 1)) {
        if (/^\S/.test(l)) break;
        folded.push(l.trim());
      }
      value = folded.join(" ").trim();
    }
    value = value.replace(/^(["'])([\s\S]*)\1$/, "$2").trim();
    return value || undefined;
  };
  const name = field("name");
  const description = field("description");
  return { ...(name ? { name } : {}), ...(description ? { description } : {}) };
}

/**
 * The folders a repository declares as its packages: `workspaces` of the root
 * package.json (an array, or `{ packages }`), else the `packages:` list of
 * pnpm-workspace.yaml. `.` is the root. Only `dir` and `dir/*` are expanded.
 */
export function workspaceGlobs(rootPackageJson?: string, pnpmWorkspace?: string): string[] {
  try {
    const root = rootPackageJson ? (JSON.parse(rootPackageJson) as { workspaces?: unknown }) : {};
    const w = root.workspaces;
    const list = Array.isArray(w) ? w : w && typeof w === "object" ? (w as { packages?: unknown }).packages : undefined;
    if (Array.isArray(list) && list.length) return ["." as string, ...list.filter((x): x is string => typeof x === "string")];
  } catch {
    // an unreadable root manifest declares nothing
  }
  if (pnpmWorkspace) {
    const block = /(^|\n)packages:\s*\n((?:[ \t]+-[^\n]*\n?)+)/.exec(pnpmWorkspace);
    if (block) {
      return block[2]
        .split("\n")
        .map((l) => l.replace(/^[ \t]+-\s*/, "").replace(/\s+#.*$/, "").replace(/^['"]|['"]$/g, "").trim())
        .filter(Boolean);
    }
  }
  return ["."];
}

/** The package.json paths of a repository's declared packages, among the files it holds. */
export function packageManifests(globs: readonly string[], files: readonly string[]): string[] {
  const manifests = new Set<string>();
  const held = new Set(files);
  for (const glob of globs) {
    const dir = glob.replace(/^\.\//, "").replace(/\/+$/, "");
    if (dir === "." || dir === "") {
      if (held.has("package.json")) manifests.add("package.json");
    } else if (dir.endsWith("/*")) {
      const base = `${dir.slice(0, -2)}/`;
      for (const f of files) {
        const rest = f.startsWith(base) ? f.slice(base.length) : "";
        if (/^[^/]+\/package\.json$/.test(rest)) manifests.add(f);
      }
    } else if (held.has(`${dir}/package.json`)) {
      manifests.add(`${dir}/package.json`);
    }
  }
  return [...manifests].sort();
}

/** The SKILL.md files a repository holds, outside dependencies and archives. */
/**
 * The address a person cites a capability by, in an episode, an issue, an
 * inquiry, a ceremony diary or a circle turn (Episode 568's Capability
 * Registry, the scheme decided by William on 2026-11-01), for the repository
 * that provides it: `miadi-capability://jgwill/medicine-wheel/cli/mw`.
 */
export function capabilityAddress(repository: string, kind: CapabilityKind, name: string): string {
  return `miadi-capability://${repository.replace(/^repository:/, "")}/${kind}/${name}`;
}

/**
 * A capability a repository defines in code rather than in a file of its own,
 * read by a reader written for that repository and that file, never guessed
 * from a name (Episode 568, P15). `read` gets the file's text at the scanned
 * commit and answers what it defines.
 */
export interface CodeReader {
  /** `repository:<owner>/<name>`, compared case-folded */
  repository: string;
  path: string;
  read(text: string): Artefact[];
}

/**
 * The medicine wheel's skills: `cli/skills.ts` defines each one as a
 * `{ name, title, description, target, … }` record, and `mw skill install` /
 * `mwsrv skill install` write it out as a SKILL.md. The statement is the
 * record's own description.
 */
export function medicineWheelSkills(text: string): Artefact[] {
  const out: Artefact[] = [];
  const re = /\{\s*name:\s*'([a-z0-9][a-z0-9-]*)',\s*title:\s*'(?:[^'\\\n]|\\.)*',\s*description:\s*'((?:[^'\\\n]|\\.)*)',\s*target:\s*'(?:cli|srv)'/g;
  for (const m of text.matchAll(re)) {
    out.push({ kind: "skill", name: m[1]!, description: m[2]!.replace(/\\(.)/g, "$1"), path: "cli/skills.ts" });
  }
  return out;
}

/** The readers written so far, one per repository file that defines capabilities in code. */
export const CODE_READERS: readonly CodeReader[] = [
  { repository: "repository:jgwill/medicine-wheel", path: "cli/skills.ts", read: medicineWheelSkills },
];

export function skillFiles(files: readonly string[]): string[] {
  return files
    .filter((f) => /(^|\/)SKILL\.md$/.test(f))
    .filter((f) => !/(^|\/)(node_modules|archives?|archived-[^/]*|dist|\.next)\//.test(f))
    .sort();
}

export interface CapabilityRowContext {
  /** `repository:<owner>/<name>` */
  repository: string;
  /** the commit the files were read at */
  commit: string;
  observedBy: string;
  /** ISO 8601 */
  observedAt: string;
}

/**
 * Capability rows for one repository. One row per id: two files naming the
 * same skill are one capability with both files as its grounding.
 */
export function capabilityRows(artefacts: readonly Artefact[], ctx: CapabilityRowContext): CapabilityFacet[] {
  const where = `${ctx.repository.replace(/^repository:/, "")}@${ctx.commit.slice(0, 12)}`;
  const rows = new Map<string, CapabilityFacet>();
  for (const a of artefacts) {
    const nodeId = capabilityId(a.kind, a.name);
    const grounding = `${where}:${a.path}`;
    const existing = rows.get(nodeId);
    if (existing) {
      if (!existing.grounding.includes(grounding)) existing.grounding.push(grounding);
      continue;
    }
    const fits = a.description ? checkStatement(a.description).fits : false;
    rows.set(nodeId, {
      nodeId,
      name: a.name,
      ...(fits ? { statement: a.description } : {}),
      status: fits ? "clear" : "needs-resolution",
      providedBy: [ctx.repository],
      statedBy: ctx.observedBy,
      statedAt: ctx.observedAt,
      grounding: [grounding],
      revision: "pending",
    });
  }
  return [...rows.values()];
}

/**
 * Rows from several repositories as one inventory: a capability two
 * repositories provide is one row that both provide, with both files as its
 * grounding. The first row read keeps its name and statement.
 */
export function mergeCapabilityRows(rows: readonly CapabilityFacet[]): CapabilityFacet[] {
  const merged = new Map<string, CapabilityFacet>();
  for (const row of rows) {
    const existing = merged.get(row.nodeId);
    if (!existing) {
      merged.set(row.nodeId, { ...row, providedBy: [...row.providedBy], grounding: [...row.grounding] });
      continue;
    }
    for (const p of row.providedBy) if (!existing.providedBy.includes(p)) existing.providedBy.push(p);
    for (const g of row.grounding) if (!existing.grounding.includes(g)) existing.grounding.push(g);
  }
  return [...merged.values()].sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0));
}

/** One `provides` edge: a repository provides a capability, said by whoever said the capability. */
export interface ProvidesEdge {
  from: string;
  to: string;
  type: "provides";
  statedBy: string;
  statedAt: string;
  grounding: string[];
  revision: CapabilityFacet["revision"];
}

/** The `provides` edges a set of capability rows holds, one per provider. */
export function providesEdges(capabilities: readonly CapabilityFacet[]): ProvidesEdge[] {
  return capabilities.flatMap((c) =>
    c.providedBy.map((from) => ({
      from,
      to: c.nodeId,
      type: "provides" as const,
      statedBy: c.statedBy,
      statedAt: c.statedAt,
      grounding: c.grounding,
      revision: c.revision,
    })),
  );
}

/** The capabilities a repository provides, matched case-folded, by kind then id. */
export function capabilitiesOf(repository: string, capabilities: readonly CapabilityFacet[]): CapabilityFacet[] {
  const id = (repository.startsWith("repository:") ? repository : `repository:${repository}`).toLowerCase();
  return capabilities.filter((c) => c.providedBy.some((p) => p.toLowerCase() === id));
}
