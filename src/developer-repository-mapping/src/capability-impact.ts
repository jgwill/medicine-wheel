// What a version bump touches, pure. The scan reads each package's version
// and the ranges it declares on other packages it maps; a `consumes` edge
// joins a package to each first-party package it depends on, across
// repositories. `impactOf` answers, for one package: what it consumes
// (upstream), who consumes it, directly and through others (downstream), and
// with a bump, which direct consumers' ranges stop reaching the new version.
// A range published with `workspace:*` pins the exact version, so its
// consumer is released again after any bump: the drift
// verify-published-deps reported when hooks-interpreter moved to 0.7.

import { z } from "zod";

export const PackageReadingSchema = z
  .object({
    /** `capability:package-…` */
    capability: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1).optional(),
    repository: z.string().min(1),
    path: z.string().min(1),
    commit: z.string().min(1),
    /** runtime dependencies as declared (dependencies, peer, optional): name → range */
    dependsOn: z.record(z.string()),
    /** the commands this package ships */
    bins: z.array(z.string().min(1)).optional(),
    /** never published: read for what consumes what, not listed as a capability */
    private: z.boolean().optional(),
  })
  .strict();

export type PackageReading = z.infer<typeof PackageReadingSchema>;

export interface ConsumesEdge {
  /** the consuming package's capability */
  from: string;
  /** the consumed package's capability */
  to: string;
  type: "consumes";
  fromName: string;
  toName: string;
  /** the repository of the consuming reading */
  fromRepository: string;
  /** the repository of the consumed reading */
  toRepository: string;
  /** the range `from` declares on `to` */
  range: string;
  /**
   * Several repositories hold a package of that name (a fork and its upstream)
   * and none is the consumer's own: the edge is drawn to each, and none of
   * them can be said to be the one installed.
   */
  ambiguous?: true;
}

/** One reading per repository and package name: a fork and its upstream are two readings. */
export const readingKey = (p: Pick<PackageReading, "repository" | "name">): string => `${p.repository.toLowerCase()}|${p.name}`;

interface ResolvedEdge {
  fromKey: string;
  toKey: string;
  edge: ConsumesEdge;
}

/**
 * A dependency is the package of that name in the consumer's own repository,
 * else the only repository that holds one, else each of them, marked ambiguous.
 */
function resolveEdges(packages: readonly PackageReading[]): ResolvedEdge[] {
  const byName = new Map<string, PackageReading[]>();
  for (const p of packages) byName.set(p.name, [...(byName.get(p.name) ?? []), p]);
  return packages.flatMap((p) =>
    Object.entries(p.dependsOn).flatMap(([name, range]) => {
      if (name === p.name) return [];
      const candidates = byName.get(name) ?? [];
      const own = candidates.find((c) => c.repository.toLowerCase() === p.repository.toLowerCase());
      const targets = own ? [own] : candidates;
      return targets.map((to) => ({
        fromKey: readingKey(p),
        toKey: readingKey(to),
        edge: {
          from: p.capability,
          to: to.capability,
          type: "consumes" as const,
          fromName: p.name,
          toName: to.name,
          fromRepository: p.repository,
          toRepository: to.repository,
          range,
          ...(targets.length > 1 ? { ambiguous: true as const } : {}),
        },
      }));
    }),
  );
}

/** `consumes` edges between the packages read, first-party only, each naming the repositories of both readings. */
export function consumesEdges(packages: readonly PackageReading[]): ConsumesEdge[] {
  return resolveEdges(packages).map((r) => r.edge);
}

export type BumpLevel = "major" | "minor" | "patch";

type Triple = [number, number, number];

function parseVersion(v: string | undefined): Triple | undefined {
  const m = v ? /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/.exec(v.trim()) : null;
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : undefined;
}

const cmp = (a: Triple, b: Triple) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

export function bumpVersion(version: string, level: BumpLevel): string | undefined {
  const v = parseVersion(version);
  if (!v) return undefined;
  if (level === "major") return `${v[0] + 1}.0.0`;
  if (level === "minor") return `${v[0]}.${v[1] + 1}.0`;
  return `${v[0]}.${v[1]}.${v[2] + 1}`;
}

/**
 * Whether `version` satisfies `range`, for the forms first-party manifests
 * use: exact, `^`, `~`, `>=`, `*`/`latest`/empty, and pnpm's `workspace:`
 * forms, read as pnpm publishes them against `published` (the consumed
 * package's version when the consumer was released). Undefined for anything
 * else (`||`, `<`, `file:`, git URLs): read it by hand.
 */
