/**
 * Facet types for @medicine-wheel/developer-repository-mapping.
 *
 * A repository mapping is how an owner says what each of their repositories
 * is: what it has done, what it might do, which fields of study it stands in,
 * whether it is a prototype or something distributed and maintained, which
 * features it holds and how it relates to the other repositories. It lives as
 * JSONL in `<owner>/<owner>/.miadi/repository-mapping/` and is read by tools,
 * not only by people.
 *
 * Relational here means kinship and accountability between repositories: a
 * fork carries an obligation to where it came from, a prototype stays the
 * place an intent was first seen after it grows into an implementation. The
 * entity-relationship drawing in `rispecs/developer-suite/repository-mapping/`
 * is how those relations are stored, not what they mean.
 *
 * Every row carries `Attribution` from `@medicine-wheel/capabilities`: who
 * wrote it, when, from what evidence, and whether a person has read it since.
 */

import type { DeveloperRelation } from '@medicine-wheel/ontology-core';
import type {
  Attribution,
  CapabilityFacet,
  NodeId,
  StatementStatus,
} from '@medicine-wheel/capabilities';

/**
 * What kind of thing a repository is, as its owner's mapping declares it.
 *
 * - `unclassified` — not read yet.
 * - `prototype` — explores an intent; its value is what it shows, not that it runs.
 * - `implementation` — a concrete build of an intent, not (yet) distributed.
 * - `maintained` — distributed (npm, PyPI, apt, a deployed service) and kept current.
 * - `archived` — ended by its owner.
 *
 * How recently anyone committed is a separate reading ({@link ActivityClass}),
 * observed from git, never declared.
 */
export type Lifecycle = 'unclassified' | 'prototype' | 'implementation' | 'maintained' | 'archived';

/**
 * The events that move a repository between lifecycle states.
 *
 * `concretize` is the move from what a prototype explored to a concrete
 * implementation **in the same repository**. When the intent continues in a
 * different repository, the prototype keeps its state and a `grew-into`
 * relation names where it went.
 */
export type LifecycleEvent = 'explore' | 'implement' | 'concretize' | 'release' | 'archive' | 'reopen';

/** Whose hands a repository is in. */
export type Origin = 'own' | 'agent' | 'community-fork';

/**
 * How recently a repository was committed to, relative to when it was read.
 * `empty` — no commits at all on the branch read.
 */
export type ActivityClass = 'active' | 'quiet' | 'dormant' | 'empty';

/**
 * A declared lifecycle compared with what git shows.
 *
 * - `converged` — the declaration and the reading agree.
 * - `drifted` — they disagree: 'maintained' with no commit in a year, 'archived' with commits this season.
 * - `unobserved` — declared, never read from git.
 * - `undeclared` — read from git, never classified.
 *
 * The comparison is the one `@medicine-wheel/infra`'s `reconcile` makes for
 * machines. The type is not reused: `unrealized` reads wrong for a repository
 * that simply has not been read yet.
 */
export type LifecycleDrift = 'converged' | 'drifted' | 'unobserved' | 'undeclared';

/**
 * A reading of a repository's git history, taken at a moment, by someone.
 * Commits are counted on the branch that was checked out.
 */
export interface ActivityReading {
  observedBy: string;
  /** ISO 8601. Also the reference time `classifyActivity` measures from. */
  observedAt: string;
  commits: number;
  commitsLast90Days: number;
  firstCommitAt?: string;
  lastCommitAt?: string;
  tags: number;
  branch?: string;
  head?: string;
}

/** A repository. Annotates a `RelationalNode` of type `'knowledge'` (`metadata.kind: 'repository'`). */
export interface RepositoryFacet extends Attribution {
  /** `repository:<owner>/<name>` */
  nodeId: NodeId;
  origin: Origin;
  lifecycle: Lifecycle;
  /** What it is and has done. At most 55 words. Required when `status` is `clear` or `unclear`. */
  purpose?: string;
  /** What it might do. At most 55 words. */
  horizon?: string;
  /** The status of `purpose`. */
  status: StatementStatus;
  /** `research-field:<slug>` node ids. */
  fields: NodeId[];
  /** `prototype:<slug>` node ids — the Miadi prototype seam's nodes, which hold the public and editing addresses. */
  prototypes: NodeId[];
  /** The `human` or `agent` node of whoever holds it, when the wheel knows them. */
  holder?: NodeId;
  /** The latest git reading. */
  observed?: ActivityReading;
}

/** A feature observed in one repository. Annotates a `knowledge` node (`metadata.kind: 'feature'`). */
export interface FeatureFacet extends Attribution {
  /** `feature:<owner>/<name>#<slug>` */
  nodeId: NodeId;
  /** → `RepositoryFacet.nodeId` */
  repository: NodeId;
  name: string;
  /** At most 55 words. Required when `status` is `clear` or `unclear`. */
  statement?: string;
  status: StatementStatus;
  /** → `CapabilityFacet.nodeId` */
  realizes?: NodeId;
}

/** The relation names a mapping may write. */
export type DeveloperEdgeName = DeveloperRelation['relationship_type'];

/** One relation between two nodes of a mapping (or of another owner's). */
export interface RelationRow extends Attribution {
  from: NodeId;
  to: NodeId;
  type: DeveloperEdgeName;
  /** Why the two are related. At most 55 words. */
  description?: string;
}

/** An owner hub a meta hub reads from. Only a `meta` manifest has these. */
export interface OwnerRegistration {
  /** GitHub login: 'miadisabelle' */
  owner: string;
  /** '<owner>/<owner>' */
  hub: string;
  /**
   * Where the hub's mapping folder is read from: a local path (relative to the
   * meta hub's mapping folder) or an https URL of the folder. Absent means
   * GitHub, `https://raw.githubusercontent.com/<hub>/HEAD/.miadi/repository-mapping/`.
   */
  source?: string;
  /** The `human` or `agent` node of the owner, when the wheel knows them. */
  holder?: NodeId;
  registeredBy: string;
  registeredAt: string;
}

/** `manifest.json` — what a mapping folder is. */
export interface MappingManifest {
  schema: 'medicine-wheel/repository-mapping';
  version: 1;
  owner: string;
  /** '<owner>/<owner>' */
  hub: string;
  /** `owner` maps its owner's repositories. `meta` does that too, and reads the hubs it registers. */
  kind: 'owner' | 'meta';
  description?: string;
}

/** One mapping folder, read. */
export interface RepositoryMapping {
  manifest: MappingManifest;
  repositories: RepositoryFacet[];
  features: FeatureFacet[];
  capabilities: CapabilityFacet[];
  relations: RelationRow[];
  owners: OwnerRegistration[];
}

/** Something a reader of a mapping should know: an error stops a writer, a warning does not. */
export interface MappingIssue {
  severity: 'error' | 'warning';
  /** The file the row is in, or the hub it came from. */
  file?: string;
  /** 1-based line in a JSONL file. */
  line?: number;
  nodeId?: string;
  message: string;
}

/** Where a mapping folder sits inside an owner hub. */
export const MAPPING_DIR = '.miadi/repository-mapping';

export const MAPPING_FILES = {
  manifest: 'manifest.json',
  repositories: 'repositories.jsonl',
  features: 'features.jsonl',
  capabilities: 'capabilities.jsonl',
  relations: 'relations.jsonl',
  owners: 'owners.jsonl',
} as const;

export const MAPPING_SCHEMA = 'medicine-wheel/repository-mapping' as const;

/** How many features a prototype is read for: its three core ones. */
export const PROTOTYPE_CORE_FEATURES = 3;
