/**
 * Checks state what they found as current reality (lane K9d, 2026-10-27).
 *
 * After any check that reports what it did not find, the pull is to fill each
 * missing item, one task per item. William (Episode 297, 2026-10-26): "You're
 * going to be obsessed to fill these fucking gaps, which is not what we're
 * doing." These tests hold three things for every check output that used to
 * tell its reader to add, address, strengthen or establish what it found:
 *
 * 1. the finding is stated as a fact about today, with no directive to fill it;
 * 2. the result points to turn_to_creative_orientation (`next_tool`);
 * 3. where the check names an ethical hold (consent, OCAP®, ceremony with the
 *    people in a relation), the hold is still there.
 *
 * The turn itself accepts a check's findings, so the pointer leads somewhere.
 */
import { describe, it, expect } from 'vitest';
import { turnToCreativeOrientation, DESIRED_OUTCOME_QUESTION } from '../src/gap-analysis/src/index';
import { createIndex, addEntry, indexHealth } from '../src/relational-index/src/index';
import { validateArc } from '../src/narrative-engine/src/index';
import { auditAccountability } from '../src/relational-query/src/index';
import {
  wilsonValidityCheck,
  sustainabilityCheck,
  reciprocityBalance,
  balanceCheck,
  reciprocityDebt,
} from '../src/transformation-tracker/src/index';
import { checkConsentHealth } from '../src/consent-lifecycle/src/index';
import { createReviewCircle, relationalHealthReview } from '../src/community-review/src/index';
import { findGaps } from '../src/importance-unit/src/index';
import { MedicineWheelDecomposer, RelationalEnricher } from '../src/prompt-decomposition/src/index';

/**
 * A directive to fill what was found: an imperative at the start of a
 * sentence or clause. "Ask the people in this relation" is not one of them;
 * asking is how a relation is attended to, and it fills nothing.
 */
const FILL_DIRECTIVE =
  /(^|[—:;.]\s*)(Add|Address|Fill|Close|Strengthen|Establish|Ensure|Consider|Seek|Begin|Investigate|Restore|Review|Revise|Integrate|Develop|Define|Deepen|Schedule|Conduct|Verify|Invite|Balance|Attend|Expand|Work with|Pause|Use shared)\b/i;

function expectFacts(lines: string[]) {
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) expect(line, line).not.toMatch(FILL_DIRECTIVE);
}

const emptyLog = () => ({
  id: 'trans:k9d',
  researchCycleId: 'k9d',
  snapshots: [],
  reflections: [],
  communityImpacts: [],
  relationalShifts: [],
  reciprocityLedger: [],
  sevenGenerationScore: 0,
  overallTransformation: 0,
});

describe('turnToCreativeOrientation after a check', () => {
  const input = {
    check: 'accountability_validator',
    findings: [
      'CRITICAL: The plan has no Elder co-investigators; its cultural validity rests on Elder knowledge it does not include',
      'IMPORTANT: The plan identifies no community REB; TCPS2 Chapter 9 requires dual review',
    ],
    holds: ["Hold the research while Elder co-investigators and the community's REB are part of the plan."],
  };

  it('keeps the findings and the holds as current reality', () => {
    const turn = turnToCreativeOrientation(input);
    expect(turn.analysisId).toBe('check:accountability_validator');
    expect(turn.currentReality.map(f => f.from)).toEqual(['finding', 'finding', 'hold']);
    const facts = turn.currentReality.map(f => f.fact).join(' ');
    expect(facts).toContain('The plan has no Elder co-investigators');
    expect(facts).toContain('TCPS2 Chapter 9');
    expect(facts).toContain('Hold the research while');
  });

  it('names the pull, keeps the holds, and asks for the desired outcome', () => {
    const turn = turnToCreativeOrientation(input);
    expect(turn.reflection).toMatch(/accountability_validator found what is missing: 2 findings/);
    expect(turn.reflection).toMatch(/That is not what we are doing/);
    expect(turn.reflection).toMatch(/holds stay as the check states them/);
    expect(turn.reflection).toMatch(/not filled in/);
    expect(turn.reflection).toContain(DESIRED_OUTCOME_QUESTION);
    expect(turn.nextStep.tool).toBe('create_structural_tension_chart');
  });

  it('drafts a chart whose current reality carries the hold and whose action steps are empty', () => {
    const turn = turnToCreativeOrientation(input, {
      desiredOutcome: 'a research relationship the community governs, with its Elders as co-investigators',
    });
    expect(turn.chartDraft!.action_steps).toEqual([]);
    expect(turn.chartDraft!.current_reality).toContain('Hold the research while');
  });

  it('refuses a check with no finding', () => {
    expect(() => turnToCreativeOrientation({ check: 'x', findings: [] })).toThrow(/at least one finding/);
  });
});

