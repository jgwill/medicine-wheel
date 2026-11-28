import { describe, expect, it } from 'vitest';
import {
  DESIGN_ENTITY_BINDING,
  DESIGN_ENTITY_KINDS,
  getKinshipEdgeType,
  inverseEdge,
  NodeTypeSchema,
  RelationalEdgeSchema,
  RelationalNodeSchema,
  type DesignRelationType,
} from '../src/ontology-core/src/index';

const now = '2026-11-27T00:00:00.000Z';

describe('design ontology', () => {
  it('carries systems and diagrams on knowledge nodes without assigning directions', () => {
    expect(DESIGN_ENTITY_KINDS).toEqual(['system', 'diagram']);
    for (const kind of DESIGN_ENTITY_KINDS) {
      const binding = DESIGN_ENTITY_BINDING[kind];
      expect(binding).toEqual({ nodeType: 'knowledge', direction: undefined });
      expect(NodeTypeSchema.safeParse(kind).success).toBe(false);
      const node = {
        id: `${kind}:example`,
        name: 'Example',
        type: binding.nodeType,
        metadata: { kind },
        created_at: now,
        updated_at: now,
      };
      expect(RelationalNodeSchema.parse(node).direction).toBeUndefined();
      expect(RelationalNodeSchema.parse({ ...node, direction: 'east' }).direction).toBe('east');
    }
  });

  it.each<[DesignRelationType, string, string, string]>([
    ['member-of', 'diagram:example', 'system:example', 'has-member'],
    ['drawn-by', 'capability:example', 'system:example', 'draws'],
  ])('registers the directed %s edge and its inverse', (name, from, to, inverse) => {
    expect(getKinshipEdgeType(name)?.symmetry).toBe('asymmetric');
    expect(inverseEdge(name)).toBe(inverse);

    const edge = {
      id: `edge:${name}`,
      from_id: from,
      to_id: to,
      relationship_type: name,
      kinship_type: name,
      strength: 1,
      ceremony_honored: false,
      obligations: [],
      created_at: now,
    };
    expect(RelationalEdgeSchema.parse(edge)).toEqual(edge);
  });
});
