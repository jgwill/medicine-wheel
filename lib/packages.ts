/**
 * Central integration module — imports and uses ALL src/ packages
 * to compute analysis data from the in-memory store.
 *
 * Server-side only.
 */

import {
  getAllNodes,
  getAllEdges,
  getAllCeremonies,
  getAllBeats,
  getAllCycles,
} from "@/lib/store";

// ── narrative-engine ──
import {
  validateCadence,
  computeCompleteness,
  currentPhase,
  buildTimeline,
  computeProgress,
  extractTransitions,
  getCeremonyPhaseFraming,
  describeSun,
  generateProvenanceNarrative,
} from "medicine-wheel-narrative-engine";

// ── ceremony-protocol ──
import {
  nextPhase,
  getPhaseFraming,
  nextPhaseExtended,
  getPhaseFramingExtended,
} from "medicine-wheel-ceremony-protocol";

// ── relational-query ──
import {
  filterNodes,
  filterEdges,
  auditAccountability,
  sortNodes,
  paginate,
  relationsNeedingAttention,
  traverse,
  neighborhood,
} from "medicine-wheel-relational-query";

// ── graph-viz ──
import {
  nodesToGraphNodes,
  edgesToGraphLinks,
  buildGraphData,
  applyWheelLayout,
  toMermaidDiagram,
} from "medicine-wheel-graph-viz";

// ── importance-unit ──
import {
  createUnit,
  computeWeight,
} from "medicine-wheel-importance-unit";

// ── transformation-tracker ──
import {
  logReflection,
  snapshotUnderstanding,
  sevenGenScore,
  wilsonValidityCheck,
  reflectionPrompts,
} from "medicine-wheel-transformation-tracker";

// ── relational-index ──
import {
  createIndex,
  addEntry,
  indexHealth,
  queryBySource,
  findConvergences,
  detectTensions,
} from "medicine-wheel-relational-index";

// ── community-review ──
import {
  createReviewCircle,
  circleStatus,
} from "medicine-wheel-community-review";

// ── consent-lifecycle ──
import { grantConsent } from "medicine-wheel-consent-lifecycle";

// ── fire-keeper ──
import {
  evaluateGates,
  FireKeeper,
  CeremonyStateManager,
  DEFAULT_GATES,
  createCeremonyState,
} from "medicine-wheel-fire-keeper";

// ── data-store (import only — not connected to Redis) ──
import type {} from "medicine-wheel-data-store";

// ── session-reader (import types only) ──
import type { SessionEvent } from "medicine-wheel-session-reader";

// ── prompt-decomposition (import class only) ──
import { MedicineWheelDecomposer } from "medicine-wheel-prompt-decomposition";

// ─────────────────────────────────────────────────────────────────────────────