describe('relational-index indexHealth', () => {
  it('states coverage findings as facts about the index and points to the turn', () => {
    let index = createIndex();
    for (let i = 0; i < 6; i++) {
      index = addEntry(index, {
        unitId: `u${i}`,
        source: 'code',
        direction: 'south',
        epistemicWeight: 0.5,
        circleDepth: 1,
        accountableTo: [],
        tags: [`t${i}`],
        timestamp: '2026-10-27T00:00:00Z',
      } as never);
    }
    const health = indexHealth(index);
    expectFacts(health.recommendations);
    expect(health.recommendations).toContain("The 'land' dimension is absent (0/6 entries, expected ~2).");
    expect(health.next_tool).toBe('turn_to_creative_orientation');
  });

  it('states an empty index as a fact', () => {
    const health = indexHealth(createIndex());
    expect(health.recommendations).toEqual([
      'The index is empty: it holds no entries from any of the four epistemic sources.',
    ]);
    expect(health.next_tool).toBe('turn_to_creative_orientation');
  });
});

describe('importance-unit findGaps', () => {
  it('describes each finding as a fact about the unit', () => {
    const gaps = findGaps([
      { id: 'u1', accountabilityLinks: [], epistemicWeight: 0.9 } as never,
    ]);
    expectFacts(gaps.map(g => g.description));
    expect(gaps[0].suggestedLinkType).toBe('accountable-to');
  });
});

describe('narrative-engine validateArc', () => {
  it('states missing directions as facts and points to the turn', () => {
    const result = validateArc([], [], []);
    expectFacts(result.recommendations);
    expect(result.recommendations).toContain('The east direction has no beat');
    expect(result.next_tool).toBe('turn_to_creative_orientation');
  });
});

describe('relational-query auditAccountability', () => {
  const relation = {
    id: 'r1',
    from_id: 'a',
    to_id: 'b',
    relationship_type: 'kinship',
    strength: 0.5,
    obligations: [{ obligations: ['return the recording'] }],
    ocap: { ownership: '', control: '', access: 'public', possession: '', compliant: false },
    accountability: { respect: 0.1, reciprocity: 0.1, responsibility: 0.1, wilson_alignment: 0.1, relations_honored: [] },
  } as never;

  it('states its findings as facts and keeps the OCAP® hold with the community', () => {
    const report = auditAccountability([], [], [relation]);
    expectFacts(report.recommendations);
    const text = report.recommendations.join(' ');
    expect(text).toMatch(/lack full OCAP® compliance/);
    expect(text).toMatch(/confirmed with the community, not filled in/);
    expect(text).toMatch(/ask the people in these relations/);
    expect(text).toMatch(/obligation\(s\) are outstanding; they are held in these relations/);
    expect(report.next_tool).toBe('turn_to_creative_orientation');
  });
});

describe('transformation-tracker', () => {
  it('wilsonValidityCheck states each unmet dimension as a fact and points to the turn', () => {
    const validity = wilsonValidityCheck(emptyLog() as never);
    expect(validity.overallValid).toBe(false);
    expectFacts(validity.recommendations);
    expect(validity.recommendations).toContain('No researcher transformation is detected in this log.');
    // The validity criterion stays.
    expect(validity.recommendations.join(' ')).toMatch(/Research must benefit the community to be valid/);
    expect(validity.next_tool).toBe('turn_to_creative_orientation');
  });

  it('sustainabilityCheck and the reciprocity summaries state facts; the obligation stays held', () => {
    const sustain = sustainabilityCheck(emptyLog() as never);
    expectFacts(sustain.recommendations);
    expect(sustain.next_tool).toBe('turn_to_creative_orientation');

    const log = {
      ...emptyLog(),
      reciprocityLedger: [
        { id: 'e1', type: 'receiving', category: 'human', description: 'a story', relatedTo: 'p1', timestamp: '2026-10-27T00:00:00Z' },
        { id: 'e2', type: 'receiving', category: 'human', description: 'a teaching', relatedTo: 'p1', timestamp: '2026-10-27T00:00:00Z' },
        { id: 'e3', type: 'receiving', category: 'human', description: 'a meal', relatedTo: 'p1', timestamp: '2026-10-27T00:00:00Z' },
      ],
    } as never;
    const balance = reciprocityBalance(log);
    expect(balance.summary).not.toMatch(FILL_DIRECTIVE);
    expect(balance.summary).toMatch(/That obligation is held in these relations/);
    expect(balanceCheck(log).summary).toMatch(/That obligation is held in these relations/);
    const debt = reciprocityDebt(log);
    expect(debt.debts[0].suggestion).not.toMatch(FILL_DIRECTIVE);
    expect(debt.debts[0].suggestion).toMatch(/That obligation is held in those relations/);
  });
});

