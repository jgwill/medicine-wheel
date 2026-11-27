/**
 * Facet types for @medicine-wheel/capabilities.
 *
 * A capability is something the platform can do for someone — publish a
 * prototype to an episode, register a service, follow a wheel's events. It
 * rides a `knowledge` node carrying `metadata.kind: 'capability'`
 * (`DEVELOPER_ENTITY_BINDING` in `ontology-core`), and this facet holds its
 * specifics keyed by node id, the way `@medicine-wheel/infra` holds a
 * service's.
 *
 * Every statement here was written by someone at some time, and most of them
 * will be written by a model reading repositories. A model's reading is
 * assumed biased until a person has read it, so every row says who wrote it,
 * when, what it read, and whether anyone has revised it since.
 */

import type { RelationalNode } from '@medicine-wheel/ontology-core';
import type { MetisHold } from '@medicine-wheel/infra';

/** The id of the `RelationalNode` a facet annotates. */
export type NodeId = RelationalNode['id'];

/**
 * Whether a statement says what a thing is, in words a reader can act on.
 *
 * - `clear` — the statement fits the word limit and the evidence read supports it.
 * - `unclear` — a statement exists, but the evidence read does not settle it
 *   (a README that contradicts the code, a name that promises more than is there).
 * - `undefinable` — what is there cannot be stated as one thing: an empty fork,
 *   a scratch folder, a snapshot of someone else's work.
 * - `needs-resolution` — a statement was attempted and did not fit the limit,
 *   or two sources disagree and a person has to settle which one holds.
 */
export type StatementStatus = 'clear' | 'unclear' | 'undefinable' | 'needs-resolution';

/**
 * Where a row stands with the people it describes.
 *
 * - `pending` — written, nobody has read it since. Every row a model writes starts here.
 * - `revised` — a later reading corrected it.
 * - `affirmed` — a person read it and stands behind it.
 */
export type RevisionState = 'pending' | 'revised' | 'affirmed';

/**
 * Who wrote a row, when, from what, and who has read it since. Required on
 * every row: a statement with no author and no time is a rumour, the rule
 * `infra`'s `ObservedState` keeps for machine readings.
 */
export interface Attribution {
  /** A model id ('claude-opus-5-5'), an agent seat or a person. */
  statedBy: string;
  /** ISO 8601. */
  statedAt: string;
  /** What was read: file paths, commits, URLs, owner/repo#n. At least one. */
  grounding: string[];
  revision: RevisionState;
  /** Required once `revision` is `revised` or `affirmed`. */
  revisedBy?: string;
  /** Required once `revision` is `revised` or `affirmed`. */
  revisedAt?: string;
}

/**
 * Where a capability stands in its life. `StatementStatus` is about the words
 * a row holds; this is about the thing they describe.
 *
 * - `specified` — a specification describes it, and no code provides it yet.
 * - `prototype` — code explores it; nothing is meant to depend on it yet.
 * - `implementation` — code builds it toward a release.
 * - `released` — a version someone can install or call.
 * - `retired` — no longer offered: deprecated or removed. Its record stays for
 *   the episodes and people that used it.
 *
 * `prototype` and `implementation` are the repository lifecycle's own words
 * (`@medicine-wheel/developer-repository-mapping`).
 */
export type CapabilityStage = 'specified' | 'prototype' | 'implementation' | 'released' | 'retired';

/** What a capability achieves, as someone said it. Never the scan's to say. */
export interface CapabilityAchieves {
  /**
   * What a person or an agent can do, or has, because the capability exists.
   * At most {@link STATEMENT_WORD_LIMIT} words. The row's `statement` says what
   * the capability is; this says what it is for.
   */
  statement: string;
  /** A person or an agent seat. */
  statedBy: string;
  /** ISO 8601. */
  statedAt: string;
}

/** Where a capability stands, who said so, when, and from what. */
export interface CapabilityStageReading {
  stage: CapabilityStage;
  statedBy: string;
  /** ISO 8601. */
  statedAt: string;
  /** What shows the stage: a specification, a commit, `npm:<package>@<version>`, `owner/repo#n`. At least one. */
  grounding: string[];
}

