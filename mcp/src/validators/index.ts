import type { Tool } from "../types.js";
import { store } from "../store.js";

/**
 * What a check returns after it finds something missing. The findings are
 * current reality: facts about the plan or the graph today. The pull after a
 * check is to fill each missing item, one task per item, and that is not what
 * we are doing. A hold stays as the check states it: what must be in place
 * before the research continues, reached with the community and never turned
 * into a task. The desired outcome is named on its own terms, through
 * turn_to_creative_orientation.
 */
export const TURN_TOOL = "turn_to_creative_orientation" as const;

export const TURN_SENTENCE =
  "These findings are current reality: facts about the plan as it is today. The pull is to fill each one, one task per item; that is not what we are doing. Pass next_tool_args to turn_to_creative_orientation to name the desired outcome on its own terms. Any hold above stays while that happens.";

export function turnPointer(check: string, findings: string[], holds: string[] = []) {
  return {
    next_tool: TURN_TOOL,
    next_tool_args: { analysis: { check, findings, holds } },
  };
}

/** "a", "a and b", "a, b and c". */
function inWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export const validators: Tool[] = [
  {
    name: "accountability_validator",
    description: "Audit research plan for relational accountability alignment with Wilson's Indigenous paradigm. Checks ontology, epistemology, axiology, and relational obligations. Each finding is stated as a fact about the plan today. When something is missing, the research holds while it is part of the plan, reached with the community; the answer names that hold and points to turn_to_creative_orientation (next_tool, next_tool_args) for the desired outcome.",
    inputSchema: {
      type: "object",
      properties: {
        research_plan: {
          type: "object",
          description: "Research plan details to validate",
          properties: {
            title: { type: "string" },
            methods: { type: "string" },
            duration: { type: "string" },
            pre_relationship_phase: { type: "string" },
            advisory_board_members: { type: "number" },
            elder_investigators: { type: "number" },
            ceremony_integration: { type: "string" },
            community_benefit: { type: "string" },
            data_storage: { type: "string" },
            reb_status: { type: "string" },
          },
        },
      },
      required: ["research_plan"],
    },
    handler: async (args) => {
      const plan = args.research_plan;
      
      // Findings, each a fact about the plan today. `missing` names, for the
      // hold, what must be part of the plan before the research continues.
      const gaps: string[] = [];
      const missing: string[] = [];
      const strengths = [];
      let score = 0;

      // Check pre-relationship phase
      if (plan.pre_relationship_phase && plan.pre_relationship_phase !== "none") {
        strengths.push("Pre-relationship phase planned");
        score += 15;
      } else {
        gaps.push("CRITICAL: The plan has no pre-relationship phase; data collection would begin before trust is built");
        missing.push("a pre-relationship phase in which trust is built");
      }

      // Check advisory board
      if (plan.advisory_board_members > 0) {
        strengths.push(`Community advisory board with ${plan.advisory_board_members} members`);
        score += 20;
      } else {
        gaps.push("CRITICAL: The plan has no community advisory board; research does not proceed without community governance");
        missing.push("community governance through an advisory board");
      }

      // Check Elder co-investigators
      if (plan.elder_investigators > 0) {
        strengths.push(`${plan.elder_investigators} Elder co-investigators`);
        score += 20;
      } else {
        gaps.push("CRITICAL: The plan has no Elder co-investigators; its cultural validity rests on Elder knowledge it does not include");
        missing.push("Elder co-investigators");
      }

      // Check ceremony integration
      if (plan.ceremony_integration && plan.ceremony_integration !== "none" && plan.ceremony_integration !== "none planned") {
        strengths.push("Ceremony integrated into research process");
        score += 15;
      } else {
        gaps.push("CRITICAL: The plan does not integrate ceremony; research is ceremony, not just methods");
        missing.push("ceremony throughout the research");
      }

      // Check community benefit
      if (plan.community_benefit && !plan.community_benefit.includes("Academic publication only")) {
        strengths.push("Reciprocal community benefit defined");
        score += 15;
      } else {
        gaps.push("CRITICAL: The plan names no reciprocal benefit for the community; as written, the research is extractive");
        missing.push("a benefit the community receives from the research");
      }

      // Check data storage (OCAP)
      if (plan.data_storage && (plan.data_storage.includes("on-premise") || plan.data_storage.includes("community"))) {
        strengths.push("Data sovereignty honored (on-premise storage)");
        score += 10;
      } else {
        gaps.push("CRITICAL: The plan does not store the data on-premise or with the community; under OCAP® the community possesses its data");
        missing.push("community possession of the data (OCAP®)");
      }

      // Check REB
      if (plan.reb_status && plan.reb_status.includes("community")) {
        strengths.push("Community REB involved");
        score += 5;
      } else {
        gaps.push("IMPORTANT: The plan identifies no community REB; TCPS2 Chapter 9 requires dual review");
        missing.push("the community's REB (dual review, TCPS2 Chapter 9)");
      }

      const hold = missing.length > 0
        ? `Hold the research while ${inWords(missing)} ${missing.length === 1 ? "is" : "are"} part of the plan.`
        : null;
      const holdManner =
        "The hold is met with the community, its Elders and its leaders: the plan is revised with them, under an OCAP® data governance agreement, with ceremony throughout the research and not only at its end. It is not filled in from this list.";

      const status = score >= 70 ? "ALIGNED" : score >= 40 ? "NEEDS IMPROVEMENT" : "CRITICAL GAPS";

      return {
        audit_status: status,
        wilson_paradigm_alignment: `${score}%`,
        ontology_check: {
          principle: "Reality is relational; everything interconnected",
          assessment: plan.advisory_board_members > 0 && plan.elder_investigators > 0
            ? "✓ Relational approach evident (advisory board + Elders)"
            : "✗ Individualistic approach; lacking relational structure",
        },
        epistemology_check: {
          principle: "Knowledge co-created via relationships, ceremony, and land",
          assessment: plan.ceremony_integration && plan.ceremony_integration !== "none" && plan.ceremony_integration !== "none planned"
            ? "✓ Ceremony as knowledge-making recognized"
            : "✗ Extractive epistemology; knowledge seen as commodity to gather",
        },
        axiology_check: {
          principle: "Relational accountability; researcher answers to all relations",
          assessment: plan.community_benefit && !plan.community_benefit.includes("Academic publication only")
            ? "✓ Reciprocity and accountability present"
            : "✗ One-way benefit; researcher gains, community does not",
        },
        critical_gaps: gaps,
        strengths: strengths,
        recommendations: hold ? [
          hold,
          holdManner,
          TURN_SENTENCE,
        ] : [
          "Research plan is well-aligned with Indigenous paradigm",
          "Continue with community oversight",
          "Regular accountability audits recommended",
        ],
        next_steps: score < 70
          ? `CANNOT PROCEED: the research holds while ${inWords(missing)} ${missing.length === 1 ? "is" : "are"} part of the plan, reached with the community.`
          : "Proceed with ongoing community oversight",
        ...(hold ? turnPointer("accountability_validator", gaps, [hold, holdManner]) : {}),
      };
    },
  },
  {
    name: "ocap_compliance_checker",
    description: "Verify OCAP® (Ownership, Control, Access, Possession) data sovereignty compliance. Ensures First Nations principles are honored. Each violation is stated as a fact about the data plan today, beside the OCAP® principle it meets. On a violation the research holds while the community's agreement, custody and oversight are part of the data plan; the answer names that hold and points to turn_to_creative_orientation (next_tool, next_tool_args) for the desired outcome.",
    inputSchema: {
      type: "object",
      properties: {
        data_plan: {
          type: "object",
          description: "Data management plan to check",
          properties: {
            storage_location: { type: "string" },
            ownership_statement: { type: "string" },
            access_controls: { type: "string" },
            community_approval: { type: "boolean" },
            data_sharing_agreements: { type: "string" },
          },
        },
      },
      required: ["data_plan"],
    },
    handler: async (args) => {
      const plan = args.data_plan;
      const violations = [];
      const compliant = [];

      // Ownership
      if (plan.ownership_statement && plan.ownership_statement.includes("community")) {
        compliant.push("✓ OWNERSHIP: Community ownership explicitly stated");
      } else {
        violations.push("✗ OWNERSHIP: The plan does not state community ownership; under OCAP® the data belongs to the community, not the researcher or institution");
      }

      // Control
      if (plan.community_approval) {
        compliant.push("✓ CONTROL: Community approval required for data use");
      } else {
        violations.push("✗ CONTROL: The plan does not require community approval; under OCAP® the community controls collection, use and sharing");
      }

      // Access
      if (plan.access_controls && plan.access_controls !== "open") {
        compliant.push("✓ ACCESS: Access controls defined");
      } else {
        violations.push("✗ ACCESS: The plan sets no access controls, or sets open access; under OCAP® the community determines who accesses the data, and open access needs its permission");
      }

      // Possession
      const hybridCloudPatterns = ["hybrid", "encrypted-cloud", "sovereign-cloud", "community-cloud"];
      const isOnPremise = plan.storage_location && (plan.storage_location.includes("on-premise") || plan.storage_location.includes("community"));
      const isHybridCloud = plan.storage_location && hybridCloudPatterns.some((p) => plan.storage_location.includes(p));

      let possessionConditional = false;
      if (isOnPremise) {
        compliant.push("✓ POSSESSION: Data stored in community custody");
      } else if (isHybridCloud) {
        possessionConditional = true;
        compliant.push("⚠ POSSESSION: Hybrid/encrypted cloud — conditional pass pending sovereignty verification");
      } else {
        violations.push("✗ POSSESSION: The plan stores the data outside community custody; under OCAP® the community possesses the data, physically or digitally (on-premise)");
      }

      const isCompliant = violations.length === 0;
      const isConditional = isCompliant && possessionConditional;

      const possessionStatus = isOnPremise ? "✓" : isHybridCloud ? "⚠" : "✗";

      // The holds, as what must be in place before the research continues.
      const conditionalPossession =
        "POSSESSION passes only on condition that the community holds every encryption key (not the cloud provider), the data resides in a jurisdiction the community's governance approved, the community can extract or delete all data without vendor lock-in, its data stewards see the access logs, and sovereignty audits run under community oversight. Until the community confirms each condition, the pass stays conditional.";
      const conditionalManner =
        "These conditions are confirmed with the community, not assumed and not filled in from this list.";
      const violationHold =
        "Hold the research while an OCAP® data governance agreement with the community, community custody of the data (on-premise or community-controlled) and community oversight are part of the data plan.";
      const violationManner =
        "That agreement is reached with the community, not filled in; consent is the community's to give.";

      const result: Record<string, unknown> = {
        ocap_status: isConditional ? "CONDITIONAL — CLOUD SOVEREIGNTY" : isCompliant ? "COMPLIANT" : "VIOLATIONS DETECTED",
        violations,
        compliant,
        ocap_principles: {
          ownership: {
            principle: "Data belongs to First Nation collectively",
            requirement: "Community retains IP; publications co-authored; community as data owner",
            current_status: plan.ownership_statement?.includes("community") ? "✓" : "✗",
          },
          control: {
            principle: "Community controls collection, use, sharing, analysis",
            requirement: "Advisory board has veto power; approval required at each research phase",
            current_status: plan.community_approval ? "✓" : "✗",
          },
          access: {
            principle: "First Nations access own data; community determines external access",
            requirement: "Community sets access protocols based on cultural values",
            current_status: plan.access_controls && plan.access_controls !== "open" ? "✓" : "✗",
          },
          possession: {
            principle: "Physical/digital custody with community",
            requirement: "On-premise storage (GC Canada or community servers); or hybrid/encrypted cloud with community-held keys",
            current_status: possessionStatus,
          },
        },
        recommendations: isConditional ? [
          conditionalPossession,
          conditionalManner,
          TURN_SENTENCE,
        ] : isCompliant ? [
          "OCAP® compliance confirmed",
          "Maintain community governance throughout research",
          "Regular audits to ensure ongoing compliance",
        ] : [
          "STOP: Cannot proceed with current data plan",
          violationHold,
          violationManner,
          TURN_SENTENCE,
        ],
        tcps2_chapter9: {
          note: "Canadian institutions require TCPS2 Chapter 9 compliance",
          requirements: [
            "Community engagement plan",
            "Dual REB approval (institutional + community)",
            "OCAP® principles integrated",
            "Community REB may override institutional REB on cultural grounds",
          ],
        },
      };

      if (isConditional) {
        result.cloud_sovereignty_guidance = {
          model: "Hybrid/Encrypted Cloud",
          requirements: [
            "Community holds encryption keys — not the cloud provider",
            "Data residency in jurisdiction approved by community governance",
            "Community can extract/delete all data at any time without vendor lock-in",
            "Access logs visible to community data stewards",
            "Regular sovereignty audits with community oversight",
          ],
          note: "Cloud storage can honor OCAP® Possession when community retains effective control through encryption and governance. This is a recognized path, not an exception.",
        };
      }

      if (!isCompliant) {
        Object.assign(result, turnPointer("ocap_compliance_checker", violations, [
          "STOP: Cannot proceed with current data plan",
          violationHold,
          violationManner,
        ]));
      } else if (isConditional) {
        Object.assign(result, turnPointer(
          "ocap_compliance_checker",
          compliant.filter((c) => c.startsWith("⚠")),
          [conditionalPossession, conditionalManner],
        ));
      }

      return result;
    },
  },
  {
    name: "two_eyed_seeing_bridge",
    description: "Translate concepts between Western and Indigenous worldviews. Supports integration without hierarchy or dominance.",
    inputSchema: {
      type: "object",
      properties: {
        concept: {
          type: "string",
          description: "Concept to translate (Western or Indigenous)",
        },
        direction: {
          type: "string",
          enum: ["western_to_indigenous", "indigenous_to_western", "integrate_both"],
          description: "Translation direction",
        },
      },
      required: ["concept", "direction"],
    },
    handler: async (args) => {
      const { concept, direction } = args;

      const translations: Record<string, any> = {
        "research methodology": {
          western: "Systematic procedures for data collection and analysis",
          indigenous: "Ceremony and relational engagement; knowledge emerges through sacred protocols",
          integrated: "Combine ceremony (smudging, talking circles) with rigorous documentation; both honor knowledge differently",
        },
        "data": {
          western: "Information collected, categorized, analyzed statistically",
          indigenous: "Stories, teachings, relationships; knowledge is alive and relational",
          integrated: "Stories + systematic documentation; honor narrative while allowing pattern analysis",
        },
        "objectivity": {
          western: "Researcher maintains distance to avoid bias",
          indigenous: "Researcher is in relationship; subjectivity and positionality are strengths",
          integrated: "Researcher acknowledges relationships and positionality while maintaining rigorous methods",
        },
        "validity": {
          western: "Measured through statistical tests, reliability, replicability",
          indigenous: "Validated by Elders, community resonance, relational integrity",
          integrated: "Dual validation: statistical rigor + Elder/community verification",
        },
        "knowledge": {
          western: "Information that can be proven, tested, documented",
          indigenous: "Wisdom held in relationships, land, ceremony, stories; co-created with spirit",
          integrated: "Honor both empirical and relational ways of knowing; neither is superior",
        },
        "relational accountability": {
          western: "Ethics board compliance; researcher follows institutional protocols",
          indigenous: "Answering to all relations — human, more-than-human, land, spirit; researcher is accountable to the web of life, not just an institution",
          integrated: "Dual accountability: institutional ethics compliance plus ongoing relational obligations to community, Elders, and the land",
        },
        "consent": {
          western: "Informed consent form signed by individual participants",
          indigenous: "Collective consent negotiated through community processes; permission granted by Elders and governance bodies, renewed throughout relationship",
          integrated: "Individual informed consent plus community-level consent through governance structures; ongoing, not one-time",
        },
        "evidence": {
          western: "Empirical data collected through controlled methods; statistically validated",
          indigenous: "Lived experience, Elder testimony, ceremony, dreams, land observation; knowledge validated through relational integrity",
          integrated: "Multiple evidence streams: empirical data alongside experiential knowledge, Elder wisdom, and ceremonial insight",
        },
        "ethics": {
          western: "Institutional Review Board approval; do no harm principle",
          indigenous: "Relational ethics: do good for all relations; ethics embedded in ceremony and accountability, not external review",
          integrated: "IRB compliance plus relational ethics: community review board, Elder oversight, and ongoing accountability beyond institutional requirements",
        },
        "theory": {
          western: "Testable hypothesis derived from literature review and prior empirical findings",
          indigenous: "Teachings passed through generations; theory lives in stories, ceremony, and land-based observation",
          integrated: "Both peer-reviewed literature and traditional teachings inform the framework; neither is privileged over the other",
        },
        "community": {
          western: "Research subjects or study population; defined by demographics",
          indigenous: "All relations — human, animal, plant, spirit, land; community includes ancestors and future generations",
          integrated: "Defined collaboratively: demographic boundaries plus relational connections including land and more-than-human relations",
        },
        "reciprocity": {
          western: "Participant compensation or token of appreciation for time",
          indigenous: "Mutual obligation woven into relationship; gifts flow both directions continuously; research must give back more than it takes",
          integrated: "Fair compensation plus long-term community benefit; research outputs co-owned; capacity building and knowledge return",
        },
        "land": {
          western: "Research site or field location; geographic variable",
          indigenous: "Teacher, relative, knowledge-holder; land is not a backdrop but an active participant in knowing",
          integrated: "Research site understood as both geographic context and relational entity; land-based methods alongside site-specific data collection",
        },
        "time": {
          western: "Linear progression; project timelines, deadlines, fiscal years",
          indigenous: "Cyclical and seasonal; time measured in ceremonies, harvests, and relational readiness; things happen when they are ready",
          integrated: "Project timelines respected while honoring relational and seasonal readiness; flexibility built into design for ceremonial timing",
        },
        "healing": {
          western: "Clinical intervention; evidence-based treatment protocols",
          indigenous: "Restoring balance in relationships — with self, community, land, and spirit; ceremony as healing; wholeness, not just symptom reduction",
          integrated: "Clinical care plus ceremony, cultural connection, and relational restoration; outcomes measured holistically",
        },
      };

      const translation = translations[concept.toLowerCase()] || {
        western: "Concept not in translation library",
        indigenous: "Consult with Elders for Indigenous understanding",
        integrated: "Two-Eyed Seeing requires learning both perspectives deeply",
      };

      return {
        framework: "Two-Eyed Seeing (Etuaptmumk) - Mi'kmaw Integration",
        concept,
        direction,
        translation,
        principles: {
          equitable: "All perspectives valued; no hierarchy",
          weaving: "Back-and-forth between both worldviews",
          decolonizing: "Rejects Western dominance; honors Indigenous epistemology as equal",
          co_learning: "Both perspectives teach each other",
          to_betterment: "Integration serves community wellbeing, not just academic goals",
        },
        implementation_guidance: {
          ontology: "Relational Indigenous (interconnected) + Western (parts & wholes) → integrated whole",
          epistemology: "Ceremony/story + hypothesis testing/rigor → blended approaches",
          axiology: "Relational accountability + academic standards → ethical clarity via Elder guidance",
          methods: "Advisory board, Elders as co-investigators, ceremony throughout, storytelling + data",
        },
        examples: {
          health: "Sweat lodge ceremony + Western trauma therapy (e.g., Seeking Safety); Elders + clinicians as equals",
          education: "Land-based curriculum + scientific rigor; storytelling pedagogy; students co-create knowledge",
          environment: "Traditional ecological knowledge (Elders) + scientific indicators; Bayesian integration",
        },
        warnings: [
          "Not just adding Indigenous 'flavor' to Western research",
          "Requires genuine respect for both worldviews",
          "Elder guidance essential; don't appropriate or tokenize",
          "Some knowledge doesn't translate; honor boundaries",
        ],
      };
    },
  },
  {
    name: "wilson_paradigm_checker",
    description: "Assess research alignment with Shawn Wilson's Indigenous research paradigm: ontology (relational reality), epistemology (ceremony as knowledge-making), axiology (relational accountability). What the description and the store show is stated as fact. When something is not shown, the answer keeps the hold (ask the community what its own protocol requires before proceeding) and points to turn_to_creative_orientation (next_tool, next_tool_args) for the desired outcome.",
    inputSchema: {
      type: "object",
      properties: {
        research_description: {
          type: "string",
          description: "Description of research approach",
        },
      },
      required: ["research_description"],
    },
    handler: async (args) => {
      const { research_description } = args;

      const description = research_description.toLowerCase();
      
      const relationshipKeywords = ["relationship", "relational", "community", "elder", "kinship", "connection"];
      const ceremonyKeywords = ["ceremony", "smudge", "tobacco", "sacred", "spirit", "prayer"];
      const accountabilityKeywords = ["reciprocity", "accountability", "reciprocal", "benefit", "responsibility"];
      
      const hasRelational_text = relationshipKeywords.some(k => description.includes(k));
      const hasCeremony_text = ceremonyKeywords.some(k => description.includes(k));
      const hasAccountability_text = accountabilityKeywords.some(k => description.includes(k));

      // --- Store-based evidence (additive signal) ---
      const storeCeremonies = (await store.getAllCeremonies());
      const storeNodes = (await store.getAllNodes());
      const storeEdges = (await store.getAllEdges());

      // Ceremonies in the store are direct evidence of ceremony integration
      const hasCeremonyInStore = storeCeremonies.length > 0;
      // Relations/edges are evidence of relational thinking
      const hasRelationsInStore = storeEdges.length > 0;
      // Knowledge nodes with accountability metadata
      const hasAccountabilityNodes = storeNodes.some(
        n => n.metadata?.axiologicalPillar === "axiology" || 
             n.description?.toLowerCase().includes("accountability") ||
             n.description?.toLowerCase().includes("reciprocity")
      );

      // Combine text evidence with store evidence (store strengthens but text path remains fallback)
      const hasRelational = hasRelational_text || hasRelationsInStore;
      const hasCeremony = hasCeremony_text || hasCeremonyInStore;
      const hasAccountability = hasAccountability_text || hasAccountabilityNodes;

      // What the description and the store show, one fact per dimension.
      const allShown = hasRelational && hasCeremony && hasAccountability;
      const dimensionFacts = [
        hasRelational
          ? "Relational framing is shown in the description or in the store"
          : "The description and the store show no relational framing (CRITICAL)",
        hasCeremony
          ? "Ceremony is shown in the description or in the store"
          : "The description and the store show no ceremony (CRITICAL)",
        hasAccountability
          ? "Reciprocity and accountability are shown in the description or in the store"
          : "The description and the store show no reciprocity or accountability (CRITICAL)",
      ];
      // The hold, kept as Wilson's sources give it.
      const protocolHold =
        "Before proceeding, ask the community whose knowledge this concerns what its own protocol requires (p. 54; p. 136)";

      return {
        framework: "Shawn Wilson's Indigenous Research Paradigm",
        research_description,
        store_evidence: {
          ceremonies_logged: storeCeremonies.length,
          relations_mapped: storeEdges.length,
          knowledge_nodes: storeNodes.length,
          ceremony_signal: hasCeremonyInStore ? "✓ Ceremonies found in relational store" : "○ No ceremonies logged yet",
          relational_signal: hasRelationsInStore ? "✓ Relations mapped in store" : "○ No relations mapped yet",
          accountability_signal: hasAccountabilityNodes ? "✓ Accountability evidence in store" : "○ No accountability nodes yet",
          note: "Store evidence supplements text analysis. Logged ceremonies and relations are direct evidence of paradigm alignment."
        },
        ontology_assessment: {
          principle: "Reality is relational; everything interconnected; identity = roles in relationships",
          indicators: relationshipKeywords,
          present: hasRelational,
          status: hasRelational 
            ? (hasRelational_text 
              ? "✓ Relational ontology evident in description" 
              : "✓ Relational ontology evident from mapped relations in store")
            : "✗ Appears individualistic; missing relational framing",
          teaching: "Once in relationship, you are responsible for that relationship's wellbeing",
        },
        epistemology_assessment: {
          principle: "Knowledge co-created via relations, stories, land observation, ceremony; not extracted",
          indicators: ceremonyKeywords,
          present: hasCeremony,
          status: hasCeremony 
            ? (hasCeremony_text 
              ? "✓ Ceremony as epistemology recognized in description"
              : "✓ Ceremony as epistemology evident from logged ceremonies in store")
            : "✗ Extractive approach; knowledge seen as commodity to gather",
          teaching: "Knowledge has spirit; treat respectfully, not as property",
        },
        axiology_assessment: {
          principle: "Ethics of relational accountability; researcher answers to all relations; reciprocity mandatory",
          indicators: accountabilityKeywords,
          present: hasAccountability,
          status: hasAccountability 
            ? (hasAccountability_text 
              ? "✓ Accountability and reciprocity present in description"
              : "✓ Accountability evident from store knowledge nodes")
            : "✗ One-way benefit; lacks reciprocity",
          teaching: "Researcher must live congruently with topic; embody values researched",
        },
        overall_alignment: {
          score: [hasRelational, hasCeremony, hasAccountability].filter(Boolean).length,
          max: 3,
          status: [hasRelational, hasCeremony, hasAccountability].filter(Boolean).length === 3
            ? "STRONG ALIGNMENT"
            : [hasRelational, hasCeremony, hasAccountability].filter(Boolean).length === 2
            ? "PARTIAL ALIGNMENT"
            : "WEAK ALIGNMENT",
        },
        key_concepts: {
          relational_accountability: "Answerable to all your relations when doing research (Shawn Wilson 2001, CJNE 25(2), p. 177, quoted in Wilson 2008, p. 57)",
          research_as_ceremony: "A ceremony for improving your relationship with an idea (Wilson 2008, p. 110)",
          giving_back: "Continuous feedback with participants (p. 121); going back to the community after the writing (p. 125)",
          source: "medicine-wheel://wilson/framework",
        },
        note: "This check matches keywords in a description: the suite's own heuristic, not a judgement Wilson makes. His book 'is not intended to impose conclusions on other people or to be a manual of techniques for their research' (Wilson 2008, p. 136); and in the Indigenous world 'you are recognized by your deeds… Not by what you say on paper' (Lewis Cardinal, p. 91). Read the relations actually made, or ask people (#65).",
        recommendations: allShown ? [
          "The keywords of relational framing, ceremony and accountability are present",
          "Ask the people involved Wilson's six questions (p. 77; medicine-wheel://wilson/framework, researcher_questions)",
          "Follow the community's own protocol for who is consulted (Atkinson, quoted p. 54)",
        ] : [
          ...dimensionFacts,
          protocolHold,
          TURN_SENTENCE,
        ],
        ...(allShown ? {} : turnPointer(
          "wilson_paradigm_checker",
          dimensionFacts.filter((f) => f.endsWith("(CRITICAL)")),
          [protocolHold],
        )),
      };
    },
  },
];
