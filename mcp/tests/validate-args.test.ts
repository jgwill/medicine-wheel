/**
 * Required arguments are checked before a handler runs.
 *
 * The defect this exists for: nothing checked them, so a call that omitted a
 * required argument reached the handler, `String(undefined)` produced the word
 * "undefined", and the tool stored it as a record and answered `created`.
 */
import { describe, it, expect } from 'vitest';
import { missingRequired } from '../src/validate-args.js';
import { allTools } from '../src/all-tools.js';

describe('missingRequired', () => {
  const schema = { type: 'object', properties: { a: {}, b: {} }, required: ['a', 'b'] };

  it('names every required argument the call left out', () => {
    expect(missingRequired(schema, {})).toEqual(['a', 'b']);
    expect(missingRequired(schema, { a: 'x' })).toEqual(['b']);
    expect(missingRequired(schema, { a: 'x', b: 'y' })).toEqual([]);
  });

  it('treats null as absent — it is what a caller sends for "I have no value"', () => {
    expect(missingRequired(schema, { a: 'x', b: null })).toEqual(['b']);
  });

  it('accepts a falsy value that was actually given', () => {
    expect(missingRequired(schema, { a: '', b: 0 })).toEqual([]);
  });

  it('constrains nothing when the schema declares no required array', () => {
    expect(missingRequired({ type: 'object', properties: { a: {} } }, {})).toEqual([]);
    expect(missingRequired(undefined, {})).toEqual([]);
  });

  it('every registered tool declares a schema this can read', () => {
    for (const tool of allTools) {
      expect(() => missingRequired(tool.inputSchema, {}), tool.name).not.toThrow();
    }
  });
});
