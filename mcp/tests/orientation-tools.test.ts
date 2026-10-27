/**
 * Orientation tools: open_gap_analysis, then turn_to_creative_orientation.
 *
 * The turn keeps an analysis's findings as current reality, names the pull to
 * fill each missing item, and points to create_structural_tension_chart. With a
 * desired outcome it returns a draft chart input whose action steps are empty.
 */
import { describe, it, expect } from 'vitest';
import { orientationTools } from '../src/tools/orientation.js';
import { allTools } from '../src/all-tools.js';

function tool(name: string) {
  const t = orientationTools.find(x => x.name === name);
  if (!t) throw new Error(`no tool ${name}`);
  return t;
}

const openArgs = {
  baseline_description: 'the published image matched the published packages',
  baseline_evidence: 'true in the previously tagged release',
  current_description: 'the newest image tag trails npm',
  current_source: 'Docker Hub tags API',
  difference: 'an intermediate release has no image',
};

describe('turn_to_creative_orientation', () => {
  it('is registered beside open_gap_analysis and orient_before_solving', () => {
    const names = allTools.map(t => t.name);
    expect(names).toContain('orient_before_solving');
    expect(names).toContain('open_gap_analysis');
    expect(names).toContain('turn_to_creative_orientation');
    expect(tool('turn_to_creative_orientation').inputSchema.required).toEqual(['analysis']);
  });

  it('turns an opened analysis: findings as current reality, reflection, next step', async () => {
    const opened = await tool('open_gap_analysis').handler(openArgs);
    expect(opened.status).toBe('opened');
    expect(opened.next_tool).toBe('turn_to_creative_orientation');

    const turned = await tool('turn_to_creative_orientation').handler({ analysis: opened.analysis });
    expect(turned.status).toBe('turned');
    expect(turned.analysis_id).toBe(opened.analysis.id);
    const facts = turned.current_reality.map((f: { fact: string }) => f.fact).join(' ');
    expect(facts).toContain(openArgs.current_description);
    expect(facts).toContain(openArgs.difference);
    expect(turned.reflection).toMatch(/fill each missing item/);
    expect(turned.reflection).toMatch(/That is not what we are doing/);
    expect(turned.next_tool).toBe('create_structural_tension_chart');
    expect(turned.next_step.needs).toEqual(['desired_outcome', 'direction']);
    expect(turned.chart_draft).toBeUndefined();
  });

  it('drafts a chart input with no action steps when a desired outcome is given', async () => {
    const opened = await tool('open_gap_analysis').handler(openArgs);
    const turned = await tool('turn_to_creative_orientation').handler({
      analysis: opened.analysis,
      desired_outcome: 'every release publishes its image from the tag',
    });
    expect(turned.chart_draft.desired_outcome).toBe('every release publishes its image from the tag');
    expect(turned.chart_draft.action_steps).toEqual([]);
    expect(turned.chart_draft.current_reality).toContain(openArgs.difference);
    expect(turned.next_step.needs).toEqual(['direction']);
  });

  it('accepts the analysis as JSON text', async () => {
    const opened = await tool('open_gap_analysis').handler(openArgs);
    const turned = await tool('turn_to_creative_orientation').handler({ analysis: JSON.stringify(opened.analysis) });
    expect(turned.status).toBe('turned');
  });

  it('answers an error, not a turn, for something that is not an analysis', async () => {
    const turned = await tool('turn_to_creative_orientation').handler({ analysis: { nope: true } });
    expect(turned.status).toBe('error');
  });
});

describe('orientation tool descriptions', () => {
  it('drop the promotional voice and point to the turn', () => {
    for (const name of ['orient_before_solving', 'open_gap_analysis']) {
      const d = tool(name).description;
      expect(d).not.toMatch(/without apology|first-class citizen|correct craft/);
      expect(d).toContain('turn_to_creative_orientation');
    }
  });
});
