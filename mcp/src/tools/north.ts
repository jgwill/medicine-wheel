import type { Tool } from "../types.js";

export const northTools: Tool[] = [
  {
    name: "north_wisdom_synthesis",
    description: "NORTH Direction (Kiiwedinong) - Winter, Wisdom, Elders (49+ years). Integrate learnings from all directions into wisdom for teaching and sharing.",
    inputSchema: {
      type: "object",
      properties: {
        research_duration: {
          type: "string",
          description: "How long has research been ongoing",
        },
        learnings: {
          type: "array",
          items: { type: "string" },
          description: "Key learnings from each direction",
        },
        community_benefit: {
          type: "string",
          description: "How will wisdom benefit community",
        },
      },
      required: ["learnings"],
    },
    handler: async (args) => {
      const { research_duration = "full cycle", learnings = [], community_benefit = "ongoing" } = args;

      return {
        direction: "NORTH (Kiiwedinong — White — Winter — Cedar & Stories)",
        stage: "49+ Years: Elder (Wisdom & Teaching)",
        medicines: {
          cedar: {
            name: "Cedar",
            use: "Purification, protection, renewal",
            teaching: "Grandmother Cedar cleanses and makes sacred",
          },
          stories: {
            name: "Stories (Living Knowledge)",
            use: "Teaching, memory, cultural transmission",
            teaching: "Stories carry wisdom; they are alive and must be honored",
          },
        },
        teachings: {
          core: "Rest, reflection, wisdom, remembrance, story-sharing",
          elder_role: "Teach via ceremony & story; feed ancestors; maintain relational continuity",
          wisdom: "Integration of all life stages and directions; seeing whole picture",
          winter: "Time of rest but also deep work; storytelling season; reflection on full cycle",
        },
        synthesis_framework: {
          east_review: {
            direction: "East (Spring/Vision)",
            questions: [
              "What relations were identified at the beginning?",
              "How were they honored throughout?",
              "What ceremonies opened this work?",
              "Were tobacco offerings and gratitude maintained?",
            ],
          },
          south_review: {
            direction: "South (Summer/Growth)",
            questions: [
              "What embodied practices were engaged?",
              "How did land teach us?",
              "Were youth voices centered?",
              "What did we learn through physical participation?",
            ],
          },
          west_review: {
            direction: "West (Fall/Reflection)",
            questions: [
              "What emotions arose and how were they processed?",
              "Were talking circles held for collective reflection?",
              "What needed forgiveness (strawberry teaching)?",
              "How did heart-centered truth emerge?",
            ],
          },
          north_integration: {
            direction: "North (Winter/Wisdom)",
            questions: [
              "What is the deepest learning from this full cycle?",
              "How has community been strengthened?",
              "What wisdom must be passed to next generation?",
              "How do we honor ancestors who guided this work?",
            ],
          },
        },
        wisdom_distillation: {
          for_community: "What teachings serve community healing, cultural revival, sovereignty?",
          for_researchers: "What will guide future Indigenous research; lessons for other scholars?",
          for_ancestors: "What honors those who came before; how is lineage strengthened?",
          for_future: "What do next 7 generations need to know; how is path cleared for them?",
        },
        story_preparation: {
          purpose: "Wisdom is shared through story; prepare narrative for teaching",
          elements: [
            "Journey narrative: how research unfolded across directions",
            "Key teachings: what medicine wheel revealed",
            "Challenges & solutions: relational tensions and repairs",
            "Transformation: how researcher and community changed",
            "Gratitude: acknowledge all relations",
          ],
          formats: [
            "Oral storytelling at winter gatherings",
            "Written narrative for community archive",
            "Academic publication with community co-authorship",
            "Teaching curriculum for future researchers",
            "Multimedia (video, audio) with community control",
          ],
        },
        accountability: {
          question: "Has wisdom been distilled in ways that honor all relations?",
          checks: [
            "Community reviews and approves all teachings shared",
            "Elders validate wisdom for accuracy and appropriateness",
            "Future generations considered in preservation",
            "Data sovereignty maintained (OCAP®)",
            "Reciprocal benefits delivered to community",
          ],
        },
        research_duration,
        learnings,
        community_benefit,
        next_phase: "Return to East for new cycles; wisdom informs future beginnings",
      };
    },
  },
  {
    name: "north_elder_council_invocation",
    description: "Formal protocols for convening Elder council, seeking ancestral guidance, and honoring wisdom keepers. Essential for research validation and ceremonial closing.",
    inputSchema: {
      type: "object",
      properties: {
        purpose: {
          type: "string",
          enum: ["research_validation", "ceremonial_closing", "guidance_seeking", "conflict_resolution"],
          description: "Purpose of Elder council",
        },
        elders_identified: {
          type: "boolean",
          description: "Have appropriate Elders been identified and invited?",
        },
      },
      required: ["purpose"],
    },
    handler: async (args) => {
      const { purpose, elders_identified = false } = args;

      return {
        direction: "NORTH - Elder Council",
        purpose,
        elders_status: elders_identified
          ? "✓ Elders identified and invited"
          : "⚠️ CRITICAL: Identify and formally invite Elders before proceeding",
        protocol: {
          identification: [
            "Seek Elders recognized by community (not self-appointed)",
            "Consult with community leaders for recommendations",
            "Ensure diverse perspectives (gender, clan, knowledge areas)",
            "Respect Elder protocols (some may decline; honor that)",
          ],
          invitation: [
            "Personal, respectful invitation (in-person when possible)",
            "Explain research purpose clearly and humbly",
            "Offer honorarium and reciprocity (food, gifts, ongoing relationship)",
            "Provide timeline and expectations",
            "Allow Elder to set terms of participation",
          ],
          preparation: [
            "Prepare feast or meal (honor Elders through food)",
            "Create comfortable, beautiful space",
            "Bring tobacco and other offerings",
            "Smudge space with sage and cedar",
            "Ensure accessibility (transportation, mobility, language)",
          ],
          council_structure: [
            "Elder(s) lead ceremony; researcher follows",
            "Opening prayer or smudging",
            "Present research clearly; answer questions honestly",
            "Listen deeply to Elder guidance; don't defend or justify",
            "Take notes respectfully (ask permission first)",
            "Closing prayer and gratitude",
          ],
          post_council: [
            "Provide feast or meal",
            "Deliver honorarium promptly",
            "Share results with Elders before public release",
            "Maintain ongoing relationship (not transactional)",
            "Implement Elder guidance; report back on actions taken",
          ],
        },
        purposes: {
          research_validation: {
            description: "Elders review research for cultural appropriateness, accuracy, and benefit",
            questions_for_elders: [
              "Does this research honor our teachings?",
              "Are protocols being followed correctly?",
              "Will this benefit or harm community?",
              "What is missing or needs correction?",
            ],
          },
          ceremonial_closing: {
            description: "Elders guide closing ceremony to complete research cycle",
            elements: [
              "Gratitude to all relations",
              "Spirit feeding for ancestors",
              "Blessing for future",
              "Release of research (symbolically returning knowledge to community)",
            ],
          },
          guidance_seeking: {
            description: "Elders provide direction when researcher is uncertain",
            approach: "Share dilemma humbly; listen to stories and teachings; integrate guidance",
          },
          conflict_resolution: {
            description: "Elders mediate relational tensions or ethical dilemmas",
            approach: "Present all sides; Elders facilitate resolution through talking circle or mediation",
          },
        },
        elder_authority: {
          principle: "Elders have final say on cultural appropriateness",
          hierarchy: "Elder guidance > Institutional requirements when in conflict",
          example: "If Elder says research should pause or change direction, researcher must honor that",
        },
        warnings: [
          "Never bypass Elder guidance",
          "Don't Elder-shop (seeking validation until you hear what you want)",
          "Respect Elder knowledge as intellectual property",
          "Some teachings are not for sharing; honor boundaries",
        ],
        relational_accountability: "Elders are not consultants; they are relatives and knowledge keepers. Treat accordingly.",
      };
    },
  },
  {
    name: "north_spirit_feeding_ceremony",
    description: "Protocol for feeding ancestors (spirit feeding). Maintains relational continuity with those who came before. Essential for honoring lineage in research.",
    inputSchema: {
      type: "object",
      properties: {
        occasion: {
          type: "string",
          description: "When/why spirit feeding is being conducted",
        },
        elder_guidance: {
          type: "boolean",
          description: "Is Elder guidance available for ceremony?",
        },
      },
      required: ["occasion"],
    },
    handler: async (args) => {
      const { occasion, elder_guidance = false } = args;

      return {
        direction: "NORTH - Spirit Feeding",
        occasion,
        elder_guidance_status: elder_guidance
          ? "✓ Elder present to guide ceremony"
          : "⚠️ Seek Elder guidance; spirit feeding requires proper protocols",
        teaching: {
          purpose: "Feed ancestors to maintain relationship; they are hungry for connection and remembrance",
          call: "Bakademe – zhamzhenung (We are hungry; feed us)",
          belief: "Ancestors remain in relation with living; feeding them honors continuity",
        },
        protocol: {
          preparation: [
            "Prepare traditional foods (based on cultural protocols)",
            "Create sacred fire or use ceremonial space",
            "Bring tobacco, sage, cedar",
            "Invite community members (not done alone)",
          ],
          foods: [
            "Traditional dishes from community",
            "Small portions of each food cooked",
            "Prepared with prayer and intention",
            "First portions always for ancestors",
          ],
          ceremony_steps: [
            "Smudge participants and space",
            "Light sacred fire (or use designated place)",
            "Call ancestors by name (if known) or collectively",
            "Speak intention: 'We remember you; we feed you; we honor you'",
            "Place food in fire or on earth",
            "Offer tobacco",
            "Share stories of ancestors (who they were, what they taught)",
            "Feast together (living and ancestors eat together symbolically)",
          ],
          closing: [
            "Thank ancestors for guidance",
            "Ask for continued protection and wisdom",
            "Gratitude for all relations",
            "Ensure fire is properly tended or extinguished",
          ],
        },
        research_application: {
          when: "Before major research milestones, at closings, seasonal ceremonies, when seeking guidance",
          purpose_in_research: "Acknowledge that knowledge comes through ancestral lineage; research builds on those who came before",
          integration: "Ancestors as co-investigators; their wisdom informs present work",
        },
        timing: {
          seasonal: "Winter (North direction) is traditional storytelling and ceremony time",
          specific: "Anniversaries, memorials, harvest celebrations, research completions",
          ongoing: "Some communities feed ancestors daily or weekly; maintains continuity",
        },
        relational_continuity: {
          teaching: "Death is not ending; transformation and continuation of relationship",
          practice: "Feeding ancestors keeps circle intact; past, present, future connected",
          research_ethics: "If researching ancestors' knowledge or history, feed them; thank them; honor them",
        },
        warnings: [
          "Must be guided by Elder or knowledge keeper",
          "Cultural protocols vary; follow specific community teachings",
          "Sacred fire requires training; don't attempt without knowledge",
          "Respectful approach essential; not performance or appropriation",
        ],
      };
    },
  },
  {
    name: "north_story_archiving",
    description: "Preserve stories with community ownership (OCAP®). Ensure knowledge serves future generations. Audio, transcription, theme extraction, consent management.",
    inputSchema: {
      type: "object",
      properties: {
        story_count: {
          type: "number",
          description: "Number of stories to archive",
        },
        consent_level: {
          type: "string",
          enum: ["public", "community_only", "restricted", "sacred_private"],
          description: "Level of access for archived stories",
        },
        format: {
          type: "array",
          items: { type: "string" },
          description: "Formats for archiving (audio, video, transcript, etc.)",
        },
      },
      required: ["story_count", "consent_level"],
    },
    handler: async (args) => {
      const { story_count, consent_level, format = ["audio", "transcript"] } = args;

      return {
        direction: "NORTH - Story Archiving",
        story_count,
        consent_level,
        format,
        ocap_framework: {
          ownership: "Stories belong to community collectively; not researcher property",
          control: "Community determines access, use, and sharing",
          access: "Community members have right to access; outsiders require permission",
          possession: "Physical/digital files stored in community custody (on-premise, not cloud)",
        },
        archiving_workflow: {
          recording: [
            "Obtain informed consent before recording",
            "Explain how story will be used and stored",
            "Use quality recording equipment",
            "Minimize interruptions; honor storytelling flow",
          ],
          transcription: [
            "Transcribe verbatim (include pauses, laughter, emotion)",
            "Use Indigenous language when spoken; translate separately",
            "Community member reviews transcript for accuracy",
            "Return to storyteller for approval",
          ],
          theme_extraction: [
            "Identify key teachings in story",
            "Link to medicine wheel directions if applicable",
            "Note relational, spiritual, practical dimensions",
            "Community validates themes; avoid researcher imposing meaning",
          ],
          metadata: [
            "Storyteller name (with permission) or anonymous",
            "Date, location, occasion",
            "Language(s) spoken",
            "Consent level and restrictions",
            "Themes, teachings, medicine wheel links",
          ],
          storage: [
            "On-premise server or community-controlled system",
            "Encrypted if sensitive",
            "Backup in multiple locations (community controlled)",
            "Never store on commercial cloud without community approval",
          ],
        },
        consent_levels: {
          public: {
            description: "Story can be shared publicly",
            use: "Publications, teaching, websites, presentations",
            approval: "Storyteller and community both consent",
          },
          community_only: {
            description: "Story accessible to community members only",
            use: "Internal education, ceremonies, healing work",
            approval: "Community members verified before access granted",
          },
          restricted: {
            description: "Story only for specific uses or people",
            use: "Researcher use with restrictions; named individuals only",
            approval: "Storyteller specifies exactly who and how",
          },
          sacred_private: {
            description: "Story not for external sharing",
            use: "Personal/family/ceremonial use only; never published",
            approval: "Extremely limited; may be archived but not accessed without ceremony",
          },
        },
        indexing: {
          searchable_by: [
            "Theme (e.g., forgiveness, land, residential schools)",
            "Medicine wheel direction",
            "Life stage (Good Life, Fast Life, etc.)",
            "Language",
            "Storyteller (if permission given)",
            "Time period referenced",
          ],
          purpose: "Future community members can find relevant teachings; knowledge preserved and accessible",
        },
        community_verification: {
          requirement: "Before archiving final, community reviews for:",
          checks: [
            "Cultural appropriateness",
            "Accuracy of transcription and themes",
            "Consent properly documented",
            "Storage security",
            "Future use guidelines clear",
          ],
        },
        future_generations: {
          teaching: "Archive not just for now but for those who come after",
          responsibility: "Ensure stories survive and serve community healing and cultural continuity",
          seven_generations: "Will children 200 years from now be able to access and benefit?",
        },
      };
    },
  },
];
