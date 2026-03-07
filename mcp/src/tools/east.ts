import type { Tool } from "../types.js";

export const eastTools: Tool[] = [
  {
    name: "east_vision_inquiry",
    description: "EAST Direction (Waabinong) - Spring, New Beginnings, Vision. Invoke tobacco medicine for new research inquiries, map relational obligations, and receive ceremony guidance for opening phases. Ages 0-7: Good Life stage.",
    inputSchema: {
      type: "object",
      properties: {
        research_question: {
          type: "string",
          description: "The research question or inquiry you are beginning",
        },
        relations_involved: {
          type: "array",
          items: { type: "string" },
          description: "List of relations involved (youth, Elders, land, ancestors, future generations, etc.)",
        },
        cultural_context: {
          type: "string",
          description: "Indigenous territory/cultural context (e.g., Anishinaabe, Innu, Mi'kmaq)",
        },
        timeline_phase: {
          type: "string",
          enum: ["pre-research", "planning", "beginning"],
          description: "Current phase of research",
        },
      },
      required: ["research_question", "relations_involved"],
    },
    handler: async (args) => {
      const {
        research_question,
        relations_involved = [],
        cultural_context = "Indigenous territory",
        timeline_phase = "pre-research",
      } = args;

      return {
        direction: "EAST (Waabinong — Yellow — Spring — Tobacco)",
        stage: "Birth-7 Years: Good Life (New Beginnings)",
        ceremony_guidance: {
          opening_practice: "Smudging with tobacco",
          intention: "Honor spirits entering research circle; thank land & ancestors",
          protocol: "Place tobacco on ground; offer gratitude for all relations; acknowledge that knowledge belongs to community",
          medicines_used: ["Tobacco"],
          timeline: "Week 1",
        },
        relational_obligations: {
          human_relations: [
            "Listen deeply to community stories; honor perspectives as valid",
            "Invite Elders as co-investigators; their wisdom validates research",
            "Ensure community engagement & reciprocal benefit",
            "Live congruently with research values; demonstrate respect through actions",
          ],
          land_relations: [
            `Acknowledge ${cultural_context} territory and land's role in knowledge`,
            "Ground research in place; land teaches",
            "Recognize how knowledge connects to natural cycles",
          ],
          spirit_relations: [
            "Protect stories; don't extract or commodify knowledge",
            "Invoke ancestral guidance; honor those who came before",
            "Treat information as alive; it teaches through relationship",
          ],
          future_relations: [
            "Consider next 7 generations in all decisions",
            "Archive knowledge for community (not just academic publication)",
            "Ensure data sovereignty; community retains control",
            "Research as opportunity for healing & revitalization",
          ],
        },
        suggested_practices: [
          {
            name: "Spirit Invitation Ceremony",
            description: "Gather community, Elders, researchers in talking circle; invite spirits via storytelling",
            medicines_used: ["Tobacco", "Sage"],
            timeline: "Week 1",
          },
          {
            name: "Elder Co-Investigator Onboarding",
            description: "Formal role definition; co-authorship; decision-making authority",
            reciprocal_benefit: "Honorarium, co-authorship, community publication",
            timeline: "Week 2",
          },
          {
            name: "Community Advisory Circle",
            description: "Community guides research design; perspectives shape methods",
            protocol: "Talking circle format; stories shared before data collection planned",
            timeline: "Week 2-3",
          },
          {
            name: "Land-Based Opening",
            description: "Conduct first ceremony on land to ground research relationally",
            acknowledgment: `Thank land, acknowledge Indigenous history of ${cultural_context}`,
            timeline: "Week 3",
          },
        ],
        accountability_checkpoint: {
          question: `Does this research honor the spirits of community, land, and ancestors in ${cultural_context}?`,
          next_steps: [
            "Schedule smudging ceremony",
            "Identify Elder co-investigator",
            "Form community advisory circle",
            "Develop OCAP® data stewardship agreement",
            "Define reciprocal benefit for community",
          ],
        },
        relational_accountability_summary: {
          wilson_paradigm_alignment: "Research beginning to embody relational accountability; spirit invocation in place",
          two_eyed_seeing: "Community knowledge (Indigenous) + research rigor (Western) = bridged perspective",
          medicine_wheel: "East direction: New beginning honoring; community as springtime of research",
          next_phase: "South (Summer) will focus on growth practices & embodied learning",
        },
        research_question,
        relations_involved,
        timeline_phase,
      };
    },
  },
  {
    name: "east_spirit_invocation",
    description: "Guidance for opening ceremonies, invoking spirits, and establishing sacred research space. Provides tobacco protocol and gratitude practices.",
    inputSchema: {
      type: "object",
      properties: {
        ceremony_type: {
          type: "string",
          enum: ["research_opening", "land_acknowledgment", "elder_invitation"],
          description: "Type of opening ceremony",
        },
        participants: {
          type: "array",
          items: { type: "string" },
          description: "Who will participate (Elders, youth, researchers, etc.)",
        },
      },
      required: ["ceremony_type"],
    },
    handler: async (args) => {
      const { ceremony_type, participants = [] } = args;

      return {
        direction: "EAST - Spirit Invocation",
        ceremony_type,
        protocol: {
          preparation: [
            "Gather tobacco or other appropriate medicine",
            "Prepare sacred space (clean, respectful environment)",
            "Invite participants with proper notice and respect",
            "Ensure Elder presence and guidance",
          ],
          opening: [
            "Begin with silence or song",
            "Offer tobacco to the four directions",
            "State intention clearly and humbly",
            "Acknowledge all relations (human, land, spirit, ancestors)",
          ],
          during: [
            "Listen deeply; create space for all voices",
            "Honor storytelling; don't interrupt or extract",
            "Remain present and attentive",
            "Follow Elder guidance for ceremony flow",
          ],
          closing: [
            "Express gratitude to all who participated",
            "Thank spirits, land, and ancestors",
            "Confirm next steps and ongoing relationships",
            "Ensure reciprocity is clear",
          ],
        },
        medicines: {
          tobacco: "Primary medicine for East; gratitude, humility, connection to all life",
          usage: "Offer to land, carry in pouch, burn in ceremony",
          teaching: "Tobacco carries prayers; use with respect and intention",
        },
        participants,
        reminder: "Research is ceremony. This is not a checkbox but a sacred act of building relationships.",
      };
    },
  },
  {
    name: "east_new_relation_mapper",
    description: "Map all relational obligations at the start of research: human, land, spirit, ancestors, future generations. Ensures nothing is forgotten.",
    inputSchema: {
      type: "object",
      properties: {
        project_title: {
          type: "string",
          description: "Title of the research project",
        },
        community: {
          type: "string",
          description: "Community or territory involved",
        },
      },
      required: ["project_title", "community"],
    },
    handler: async (args) => {
      const { project_title, community } = args;

      return {
        direction: "EAST - Relational Mapping",
        project_title,
        community,
        relational_web: {
          human_relations: {
            description: "People directly and indirectly involved",
            mapping: [
              "Elders: Co-investigators, wisdom holders, ceremony guides",
              "Community members: Participants, advisory board, decision-makers",
              "Youth: Future knowledge holders, participants, mentees",
              "Researchers: Responsible for living congruently with topic",
              "Family networks: Extended relations, kinship systems",
              "Future researchers: Those who will build on this work",
            ],
            obligations: [
              "Obtain informed consent that honors community protocols",
              "Ensure co-authorship and equitable credit",
              "Provide ongoing updates and transparency",
              "Deliver reciprocal benefits (honoraria, capacity building, publications)",
            ],
          },
          land_relations: {
            description: "Territory, waters, ecology as active participants",
            mapping: [
              `${community} territory: Acknowledge Indigenous sovereignty`,
              "Waters: Rivers, lakes as knowledge holders",
              "Plants & animals: Relatives in ecosystem",
              "Seasons & cycles: Timing of research respects natural rhythms",
            ],
            obligations: [
              "Land acknowledgment at every gathering",
              "Conduct ceremonies on land (with permission)",
              "Minimize environmental impact",
              "Learn from land; it teaches if we listen",
            ],
          },
          spirit_relations: {
            description: "Non-physical beings, ancestors, knowledge spirits",
            mapping: [
              "Ancestors: Those who came before; wisdom carriers",
              "Spirit of knowledge: Information has life; treat with respect",
              "Guardians of place: Spirits protecting territory",
              "Creator/Great Mystery: Source of all relations",
            ],
            obligations: [
              "Invoke spirits at ceremonies; invite their guidance",
              "Don't extract knowledge; co-create with spirit present",
              "Honor sacred protocols (smudging, offerings)",
              "Feed ancestors (spirit feeding ceremonies)",
            ],
          },
          future_relations: {
            description: "Next 7 generations and beyond",
            mapping: [
              "Unborn children: Their inheritance of knowledge",
              "Future scholars: Will they benefit or be harmed?",
              "Community continuity: Strengthening culture for future",
              "Healing lineages: Breaking colonial patterns",
            ],
            obligations: [
              "Archive knowledge for community ownership (OCAP®)",
              "Build capacity for future Indigenous researchers",
              "Ensure sustainability of research relationships",
              "Leave community stronger than you found it",
            ],
          },
        },
        wilson_teaching: "Once you are in relationship, you are responsible for that relationship's wellbeing. This mapping ensures you know all your relations.",
        next_steps: [
          "Review with Elder co-investigator",
          "Present to community advisory board for validation",
          "Incorporate into OCAP® data governance agreement",
          "Revisit quarterly to update and honor ongoing relationships",
        ],
      };
    },
  },
];
