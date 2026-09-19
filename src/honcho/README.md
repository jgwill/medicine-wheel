# @medicine-wheel/honcho

The wheel's projection into [Honcho](https://honcho.dev) — memory that reasons. The wheel stays canonical (what was recorded, and how it relates); Honcho holds what the accumulated history has come to mean about each peer, and keeps revising it as new records arrive.

Zero dependencies beyond `fetch`, `/v3` only.

## The river: automatic, on write

A wheel server started with `HONCHO_URL` set projects **every stored beat, ceremony and diary entry** into Honcho the moment it is written, in the background. No agent in the loop, nothing to call, nothing filtered. The wheel's own answer to its caller is unchanged: a projection never delays a response, and a Honcho that is down is one line on stderr, never an error to the writer.

```
POST /api/ceremonies        → one message from the peer `medicine-wheel`, in the ceremony's session
POST /api/narrative/beats   → one message from the speaker, witnesses seated, in the session of its first ceremony
POST /api/diary             → one message in the participant's voice, in the ceremony's (or episode's) session
```

`GET /api/health` reports it: `"honcho": { "enabled": true, "url": …, "workspace": … }`, or `{ "enabled": false }`.

The MCP server writes through these routes when `MW_API_URL` is set, so beats and ceremonies logged by an agent flow too. Honcho's deriver then reasons over each session in the background and the peer representations grow on their own.

## Putting it into production

On the host that runs the wheel (eury: the chronicle wheel on `:8040`; Honcho on `:8133`):

```bash
# 1. the wheel — one variable, then restart the server (a running process holds its old build)
HONCHO_URL=http://localhost:8133        # https://honcho.<tailnet>.ts.net from another host
HONCHO_WORKSPACE_ID=medicine-wheel      # default; set it to share a workspace with Miadi (miadi-dev)
# HONCHO_API_KEY is unset while Honcho's auth is off

# 2. prove the river runs
curl -s http://127.0.0.1:8040/api/health | jq .honcho          # {"enabled":true,...}
curl -s -X POST http://127.0.0.1:8040/api/narrative/beats -H 'content-type: application/json' \
  -d '{"direction":"east","title":"River check","description":"first projected beat","learnings":[]}'
curl -s -X POST http://localhost:8133/v3/workspaces/medicine-wheel/sessions/list | jq '.items[].id'   # medicine-wheel
curl -s -X POST http://localhost:8133/v3/workspaces/medicine-wheel/sessions/medicine-wheel/messages/list | jq '.items[-1].content'

# 3. later, once the deriver has reasoned
curl -s -X POST http://localhost:8133/v3/workspaces/medicine-wheel/peers/medicine-wheel/representation -H 'content-type: application/json' -d '{}'
```

Docker: the entrypoint passes `HONCHO_URL`, `HONCHO_WORKSPACE_ID` and `HONCHO_API_KEY` through and prints the target at start.

## The door: the same three moves by hand

```ts
import { createHonchoClient, honchoFromEnv, honchoIdFor, project, projectBeat, memoryProjectionNode } from '@medicine-wheel/honcho';

const honcho = createHonchoClient(honchoFromEnv() ?? { baseUrl: 'http://localhost:8133', workspace: 'medicine-wheel' });

// project — a beat becomes a message from its speaker, in the session of its ceremony
await project(honcho, projectBeat(beat));

// recall — what Honcho has come to understand about the speaker
const who = await honcho.peers.representation(honchoIdFor(beat.speaker!));
const why = await honcho.peers.chat(honchoIdFor(beat.speaker!), 'What keeps this person from finishing a project?');

// project back — a derived conclusion returns to the wheel as a knowledge node
const node = memoryProjectionNode({
  source: 'honcho', peerId: honchoIdFor(beat.speaker!), kind: 'pattern', status: 'inferred',
  sourceEventIds: [beat.id], content: why, generatedAt: new Date().toISOString(), derivedBy: 'dialectic',
});
await wheel.nodes.create(node); // @medicine-wheel/client
```

Through MCP: `honcho_status`, `honcho_project` (a beat or ceremony by id), `honcho_recall` (representation, or a question), `honcho_project_back` (a memory projection into the wheel).

## Configuration

| Variable | Meaning |
| --- | --- |
| `HONCHO_URL` | The Honcho API. Unset: the river is off and the tools answer `unconfigured` |
| `HONCHO_WORKSPACE_ID` | Workspace; default `medicine-wheel` |
| `HONCHO_API_KEY` | Bearer token; unset for a self-hosted instance with auth off |

## Ids and sessions

Honcho names resources with `^[a-zA-Z0-9_-]+$`; wheel ids carry colons. `honchoIdFor` is the deterministic bridge (`node:human:1726:abc` → `node-human-1726-abc`, `Éloïse` → `Eloise`), and every peer, session and message carries the original as `metadata.wheel_id`, so a Honcho record can always be traced back (Honcho's `filters` body: `{"metadata": {"wheel_id": "…"}}`).

A beat lands in the session of its first ceremony, else its cycle, else the wheel's standing session `medicine-wheel`. A ceremony log lands in its own session; a diary entry in its ceremony's, else its chronicle episode's. A ceremony and everything said in it share one session, which is what lets Honcho reason over them together.
