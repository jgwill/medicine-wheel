import type { Prompt } from "../types.js";

export const prompts: Prompt[] = [
  {
    name: "direction_inquiry",
    description: "Invoke a specific medicine wheel direction for research guidance",
    arguments: [
      {
        name: "direction",
        description: "Which direction to invoke (east, south, west, north)",
        required: true,
      },
      {
        name: "research_context",
        description: "Brief context about your research",
        required: true,
      },
    ],
    handler: async (args) => {
      const { direction = "east", research_context = "" } = args;
      
      const prompts: Record<string, any> = {
        east: {
          role: "user",
          content: {
            type: "text",
            text: `You are beginning research within an Indigenous paradigm. Invoke the EAST direction (Waabinong - Spring - Yellow - Tobacco) for guidance.

Research Context: ${research_context}

Call the east_vision_inquiry tool to:
1. Map relational obligations (human, land, spirit, ancestors, future)
2. Receive ceremony guidance for opening
3. Identify Elder co-investigators and community advisory board
4. Plan tobacco offerings and gratitude practices

Remember: Research is ceremony. This is a sacred beginning.`,
          },
        },
        south: {
          role: "user",
          content: {
            type: "text",
            text: `You are in the growth phase of research. Invoke the SOUTH direction (Zhaawanong - Summer - Red - Cedar) for embodiment guidance.

Research Context: ${research_context}

Call the south_growth_practice tool to:
1. Design land-based data collection
2. Create youth mentorship protocols
3. Integrate cedar medicine for cleansing and renewal
4. Honor embodied ways of knowing

Remember: Knowledge lives in body, land, and spirit - not just mind.`,
          },
        },
        west: {
          role: "user",
          content: {
            type: "text",
            text: `You are in the reflection phase. Invoke the WEST direction (Epangishmok - Fall - Black - Sage & Strawberry) for emotional processing and truth-speaking.

Research Context: ${research_context}

Call the west_reflection_ceremony tool to:
1. Design talking circles for collective reflection
2. Process difficult emotions (trauma, grief, anger, shame)
3. Apply strawberry teaching for forgiveness
4. Integrate sage for mental/emotional cleansing

Remember: Heart (not head) leads to peace. Death is transformation, not ending.`,
          },
        },
        north: {
          role: "user",
          content: {
            type: "text",
            text: `You are ready for wisdom synthesis and closing. Invoke the NORTH direction (Kiiwedinong - Winter - White - Cedar & Stories) for Elder guidance.

Research Context: ${research_context}

Call the north_wisdom_synthesis tool to:
1. Integrate learnings from all four directions
2. Convene Elder council for validation
3. Plan spirit feeding ceremony for ancestors
4. Archive stories with community ownership (OCAP®)

Remember: Wisdom serves seven generations. Feed the ancestors; they are hungry for connection.`,
          },
        },
      };

      return [prompts[direction.toLowerCase()] || prompts.east];
    },
  },
  {
    name: "accountability_audit",
    description: "Comprehensive relational accountability audit for research plans",
    arguments: [
      {
        name: "research_plan",
        description: "Your research plan (as JSON object or description)",
        required: true,
      },
    ],
    handler: async (args) => {
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Conduct a comprehensive relational accountability audit using Indigenous paradigm validators.

Research Plan: ${JSON.stringify(args.research_plan, null, 2)}

Please call these tools in sequence:
1. accountability_validator - Check Wilson's paradigm alignment
2. ocap_compliance_checker - Verify data sovereignty
3. wilson_paradigm_checker - Assess ontology/epistemology/axiology

After audits, synthesize findings and recommend next steps. Be honest about gaps - this serves community protection.`,
          },
        },
      ];
    },
  },
  {
    name: "research_planning",
    description: "Plan Indigenous paradigm research from beginning to end",
    arguments: [
      {
        name: "research_question",
        description: "Your research question or topic",
        required: true,
      },
      {
        name: "community",
        description: "Community or territory involved",
        required: true,
      },
    ],
    handler: async (args) => {
      const { research_question, community } = args;
      
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Plan Indigenous paradigm research that honors the Medicine Wheel's four directions.

Research Question: ${research_question}
Community: ${community}

Phase 1 - EAST (Pre-Research: Months 1-3)
Call east_vision_inquiry and east_new_relation_mapper to:
- Identify all relational obligations
- Plan opening ceremonies (tobacco, smudging)
- Recruit Elder co-investigators
- Form community advisory board
- Establish OCAP® data governance agreement

Phase 2 - SOUTH (Data Collection: Months 4-6)
Call south_growth_practice and south_embodied_data_collection to:
- Design land-based methods
- Create youth engagement protocols
- Integrate cedar medicine
- Document through embodied participation

Phase 3 - WEST (Reflection: Months 7-9)
Call west_reflection_ceremony and west_emotional_processing to:
- Hold talking circles
- Process emotions (trauma, grief, etc.)
- Apply forgiveness frameworks
- Synthesize themes from heart

Phase 4 - NORTH (Wisdom & Closing: Months 10-12)
Call north_wisdom_synthesis and north_story_archiving to:
- Convene Elder council for validation
- Spirit feeding ceremony
- Archive stories (OCAP®)
- Deliver reciprocal benefits to community

Throughout: Regular accountability audits to ensure relational integrity.

All my relations. 🌿`,
          },
        },
      ];
    },
  },
  {
    name: "ceremony_invocation",
    description: "Guidance for conducting specific ceremonies",
    arguments: [
      {
        name: "ceremony_type",
        description: "Type of ceremony (smudging, talking_circle, spirit_feeding, etc.)",
        required: true,
      },
    ],
    handler: async (args) => {
      const { ceremony_type } = args;
      
      const ceremonies: Record<string, string> = {
        smudging: "Call east_spirit_invocation for smudging protocols with tobacco, sage, or cedar",
        talking_circle: "Call west_reflection_ceremony with ceremony_format='talking_circle' for protocols",
        spirit_feeding: "Call north_spirit_feeding_ceremony for ancestor honoring protocols",
        opening: "Call east_spirit_invocation with ceremony_type='research_opening'",
        closing: "Call north_elder_council_invocation with purpose='ceremonial_closing'",
      };

      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Ceremony Guidance Request: ${ceremony_type}

${ceremonies[ceremony_type.toLowerCase()] || "Consult with Elders for specific ceremony protocols"}

Remember:
- Elder guidance is essential
- Proper medicines and offerings required
- Sacred space must be prepared
- Participants informed of protocols
- Ceremony is not performance; it is sacred relationship

Research is ceremony. Approach with humility and respect.`,
          },
        },
      ];
    },
  },
];
