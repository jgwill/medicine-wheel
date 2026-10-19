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
}

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
