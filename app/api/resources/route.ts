import { NextResponse } from "next/server";

const RESOURCES = [
  {
    id: "wilson-paradigm",
    name: "Shawn Wilson's Indigenous Research Paradigm",
    description: "Research is Ceremony — ontology, epistemology, axiology framework",
    content: {
      ontology: "Reality is relational — all things exist in relationship",
      epistemology: "Knowledge is shared and ceremony-based",
      axiology: "Relational accountability to all relations",
    },
  },
  {
    id: "two-eyed-seeing",
    name: "Two-Eyed Seeing (Etuaptmumk)",
    description: "Mi'kmaw framework for integrating Indigenous and Western knowledge",
    content: {
      principle: "Learn to see from one eye with the strengths of Indigenous knowledge, and from the other eye with the strengths of Western knowledge, and to use both these eyes together",
      source: "Elder Albert Marshall, Mi'kmaq",
    },
  },
  {
    id: "ocap",
    name: "OCAP® Data Sovereignty",
    description: "Ownership, Control, Access, Possession principles for First Nations data",
    content: {
      ownership: "Community collectively owns cultural information",
      control: "Community controls research processes and data management",
      access: "Community determines who has access",
      possession: "Data must be physically possessed by community (on-premise)",
    },
  },
  {
    id: "methodologies",
    name: "Indigenous Research Methodologies",
    description: "Kapati, Storywork, and Conversational methods",
    content: {
      kapati: "Kaupapa Māori research approach",
      storywork: "Jo-ann Archibald's Indigenous storywork methodology",
      conversational: "Relational dialogue-based research",
    },
  },
];

export async function GET() {
  return NextResponse.json(RESOURCES);
}
