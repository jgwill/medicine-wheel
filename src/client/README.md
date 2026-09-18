# @medicine-wheel/client

The door to a Medicine Wheel over HTTP: nodes, edges, ceremonies, beats and the ceremonial diary, typed against `@medicine-wheel/ontology-core`, with the wheel's paging honesty (`count`, `total`, `matched`, `truncated`) carried through and fail-fast errors that name the status.

```ts
import { createMedicineWheelClient, wheelUrlFromEnv } from '@medicine-wheel/client';

const wheel = createMedicineWheelClient(wheelUrlFromEnv() ?? 'http://127.0.0.1:8040');
const page = await wheel.ceremonies.list({ episode_path: '2026-09-17-episode-349-…', limit: 'all' });
const opened = await wheel.ceremonies.create({ type: 'talking_circle', direction: 'east', participants: [], medicines_used: [], intentions: ['…'], circle_id: 'circle:…' });
const turn = await wheel.beats.create({ direction: 'east', title: 'Guillaume speaks', description: '…', ceremonies: [opened.id], speaker: 'node:human:…' });
await wheel.beats.witness(turn.id, { witnesses: ['node:human:…'] });
```

No retry: an unreachable wheel throws `MedicineWheelClientError` with status 502; a refusal carries the wheel's status and body. `limit: 'all'` asks for the whole store.

Extracted in 0.14.0 from the MCP's `http-store.ts` and Miadi's `lib/chronicle-wheel.ts` (jgwill/Miadi#647). Spec: `rispecs/client.spec.md`.
