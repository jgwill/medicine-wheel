/**
 * Tool Registry Tests
 *
 * Validates that the allTools registry is complete and that
 * tools/list and tools/call dispatch work correctly through
 * the shared registry used by both stdio and HTTP transports.
 *
 * @see https://github.com/jgwill/medicine-wheel/issues/69
 * @see https://github.com/jgwill/medicine-wheel/issues/70
 */
import { describe, it, expect } from 'vitest';
import { allTools } from '../src/all-tools.js';

describe('allTools registry', () => {
  it('exports a non-empty array of tools', () => {
    expect(Array.isArray(allTools)).toBe(true);
    expect(allTools.length).toBeGreaterThan(50);
  });

  it('every tool has name, description, inputSchema, and handler', () => {
    for (const tool of allTools) {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    }
  });

  it('has no duplicate tool names', () => {
    const names = allTools.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('includes all four direction modules', () => {
    const names = new Set(allTools.map(t => t.name));
    expect(names.has('east_vision_inquiry')).toBe(true);
    expect(names.has('south_growth_practice')).toBe(true);
    expect(names.has('west_reflection_ceremony')).toBe(true);
    expect(names.has('north_wisdom_synthesis')).toBe(true);
  });

  it('includes validators', () => {
    const names = new Set(allTools.map(t => t.name));
    expect(names.has('accountability_validator')).toBe(true);
    expect(names.has('ocap_compliance_checker')).toBe(true);
    expect(names.has('two_eyed_seeing_bridge')).toBe(true);
    expect(names.has('wilson_paradigm_checker')).toBe(true);
  });

  it('includes ceremony lifecycle tools', () => {
    const names = new Set(allTools.map(t => t.name));
    expect(names.has('mw_ceremony_open')).toBe(true);
    expect(names.has('mw_ceremony_close')).toBe(true);
  });

  it('includes structural tension tools', () => {
    const names = new Set(allTools.map(t => t.name));
    expect(names.has('create_structural_tension_chart')).toBe(true);
  });

  it('includes Inquiry Weave registration tools', () => {
    const names = new Set(allTools.map(t => t.name));
    expect(names.has('register_inquiry_weave')).toBe(true);
    expect(names.has('list_inquiry_weaves')).toBe(true);
    expect(names.has('get_inquiry_weave')).toBe(true);
  });
});

describe('tools/list simulation', () => {
  it('maps all tools to name/description/inputSchema', () => {
    const listed = allTools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));

    expect(listed.length).toBe(allTools.length);
    for (const entry of listed) {
      expect(entry).not.toHaveProperty('handler');
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.description).toBe('string');
      expect(entry.inputSchema).toBeDefined();
    }
  });
});

describe('tools/call dispatch', () => {
  it('finds a tool by name and calls its handler', async () => {
    const toolName = 'two_eyed_seeing_bridge';
    const tool = allTools.find(t => t.name === toolName);
    expect(tool).toBeDefined();

    const result = await tool!.handler({
      concept: 'consent',
      direction: 'integrate_both',
    });

    expect(result).toBeDefined();
    expect(result.framework).toContain('Two-Eyed Seeing');
    expect(result.concept).toBe('consent');
  });

  it('returns undefined for unknown tool name', () => {
    const tool = allTools.find(t => t.name === 'nonexistent_tool_xyz');
    expect(tool).toBeUndefined();
  });
});