/**
 * Where a capability runs, who deploys it, where its code is written, and how a
 * change reaches it, as someone said it. Never the scan's to say.
 *
 * `authoredIn` is set when the code is written somewhere other than the
 * repository that holds it, a v0 project for example: the copy in the
 * repository is replaced at the next import, so an edit made there is lost.
 * `change` then says what to do instead.
 */
export interface CapabilityHosting {
  /** Where people open it or services call it: `https://` or `http://` addresses. */
  urls?: string[];
  /** Who or what deploys it: 'v0, on Vercel', 'npm publish from this repository'. */
  deployedBy: string;
  /** Where its code is written when that is not this repository: 'v0'. */
  authoredIn?: string;
  /** How a change reaches it, at most {@link STATEMENT_WORD_LIMIT} words. */
  change?: string;
  /** A person or an agent seat. */
  statedBy: string;
  /** ISO 8601. */
  statedAt: string;
  /** What shows it: a file, a URL, `owner/repo#n`. At least one. */
  grounding: string[];
}

/** A platform capability. Annotates a `RelationalNode` of type `'knowledge'`. */
export interface CapabilityFacet extends Attribution {
  /** → `RelationalNode.id`, `capability:<slug>` */
  nodeId: NodeId;
  /** 'Publish a prototype to an episode' */
  name: string;
  /** At most {@link STATEMENT_WORD_LIMIT} words. Required when `status` is `clear` or `unclear`. */
  statement?: string;
  status: StatementStatus;
  /** Repository or service node ids that offer it. */
  providedBy: NodeId[];
  metis?: MetisHold;
  /** What it achieves for someone, and who said so. */
  achieves?: CapabilityAchieves;
  /** Where it stands in its life, and who said so from what. */
  stage?: CapabilityStageReading;
  /** Where its specifications are: `rise://<owner>/<repo>/<path>[@<commit>]`, or an `https://` URL. */
  specifications?: string[];
  /** The issues that track it: `owner/repo#n`. */
  issues?: string[];
  /** Where it runs and how a change reaches it, and who said so. */
  hosting?: CapabilityHosting;
  /** The chronicle episodes that hold it: `miadi-chronicle://<n>`. */
  episodes?: string[];
  /** Revision-addressable Stateloom systems that draw this capability. */
  systems?: string[];
  /** For a plugin, the capability addresses of the components it carries. */
  components?: string[];
  /** For a plugin component, the capability address of its plugin. */
  plugin?: string;
}

/** Every stage, in the order a capability usually lives them. */
export const CAPABILITY_STAGES: readonly CapabilityStage[] = ['specified', 'prototype', 'implementation', 'released', 'retired'];

/**
 * Stages at which no code is expected to provide the capability: not yet
 * (`specified`) or no longer (`retired`). A reader keeps such a row even when
 * the commit it reads holds nothing of that name.
 */
export const STAGES_WITHOUT_CODE: readonly CapabilityStage[] = ['specified', 'retired'];

/**
 * One provider's claim on a capability. It comes from a capability's own
 * `providedBy`, or from a feature that realizes it (`via` names the feature).
 */
export interface CapabilityClaim {
  /** → `CapabilityFacet.nodeId` */
  capability: NodeId;
  /** A repository or service node id. */
  provider: NodeId;
  /** The feature the claim comes from, when it comes from one. */
  via?: NodeId;
}

/**
 * A capability that more than one provider offers. Not a conflict: two
 * repositories giving the same capability are kin to name — one may have
 * grown from the other, or both may be the same intent explored twice.
 */
export interface SharedCapability {
  /** → `CapabilityFacet.nodeId` */
  capability: NodeId;
  /** Distinct, sorted, at least two. */
  providers: NodeId[];
}

/** The word limit for every statement: a capability, a feature, a repository's purpose. */
export const STATEMENT_WORD_LIMIT = 55;
