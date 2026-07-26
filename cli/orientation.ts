/**
 * mw orient — which orientation does this situation call for?
 *
 * The operator surface for `@medicine-wheel/creative-orientation`. The package
 * shipped at 0.5.3 with no way to run it, which made it a library nobody could
 * reach — a spec with a package.json.
 *
 *   mw orient "catch cross-service contract breaks"
 *   mw orient "the image matches the packages" --restores "true through 0.5.0" --evidence "tagged 2026-07-17"
 *
 * It never refuses. It reports, and where the phrasing and the situation
 * disagree it says so and offers a restatement.
 */
import {
  readOrientation,
  worthSaying,
  type SituationClaim,
} from '@medicine-wheel/creative-orientation';

const C = {
  east: '\x1b[33m', south: '\x1b[31m', west: '\x1b[34m',
  green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m',
};

export function cmdOrient(positional: string[], flags: Record<string, string | boolean>): void {
  const outcome = positional.join(' ').trim();
  if (!outcome) {
    console.error('Usage: mw orient "<the outcome you want>" [--restores "<prior state>"] [--evidence "<when it existed>"]');
    console.error('');
    console.error('  Names which orientation the situation calls for.');
    console.error('  --restores  a prior state you are returning to. Its presence is what');
    console.error('              separates a repair from a creating act.');
    process.exit(2);
  }

  const restores = typeof flags.restores === 'string' ? flags.restores : null;
  const evidence = typeof flags.evidence === 'string' ? flags.evidence : undefined;

  const claim: SituationClaim = { outcome, restores, evidence };
  const reading = readOrientation(claim);

  const tint = reading.orientation === 'advancing' ? C.east : C.west;
  console.log('');
  console.log(`${C.bold}${tint}${reading.orientation}${C.reset}  →  route: ${C.bold}${reading.route}${C.reset}`);
  console.log('');
  console.log(`${C.dim}outcome:${C.reset} ${outcome}`);
  if (restores) console.log(`${C.dim}restores:${C.reset} ${restores}${evidence ? ` ${C.dim}(${evidence})${C.reset}` : ''}`);
  console.log('');

  console.log(`${C.dim}signals${C.reset}`);
  for (const s of reading.signals) {
    const mark = s.suggests === 'advancing' ? `${C.east}↑${C.reset}` : `${C.west}↻${C.reset}`;
    console.log(`  ${mark} ${C.dim}[${s.kind}]${C.reset} ${s.detail}`);
  }

  if (worthSaying(reading)) {
    console.log('');
    console.log(`${C.south}${C.bold}advice${C.reset}`);
    console.log(`  ${reading.advice}`);
    if (reading.suggestedOutcome) {
      console.log('');
      console.log(`${C.green}suggested restatement${C.reset}`);
      console.log(`  ${reading.suggestedOutcome}`);
    }
  } else {
    console.log('');
    console.log(`${C.green}the phrasing and the situation agree — nothing to say${C.reset}`);
  }
  console.log('');
}
