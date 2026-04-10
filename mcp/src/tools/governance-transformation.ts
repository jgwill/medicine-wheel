/**
 * Governance & Transformation Tools
 * 
 * These tools leverage @medicine-wheel/community-review,
 * @medicine-wheel/consent-lifecycle, and @medicine-wheel/transformation-tracker
 * to manage the relational health and validity of the research process.
 */

import { 
  createReviewCircle, 
  talkingCircle, 
  requestElderValidation,
  seekConsensus
} from "medicine-wheel-community-review";
import { 
  grantConsent,
  renegotiateConsent,
  checkConsentHealth
} from "medicine-wheel-consent-lifecycle";
import { 
  snapshotUnderstanding,
  wilsonValidityCheck,
  logReflection
} from "medicine-wheel-transformation-tracker";
import type { Tool } from "../types.js";
import { store } from "../store.js";

export const governanceTransformationTools: Tool[] = [
  {
    name: "mw_review_circle_open",
    description: "Open a community review circle for an artifact. Initializes in 'gathering' status, awaiting reviewers and talking circle entries.",
    inputSchema: {
      type: "object",
      properties: {
        artifactId: {
          type: "string",
          description: "ID of the artifact (e.g., knowledge node, cycle, chart) to review",
        },
        artifactType: {
          type: "string",
          enum: ["research", "ceremony", "knowledge", "code", "narrative"],
          description: "Type of artifact being reviewed",
        }
      },
      required: ["artifactId", "artifactType"],
    },
    handler: async (args) => {
      try {
        const { artifactId, artifactType } = args;
        const circle = createReviewCircle(artifactId, artifactType as any);
        
        // Persist as a specialized node for UI visibility
        store.createNode({
          id: circle.id,
          type: "knowledge",
          name: `Review Circle: ${artifactId}`,
          description: `Community review for ${artifactType} [${artifactId}]`,
          metadata: {
            is_review_circle: true,
            circle_status: circle.status,
            artifact_id: circle.artifactId,
            artifact_type: circle.artifactType,
            full_circle_state: circle
          },
          created_at: circle.createdAt,
          updated_at: circle.createdAt
        });

        return {
          status: "opened",
          circle_id: circle.id,
          message: "Community review circle initiated.",
          teaching: "Validation comes through community consensus, not individual judgment."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  },
  {
    name: "mw_consent_grant",
    description: "Record the initial granting of relational consent. Transitions from 'pending' to 'granted' and establishes the initial scope.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Unique consent identifier" },
        grantor: { type: "string", description: "Who gave consent" },
        grantee: { type: "string", description: "Who received consent" },
        scopeDescription: { type: "string", description: "Human-readable description of the consent scope" },
        dataTypes: { type: "array", items: { type: "string" }, description: "Types of data covered" },
        purposes: { type: "array", items: { type: "string" }, description: "Consented purposes" }
      },
      required: ["grantor", "grantee", "scopeDescription"],
    },
    handler: async (args) => {
      try {
        const { id, grantor, grantee, scopeDescription, dataTypes = [], purposes = [] } = args;
        
        const record = {
          id: id || `consent:${Date.now()}`,
          grantor,
          grantee,
          scope: {
            description: scopeDescription,
            dataTypes,
            purposes,
            restrictions: []
          },
          state: 'pending',
          ceremonies: [],
          history: [],
          communityLevel: false,
          dependentRelations: [],
          ocapFlags: { compliant: false } as any
        } as any;

        const granted = grantConsent(record);

        store.createNode({
          id: granted.id,
          type: "knowledge",
          name: `Consent: ${grantor} ──▶ ${grantee}`,
          description: scopeDescription,
          metadata: {
            is_consent_record: true,
            consent_state: granted.state,
            full_record: granted
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        return {
          status: "granted",
          consent_id: granted.id,
          message: "Relational consent granted.",
          teaching: "Consent is a relationship, not an event. You are now responsible for its wellbeing."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  },
  {
    name: "mw_snapshot_transformation",
    description: "Capture a snapshot of researcher understanding and perform a Wilson validity audit. Tracks growth, community impact, and relational shifts.",
    inputSchema: {
      type: "object",
      properties: {
        researchCycleId: { type: "string", description: "ID of the research cycle being tracked" },
        understanding: { type: "string", description: "Free-text description of current understanding" },
        direction: { type: "string", enum: ["east", "south", "west", "north"], description: "Current direction alignment" },
        ceremonyPhase: { type: "string", enum: ["opening", "council", "integration", "closure"], description: "Current ceremony phase" },
        keyInsights: { type: "array", items: { type: "string" }, description: "New insights gained" },
        openQuestions: { type: "array", items: { type: "string" }, description: "Remaining open questions" }
      },
      required: ["researchCycleId", "understanding", "direction", "ceremonyPhase"],
    },
    handler: async (args) => {
      try {
        const { researchCycleId, understanding, direction, ceremonyPhase, keyInsights = [], openQuestions = [] } = args;
        
        // Simple log initialization (in real use, we'd load existing log)
        const log = {
          id: `trans:${researchCycleId}`,
          researchCycleId,
          snapshots: [],
          reflections: [],
          communityImpacts: [],
          relationalShifts: [],
          reciprocityLedger: [],
          sevenGenerationScore: 0,
          overallTransformation: 0
        } as any;

        const snapshot = {
          timestamp: new Date().toISOString(),
          direction,
          ceremonyPhase,
          understanding,
          relationsCount: 0, // Should be calculated from store in full implementation
          wilsonAlignment: 0.5,
          keyInsights,
          openQuestions
        };

        const updatedLog = snapshotUnderstanding(log, snapshot as any);
        const validity = wilsonValidityCheck(updatedLog);

        return {
          status: "snapshot_taken",
          wilson_validity: validity,
          overall_valid: validity.overallValid,
          score: validity.score,
          recommendations: validity.recommendations,
          teaching: "If research doesn't change you, you haven't done it right."
        };
      } catch (error) {
        return { status: "error", message: String(error) };
      }
    }
  }
];
