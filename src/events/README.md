# @medicine-wheel/events

The events a Medicine Wheel writes when something happens on it: a cycle
opened, a beat recorded, a ceremony closed, a circle created, a chronicle
episode registered, a relation woven. One catalog, the envelope the events
travel in, the files that describe them for any consumer, the log they wait in,
and the seam a broker plugs into.

The wheel keeps each record's latest state in its store. This package keeps the
moments: every write the wheel commits leaves one line in `events.jsonl`
beside the store. Nothing leaves the machine until a publisher is configured.
Episode 548 of the Miadi Chronicle is choosing the broker
(jgwill/medicine-wheel#164, miadisabelle/kherix-hermeneia#70).

## For a consumer

| file | what it is |
|---|---|
| `schema/wheel-events.schema.json` | One JSON Schema (draft-07) that validates any wheel event: the envelope, plus each event's type, subject kind and payload. |
| `schema/asyncapi.json` | An AsyncAPI 3.0 document: one channel per event, addressed by its topic (`medicine-wheel.cycle.opened`). AsyncAPI is to events what OpenAPI is to HTTP; AsyncAPI Studio renders it and generators read it. It names no server, because no broker is chosen. |

```js
const schema = require('@medicine-wheel/events/schema/wheel-events.schema.json');
const { WHEEL_EVENT_CATALOG, filterEvents } = require('@medicine-wheel/events');
```

A payload carries references and labels: ids, a direction, a type. A cycle's
question, a beat's prose and a diary entry's text stay in the wheel. To read
one, fetch the record by `subject.id` from the wheel that wrote the event
(`source.instance`).

There is one exception. When two chronicle episodes are related, the
`chronicle.lineage.*` events carry the sentence that says why
(`payload.relation`). That sentence is already committed to the episode's
`episode.yaml`, so the event repeats it rather than releasing it. These
events say so with `privacy: { classification: "chronicle", content_included: true }`.

## The envelope

jgwill/Miadi's `MiadiEventEnvelope` 0.1.0
(`rispecs/events/00-miadi-event-spine.rispec.md`):

```json
{
  "id": "mwev:1792019860666:4c509d0b",
  "schema_version": "0.1.0",
  "event_type": "medicine-wheel.cycle.opened",
  "source": { "kind": "miadi", "system": "medicine-wheel", "instance": "ilex:8040" },
  "subject": { "kind": "cycle", "id": "cycle-1792019860642-hzqvkk" },
  "occurred_at": "2026-10-14T23:17:40.666Z",
  "observed_at": "2026-10-14T23:17:40.666Z",
  "correlation_id": "cycle-1792019860642-hzqvkk",
  "idempotency_key": "mwev:1792019860666:4c509d0b",
  "privacy": { "classification": "internal", "content_included": false },
  "payload": { "current_direction": "east" }
}
```

- `idempotency_key` equals `id`. A resend of the same line is the same
  occurrence; a receiver that keeps keys recognises it.
- `correlation_id` groups: a cycle and the beats recorded in it, a ceremony and
  its closing, a conclusion and the person it is about.
- An amendment names what moved in `payload.changed`. A write that changes
  nothing writes no event.

## The events

| family | events |
|---|---|
| cycle | `cycle.opened`, `cycle.amended`, `cycle.archived` |
| beat | `beat.recorded`, `beat.amended`, `beat.witnessed` |
| ceremony | `ceremony.opened`, `ceremony.closed`, `ceremony.amended`, `ceremony.removed` |
| diary | `diary.written`, `diary.amended`, `diary.removed` |
| circle | `circle.created`, `circle.amended`, `circle.removed` |
| chronicle episode | `chronicle.episode.registered`, `chronicle.episode.amended`, `chronicle.episode.removed` |
| memory conclusion | `memory.conclusion.recorded`, `memory.conclusion.judged`, `memory.conclusion.amended`, `memory.conclusion.removed` |
| node | `node.created`, `node.amended`, `node.removed` |
| chronicle lineage | `chronicle.lineage.made`, `chronicle.lineage.amended`, `chronicle.lineage.removed` — a relation between two chronicle episodes, with the why |
| relation | `relation.made`, `relation.amended`, `relation.removed` |

`WHEEL_EVENT_CATALOG` says, for each: what happened, which write produces it,
what its correlation groups, and every payload field. `PayloadOf<'beat.recorded'>`
is its payload type.

## For a producer

```ts
import { buildEvent, cycleWritten } from '@medicine-wheel/events';
import { appendEvent, eventLogPath } from '@medicine-wheel/events/log';

const input = cycleWritten(before, after, Object.keys(patch)); // null when nothing moved
if (input) appendEvent(eventLogPath(dataDir), buildEvent(input, { instance: process.env.MW_INSTANCE }));
```

The deciders (`cycleWritten`, `beatWritten`, `beatWitnessed`, `ceremonyWritten`,
`diaryWritten`, `nodeWritten`, `conclusionJudged`, `relationWritten` and the
`*Removed` ones) are shared by the wheel's HTTP routes and the MCP server's
local store, so the same act leaves the same event whichever door it used.

## Carried by git

Before any broker exists, the log can travel through the data repository it
already lives in. This is not a publisher: nothing here sends one event and
waits for a receipt.

```ts
import { commitEventLog, followEventLog } from '@medicine-wheel/events/git';
```

**On the wheel's side,** `commitEventLog` commits `events.jsonl` and nothing
else. Anything else that is changed or staged stays exactly as it was. It then
pushes. It pushes only commits that touch the log alone. When the branch also
holds someone's own data commit, it holds the push and says why. A log the
repository ignores is reported as an error, not committed by force.

In the wheel, set `MW_EVENTS_GIT_SYNC=push` (or `commit`). The wheel then
commits:

- about 30 seconds after events are recorded, so a burst travels as one commit;
- on start;
- every 10 minutes.

`mw events sync` commits now. `GET /api/events/git` shows the last pass.

**Anywhere else,** clone the data repository, then follow it:

```bash
npx -p @medicine-wheel/events mw-events follow ~/mw-data --exec ./on-event.sh
npx -p @medicine-wheel/events mw-events follow ~/mw-data --every 60   # pull every minute, print new events
```

`follow` pulls, then hands each event this follower has not handled yet to
`--exec`, oldest first:

- The event's JSON goes on stdin.
- `MW_EVENT_ID`, `MW_EVENT_TYPE`, `MW_EVENT_SUBJECT_KIND`, `MW_EVENT_SUBJECT_ID`,
  `MW_EVENT_CORRELATION` and `MW_EVENT_OBSERVED_AT` go in the environment.
- Exit 0 and the follower moves past that event. Anything else and it stops,
  and the same event comes first next time.

The cursor lives in `--state-dir`, which defaults to
`~/.local/state/medicine-wheel-events`, never in the clone. Use `--name` to give
two followers of one clone separate places.

## Publishing

```ts
import { drainLog, httpPublisher, rewind, publisherStatus } from '@medicine-wheel/events/publish';

await drainLog(logFile, httpPublisher({ url, token }));
```

Episode 548 draws an event's path as Named → Sent → Arrived | Failed →
Replayed. An event in the log is Named. `drainLog` sends each event after the
publisher's cursor, in order, and writes the outcome to `events-receipts.jsonl`:

- `arrived`: a 2xx answer.
- `failed`: unreachable, timed out, 408, 429 or 5xx. The pass stops, and the
  next one starts from the same event.
- `refused`: any other answer. It is recorded and passed, so one bad event does
  not hold back the rest.

`rewind` is Replay: it moves the cursor back, and the same lines go out again
with the same idempotency keys. Each publisher keeps its own cursor
(`events-cursor.<name>.json`).

`httpPublisher` POSTs the envelope as JSON with `Idempotency-Key` and
`X-Event-Type` headers. Each of these can receive it: a webhook endpoint, a
Hookdeck source, a Cloudflare Worker in front of a queue, or the Miadi
hooks-gateway once it accepts this envelope. A broker client would be another
`Publisher` beside it. The events and their names stay the same.

In the wheel, set `MW_EVENTS_PUBLISH_URL` (and `MW_EVENTS_PUBLISH_TOKEN`) to turn
publishing on. `GET /api/health` then reports how many events are still owed.