describe('consent-lifecycle checkConsentHealth', () => {
  const record = (state: string) => ({
    id: 'consent:k9d',
    grantor: 'the community',
    grantee: 'the researcher',
    scope: { description: 'stories', dataTypes: [], purposes: [], restrictions: [] },
    state,
    ceremonies: [],
    history: [],
    communityLevel: true,
    dependentRelations: [],
    ocapFlags: { compliant: false },
    expiresAt: '2026-01-01T00:00:00Z',
  }) as never;

  it('keeps the consent hold: expired consent holds use until the grantor renews it', () => {
    const health = checkConsentHealth(record('expired'));
    expect(health.issues).toContain('Consent has expired. Use under it holds until the grantor renews it.');
    expectFacts(health.recommendations);
    expect(health.recommendations.join(' ')).toMatch(/renewed with the grantor, in ceremony; it is not filled in/);
    expect(health.recommendations.join(' ')).toMatch(/confirmed with the community, not assumed/);
    expect(health.next_tool).toBe('turn_to_creative_orientation');
  });

  it('keeps the hold on a withdrawn consent', () => {
    const health = checkConsentHealth(record('withdrawn'));
    expect(health.recommendations).toEqual([
      'The relationship continues only under a new consent, reached with the grantor.',
    ]);
    expect(health.next_tool).toBe('turn_to_creative_orientation');
  });
});

describe('community-review relationalHealthReview', () => {
  it('states what the circle is today and points to the turn', () => {
    const review = relationalHealthReview(createReviewCircle('artifact:k9d', 'research'));
    expectFacts(review.recommendations);
    expect(review.recommendations).toContain('No Elder has validated this review');
    expect(review.next_tool).toBe('turn_to_creative_orientation');
  });
});

describe('prompt-decomposition', () => {
  it('acknowledges neglected directions as they are, without turning them into work', () => {
    const decomposition = new MedicineWheelDecomposer().decompose(
      'Implement the parser, build the indexer, deploy the service and run the tests.',
    );
    expect(decomposition.ceremonyGuidance).not.toBeNull();
    expect(decomposition.ceremonyGuidance!.intention).toMatch(/^Acknowledge the directions as they are held now/);
    expect(decomposition.ceremonyGuidance!.intention).toMatch(/the vision dimension holds few insights/);
    expect(decomposition.ceremonyGuidance!.intention).not.toMatch(/address the|Attend to/);
  });

  it('RelationalEnricher states accountability findings as facts and points to the turn', () => {
    const decomposition = new MedicineWheelDecomposer().decompose('Deploy the archive service.');
    const lowAlignment = {
      id: 'r1',
      from_id: 'a',
      to_id: 'b',
      relationship_type: 'archive',
      strength: 0.5,
      obligations: [],
      ocap: { compliant: false },
      accountability: { respect: 0.1, reciprocity: 0.1, responsibility: 0.1, wilson_alignment: 0.1, relations_honored: [] },
    } as never;
    const result = new RelationalEnricher().enrich(decomposition, { nodes: [], edges: [], relations: [lowAlignment] });
    expect(result.accountabilityGaps).toHaveLength(1);
    expectFacts(result.accountabilityGaps.map(g => g.suggestion));
    expect(result.accountabilityGaps[0].suggestion).toMatch(/Ask the people in this relation/);
    expect(result.next_tool).toBe('turn_to_creative_orientation');

    const none = new RelationalEnricher().enrich(decomposition, { nodes: [], edges: [], relations: [] });
    expect(none.accountabilityGaps).toHaveLength(0);
    expect(none.next_tool).toBeUndefined();
  });
});
