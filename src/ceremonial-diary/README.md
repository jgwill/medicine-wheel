# @medicine-wheel/ceremonial-diary

The ceremonial diary — a participant's voice across the **Five-Phase Ceremonial
Technology Methodology**. Intention, observation, and reflection entries, with
pattern detection, statistics, Markdown export, and optional projection into the
chronicle wheel.

This domain came home from Miadi (`jgwill/Miadi#506`) as a reusable package. It
persists through [`@medicine-wheel/storage-provider`](../storage-provider), where
**jsonl and neon are first-class equals** — the same code path serves both.

## Ceremonial Phases

| Phase | Name | Direction bridge |
| :-- | :-- | :-- |
| `miigwechiwendam` | Sacred Space Creation | east |
| `nindokendaan` | Two-Eyed Research Gathering | south |
| `ningwaab` | Knowledge Integration | west |
| `nindoodam` | Creative Expression | west |
| `migwech` | Ceremonial Closing | north |

## Usage

```ts
import { createProvider } from '@medicine-wheel/storage-provider';
import {
  createIntentionEntry,
  createReflectionEntry,
  queryDiaryEntries,
  getDiaryStatistics,
  exportToMarkdown,
  projectEntryToWheel,
} from '@medicine-wheel/ceremonial-diary';

const store = await createProvider(); // jsonl by default; MW_STORAGE_PROVIDER=neon for Postgres

const intention = await createIntentionEntry(store, {
  intention: 'Hold space for the film-production ceremony',
  participant: 'mia',
  chronicle: 'chronicle:2026-07-20-episode-074-medicine-wheel',
});

// A diary entry can write itself into the chronicle wheel (fail-open):
await projectEntryToWheel(store, intention, { ensureChronicleNode: true });

const entries = await queryDiaryEntries(store, { participant: 'mia' });
const stats = await getDiaryStatistics(store, 'mia');
const markdown = exportToMarkdown(entries);
```

## Relation to the chronicle

A diary entry optionally carries a `chronicle` reference — the medicine-wheel
node id `chronicle:<episode-folder-name>` (a `chronicle_episode` node under parent
`chronicle:miadi-chronicle`, normally registered by `@miadi/inquiry-weave`).
`projectEntryToWheel` draws the relation `participant --authored--> entry
--recorded_in--> chronicle episode`. Entries without a chronicle reference remain
fully valid — the diary can speak whether or not it writes into an episode.

## License

MIT — IAIP Collaborative, Shawinigan, QC.
