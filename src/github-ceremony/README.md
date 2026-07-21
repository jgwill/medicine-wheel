# @medicine-wheel/github-ceremony

Witness GitHub webhook events through a ceremonial lens and record them as
relational ceremony beads. This domain came home from Miadi (`jgwill/Miadi#506`)
as a reusable, framework-free package.

- **`build*`** functions are pure — a parsed payload in, a `CeremonyEventRecord`
  out. No storage, no Next.js, no network.
- **`process*`** functions additionally persist through
  [`@medicine-wheel/storage-provider`](../storage-provider), where jsonl and neon
  are first-class equals.

Each phase bridges onto the Four Directions (reusing `ontology-core`'s
`DirectionName`) while preserving the original ceremonial phase name.

## Usage

```ts
import { createProvider } from '@medicine-wheel/storage-provider';
import {
  processGitHubEvent,
  buildIssueCeremony,
  isCeremonialEvent,
} from '@medicine-wheel/github-ceremony';

// Pure — no storage:
const record = buildIssueCeremony({ issue }, 'jgwill/medicine-wheel');

// Persisting:
const store = await createProvider();
const result = await processGitHubEvent(
  { type: 'issues', payload: { action: 'opened', issue } },
  'jgwill/medicine-wheel',
  store,
);
```

## What stays local to Miadi

Consensus building (`pull_request_review` → agreement tracking) and the
Upstash-Redis ceremonial spiral are entangled with Miadi-specific
infrastructure. `processGitHubEvent` returns `null` for review events; the
spiral key is preserved as a deterministic identifier (`Ceremony.<kind>.<phase>.<millis>`)
without any Redis dependency.

## License

MIT — IAIP Collaborative, Shawinigan, QC.
