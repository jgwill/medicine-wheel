/**
 * The MCP checks state what they found as current reality (lane K9d, 2026-10-27).
 *
 * accountability_validator, ocap_compliance_checker, wilson_paradigm_checker
 * and mw_snapshot_transformation used to answer a finding with a task list
 * ("Pause research until gaps addressed", "Strengthen relational framing",
 * "Develop OCAP®-compliant data governance agreement"). Each now states the
 * finding as a fact about the plan today, keeps its ethical hold as what must
 * be in place before the research continues, and points to
 * turn_to_creative_orientation with arguments ready to pass. Status values and
 * field names consumers may branch on are unchanged.
 *
 * Lane K9f (suite 0.27.0, mcp 4.27.0) changed one status value on purpose:
 * accountability_validator's audit_status reads "HELD" for any plan it holds,
 * whatever its score.
 */
import { describe, it, expect } from 'vitest';
import { allTools } from '../src/all-tools.js';
import { prompts } from '../src/prompts/index.js';

function findTool(name: string) {
  const tool = allTools.find(t => t.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found in allTools registry`);
  return tool;
}

const FILL_DIRECTIVE =
  /(^|[—:;.]\s*)(Add|Address|Fill|Close|Strengthen|Establish|Ensure|Consider|Seek|Begin|Investigate|Restore|Review|Revise|Integrate|Develop|Define|Deepen|Schedule|Conduct|Verify|Invite|Balance|Attend|Expand|Work with|Pause)\b/i;

function expectFacts(lines: string[]) {
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) expect(line, line).not.toMatch(FILL_DIRECTIVE);
}

async function turnWith(args: unknown) {
  return findTool('turn_to_creative_orientation').handler(args as never);
}

describe('accountability_validator', () => {
  const tool = findTool('accountability_validator');
  const extractive = {
    research_plan: {
      title: 'Survey',
      methods: 'online survey',
      pre_relationship_phase: 'none',
      advisory_board_members: 0,
      elder_investigators: 0,
      ceremony_integration: 'none planned',
      community_benefit: 'Academic publication only',
      data_storage: 'university cloud',
      reb_status: 'institutional only',
    },
  };

  it('states each finding as a fact about the plan, under the same field, and reads HELD', async () => {
    const result = await tool.handler(extractive);
    expect(result.audit_status).toBe('HELD');
    expect(result.critical_gaps).toHaveLength(7);
    expectFacts(result.critical_gaps);
    expect(result.critical_gaps[0]).toMatch(/^CRITICAL: The plan has no pre-relationship phase/);
    expect(result.critical_gaps[6]).toMatch(/^IMPORTANT: The plan identifies no community REB; TCPS2 Chapter 9 requires dual review/);
  });

  it('keeps the hold as what must be in place before the research continues', async () => {
    const result = await tool.handler(extractive);
    const recs: string[] = result.recommendations;
    expect(recs[0]).toMatch(/^Hold the research while /);
    expect(recs[0]).toMatch(/Elder co-investigators/);
    expect(recs[0]).toMatch(/community possession of the data \(OCAP®\)/);
    expect(recs[0]).toMatch(/the community's REB \(dual review, TCPS2 Chapter 9\)/);
    expect(recs[1]).toMatch(/OCAP® data governance agreement/);
    expect(recs[1]).toMatch(/not filled in from this list/);
    expect(result.next_steps).toMatch(/^CANNOT PROCEED: the research holds while /);
    for (const r of recs) expect(r).not.toMatch(/Pause research until|gaps addressed|^Establish|^Integrate|^Consult/);
  });

  it('points to turn_to_creative_orientation with arguments the turn accepts', async () => {
    const result = await tool.handler(extractive);
    expect(result.next_tool).toBe('turn_to_creative_orientation');
    expect(result.recommendations.at(-1)).toMatch(/turn_to_creative_orientation/);
    expect(result.next_tool_args.analysis.check).toBe('accountability_validator');
    expect(result.next_tool_args.analysis.findings).toEqual(result.critical_gaps);
    expect(result.next_tool_args.analysis.holds[0]).toBe(result.recommendations[0]);

    const turned = await turnWith(result.next_tool_args);
    expect(turned.status).toBe('turned');
    expect(turned.analysis_id).toBe('check:accountability_validator');
    expect(turned.current_reality.filter((f: { from: string }) => f.from === 'hold')).toHaveLength(2);
    expect(turned.reflection).toMatch(/holds stay as the check states them/);
    expect(turned.next_tool).toBe('create_structural_tension_chart');
  });

  it('keeps the hold for a single missing item and leaves an aligned plan as it was', async () => {
    const onlyReb = await tool.handler({
      research_plan: {
        pre_relationship_phase: 'two seasons',
        advisory_board_members: 5,
        elder_investigators: 2,
        ceremony_integration: 'throughout',
        community_benefit: 'land-based programme',
        data_storage: 'on-premise community server',
        reb_status: 'institutional',
      },
    });
    expect(onlyReb.audit_status).toBe('HELD');
    expect(onlyReb.recommendations[0]).toBe(
      "Hold the research while the community's REB (dual review, TCPS2 Chapter 9) is part of the plan.",
    );
    expect(onlyReb.next_tool).toBe('turn_to_creative_orientation');

    const aligned = await tool.handler({
      research_plan: {
        pre_relationship_phase: 'two seasons',
        advisory_board_members: 5,
        elder_investigators: 2,
        ceremony_integration: 'throughout',
        community_benefit: 'land-based programme',
        data_storage: 'on-premise community server',
        reb_status: 'community REB and institutional',
      },
    });
    expect(aligned.critical_gaps).toEqual([]);
    expect(aligned.next_steps).toBe('Proceed with ongoing community oversight');
    expect(aligned.next_tool).toBeUndefined();
  });

  // Lane K9e, 2026-10-27: next_steps follows the hold at any score. A plan
  // scoring 95 with only the community's REB missing used to answer "Proceed
  // with ongoing community oversight" beside a recommendation to hold.
  it('holds next_steps when only the community REB is missing, at a score of 70 or more', async () => {
    const onlyReb = await tool.handler({
      research_plan: {
        pre_relationship_phase: 'two seasons',
        advisory_board_members: 5,
        elder_investigators: 2,
        ceremony_integration: 'throughout',
        community_benefit: 'land-based programme',
        data_storage: 'on-premise community server',
        reb_status: 'institutional',
      },
    });
    expect(parseInt(onlyReb.wilson_paradigm_alignment, 10)).toBeGreaterThanOrEqual(70);
    expect(onlyReb.next_steps).toBe(
      "CANNOT PROCEED: the research holds while the community's REB (dual review, TCPS2 Chapter 9) is part of the plan, reached with the community.",
    );
    expect(onlyReb.next_steps).not.toMatch(/Proceed with ongoing community oversight/);
    expect(onlyReb.recommendations[0]).toMatch(/^Hold the research while /);
  });

  it('answers "Proceed with ongoing community oversight" only when nothing is held', async () => {
    const aligned = await tool.handler({
      research_plan: {
        pre_relationship_phase: 'two seasons',
        advisory_board_members: 5,
        elder_investigators: 2,
        ceremony_integration: 'throughout',
        community_benefit: 'land-based programme',
        data_storage: 'on-premise community server',
        reb_status: 'community REB and institutional',
      },
    });
    expect(aligned.wilson_paradigm_alignment).toBe('100%');
    expect(aligned.recommendations[0]).not.toMatch(/^Hold the research/);
    expect(aligned.next_steps).toBe('Proceed with ongoing community oversight');
  });

  // Lane K9f, 2026-10-27: audit_status follows the hold at any score. A plan
  // scoring 95 with only the community's REB missing used to read "ALIGNED"
  // beside next_steps "CANNOT PROCEED".
  const full = {
    pre_relationship_phase: 'two seasons',
    advisory_board_members: 5,
    elder_investigators: 2,
    ceremony_integration: 'throughout',
    community_benefit: 'land-based programme',
    data_storage: 'on-premise community server',
    reb_status: 'community REB and institutional',
  };
  const without: Record<string, unknown> = {
    pre_relationship_phase: 'none',
    advisory_board_members: 0,
    elder_investigators: 0,
    ceremony_integration: 'none planned',
    community_benefit: 'Academic publication only',
    data_storage: 'university cloud',
    reb_status: 'institutional',
  };

  it('reads HELD with next_steps CANNOT PROCEED when only the community REB is missing, at 95%', async () => {
    const onlyReb = await tool.handler({ research_plan: { ...full, reb_status: 'institutional' } });
    expect(onlyReb.wilson_paradigm_alignment).toBe('95%');
    expect(onlyReb.audit_status).toBe('HELD');
    expect(onlyReb.next_steps).toBe(
      "CANNOT PROCEED: the research holds while the community's REB (dual review, TCPS2 Chapter 9) is part of the plan, reached with the community.",
    );
  });

  it('keeps the score-based value, ALIGNED, for a plan with nothing held', async () => {
    const aligned = await tool.handler({ research_plan: full });
    expect(aligned.wilson_paradigm_alignment).toBe('100%');
    expect(aligned.audit_status).toBe('ALIGNED');
    expect(aligned.next_steps).toBe('Proceed with ongoing community oversight');
  });

  it('reads HELD exactly when something is held, so only HELD and ALIGNED occur', async () => {
    const keys = Object.keys(full) as (keyof typeof full)[];
    const seen = new Set<string>();
    for (let mask = 0; mask < 1 << keys.length; mask++) {
      const plan: Record<string, unknown> = { ...full };
      keys.forEach((k, i) => { if (mask & (1 << i)) plan[k] = without[k]; });
      const result = await tool.handler({ research_plan: plan });
      const held = result.critical_gaps.length > 0;
      expect(result.audit_status).toBe(held ? 'HELD' : 'ALIGNED');
      expect(result.next_steps.startsWith('CANNOT PROCEED')).toBe(held);
      seen.add(result.audit_status);
    }
    expect([...seen].sort()).toEqual(['ALIGNED', 'HELD']);
  });
});

describe('ocap_compliance_checker', () => {
  const tool = findTool('ocap_compliance_checker');

  it('states violations as facts, keeps STOP and the agreement hold, and points to the turn', async () => {
    const result = await tool.handler({
      data_plan: {
        storage_location: 'AWS S3',
        ownership_statement: 'university owns data',
        access_controls: 'open',
        community_approval: false,
      },
    });
    expect(result.ocap_status).toBe('VIOLATIONS DETECTED');
    expect(result.violations).toHaveLength(4);
    expectFacts(result.violations.map((v: string) => v.replace(/^✗ \w+: /, '')));
    expect(result.violations[0]).toMatch(/^✗ OWNERSHIP: The plan does not state community ownership/);
    expect(result.recommendations[0]).toBe('STOP: Cannot proceed with current data plan');
    expect(result.recommendations[1]).toMatch(/^Hold the research while an OCAP® data governance agreement with the community/);
    expect(result.recommendations[2]).toMatch(/consent is the community's to give/);
    expect(result.tcps2_chapter9.requirements).toContain('Dual REB approval (institutional + community)');
    expect(result.next_tool).toBe('turn_to_creative_orientation');
    expect(result.next_tool_args.analysis.holds[0]).toBe('STOP: Cannot proceed with current data plan');

    const turned = await turnWith(result.next_tool_args);
    expect(turned.status).toBe('turned');
  });

  it('words the conditional cloud pass as conditions the community confirms', async () => {
    const result = await tool.handler({
      data_plan: {
        storage_location: 'encrypted-cloud',
        ownership_statement: 'community owns all data',
        access_controls: 'restricted',
        community_approval: true,
      },
    });
    expect(result.ocap_status).toBe('CONDITIONAL — CLOUD SOVEREIGNTY');
    expectFacts(result.recommendations.slice(0, 2));
    expect(result.recommendations[0]).toMatch(/^POSSESSION passes only on condition that the community holds every encryption key/);
    expect(result.recommendations[0]).toMatch(/the pass stays conditional/);
    expect(result.next_tool).toBe('turn_to_creative_orientation');
    expect(result.next_tool_args.analysis.findings[0]).toMatch(/^⚠ POSSESSION/);
  });

  it('leaves a compliant plan as it was', async () => {
    const result = await tool.handler({
      data_plan: {
        storage_location: 'on-premise community server',
        ownership_statement: 'community owns all data',
        access_controls: 'restricted to council',
        community_approval: true,
      },
    });
    expect(result.ocap_status).toBe('COMPLIANT');
    expect(result.recommendations[0]).toBe('OCAP® compliance confirmed');
    expect(result.next_tool).toBeUndefined();
  });
});

describe('wilson_paradigm_checker', () => {
  const tool = findTool('wilson_paradigm_checker');

  it('states what the description and store show, keeps the protocol hold, and points to the turn', async () => {
    const result = await tool.handler({ research_description: 'Survey-based quantitative data collection using online forms' });
    if (result.overall_alignment.score === 3) {
      // Store evidence from other tests in this process can lift every dimension.
      expect(result.next_tool).toBeUndefined();
      return;
    }
    const recs: string[] = result.recommendations;
    expectFacts(recs.slice(0, 3));
    expect(recs.some(r => r.endsWith('(CRITICAL)'))).toBe(true);
    expect(recs).toContain(
      'Before proceeding, ask the community whose knowledge this concerns what its own protocol requires (p. 54; p. 136)',
    );
    for (const r of recs) expect(r).not.toMatch(/^(Strengthen|Integrate|Define)/);
    expect(result.next_tool).toBe('turn_to_creative_orientation');
    expect(result.next_tool_args.analysis.findings.every((f: string) => f.endsWith('(CRITICAL)'))).toBe(true);
    expect(['PARTIAL ALIGNMENT', 'WEAK ALIGNMENT']).toContain(result.overall_alignment.status);
  });
});

describe('mw_snapshot_transformation', () => {
  it('states unmet validity dimensions as facts and points to the turn', async () => {
    const result = await findTool('mw_snapshot_transformation').handler({
      researchCycleId: 'k9d',
      understanding: 'first reading',
      direction: 'east',
      ceremonyPhase: 'opening',
    });
    expect(result.status).toBe('snapshot_taken');
    expect(result.overall_valid).toBe(false);
    expectFacts(result.wilson_validity.recommendations);
    expect(result.recommendations.at(-1)).toMatch(/turn_to_creative_orientation/);
    expect(result.next_tool).toBe('turn_to_creative_orientation');
    expect(result.next_tool_args.analysis.findings).toEqual(result.wilson_validity.recommendations);
  });
});

describe('accountability_audit prompt', () => {
  it('asks for findings as current reality, the holds kept, and the turn', async () => {
    const prompt = prompts.find(p => p.name === 'accountability_audit')!;
    const [message] = await prompt.handler({ research_plan: { title: 'x' } });
    const text = message.content.text as string;
    expect(text).toMatch(/state what they found as current reality/);
    expect(text).toMatch(/Keep every hold they name/);
    expect(text).toMatch(/turn_to_creative_orientation/);
    expect(text).not.toMatch(/recommend next steps|Be honest about gaps/);
  });
});
