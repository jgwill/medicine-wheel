/**
 * DEPRECATED ALIAS — `/api/recordings` answers with the same handlers as the
 * canonical `/api/captures` route (capture-vocabulary.spec.md §8, the registry
 * noun ruling).
 *
 * This alias is deliberate strangler design, not leftovers: forgewright's
 * episode-recordings-section branch GETs {MW_API_URL}/api/recordings
 * fail-closed — on any mismatch it returns silent empty enrichment, and
 * nothing may fail quiet. The alias keeps that reader fed until it migrates.
 *
 * Remove when forgewright's fetchRecordingRecords targets /api/captures
 * (coupling point, capture-vocabulary.spec.md).
 */
export { GET, POST } from "../captures/route";
