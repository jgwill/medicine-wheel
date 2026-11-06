/**
 * @medicine-wheel/ontology-core — Media Plan
 *
 * A media plan is what a slide deck or a video intends, kept before anything
 * renders: an outline for slides, producer notes for video. It is the point in
 * a production where a person, a talking circle or a decision model can still
 * change what gets made, at no cost of rendering.
 *
 * Like a shot or an edit brief, it rides a `knowledge` node with a
 * `metadata.kind` discriminator (`ProductionEntityKind`), and the NodeType union
 * stays closed. There is one node per version, since each version is a separate
 * card in the tool that made it. The plan's text stays in the episode's files,
 * and the node points at them, so what is read and what is on the wheel can't
 * drift apart.
 *
 * It is not a `plan_perspective`. That record is Miette's reading of a Claude
 * Code session's plan, keyed by session. A media plan is a plan for a piece of
 * media, keyed by its card.
 *
 * Edges: `holds-plan` (notebook → plan), `seeded-from` (plan → the plan it was
 * started from), both governed in `kinship.ts`. A ceremony held about one
 * version names its node id in `subject_id`.
 *
 * Name: Guillaume, 2026-11-05. Ref: jgwill/medicine-wheel#173, jgwill/Miadi#940.
 */

import { z } from 'zod';

/** The `metadata.kind` a media plan's `knowledge` node carries. */
export const MEDIA_PLAN_KIND = 'media-plan' as const;

/** Node ids for media plans: `media-plan:<card uuid>`. */
export const MEDIA_PLAN_NODE_PREFIX = 'media-plan:' as const;

/** The node id of one version of a plan, from the card that holds it. */
export function mediaPlanNodeId(cardId: string): string {
  return cardId.startsWith(MEDIA_PLAN_NODE_PREFIX) ? cardId : `${MEDIA_PLAN_NODE_PREFIX}${cardId}`;
}

/** The card a media plan's node id names, or undefined for any other node. */
export function mediaPlanCardId(nodeId: string): string | undefined {
  return nodeId.startsWith(MEDIA_PLAN_NODE_PREFIX) ? nodeId.slice(MEDIA_PLAN_NODE_PREFIX.length) : undefined;
}

/**
 * What has happened to a plan since it was kept. `paused` waits for someone,
 * `sent_on` has gone to render, `rendered` became a finished artifact, and
 * `released` was let go without one.
 */
export const MEDIA_PLAN_STATES = ['paused', 'sent_on', 'rendered', 'released'] as const;
export type MediaPlanState = (typeof MEDIA_PLAN_STATES)[number];

/** The `metadata` of a media plan's node. A producer may add keys of its own. */
export const MediaPlanMetadataSchema = z
  .object({
    kind: z.literal(MEDIA_PLAN_KIND),
    /** The card in the tool that made it. Each version is another card. */
    artifact_id: z.string().min(1),
    /** Its place in a version chain: 1, 2, 3 within the notebook's folder. */
    version: z.number().int().positive(),
    /** Containment, as `GET /api/nodes?kind=media-plan&parent_id=<node>` reads it. */
    parent_id: z.string().min(1),
    /** The episode's folder name. */
    episode_path: z.string().min(1),
    /** The plan's file, relative to the episode's folder. The file is the record. */
    path: z.string().min(1),
    state: z.enum(MEDIA_PLAN_STATES),
    notebook_id: z.string().optional(),
    /** What the plan is for, such as "Slide Deck" or "Video Overview". */
    family: z.string().optional(),
    item_count: z.number().int().nonnegative().optional(),
    plan_sha256: z.string().optional(),
    saved_at: z.string().optional(),
    /** The capability that made it, as a `miadi-capability:` address or a tool's name. */
    made_with: z.string().optional(),
    /** The portable reference. */
    address: z.string().optional(),
    proceeded_at: z.string().optional(),
    feedback_sent: z.boolean().optional(),
    feedback_path: z.string().optional(),
    /** What it became. A rendered artifact has no node of its own. */
    rendered_as: z.object({ artifact_id: z.string().optional(), title: z.string().optional() }).optional(),
  })
  .passthrough();

export type MediaPlanMetadata = z.infer<typeof MediaPlanMetadataSchema>;

/** True when a node's `metadata` reads as a media plan's. */
export function isMediaPlanMetadata(metadata: unknown): metadata is MediaPlanMetadata {
  return MediaPlanMetadataSchema.safeParse(metadata).success;
}
