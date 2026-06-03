import type { Tool } from "../types.js";
import { store } from "../store.js";

export const validators: Tool[] = [
  {
    name: "accountability_validator",
    description: "Audit research plan for relational accountability alignment with Wilson's Indigenous paradigm. Checks ontology, epistemology, axiology, and relational obligations.",
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
      
      const gaps = [];
      const strengths = [];
      let score = 0;

      // Check pre-relationship phase
      if (plan.pre_relationship_phase && plan.pre_relationship_phase !== "none") {
        strengths.push("Pre-relationship phase planned");
        score += 15;
      } else {
        gaps.push("CRITICAL: No pre-relationship phase; must build trust before data collection");
      }

      // Check advisory board
      if (plan.advisory_board_members > 0) {
        strengths.push(`Community advisory board with ${plan.advisory_board_members} members`);
        score += 20;
      } else {
        gaps.push("CRITICAL: No community advisory board; research cannot proceed without community governance");
      }

      // Check Elder co-investigators
      if (plan.elder_investigators > 0) {
        strengths.push(`${plan.elder_investigators} Elder co-investigators`);
        score += 20;
      } else {
        gaps.push("CRITICAL: No Elder co-investigators; Elder wisdom essential for cultural validity");
      }

      // Check ceremony integration
      if (plan.ceremony_integration && plan.ceremony_integration !== "none" && plan.ceremony_integration !== "none planned") {
        strengths.push("Ceremony integrated into research process");
        score += 15;
      } else {
        gaps.push("CRITICAL: No ceremony integration; research is ceremony, not just methods");
      }

      // Check community benefit
      if (plan.community_benefit && !plan.community_benefit.includes("Academic publication only")) {
        strengths.push("Reciprocal community benefit defined");
        score += 15;
      } else {
        gaps.push("CRITICAL: No reciprocal benefit; extractive approach; community must gain from research");
      }

      // Check data storage (OCAP)
      if (plan.data_storage && (plan.data_storage.includes("on-premise") || plan.data_storage.includes("community"))) {
        strengths.push("Data sovereignty honored (on-premise storage)");
        score += 10;
      } else {
        gaps.push("CRITICAL: Data not stored on-premise; OCAP® violation; community must possess data");
      }

      // Check REB
      if (plan.reb_status && plan.reb_status.includes("community")) {
        strengths.push("Community REB involved");
        score += 5;
      } else {
        gaps.push("IMPORTANT: Community REB not identified; dual review required (TCPS2 Chapter 9)");
      }

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
        recommendations: gaps.length > 0 ? [
          "Pause research until gaps addressed",
          "Consult with Elders and community leaders",
          "Revise research plan with community input",
          "Establish OCAP® data governance agreement",
          "Integrate ceremony throughout (not just at end)",
        ] : [
          "Research plan is well-aligned with Indigenous paradigm",
          "Continue with community oversight",
          "Regular accountability audits recommended",
        ],
        next_steps: score < 70 ? "CANNOT PROCEED until critical gaps addressed" : "Proceed with ongoing community oversight",
      };
    },
  },
  {
    name: "ocap_compliance_checker",
    description: "Verify OCAP® (Ownership, Control, Access, Possession) data sovereignty compliance. Ensures First Nations principles are honored.",
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
        violations.push("✗ OWNERSHIP: Data ownership must belong to community, not researcher/institution");
      }

      // Control
      if (plan.community_approval) {
        compliant.push("✓ CONTROL: Community approval required for data use");
      } else {
        violations.push("✗ CONTROL: Community must control data collection, use, and sharing");
      }

      // Access
      if (plan.access_controls && plan.access_controls !== "open") {
        compliant.push("✓ ACCESS: Access controls defined");
      } else {
        violations.push("✗ ACCESS: Community must determine who accesses data; cannot be open access without permission");
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
        violations.push("✗ POSSESSION: Data must be physically/digitally possessed by community (on-premise)");
      }

      const isCompliant = violations.length === 0;
      const isConditional = isCompliant && possessionConditional;

      const possessionStatus = isOnPremise ? "✓" : isHybridCloud ? "⚠" : "✗";

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
          "Verify community holds all encryption keys — not the cloud provider",
          "Confirm data residency jurisdiction is approved by community governance",
          "Ensure community can extract/delete all data without vendor lock-in",
          "Establish access log visibility for community data stewards",
          "Schedule regular sovereignty audits with community oversight",
        ] : isCompliant ? [
          "OCAP® compliance confirmed",
          "Maintain community governance throughout research",
          "Regular audits to ensure ongoing compliance",
        ] : [
          "STOP: Cannot proceed with current data plan",
          "Develop OCAP®-compliant data governance agreement with community",
          "Revise storage to on-premise/community controlled",
          "Establish community oversight mechanisms",
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
    description: "Assess research alignment with Shawn Wilson's Indigenous research paradigm: ontology (relational reality), epistemology (ceremony as knowledge-making), axiology (relational accountability).",
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
      const storeCeremonies = store.getAllCeremonies();
      const storeNodes = store.getAllNodes();
      const storeEdges = store.edges?.getAll?.() ?? [];

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
          relational_accountability: "Once in relationship, responsible for its wellbeing",
          research_as_ceremony: "Sacred act of building & maintaining relationships",
          wetiko_disease: "Colonial illness of greed/disconnection; cure = laughter, willpower, relational repair",
          spiritual_crash: "When spirit and action misaligned; resolved through ceremony and congruence",
          natural_law: "Living in right relationship with all relations",
        },
        recommendations: hasRelational && hasCeremony && hasAccountability ? [
          "Strong alignment with Wilson's paradigm",
          "Continue with Elder guidance",
          "Regular accountability audits",
        ] : [
          "Strengthen relational framing" + (!hasRelational ? " (CRITICAL)" : ""),
          "Integrate ceremony throughout" + (!hasCeremony ? " (CRITICAL)" : ""),
          "Define reciprocal benefits" + (!hasAccountability ? " (CRITICAL)" : ""),
          "Consult with Elders before proceeding",
        ],
      };
    },
  },
];
