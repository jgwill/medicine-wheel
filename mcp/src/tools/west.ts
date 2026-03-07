import type { Tool } from "../types.js";

export const westTools: Tool[] = [
  {
    name: "west_reflection_ceremony",
    description: "WEST Direction (Epangishmok) - Fall, Reflection, Truth (35-49 years). Sage and Strawberry medicines for talking circles, emotional processing, forgiveness, and relational healing.",
    inputSchema: {
      type: "object",
      properties: {
        reflection_focus: {
          type: "string",
          description: "What needs reflection (data analysis, emotional processing, relational tensions)",
        },
        participants: {
          type: "array",
          items: { type: "string" },
          description: "Who is involved in reflection",
        },
        ceremony_format: {
          type: "string",
          enum: ["talking_circle", "dream_work", "storytelling", "forgiveness"],
          description: "Format for reflection ceremony",
        },
      },
      required: ["reflection_focus"],
    },
    handler: async (args) => {
      const { reflection_focus, participants = [], ceremony_format = "talking_circle" } = args;

      return {
        direction: "WEST (Epangishmok — Black — Fall — Sage & Strawberry)",
        stage: "35-49 Years: Truth & Planning (Reflection & Transformation)",
        medicines: {
          sage: {
            name: "Sage",
            use: "Smudging to clear mind and heart",
            teaching: "Cleanses mental and emotional burdens; prepares for truth-speaking",
          },
          strawberry: {
            name: "Strawberry",
            teaching: "Forgiveness; release of blame; heart-shaped berry of healing",
            story: "Brother kills brother in anger; mourns for years; strawberry grows on grave; eating berry brings freedom from grief and blame",
          },
        },
        teachings: {
          core: "Death not ending but continuous transformation; accept change and loss; heart (not head) leads to peace",
          reflection: "Harvest of what has been grown; time to evaluate and integrate",
          truth_speaking: "Speak truth from heart; hold space for others' truths",
          forgiveness: "Release shame, blame, and wounds to find freedom",
        },
        ceremony_formats: {
          talking_circle: {
            description: "Sacred circle for sharing and listening; everyone equal",
            protocol: [
              "Smudge with sage before circle",
              "Pass talking piece (feather, stone, etc.); only holder speaks",
              "Speak from heart; listen from heart",
              "What is said in circle stays in circle (unless permission given)",
              "No cross-talk, advice-giving, or judgment",
              "Close with gratitude and tobacco offering",
            ],
            purpose: "Honor all voices; create safety for vulnerable sharing; collective wisdom emerges",
          },
          dream_work: {
            description: "Share and interpret dreams; spirit messages through sleep",
            protocol: [
              "Share dreams in morning or designated time",
              "Elders help interpret; community reflects together",
              "Dreams carry guidance for research and life",
              "Record dreams respectfully; honor their sacredness",
            ],
            purpose: "Access spiritual guidance; subconscious processing; messages from ancestors",
          },
          storytelling: {
            description: "Share stories of research journey; what has changed, what has been learned",
            protocol: [
              "Create comfortable, beautiful space",
              "Invite stories (don't demand)",
              "Listen without interruption",
              "Stories are living; treat with reverence",
              "Thank storytellers; reciprocate with gifts or recognition",
            ],
            purpose: "Integration through narrative; community meaning-making; oral tradition honored",
          },
          forgiveness: {
            description: "Strawberry teaching ceremony for releasing wounds",
            protocol: [
              "Share strawberries (or other heart medicine)",
              "Tell story of what needs forgiveness (self, others, ancestors, colonization)",
              "Eat strawberry as symbolic release",
              "Sage smudge to cleanse released burdens",
              "Elder guidance essential for deep wounds",
            ],
            purpose: "Healing from trauma; release of colonial wounds; freedom from shame",
          },
        },
        research_applications: {
          data_analysis: "Reflect on what data reveals; don't just categorize—feel and understand",
          relational_tensions: "Address conflicts or misunderstandings; repair through honest dialogue",
          emotional_processing: "Research stirs emotions (especially trauma-related); honor this",
          researcher_transformation: "You are changed by research; reflect on your own journey",
        },
        accountability: {
          question: "Have we honored the emotional and relational dimensions of this work?",
          checks: [
            "Talking circles held for collective reflection",
            "Emotional safety maintained for all participants",
            "Conflicts addressed through relational repair",
            "Researcher's own transformation acknowledged",
            "Forgiveness practices where needed (self, community, colonial history)",
          ],
        },
        strawberry_teaching_deep: {
          narrative: "A brother, in a moment of rage, killed his brother. He mourned for years, consumed by grief and shame. One day, a strawberry plant grew on his brother's grave. When he ate the berry, he felt his brother's forgiveness and was freed from the burden of blame. The strawberry, heart-shaped, teaches us that the heart—not the head—brings peace.",
          application: "In research involving colonial trauma, violence, or loss, forgiveness (of self, others, history) is necessary for healing. This doesn't erase harm but frees us to move forward.",
        },
        reflection_focus,
        participants,
        ceremony_format,
        next_phase: "North (Winter) will integrate this reflection into wisdom for sharing",
      };
    },
  },
  {
    name: "west_emotional_processing",
    description: "Story-based frameworks for processing difficult emotions that arise in research: trauma, grief, anger, shame. Honors heart-centered healing.",
    inputSchema: {
      type: "object",
      properties: {
        emotion_type: {
          type: "string",
          enum: ["trauma", "grief", "anger", "shame", "colonial_wounds"],
          description: "Type of emotion needing processing",
        },
        source: {
          type: "string",
          description: "Where emotion arises (research topic, participant stories, researcher's own experience)",
        },
      },
      required: ["emotion_type"],
    },
    handler: async (args) => {
      const { emotion_type, source = "research process" } = args;

      const frameworks: Record<string, any> = {
        trauma: {
          name: "Trauma Processing",
          recognition: "Research on trauma (residential schools, violence, displacement) re-traumatizes; must be handled with care",
          protocol: [
            "Mental health support available at all times",
            "Elders and cultural practitioners present",
            "Talking circles for collective processing",
            "Sage smudging for cleansing after difficult sessions",
            "Allow breaks; honor pace of healing",
          ],
          heart_centered: "Trauma lives in body and heart; rational processing is not enough",
          two_eyed_seeing: "Western therapy (e.g., trauma-informed care) + Indigenous ceremony (sweat lodge, talking circles)",
        },
        grief: {
          name: "Grief Processing",
          recognition: "Loss of land, language, culture, loved ones; grief is honored, not rushed",
          protocol: [
            "Create space for mourning; don't minimize or fix",
            "Sharing circles; collective witnessing",
            "Spirit feeding for ancestors; maintain connection to those lost",
            "Seasonal ceremonies to mark ongoing grief",
          ],
          teaching: "West is place of death and transformation; grief honored as part of life cycle",
        },
        anger: {
          name: "Anger Processing",
          recognition: "Righteous anger at injustice, colonization, ongoing oppression; valid and necessary",
          protocol: [
            "Create safe containers for anger expression",
            "Physical activity (chopping wood, sports, land work)",
            "Drumming, singing, dancing (embodied release)",
            "Transform anger into action for justice",
            "Sage to clear; avoid letting anger consume",
          ],
          teaching: "Anger signals broken relationship; channel toward repair and justice",
        },
        shame: {
          name: "Shame Release",
          recognition: "Colonial shame imposed on Indigenous identity; must be released to heal",
          protocol: [
            "Strawberry teaching; forgiveness of self",
            "Affirmation of Indigenous identity and worth",
            "Community witnessing and validation",
            "Reclaim pride in culture, language, traditions",
          ],
          teaching: "Shame is colonial inheritance; not yours to carry; release through heart",
        },
        colonial_wounds: {
          name: "Colonial Wound Healing",
          recognition: "Intergenerational trauma from residential schools, displacement, cultural genocide",
          protocol: [
            "Acknowledge history honestly; don't minimize",
            "Ceremony for ancestral healing",
            "Cultural revitalization as resistance and healing",
            "Two-Eyed Seeing: Western therapy + Indigenous ceremony",
            "Ongoing; not one-time fix",
          ],
          teaching: "Healing is multi-generational; your research can contribute to collective healing or harm—choose wisely",
        },
      };

      return {
        direction: "WEST - Emotional Processing",
        emotion: frameworks[emotion_type],
        source,
        general_principles: {
          heart_not_head: "Heart leads to peace; don't bypass emotion with rationality",
          collective_not_individual: "Healing is relational; community holds space",
          ceremony_essential: "Talking circles, smudging, spirit feeding—not optional",
          ongoing_process: "Healing is not linear; honor the spiral",
        },
        researcher_self_care: {
          warning: "You will be changed by this work; prepare for your own emotional journey",
          practices: [
            "Regular debriefing with Elder or mentor",
            "Personal ceremony and reflection",
            "Therapy if needed (Western or Indigenous)",
            "Set boundaries; you cannot carry everything",
          ],
        },
        accountability: {
          question: "Is this research causing harm (re-traumatization) or contributing to healing?",
          checks: [
            "Mental health supports in place",
            "Participants can opt out anytime",
            "Cultural safety maintained",
            "Researcher is processing their own emotions (not projecting onto community)",
          ],
        },
      };
    },
  },
  {
    name: "west_strawberry_teaching",
    description: "Deep dive into Strawberry Teaching: forgiveness, release of blame/shame, heart-centered peace. For healing colonial and personal wounds.",
    inputSchema: {
      type: "object",
      properties: {
        wound_type: {
          type: "string",
          description: "What needs forgiveness (self, other person, colonial history, etc.)",
        },
        readiness: {
          type: "boolean",
          description: "Is the person/community ready for forgiveness work? (Can't be rushed)",
        },
      },
      required: ["wound_type"],
    },
    handler: async (args) => {
      const { wound_type, readiness = true } = args;

      return {
        direction: "WEST - Strawberry Teaching",
        medicine: "Strawberry (heart-shaped; grows low to ground; sweet medicine)",
        wound_type,
        readiness_assessment: readiness
          ? "Readiness affirmed; forgiveness work can proceed with care"
          : "⚠️ NOT READY: Forgiveness cannot be rushed; honor timing; allow space for grief and anger first",
        teaching: {
          story: "Brother kills brother in anger. Grieves for years. Strawberry grows on grave. Eating berry releases grief and blame. Freedom comes through heart, not head.",
          meaning: "Forgiveness doesn't erase harm but frees us from carrying its weight. The heart (strawberry's shape) knows peace that the mind cannot find.",
          application_to_research: "Research involving trauma requires forgiveness at multiple levels: self (for not knowing enough), participants (for pain stirred), colonizers (historical and ongoing), ancestors (for burdens carried).",
        },
        protocol: {
          when_to_use: "When shame, blame, or grief blocks healing; when heart feels heavy",
          ceremony_steps: [
            "Gather strawberries (or other heart medicine if strawberries unavailable)",
            "Create safe, sacred space with Elders",
            "Smudge with sage to clear mind/heart",
            "Share story of wound (what happened, who was harmed, what was lost)",
            "Name what needs forgiveness (self, other, system)",
            "Eat strawberry slowly; visualize releasing burden",
            "Sit in silence; let heart speak",
            "Elder offers guidance or blessing",
            "Close with gratitude; tobacco offering",
          ],
          warnings: [
            "Cannot be forced; readiness is essential",
            "Doesn't erase accountability; colonizers still responsible for harm",
            "Personal forgiveness is different from systemic justice",
            "Some wounds take years; honor the timeline",
          ],
        },
        applications: {
          researcher_self_forgiveness: "You will make mistakes; Indigenous research is learning journey; forgive yourself and commit to doing better",
          participant_healing: "Sharing painful stories can bring freedom; strawberry ceremony afterward",
          colonial_history: "Collective forgiveness of colonial trauma allows moving forward without carrying poison; doesn't erase need for justice",
          relational_repair: "When conflicts arise in research team; strawberry teaching can restore peace",
        },
        heart_vs_head: {
          head_approach: "Analyze, categorize, rationalize wounds → often gets stuck in loops",
          heart_approach: "Feel, release, forgive, transform → frees energy for healing and action",
          teaching: "West direction: heart is evaluator, not head; peace comes from heart-centered truth",
        },
        next_steps: readiness
          ? [
              "Consult with Elder about strawberry ceremony",
              "Create safe space and time",
              "Prepare strawberries and sage",
              "Invite only those ready and willing",
              "Follow up with integration support",
            ]
          : [
              "Honor current stage of grief/anger",
              "Create space for those emotions first",
              "Revisit strawberry teaching when ready",
              "No pressure; healing has its own timing",
            ],
      };
    },
  },
];
