import { describe, expect, it } from "vitest";

import {
  rdfToKinshipGraph,
  kinshipGraphToCypher,
  kinshipGraphToJsonl,
  type RdfTriple,
} from "@medicine-wheel/relational-query";

const triples: RdfTriple[] = [
  { subject: "ex:river", predicate: "rdfs:label", object: "River" },
  // the subordinating axis — must NOT become a hierarchy
  { subject: "ex:river", predicate: "rdfs:subClassOf", object: "ex:water" },
  { subject: "ex:river", predicate: "rdf:type", object: "ex:Being" },
  // a predicate whose local name is itself a governed kinship edge
  { subject: "ex:elder", predicate: "ex:holds-responsibility-for", object: "ex:river" },
];

describe("rdf → flat kinship-graph migration", () => {
  const graph = rdfToKinshipGraph(triples, { source: "treaty-dataset", now: "2026-06-14T00:00:00.000Z" });

  it("creates one co-equal node per resource, all on the same flat layer", () => {
    const ids = graph.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["ex:Being", "ex:elder", "ex:river", "ex:water"]);
    // flat ontology: no node is a subclass of another — every node shares the layer
    expect(graph.nodes.every((n) => n.type === "knowledge")).toBe(true);
  });

  it("folds a literal label into node.name", () => {
    const river = graph.nodes.find((n) => n.id === "ex:river");
    expect(river?.name).toBe("River");
  });

  it("flattens subClassOf and rdf:type into the co-emerges-with kinship edge", () => {
    const subClass = graph.relations.find((r) => r.relationship_type === "subClassOf");
    expect(subClass).toBeDefined();
    expect(subClass?.from_id).toBe("ex:river");
    expect(subClass?.to_id).toBe("ex:water");
    expect(subClass?.kinship_type).toBe("co-emerges-with");

    const isa = graph.relations.find((r) => r.relationship_type === "type");
    expect(isa?.kinship_type).toBe("co-emerges-with");
  });

  it("maps a predicate whose local name is a kinship edge to that edge", () => {
    const resp = graph.relations.find((r) => r.relationship_type === "holds-responsibility-for");
    expect(resp?.kinship_type).toBe("holds-responsibility-for");
    expect(resp?.from_id).toBe("ex:elder");
  });

  it("carries source provenance into each relation's context", () => {
    expect(graph.relations.length).toBeGreaterThan(0);
    expect(graph.relations.every((r) => r.context?.authorized_by === "treaty-dataset")).toBe(true);
  });

  it("emits Cypher MERGE statements and round-trippable JSONL", () => {
    const cypher = kinshipGraphToCypher(graph);
    expect(cypher.some((s) => s.includes("MERGE") && s.includes("ex:river"))).toBe(true);
    expect(cypher.some((s) => s.includes("KINSHIP") && s.includes("co-emerges-with"))).toBe(true);

    const jsonl = kinshipGraphToJsonl(graph);
    const parsed = jsonl.split("\n").map((l) => JSON.parse(l));
    expect(parsed.filter((p) => p.kind === "node")).toHaveLength(graph.nodes.length);
    expect(parsed.filter((p) => p.kind === "relation")).toHaveLength(graph.relations.length);
  });
});