export function satisfies(version: string, range: string, published?: string): boolean | undefined {
  const r = range.trim();
  if (r.startsWith("workspace:")) {
    const form = r.slice("workspace:".length);
    if (!published) return undefined;
    if (form === "*" || form === "") return satisfies(version, published);
    if (form === "^" || form === "~") return satisfies(version, `${form}${published}`);
    return satisfies(version, form);
  }
  if (r === "*" || r === "" || r === "latest" || r === "x") return true;
  const v = parseVersion(version);
  if (!v) return undefined;
  if (/^\^/.test(r)) {
    const base = parseVersion(r.slice(1));
    if (!base) return undefined;
    if (cmp(v, base) < 0) return false;
    if (base[0] > 0) return v[0] === base[0];
    if (base[1] > 0) return v[0] === 0 && v[1] === base[1];
    return v[0] === 0 && v[1] === 0 && v[2] === base[2];
  }
  if (/^~/.test(r)) {
    const base = parseVersion(r.slice(1));
    return base ? cmp(v, base) >= 0 && v[0] === base[0] && v[1] === base[1] : undefined;
  }
  if (/^>=/.test(r)) {
    const base = parseVersion(r.slice(2));
    return base ? cmp(v, base) >= 0 : undefined;
  }
  if (/^\d/.test(r) && !/[\s|<>]/.test(r)) {
    const base = parseVersion(r);
    return base ? cmp(v, base) === 0 : undefined;
  }
  return undefined;
}

export interface ImpactLink {
  name: string;
  capability: string;
  repository: string;
  version?: string;
  /** the range the consumer declares (downstream) or this package declares (upstream) */
  range: string;
}

export interface ImpactConsumer extends ImpactLink {
  /** 1 for a direct consumer, 2 for a consumer of a consumer, … */
  depth: number;
  /** the consumer it is reached through, from depth 2 */
  via?: string;
  /** with a bump, depth 1: whether its range reaches the new version */
  accepts?: boolean;
  /** with a bump: what the consumer needs */
  action?: string;
}

export interface ImpactAnswer {
  package: { name: string; capability: string; version?: string; repository: string };
  bump?: { level: BumpLevel; from: string; to: string };
  /** upstream: the first-party packages it consumes */
  consumes: ImpactLink[];
  /** downstream: who consumes it, directly or through others */
  consumers: ImpactConsumer[];
}

/**
 * The impact of a package, found by name (`@miadi/x`) or capability id;
 * undefined when no reading names it. With `repository`, the reading of that
 * repository: a fork and its upstream each answer for their own package.
 */
export function impactOf(packageOrCapability: string, packages: readonly PackageReading[], bump?: BumpLevel, options: { repository?: string } = {}): ImpactAnswer | undefined {
  const wanted = options.repository?.toLowerCase();
  const target = packages.find((p) => (p.name === packageOrCapability || p.capability === packageOrCapability) && (!wanted || p.repository.toLowerCase() === wanted));
  if (!target) return undefined;
  const edges = resolveEdges(packages);
  const byKey = new Map(packages.map((p) => [readingKey(p), p]));
  const targetKey = readingKey(target);
  const to = bump && target.version ? bumpVersion(target.version, bump) : undefined;

  const consumes = edges
    .filter((e) => e.fromKey === targetKey)
    .map(({ toKey, edge }) => {
      const p = byKey.get(toKey)!;
      return { name: p.name, capability: p.capability, repository: p.repository, ...(p.version ? { version: p.version } : {}), range: edge.range };
    });

  const consumers: ImpactConsumer[] = [];
  const seen = new Set<string>([targetKey]);
  let frontier: { key: string }[] = [{ key: targetKey }];
  for (let depth = 1; frontier.length; depth++) {
    const next: { key: string }[] = [];
    for (const { key } of frontier) {
      for (const { fromKey, edge: e } of edges.filter((x) => x.toKey === key)) {
        if (seen.has(fromKey)) continue;
        seen.add(fromKey);
        const p = byKey.get(fromKey)!;
        const link: ImpactConsumer = {
          name: p.name,
          capability: p.capability,
          repository: p.repository,
          ...(p.version ? { version: p.version } : {}),
          range: e.range,
          depth,
          ...(depth > 1 ? { via: byKey.get(key)!.name } : {}),
        };
        if (to && target.version) {
          if (depth === 1) {
            const accepts = satisfies(to, e.range, target.version);
            if (accepts !== undefined) link.accepts = accepts;
            link.action =
              accepts === true
                ? `${e.range} already reaches ${to}`
                : e.range.startsWith("workspace:")
                  ? `release ${p.name} again: ${e.range} is published as ${e.range === "workspace:*" ? target.version : `${e.range.slice(10)}${target.version}`}, which does not reach ${to}`
                  : accepts === false
                    ? `widen ${e.range} to reach ${to}, then release ${p.name}`
                    : `read ${e.range} by hand`;
          } else {
            link.action = `downstream through ${link.via}`;
          }
        }
        consumers.push(link);
        next.push({ key: fromKey });
      }
    }
    frontier = next;
  }
  consumers.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));

  return {
    package: { name: target.name, capability: target.capability, ...(target.version ? { version: target.version } : {}), repository: target.repository },
    ...(to && bump && target.version ? { bump: { level: bump, from: target.version, to } } : {}),
    consumes,
    consumers,
  };
}