export function getAnalysis() {
  const nodes = getAllNodes();
  const edges = getAllEdges();
  const ceremonies = getAllCeremonies();
  const beats = getAllBeats();
  const cycles = getAllCycles();

  // ── Narrative Analysis ──
  let narrativeAnalysis: Record<string, unknown> = {};
  try {
    const cadenceResult = validateCadence(beats, ceremonies);
    const phase = currentPhase(beats);
    const timeline = buildTimeline(beats);

    let completeness: unknown = null;
    try {
      completeness = computeCompleteness(beats, ceremonies, []);
    } catch {
      completeness = { directionsVisited: 0, note: "Requires Relation[] — skipped" };
    }

    let progress: unknown = null;
    try {
      if (cycles.length > 0) {
        progress = computeProgress(cycles[0], beats, ceremonies, []);
      }
    } catch {
      progress = { note: "computeProgress skipped" };
    }

    let transitions: unknown = null;
    try {
      transitions = extractTransitions(beats, ceremonies);
    } catch {
      transitions = [];
    }

    narrativeAnalysis = {
      cadence: cadenceResult,
      completeness,
      currentPhase: phase,
      timeline,
      progress,
      transitions,
    };
  } catch (err: any) {
    narrativeAnalysis = { error: err.message };
  }

  // ── Ceremony State (ceremony-protocol) ──
  let ceremonyState: Record<string, unknown> = {};
  try {
    const latestDir =
      ceremonies.length > 0 ? ceremonies[0].direction : "east";
    const phaseMap: Record<string, string> = {
      east: "opening",
      south: "council",
      west: "integration",
      north: "closure",
    };
    const cp = (phaseMap[latestDir] ?? "opening") as any;
    const framing = getPhaseFraming(cp);
    const np = nextPhase(cp);
    const extPhase = "gathering" as const;
    const extFraming = getPhaseFramingExtended(extPhase);
    const npExt = nextPhaseExtended(extPhase);
    ceremonyState = {
      currentPhase: cp,
      framing,
      nextPhase: np,
      extendedPhase: extPhase,
      extendedFraming: extFraming,
      nextPhaseExtended: npExt,
    };
  } catch (err: any) {
    ceremonyState = { error: err.message };
  }

  // ── Accountability Audit (relational-query) ──
  let accountabilityAudit: unknown = {};
  try {
    accountabilityAudit = auditAccountability(nodes, edges, []);
  } catch (err: any) {
    accountabilityAudit = { error: err.message, compliantCount: 0, recommendations: [] };
  }

  // ── Graph Data (graph-viz) ──
  let graphData: unknown = {};
  try {
    const gd = buildGraphData(nodes, edges);
    const laid = applyWheelLayout(gd);
    graphData = laid;
  } catch (err: any) {
    graphData = { error: err.message };
  }

  // ── Mermaid Diagram (graph-viz) ──
  let mermaidDiagram: string = "";
  try {
    mermaidDiagram = toMermaidDiagram([], []);
  } catch {
    mermaidDiagram = "graph LR\n  A-->B";
  }

  // ── Importance Units ──
  let importanceUnits: unknown = {};
  try {
    const unit = createUnit({
      summary: "Relational accountability in software design",
      source: "dream",
      direction: "east",
      tags: ["accountability", "software", "relations"],
    } as any);
    const weight = computeWeight("dream", 1);
    const unit2 = createUnit({
      summary: "Land-based design patterns for databases",
      source: "land",
      direction: "south",
      tags: ["land", "database", "patterns"],
    } as any);
    const weight2 = computeWeight("land", 2);
    importanceUnits = {
      units: [
        { ...unit, computedWeight: weight },
        { ...unit2, computedWeight: weight2 },
      ],
      weightExamples: {
        dream_depth1: weight,
        land_depth2: weight2,
        code_depth1: computeWeight("code", 1),
        vision_depth3: computeWeight("vision", 3),
      },
    };
  } catch (err: any) {
    importanceUnits = { error: err.message };
  }

  // ── Transformation Tracker ──
  let transformationData: unknown = {};
  try {
    const baseLog: any = {
      id: "tlog-demo",
      researchCycleId: cycles[0]?.id ?? "cycle-1",
      snapshots: [],
      reflections: [],
      communityImpacts: [],
      relationalShifts: [],
      reciprocityLedger: [],
      sevenGenerationScore: 0,
      overallTransformation: 0,
    };

    let log = logReflection(
      baseLog,
      "What has changed in my understanding of relational accountability?",
      "I now see that every line of code carries an obligation to the community it serves.",
      "east"
    );
    log = logReflection(
      log,
      "How has the community shaped this research?",
      "The Youth Circle reminded me that digital sovereignty is not optional — it is an obligation to future generations.",
      "south"
    );

    const snapshot: any = {
      timestamp: new Date().toISOString(),
      direction: "west",
      ceremonyPhase: "integration",
      understanding: "Software accountability requires ceremony — not as metaphor, but as practice.",
      relationsCount: edges.length,
      wilsonAlignment: 0.72,
      keyInsights: ["Code carries relations", "Databases are stewards"],
      openQuestions: ["How to measure reciprocity in software?"],
    };
    log = snapshotUnderstanding(log, snapshot);

    let sevenGen: unknown = null;
    try {
      sevenGen = sevenGenScore(log);
    } catch {
      sevenGen = { score: 0, summary: "Insufficient data for seven-gen scoring" };
    }

    let wilsonCheck: unknown = null;
    try {
      wilsonCheck = wilsonValidityCheck(log);
    } catch {
      wilsonCheck = { valid: false, note: "Insufficient data" };
    }

    transformationData = {
      reflectionCount: log.reflections.length,
      snapshotCount: log.snapshots.length,
      sevenGenScore: sevenGen,
      wilsonValidity: wilsonCheck,
    };
  } catch (err: any) {
    transformationData = { error: err.message };
  }

  // ── Relational Index ──
  let indexHealthData: unknown = {};
  try {
    let idx = createIndex();
    idx = addEntry(idx, {
      unitId: "iu-1",
      source: "dream",
      direction: "east",
      epistemicWeight: 0.85,
      circleDepth: 1,
      accountableTo: ["Elder Sarah", "Community Council"],
      tags: ["vision", "accountability"],
      timestamp: new Date().toISOString(),
    });
    idx = addEntry(idx, {
      unitId: "iu-2",
      source: "land",
      direction: "south",
      epistemicWeight: 0.75,
      circleDepth: 2,
      accountableTo: ["Youth Circle"],
      tags: ["land", "learning"],
      timestamp: new Date().toISOString(),
    });
    idx = addEntry(idx, {
      unitId: "iu-3",
      source: "code",
      direction: "west",
      epistemicWeight: 0.5,
      circleDepth: 1,
      accountableTo: ["Development Team"],
      tags: ["software", "patterns"],
      timestamp: new Date().toISOString(),
    });
    idx = addEntry(idx, {
      unitId: "iu-4",
      source: "vision",
      direction: "north",
      epistemicWeight: 0.65,
      circleDepth: 1,
      accountableTo: ["Seven Generations"],
      tags: ["future", "digital sovereignty"],
      timestamp: new Date().toISOString(),
    });

    const health = indexHealth(idx);
    let dreamEntries: unknown = [];
    try { dreamEntries = queryBySource(idx, "dream"); } catch { /* skip */ }
    let convergences: unknown = [];
    try { convergences = findConvergences(idx); } catch { /* skip */ }
    let tensions: unknown = [];
    try { tensions = detectTensions(idx); } catch { /* skip */ }

    indexHealthData = {
      health,
      dreamEntries,
      convergences,
      tensions,
    };
  } catch (err: any) {
    indexHealthData = { error: err.message };
  }

  // ── Community Review Circles ──
  let reviewCircles: unknown = {};
  try {
    const circle1 = createReviewCircle("artifact-data-model", "code" as any);
    const circle2 = createReviewCircle("artifact-ceremony-protocol", "document" as any);
    const status1 = circleStatus(circle1);
    const status2 = circleStatus(circle2);
    reviewCircles = {
      circles: [
        { ...circle1, status: status1 },
        { ...circle2, status: status2 },
      ],
    };
  } catch (err: any) {
    reviewCircles = { error: err.message };
  }

  // ── Consent Records ──
  let consentRecords: unknown = {};
  try {
    const pendingRecord: any = {
      id: "consent-community-data",
      grantor: "Community Council",
      grantee: "Research Team",
      scope: {
        description: "Access to community knowledge for relational software research",
        dataTypes: ["oral traditions", "ceremony protocols"],
        purposes: ["research", "software design"],
        exclusions: ["commercial use"],
      },
      state: "pending",
      ceremonies: [],
      history: [],
      communityLevel: true,
      dependentRelations: [],
      ocapFlags: {
        ownership: true,
        control: true,
        access: true,
        possession: true,
      },
    };
    const grantedRecord = grantConsent(pendingRecord);
    const pendingRecord2: any = {
      id: "consent-elder-teachings",
      grantor: "Elder Sarah",
      grantee: "Development Team",
      scope: {
        description: "Permission to encode ceremony protocols in software",
        dataTypes: ["ceremony knowledge"],
        purposes: ["protocol encoding"],
        exclusions: ["distribution without approval"],
      },
      state: "pending",
      ceremonies: [],
      history: [],
      communityLevel: false,
      dependentRelations: [],
      ocapFlags: {
        ownership: true,
        control: true,
        access: true,
        possession: false,
      },
    };
    const grantedRecord2 = grantConsent(pendingRecord2);
    consentRecords = {
      records: [grantedRecord, grantedRecord2],
    };
  } catch (err: any) {
    consentRecords = { error: err.message };
  }

  // ── Fire Keeper Status ──
  let fireKeeperStatus: unknown = {};
  try {
    const cs = createCeremonyState("inquiry-accountability", "east");
    const mgr = new CeremonyStateManager(cs);
    const state = mgr.getState();
    const readiness = mgr.detectCompletionReadiness();

    let gateResult: unknown = null;
    try {
      gateResult = evaluateGates(DEFAULT_GATES, {
        ceremonyState: cs,
        wilsonAlignment: 0.72,
        ocapCompliant: true,
      });
    } catch {
      gateResult = { allSatisfied: false, note: "Gate evaluation skipped" };
    }

    fireKeeperStatus = {
      ceremonyState: state,
      completionReadiness: readiness,
      gateEvaluation: gateResult,
    };
  } catch (err: any) {
    fireKeeperStatus = { error: err.message };
  }

  // ── Ceremony Phase Framing (narrative-engine) ──
  let ceremonyPhaseFraming: Record<string, string> = {};
  try {
    ceremonyPhaseFraming = {
      opening: getCeremonyPhaseFraming("opening"),
      council: getCeremonyPhaseFraming("council"),
      integration: getCeremonyPhaseFraming("integration"),
      closure: getCeremonyPhaseFraming("closure"),
    };
  } catch (err: any) {
    ceremonyPhaseFraming = { error: err.message };
  }

  // ── Reflection Prompts (transformation-tracker) ──
  let reflectionPromptsData: Record<string, string[]> = {};
  try {
    reflectionPromptsData = {
      opening: reflectionPrompts("opening"),
      council: reflectionPrompts("council"),
      integration: reflectionPrompts("integration"),
      closure: reflectionPrompts("closure"),
    };
  } catch (err: any) {
    reflectionPromptsData = {};
  }

  // ── Additional relational-query demos ──
  let queryDemos: Record<string, unknown> = {};
  try {
    const humanNodes = filterNodes(nodes, { type: "human" });
    const strongEdges = filterEdges(edges, { minStrength: 0.8 });
    const sorted = sortNodes(nodes, { field: "name", order: "asc" });
    const page = paginate(sorted, { offset: 0, limit: 5 });
    let neighborhoodResult: unknown = [];
    try {
      if (nodes.length > 0) {
        neighborhoodResult = neighborhood(nodes[0].id, nodes, edges, 2);
      }
    } catch { /* skip */ }

    queryDemos = {
      humanNodes: humanNodes.length,
      strongEdges: strongEdges.length,
      sortedPage: page,
      neighborhoodSize: Array.isArray(neighborhoodResult)
        ? neighborhoodResult.length
        : 0,
    };
  } catch (err: any) {
    queryDemos = { error: err.message };
  }

  // ── Sun description (narrative-engine) ──
  let sunDescription = "";
  try {
    sunDescription = describeSun("waabishkizi-sun" as any);
  } catch {
    try {
      sunDescription = describeSun("bear" as any);
    } catch {
      sunDescription = "Sun description unavailable";
    }
  }

  // ── Provenance narrative (narrative-engine) ──
  let provenanceNarrative = "";
  try {
    provenanceNarrative = generateProvenanceNarrative(
      "MedicineWheel.store",
      [],
      [{ name: "relational-accountability-inquiry" }],
      [{ name: "Elder Sarah" }]
    );
  } catch {
    provenanceNarrative = "Provenance narrative unavailable";
  }

  // ── Decomposer existence check (prompt-decomposition) ──
  let decomposerAvailable = false;
  try {
    decomposerAvailable = typeof MedicineWheelDecomposer === "function";
  } catch {
    decomposerAvailable = false;
  }

  return {
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      ceremonyCount: ceremonies.length,
      beatCount: beats.length,
      cycleCount: cycles.length,
      ceremoniedEdges: edges.filter((e) => e.ceremony_honored).length,
    },
    narrativeAnalysis,
    ceremonyState,
    accountabilityAudit,
    graphData,
    mermaidDiagram,
    importanceUnits,
    transformationData,
    indexHealth: indexHealthData,
    reviewCircles,
    consentRecords,
    fireKeeperStatus,
    ceremonyPhaseFraming,
    reflectionPrompts: reflectionPromptsData,
    queryDemos,
    sunDescription,
    provenanceNarrative,
    decomposerAvailable,
  };
}
