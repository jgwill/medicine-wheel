# @medicine-wheel/honcho

The wheel's projection into [Honcho](https://honcho.dev) — memory that reasons. The wheel stays canonical (what was recorded, and how it relates); Honcho holds what the accumulated history has come to mean about each peer, and keeps revising it as new records arrive.

Three moves, zero dependencies beyond `fetch`, `/v3` only:

```ts
import { createHonchoClient, honchoFromEnv, project, projectBeat, memoryProjectionNode } from '@medicine-wheel/honcho';

const honcho = createHonchoClient(honchoFromEnv() ?? { baseUrl: 'http://localhost:8133', workspace: 'medicine-wheel' });

// 1. project — a beat becomes a message from its speaker, in the session of its ceremony
await project(honcho, projectBeat(beat));

// 2. recall — what Honcho has come to understand about the speaker
const who = await honcho.peers.representation(honchoIdFor(beat.speaker!));
const why = await honcho.peers.chat(honchoIdFor(beat.speaker!), 'What keeps this person from finishing a project?');

// 3. project back — a derived conclusion returns to the wheel as a knowledge node
const node = memoryProjectionNode({
  source: 'honcho', peerId: 'node-human-1726-abc', kind: 'pattern', status: 'inferred',
  sourceEventIds: [beat.id], content: why, generatedAt: new Date().toISOString(), derivedBy: 'dialectic',
});
await wheel.nodes.create(node); // @medicine-wheel/client
```

## Configuration

| Variable | Meaning |
| --- | --- |
| `HONCHO_URL` | The Honcho API — `http://localhost:8133` on eury, `https://honcho.<tailnet>.ts.net` elsewhere on the tailnet |
| `HONCHO_WORKSPACE_ID` | Workspace; default `medicine-wheel` |
| `HONCHO_API_KEY` | Bearer token; unset for a self-hosted instance with auth off |

## Ids

Honcho names resources with `^[a-zA-Z0-9_-]+$`; wheel ids carry colons. `honchoIdFor` is the deterministic bridge (`node:human:1726:abc` → `node-human-1726-abc`, `Éloïse` → `Eloise`), and every peer, session and message carries the original as `metadata.wheel_id`, so a Honcho record can always be traced back.

## Sessions

A beat lands in the session of its first ceremony, else its cycle, else the wheel's standing session `medicine-wheel`. A ceremony log lands in its own session. So a ceremony and its beats share one session, which is what lets Honcho reason over them together.

## Nothing is filtered here

Everything on the wheel projects as it is. Which records reach Honcho is decided by who calls `project`, not by this package.

## MCP

`@medicine-wheel/mcp` exposes the same three moves as tools: `honcho_status`, `honcho_project` (a beat or ceremony by id), `honcho_recall` (representation, or a question), `honcho_project_back` (a memory projection into the wheel).
