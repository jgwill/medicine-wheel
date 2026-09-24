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

One chronicle episode, read whole: its registered node (`null` before registration, not an error) and every ceremony bound to it, closings included. `circlesHeldIn` names the circles those ceremonies were held in, most recently active first, with how many are still open.

```ts
import { circlesHeldIn, episodeNodeId } from '@medicine-wheel/client';

const ep = await wheel.episodes.get('2026-09-17-episode-349-…');   // or 'chronicle:2026-09-17-…'
ep.node_id;                  // 'chronicle:2026-09-17-episode-349-…' — episodeNodeId() spells it
ep.node === null;            // true when the episode was never registered on this wheel
circlesHeldIn(ep.ceremonies); // [{ circle_id, ceremonies, open, last }, …]
```

A ceremony gathered around something names that node in `subject_id` (0.15.5): a review's talking circle carries `subject_id: 'review:<uuid>'`, and `wheel.ceremonies.list({ subject_id: 'review:<uuid>' })` finds it from the review. The wheel refuses a `subject_id` whose node does not exist.

A consumer that filters ceremonies per reader passes only the visible ones to `circlesHeldIn`, so a circle is never named to someone who cannot read what it held.

No retry: an unreachable wheel throws `MedicineWheelClientError` with status 502; a refusal carries the wheel's status and body. `limit: 'all'` asks for the whole store.

Extracted in 0.14.0 from the MCP's `http-store.ts` and Miadi's `lib/chronicle-wheel.ts` (jgwill/Miadi#647). Spec: `rispecs/client.spec.md`.
