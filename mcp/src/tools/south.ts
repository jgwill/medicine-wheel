import type { Tool } from "../types.js";

export const southTools: Tool[] = [
  {
    name: "south_growth_practice",
    description: "SOUTH Direction (Zhaawanong) - Summer, Growth, Youth (7-14 years: Fast Life). Cedar medicine for embodiment practices, land-based learning, and physical engagement with research.",
    inputSchema: {
      type: "object",
      properties: {
        research_phase: {
          type: "string",
          description: "Current research phase (data collection, field work, etc.)",
        },
        participants: {
          type: "array",
          items: { type: "string" },
          description: "Who is participating in growth practices",
        },
        location: {
          type: "string",
          description: "Where the practices will take place (land, water, community space)",
        },
      },
      required: ["research_phase"],
    },
    handler: async (args) => {
      const { research_phase, participants = [], location = "land" } = args;

      return {
        direction: "SOUTH (Zhaawanong — Red — Summer — Cedar)",
        stage: "7-14 Years: Fast Life (Growth & Embodiment)",
        medicine: {
          name: "Cedar (Grandmother)",
          properties: "Free medicine, cleansing, protection; makes anew what journey doesn't need",
          usage: "Smudging, tea, baths; purification and renewal",
        },
        teachings: {
          core: "Life awake and dancing; spirit nurturance critical; growth through embodied experience",
          mentorship: "Elders invite (don't command); mentorship heals",
          intuition: "Listen to spirit's warnings; intuition never deceives",
        },
        growth_practices: [
          {
            name: "Land-Based Data Collection",
            description: "Conduct research on the land; walk, observe, participate",
            protocol: [
              "Bring tobacco or offerings",
              "Let land teach; observe patterns in nature",
              "Document through stories, not just data points",
              "Invite participants to share land knowledge",
            ],
            benefits: "Honors embodied knowing; land as teacher; grounds research in place",
          },
          {
            name: "Youth Mentorship Circles",
            description: "Create spaces for youth-Elder knowledge exchange",
            protocol: [
              "Elders share stories; youth ask questions",
              "No pressure; invitation-based participation",
              "Hands-on activities (crafts, harvesting, ceremonies)",
              "Honor youth as knowledge holders too",
            ],
            benefits: "Intergenerational healing; cultural transmission; youth empowerment",
          },
          {
            name: "Sweat Lodge Ceremony",
            description: "Purification and renewal through sacred ceremony",
            protocol: [
              "Requires Elder guidance and proper training",
              "Preparation with cedar and sage",
              "Four rounds honoring four directions",
              "Post-ceremony sharing and integration",
            ],
            benefits: "Physical, emotional, spiritual cleansing; community bonding",
          },
          {
            name: "Berry Harvesting & Seasonal Activities",
            description: "Participate in traditional seasonal practices",
            protocol: [
              "Learn from Elders when and how to harvest",
              "Give thanks and offerings to land",
              "Share harvest with community (reciprocity)",
              "Document seasonal ecological knowledge",
            ],
            benefits: "Embodied learning; seasonal awareness; community care",
          },
        ],
        research_applications: {
          field_methods: "Use embodied practices to collect data; participate, don't just observe",
          youth_engagement: "Create safe spaces for youth voices; honor their lived experience",
          physical_documentation: "Photos, videos, artifacts with full consent and community control",
          movement_based: "Walking interviews, land-based conversations, ceremony participation",
        },
        accountability: {
          question: "Are we honoring the physical, embodied dimensions of knowledge?",
          checks: [
            "Spending time on land (not just in offices/labs)",
            "Youth have agency in research design",
            "Cedar or other medicines used appropriately",
            "Physical artifacts handled with respect",
            "Community benefits from embodied practices",
          ],
        },
        next_phase: "West (Fall) will bring reflection on what has been gathered",
        participants,
        location,
        research_phase,
      };
    },
  },
  {
    name: "south_youth_mentorship_protocol",
    description: "Protocols for engaging youth in research with Elder mentorship. Honors developmental stage, spirit nurturance, and invitation-based participation.",
    inputSchema: {
      type: "object",
      properties: {
        youth_age_range: {
          type: "string",
          description: "Age range of youth participants (e.g., 12-17)",
        },
        research_topic: {
          type: "string",
          description: "Research topic involving youth",
        },
        elder_availability: {
          type: "boolean",
          description: "Whether Elders are available for co-facilitation",
        },
      },
      required: ["youth_age_range", "research_topic"],
    },
    handler: async (args) => {
      const { youth_age_range, research_topic, elder_availability = false } = args;

      return {
        direction: "SOUTH - Youth Mentorship",
        youth_age_range,
        research_topic,
        protocol: {
          invitation_approach: {
            principle: "Elders invite, don't command; youth choose to participate",
            methods: [
              "Personal invitation from trusted Elder or mentor",
              "Explain benefits clearly; no coercion",
              "Allow youth to bring friends (peer support)",
              "Create safe, welcoming environment",
            ],
          },
          elder_role: elder_availability
            ? [
                "Co-facilitator with researcher",
                "Cultural knowledge holder",
                "Safe space creator",
                "Story sharer and wisdom guide",
              ]
            : [
                "CRITICAL GAP: Elder involvement required for authentic youth engagement",
                "Seek Elder co-facilitator before proceeding",
              ],
          youth_agency: [
            "Youth guide research questions (participatory design)",
            "Their stories are valid; don't correct or dismiss",
            "Allow silence; don't pressure sharing",
            "Honor diverse communication styles (art, music, digital)",
          ],
          consent: [
            "Youth assent + parent/guardian consent (dual consent)",
            "Ongoing consent; can withdraw anytime",
            "Explain data use in youth-friendly language",
            "Community controls data (OCAP®); youth know this",
          ],
          activities: [
            "Storytelling circles (oral tradition)",
            "Digital storytelling (video, audio, social media)",
            "Arts-based methods (drawing, music, performance)",
            "Land-based activities (walking, harvesting)",
            "Games and play (joy as pedagogy)",
          ],
        },
        spirit_nurturance: {
          teaching: "Youth spirits are vulnerable; protect and nurture",
          practices: [
            "Begin/end sessions with smudging (with permission)",
            "Provide food (care for physical needs)",
            "Create beauty (art, music, decoration)",
            "Celebrate youth; affirm their gifts",
          ],
        },
        warnings: {
          extractive_approach: "Avoid treating youth as data sources; they are knowledge holders",
          academic_language: "Use accessible language; avoid jargon",
          adult_centered: "Center youth voices, not researcher agenda",
          tokenism: "Ensure meaningful participation, not just representation",
        },
        elder_availability_status: elder_availability
          ? "✓ Elder co-facilitation available"
          : "⚠️ CRITICAL: Elder co-facilitation required before proceeding",
      };
    },
  },
  {
    name: "south_embodied_data_collection",
    description: "Methods for data collection that honor embodiment: walking interviews, land-based observation, participatory practices.",
    inputSchema: {
      type: "object",
      properties: {
        method_type: {
          type: "string",
          enum: ["walking_interview", "land_observation", "ceremony_participation", "seasonal_activity"],
          description: "Type of embodied method",
        },
        duration: {
          type: "string",
          description: "Expected duration (e.g., '2 hours', 'full day')",
        },
      },
      required: ["method_type"],
    },
    handler: async (args) => {
      const { method_type, duration = "flexible" } = args;

      const methods: Record<string, any> = {
        walking_interview: {
          name: "Walking Interview",
          description: "Conversation while walking on land; movement opens different knowledge",
          protocol: [
            "Invite participant to choose route (their place of comfort)",
            "Bring offerings (tobacco, food)",
            "Let land guide conversation; silence is okay",
            "Record with permission; or rely on memory/notes",
            "Notice what land reveals during walk",
          ],
          benefits: "Embodied knowing; land as co-teacher; less formal than sitting interview",
          cedar_teaching: "Movement cleanses; makes anew what journey doesn't need",
        },
        land_observation: {
          name: "Land-Based Observation",
          description: "Sit with land; observe seasonal patterns, ecological relationships",
          protocol: [
            "Identify observation site with community guidance",
            "Regular visits across seasons (honor cycles)",
            "Bring tobacco; offer gratitude",
            "Document respectfully (photos, sketches, notes)",
            "Integrate Indigenous ecological knowledge from Elders",
          ],
          benefits: "Grounds research in place; honors land as knowledge source",
          two_eyed_seeing: "Western ecological methods + Indigenous land teachings",
        },
        ceremony_participation: {
          name: "Ceremony Participation",
          description: "Participate in community ceremonies (with permission and guidance)",
          protocol: [
            "Invitation required; never intrude",
            "Follow all protocols (dress, offerings, behavior)",
            "No recording unless explicitly permitted",
            "Participate fully; don't just observe",
            "Honor confidentiality; sacred knowledge stays within ceremony",
          ],
          benefits: "Deepest relational knowing; trust building; direct experience of worldview",
          accountability: "Your presence is not extraction; it is relationship",
        },
        seasonal_activity: {
          name: "Seasonal Activity Participation",
          description: "Join seasonal practices: harvesting, hunting, fishing, ceremonies",
          protocol: [
            "Learn proper protocols from Elders",
            "Contribute labor; don't just watch",
            "Share in harvest (reciprocity)",
            "Document with permission; honor what must stay private",
          ],
          benefits: "Embodied cultural learning; seasonal awareness; community membership",
          long_term: "Relationships built across multiple seasons deepen trust and knowledge",
        },
      };

      return {
        direction: "SOUTH - Embodied Data Collection",
        method: methods[method_type],
        duration,
        general_principles: {
          embodiment: "Knowledge lives in body, land, and spirit—not just mind",
          participation: "Participate, don't just extract; be in relationship",
          movement: "Walking, dancing, working with hands opens different ways of knowing",
          seasons: "Honor natural cycles; some knowledge only available in certain seasons",
        },
        cedar_integration: {
          before: "Smudge with cedar to prepare; cleanse and open to learning",
          during: "Carry cedar; protection and renewal",
          after: "Smudge to release what journey doesn't need; integrate learning",
        },
        accountability_questions: [
          "Am I honoring embodied knowing, or just extracting verbal data?",
          "Is land present in this research, or just backdrop?",
          "Are participants co-creators, or just sources?",
          "Am I physically present, or distant?",
        ],
      };
    },
  },
];
