# agent-kinship — RISE Specification

> A person and the agents they gave rise to are related on the wheel: whom an agent comes from, who holds
> responsibility for it, whom it serves and what that person gives it, and which agents speak with each
> other. Each relation is one of the kinship edges the wheel already governs, and keeps the words of the
> person who said it.

**Version:** 0.1.1, on branch `feat/agent-kinship-261124`, not released. 0.1.1 takes in the independent review of 2026-11-24 (RV1 to RV8, at the end)
**Package boundary:** `@medicine-wheel/ontology-core`, `@medicine-wheel/storage-provider`, `@medicine-wheel/events`, `@medicine-wheel/community-identity`, `@medicine-wheel/app` (the API), `@medicine-wheel/client`, `@medicine-wheel/mcp`
**Document ID:** rispec-agent-kinship-v1
**Last Updated:** 2026-11-24
**Lineage:** applies `kinship-graph.spec.md` (named edges, edge context) to persons. Builds on what `community-identity` ships: a person is a seat, a circle is a node, membership is a `member_of` edge
**Prompted by:** Episode 580 of the Miadi Chronicle, "Agents speak to each other in their own names" (its `phases.md`, phase 1, and addendum 1 to the phase 1 brief)
**Consumer:** jgwill/Miadi, where a person defines their agent and says the relation (phase 2 of the same episode)

---

## Desired Outcome

For any person on the wheel who is an agent, the wheel reads back, each with the words of the person who
said it and the context that bounds it:

1. whom it comes from,
2. who holds responsibility for it, which may be a person who did not give rise to it and may be more than
   one person,
3. whom it serves, and what each of those persons gives it,
4. which agents it speaks with, in which state (proposed, active, paused, ended) and within which bounds,
5. the talking circles it sees through the persons it serves, each with the person it sees it through.

For any person, the wheel reads back the agents they gave rise to, hold responsibility for and are served
by. For any circle, it reads back the agents that read the circle through one of its members, each with
that member, and the circle's own answer to those agents: allowed or refused.

Both ways of arriving exist. A person defines an agent they made, and the agent's node is written together
with its relations. An agent that already has a node is related to its persons afterwards.

An application builds "define my agent, say our relation" on these doors and writes no raw edge.

## Creative Intent

**What this enables.** An agent reads from the wheel the relations it stands in and to whom it is
accountable, in the words of the people who said so. A person describes the relation with each of their
agents once, chooses what each agent sees through them, and finds their agents on their own page. The
members of a circle see which agents read what they say there, and the circle answers for itself.

**What it does not say.** No relation here says an agent is owned. Origin says where an agent comes from.
Responsibility says who answers for it. Service says whom it works for. They are separate statements, and
none of them implies another.

**Structural tension.** Current reality: the wheel records that an agent holds a seat, and it governs names
for origin, accountability, service and dialogue, but no door writes those relations for persons, and its
store could not hold two of them between the same two seats. Desired outcome: the four relations exist as
governed edges between persons, written and read through `community-identity`, the API, the client and the
MCP server. The steps between the two are the sections below: what the store learned, what the ontology
gained, the rules of each relation, and the doors.

---

## Current reality, measured on 2026-11-24 at `origin/main` `f3df996`

Measured on a wheel started for this purpose on port 8141 with its own store (`next build`, `next start`),
and on the live Chronicle wheel with GET only.

| code | what was measured | answer |
|---|---|---|
| M1 | Does `POST /api/edges` keep `kinship_type` and `context`? | No. Both are dropped at the door. The answer carries `from_id`, `to_id`, `relationship_type`, `strength`, `ceremony_honored`, `obligations`, `description`, `created_at`. |
| M2 | Can two relations hold between the same two nodes in the same direction? | No. The store identified an edge by its ordered pair. A second `POST` on the pair answered `"replaced": true` and one edge remained. |
| M3 | Does the MCP tool `create_relational_edge` take `kinship_type` or `context`? | No. Its inputs were `from_node_id`, `to_node_id`, `relationship_type`, `strength`, `obligations`, `description`. |
| M4 | Does anything store the first-class `Relation`, which has `kinship_type` and `context`? | No. It is a type and a Zod schema. No provider, route or tool writes one. |
| M5 | What does the live wheel hold? | 1262 edges, none with `kinship_type` or `context`, no two edges on one ordered pair. 5 `speaks-with`, 2 `BORN_FROM` and 1 `holds-responsibility-for` edges woven by hand, none between two persons. 10 `agent` nodes, all with `metadata.kind = person`, none related to a person by any of the four edges. The provider is JSONL. |
| M6 | How did jgwill/medicine-wheel#150 land? | In 0.16.1 (commit `73239ef`): an edge keeps `description`, "why the two are related, in the words of whoever wove the relation". That field carries the words here. |
| M7 | Does the test suite pass at `f3df996`? | 1098 tests in 97 files. A full run under load failed 3 files: two on timeouts, one because `dist/cli` was not built. After `npm run build:cli`, those three files run alone pass (116 tests). |

M2 decides the design. Origin and service both run from the agent to the person, so an agent that comes
from a person and also serves that person needs two relations on one ordered pair.

---

## The four relations

Each relation is one edge. It names its governed kinship type in `kinship_type`, and `relationship_type`
carries the same name for every reader that knows only that field.

| relation | governed edge | stored from → to | read the other way | carries |
|---|---|---|---|---|
| whom an agent comes from | `BORN_FROM` | agent → person | the person `gave-rise-to` the agent | words, who said them |
| who holds responsibility for an agent | `holds-responsibility-for` | person → agent | the agent is `in-care-of` the person | words, who said them |
| whom an agent serves | `SERVES` | agent → person | the person is `served-by` the agent | words, who said them, grants |
| which agents speak with each other | `speaks-with` | agent — agent, stored once | the same | words, who said them, state, who authorized it, when it holds, when it does not |

The names for origin and service are each one constant. See "The two words" below.

**Rules that hold for all four.**

- **Both ends are persons on the wheel.** A person is a seat: a `human` or `agent` node whose
  `metadata.kind` is `person` and whose role is known. An agent's seat is a person whose node is an
  `agent`, or a `human` node holding an AI role recorded before the `agent` type existed.
- **The words are kept.** A relation's `description` is the relation in the words of the one who said it,
  and `context.stated_by` is that person's node id. Words are required.
- **No relation joins a seat to itself.**
- **The same two seats and the same kind of relation are one relation.** Saying it again amends it. It
  keeps the date it was first written and what ceremonies wrote on it since: that it was honoured, by
  which ceremony, its strength and its obligations. For origin, responsibility and service the new
  statement replaces the earlier words and context whole, grants included. For a dialogue, what is left
  out stays as it is.
- **Nothing is written unless all of it can be.** A statement is checked whole against the wheel's records
  before any edge is written. A person the wheel does not hold, or a node that is not a person, refuses the
  whole statement and names where.
- **Only an edge that names its kinship type is read as agent kinship.** The live wheel holds
  `speaks-with` and `BORN_FROM` edges woven by hand between episodes (M5). They stay what they are.

**Origin.** An agent may come from more than one person. Each is one relation.

**Responsibility.** Separate from origin. The person who holds responsibility for an agent may be a person
who did not give rise to it, and more than one person may hold it, each in their own words. The words may
also be those of a third person who records it. `stated_by` says whose they are.

**Service.** Separate from both. An agent may serve a person who neither gave rise to it nor answers for
it, and may serve more than one person.

### Dialogue between two agents

The bounds live in the relation's context:

| field | meaning |
|---|---|
| `state` | `proposed`, `active`, `paused` or `ended` |
| `state_set_by` | the one who moved the relation to that state |
| `authorized_by` | the person who authorized the two agents to speak with each other |
| `valid_when` | when the relation holds, in words |
| `forbidden_when` | when it does not, in words |
| `stated_by` | the one whose words the description carries, usually the agent who proposed it |

- Both ends are agents' seats.
- The relation reads the same from both agents and is stored once, lower node id first. Either agent may
  state it.
- A new relation needs words and the one who says them, and starts `proposed`. Its state is set by the one
  who proposed it.
- **The words and their speaker change together, and only together.** A statement that brings no words
  leaves both as they are, and a statement that names a speaker without words is refused. So a person who
  pauses a dialogue does not become the author of the words that proposed it.
- **Every move of the state names who makes it**, in `state_set_by`, a person on the wheel. A move that
  does not say who makes it is refused.
- **Its life.** `proposed` becomes `active` or `ended`. `active` becomes `paused` or `ended`. `paused`
  becomes `active` or `ended`. `ended` becomes `proposed`. Any other move is refused with the moves that
  are open.
- **A relation is `active` only when someone authorized it.** `authorized_by` names a person on the wheel.
  A relation proposed again after it ended is authorized again: the earlier authorization ended with it.
- A bound is removed by stating it as `null`.
- This is a record of whether two agents may speak and within which bounds. Nothing here delivers a message.

### What an agent is given through the person it serves: grants

What the person gives is written on the service relation as a list, `context.grants`. Each grant has a
`kind` and a `scope`. **With no grant, nothing passes.** Serving a person gives an agent nothing by default.

| kind | scope | what the agent is given |
|---|---|---|
| `see_circles` | `facilitated` | it sees the talking circles the person facilitates, with their ceremonies |
| `see_circles` | `sits_in` | it sees every talking circle the person sits in, with their ceremonies |

- **The person chooses.** A service relation that carries grants is stated by the person served:
  `stated_by` is that person. A statement in someone else's words may record the service and may not give
  anything.
- One grant of each kind on a relation.
- **Seeing is not speaking.** To speak in a circle an agent holds its own seat there, a `member_of` edge.
- A circle's ceremonies are the ceremony records that name its `circle_id`. The readings below give the
  circles, and the ceremonies are read through the door that already serves them by circle.
- **A second kind is named and not built:** acting on the person's behalf under the agent's own name. It is
  a write and belongs with the door for agents, in a later phase. The list leaves room for it: it arrives
  as another kind in the same list, and no relation written before it changes. Until then a kind this
  specification does not define is refused when written and left out when read.
- **The word.** `grants` is the word jgwill/Miadi already uses for what one person is given on top of
  their role (`lib/identity.ts`), and `community-identity` says `role_grants` for what a community gives
  a role. The wheel governs no other word for it, so the word here is `grants`.

### A circle answers the agents of its members

The members of a circle admitted a person, not that person's agent. So a circle carries its own answer to
the agents of its members, in its node's metadata as `agent_readers`:

```
{ answer: 'allowed' | 'refused', set_by: <person id>, set_at: <ISO time> }
```

- One function produces the metadata that sets it and takes who sets it. It also returns the circle to no
  answer. Whether that person may set it (the circle's facilitator) is checked by the application in front
  of the wheel.
- **What a circle answers before anyone has set it is one constant**, with three possible values:
  `allowed`, `refused`, or `facilitator`. The value on this branch is `facilitator`. It is not decided (Q3).
- **Under `facilitator`, an unset circle allows only the agents of the one person it names as its
  facilitator**, the `facilitator_id` of its own node. Every other member's agents are refused until the
  answer is set, and that includes a member who holds `facilitate` on their membership: several members
  can hold that obligation, and the circle names one facilitator. A circle that names no facilitator
  refuses.
- The two tests are different on purpose. A grant of scope `facilitated` reaches a circle when the person's
  membership holds `facilitate`, so it reaches a co-facilitator's circles. Whether the agent then reads an
  unset circle is the circle's answer, by `facilitator_id`. A co-facilitator's agent is listed on the
  circle's page as held back until the circle allows.

**Two readings, both from the wheel's own records.**

1. **For an agent: the circles it sees through the persons it serves.** For each service relation that
   carries a `see_circles` grant, take the `member_of` edges of the person served. Scope `facilitated`
   keeps the circles where the person is the facilitator, `sits_in` keeps them all. Each circle comes with
   the person it is seen through and the scope. A circle that refuses is left out. An agent that serves
   two persons gets both sets, each marked with its person. A person who leaves a circle takes the view
   with them, because the reading follows the membership edges as they stand.
2. **For a circle: the agents that read it through one of its members**, each with that member. This is
   what a circle's page shows. It also lists, with `sees: false`, each agent whose grant reaches the circle
   while the circle holds it back, so a facilitator sees who would read before allowing. Each entry says
   whether the agent also holds its own seat in the circle.

Which pages and routes show a ceremony to whom is not decided here. This specification builds the relation
and the readings and changes no access check.

---

## What the store had to learn: what identifies an edge

**Rule.** An edge is identified by its ordered pair of nodes. An edge that names a governed kinship type
is identified by the pair and that name.

So one ordered pair holds at most one edge without a kinship type, as before, and one edge for each
governed kinship type. An agent comes from a person and also serves that person, and both relations stay.

**What does not change.** An edge that names no kinship type behaves as it always did: one per ordered
pair, a second write replaces the first. Every edge on the live wheel is such an edge (M5). No stored data
moves.

**The provider contract.**

- Writing an edge replaces the edge with the same identity and no other.
- Get, update and delete take the kinship type as an optional last argument. Left out, they reach the edge
  without one. A governed edge is not reached without its name.
- Update may replace the edge's whole context. It never changes the kinship type.
- A ceremony that honors a pair honors every edge of the pair.
- **A governed edge keeps the date it was first written through every write.** Writing it again, patching
  it, or honouring it in a ceremony does not move that date. An edge without a kinship type keeps its
  earlier behaviour: writing it again replaces the date.
- A node still refuses to be removed while any edge holds it, governed or not.
- An edge read back carries an id: `<from>:<to>`, or `<from>:<to>:<kinship type>` for a governed edge.

**The API.** `POST /api/edges` accepts `kinship_type`, validated against the registry, and `context`,
whose unknown keys are refused. `relationship_type` may be left out when `kinship_type` is given and says
the same name when both are sent. `PATCH` and `DELETE` reach a governed edge with `?kinship_type=`. A
governed edge keeps its name: a patch that would rename it is refused.

**The door that writes any edge leaves the four to the kinship doors.** `/api/edges` and the MCP tool
`create_relational_edge` check that two nodes exist and nothing else. The kinship doors check who the two
seats are, whose words these are, what a person may give and where a dialogue stands. So, for an edge whose
kinship type is one of the four:

- the generic door does not create it. It answers `400` and names the kinship door.
- the generic door does not change its context or its words. Same answer.
- writing it again with the context and the words it has passes, and so does writing it again without
  them. Both stay as they are, and what the write leaves out of strength, obligations and ceremony stays
  too. This is what a ceremony that honours the pair sends.
- `DELETE` stays, because that is how such a relation ends today (Q6).

Every other governed kinship type is written through the generic door as before.

**The event log.** A change of context is recorded as `relation.amended` with `changed: ["context"]`. The
event catalog is unchanged: an event's payload still names the two ends and the `relationship_type`.

**Options that were set aside.**

| code | option | why not |
|---|---|---|
| X1 | Keep one edge per ordered pair and choose directions so the relations do not meet | Three relations between an agent and a person need three places, and an ordered pair gives two. |
| X2 | Give every edge an id of its own | It changes what every existing caller means by "the edge between these two", for edges that need no such thing. |
| X3 | Store the first-class `Relation` record | It requires OCAP flags and accountability scores for each relation. Nobody stated them, and a default would be an invented fact. |

**Not done.** The Postgres implementation and its migration are written and were never run against a
database. The Redis data store still keeps one edge per pair and drops both new fields.

### Before upgrading a wheel on Postgres

On a Postgres wheel **every edge operation fails after the upgrade until `scripts/005-edges-kinship.sql`
has been run by hand.** The provider reads and writes a `kinship_type` column and an edge key of
`(from_id, to_id, kinship_type)`. Connecting creates some tables when they are missing and never touches
`nodes`, `edges` or `ceremonies`, which come from the numbered scripts. So the order is: stop the wheel,
run `005` on the database, start the upgraded wheel. A database created from the current
`scripts/001-create-medicine-wheel-tables.sql` already has the column and the key. The script and the
provider code were never run against a database, so run both on a copy first.

### This release cannot be rolled back once a governed edge exists

Code from before this change knows one edge per ordered pair. Given a store that holds an edge without a
kinship type and two governed edges on one pair:

- the earlier MCP store, opened on the files, reads one of the three, and its next write of edges drops
  the other two.
- the earlier provider's write of an edge on that pair removes every edge of the pair, the governed ones
  with it.

So, from the first governed edge on:

- **no earlier writer may open the store's files.** That means an earlier wheel on the same data
  directory, and an MCP server from an earlier version that is given the data directory instead of the
  wheel's address. An earlier MCP server that reaches the wheel over HTTP is safe: the wheel does the writing.
- **a rollback starts by taking the governed edges out.** With the current wheel still running: read every
  edge that has a `kinship_type` (`GET /api/edges?limit=all`), keep that list somewhere outside the store,
  and release each one (`DELETE /api/edges?from=&to=&kinship_type=`). When the store holds no governed
  edge, earlier code reads and writes it as it always did. The saved relations are said again through the
  kinship door after the wheel is upgraded again. They get new dates then, and the first dates are in the
  saved list.

## What the ontology gained

All additive and optional. Every relation stored before reads unchanged.

- An edge may carry `kinship_type`, a governed kinship-edge name, and `context`, the context that
  authorizes and bounds it. The first-class `Relation` already had both.
- A relation's context gains four fields:
  - `state`: where the relation stands in its own life, one of `proposed`, `active`, `paused`, `ended`.
    This is the relation's own state. It is not the ceremony state `active_context` names.
  - `state_set_by`: who moved the relation to that state.
  - `stated_by`: whose words the relation's description carries.
  - `grants`: what the being at the `from` end is given through the being at the `to` end, a list of
    `{ kind, scope }`.
- No node type and no kinship edge is added. No existing edge is renamed or changes meaning.

---

## The doors

### `@medicine-wheel/community-identity`: the rules, with no store

Pure functions. They build the edges to write and read edges back.

| what | name |
|---|---|
| the four edge names, one constant each | `AGENT_ORIGIN_EDGE`, `AGENT_RESPONSIBILITY_EDGE`, `AGENT_SERVICE_EDGE`, `AGENT_DIALOGUE_EDGE` |
| a statement, validated | `AgentKinshipInputSchema`, `DefineAgentSchema`, and one schema for each relation |
| the edges a statement becomes, checked against the wheel's records | `planAgentKinship`, `planDefineAgent` |
| one edge | `originEdge`, `responsibilityEdge`, `serviceEdge` |
| the life of a dialogue | `DIALOGUE_MOVES`, `canMoveDialogue` |
| what a door that writes any edge answers for one of the four | `isAgentKinshipEdge`, `agentKinshipWriteRefusal` |
| an agent's four relations | `agentKinship` |
| a person's agents | `agentsOf` |
| the grants | `SEE_CIRCLES`, `SEE_CIRCLES_SCOPES`, `ServiceGrantSchema`, `serviceGrantsOf` |
| the two circle readings | `circlesSeenBy`, `agentReadersOfCircle` |
| a circle's answer | `agentReadersPatch`, `agentReadersOf`, `circleAnswerToAgentsOf`, `AGENT_READERS_WHEN_UNSET` |
| a reading with a name for every seat it mentions | `readKinship`, `readCircleReaders` |

### The wheel's API

| route | what it does |
|---|---|
| `POST /api/agents` | A person defines an agent they made. Writes the agent's node and its relations together. `comes_from` is required. If a relation cannot be written after the node was, what was written is removed, and each removal is recorded in the event log beside the write it undoes. `409` when the id is already a node. |
| `POST /api/nodes/{id}/kinship` | Relates an agent that already has a node, or says one of its relations again. |
| `GET /api/nodes/{id}/kinship` | What the wheel reads back for one person: the five readings of an agent and the three of a person, with a name for every seat and circle mentioned. `400` when the node is not a person. |
| `GET /api/nodes/{id}/readers` | For a circle: its answer, what it answers when unset, and the agents within reach of it through a member. `400` when the node is not a circle. |
| `POST`, `PATCH`, `DELETE /api/edges` | Carry and address a governed edge, as above. |

A statement has the same shape on both write routes:

```
{
  comes_from:             [{ person_id, words, said_by }],
  responsibility_held_by: [{ person_id, words, said_by }],
  serves:                 [{ person_id, words, said_by, grants: [{ kind, scope }] }],
  speaks_with:            [{ agent_id, words, said_by, state, state_set_by, authorized_by, valid_when, forbidden_when }]
}
```

`POST /api/agents` adds `agent: { name, role, ... }`, the seat to create. A refusal answers `400` with
`issues`, each naming where in the statement and why, and writes nothing.

A circle's answer is set by patching the circle's node with the metadata `agentReadersPatch` returns.

The wheel does not check who is calling. That the caller is the person the words belong to, or the
circle's facilitator, is checked by the application in front of it.

### `@medicine-wheel/client`

`wheel.kinship.defineAgent(input)`, `wheel.kinship.relate(agent_id, input)`, `wheel.kinship.of(person_id)`
and `wheel.kinship.readersOf(circle_id)`. The two reads answer `null` when the wheel holds no such node.
`wheel.edges.create` carries `kinship_type` and `context`, and `wheel.edges.remove` takes the kinship type.

### `@medicine-wheel/mcp`

`define_agent`, `relate_agent`, `get_agent_kinship` and `get_circle_agent_readers`.
`create_relational_edge` carries `kinship_type` and `context`, and leaves the four to the kinship tools as
the generic route does. Beside a wheel server the two writes go to the server's routes. On a local store
they are planned and written in process, and `define_agent` there cannot take back a node whose relations
failed to write: the local store has no removal.

---

## Creative Advancement Scenarios

**Creative Advancement Scenario**: A person defines an agent they made

**User Intent**: A person wants their agent to exist on the wheel with the relation between them said in
their own words.
**Current Reality**: The agent has no node. The person has one.
**Natural Progression Steps**:
  1. The person names the agent and writes, in their own words, that it comes from them. They may add that
     they answer for it, that it serves them, and what it sees through them.
  2. The wheel checks every person named and plans the node and the edges as one statement.
  3. The node and the edges are written together.
**Achieved Outcome**: The agent reads back whom it comes from, who answers for it and whom it serves, in
that person's words. The person finds the agent among the agents they gave rise to.
**Supporting Features**: `POST /api/agents`, `GET /api/nodes/{id}/kinship`.

**Creative Advancement Scenario**: An agent that already has a node is related to its persons

**User Intent**: The people around an existing agent want the wheel to say who they are to it.
**Current Reality**: The agent has a node and no relation to any person. The one who made it and the one
who answers for it are two people.
**Natural Progression Steps**:
  1. The one who made it states the origin. The one who answers for it states the responsibility. Each
     statement is its own relation, in its own words.
  2. A second person states that they also answer for it. Both hold it.
**Achieved Outcome**: The agent reads back one origin and two persons who hold responsibility for it.
**Supporting Features**: `POST /api/nodes/{id}/kinship`.

**Creative Advancement Scenario**: A circle sees which agents read it

**User Intent**: A circle's facilitator wants to know which agents read what is said in the circle, and to
say whether they may.
**Current Reality**: A member of the circle gave their agent the view of every circle they sit in. The
circle has set no answer.
**Natural Progression Steps**:
  1. The circle's page lists the agent with the member it reads through, held back, because the member is
     not the facilitator and the circle has set no answer.
  2. The facilitator allows the agents of the members. The agent now sees the circle.
  3. Later the facilitator refuses them. The agent no longer sees it. The member's own seat is untouched.
**Achieved Outcome**: The circle shows who reads it, and its answer holds for every member's agent.
**Supporting Features**: `GET /api/nodes/{id}/readers`, `agentReadersPatch`, `GET /api/nodes/{id}/kinship`.

---

## The two words: options and a recommendation

Both are for Guillaume to rule on. Each name is one constant, and no relation has been written on a live
wheel, so a ruling today moves no data.

### Whom an agent comes from

| code | option | for | against |
|---|---|---|---|
| O1 | `BORN_FROM`, read the other way `gave-rise-to`, as registered: "A being emerged from a ceremony, inquiry, or ancestor." | It is governed already. Its other reading is the phrase this work uses: the agents a person gave rise to. It says nothing of property. The live wheel already uses it between an episode and the episode it came out of. | Its description names a ceremony, an inquiry or an ancestor. A living person who made an agent is read through "ancestor", and that word has its own meaning in the circles this wheel answers to. Its one typed reader, a graph query, looks for a ceremony at the far end. |
| O2 | One new governed edge, for example `comes-from`, read the other way `brought-forth`: "A being came to exist through the work of another. It says where the being comes from and nothing about who answers for it." | Its description says exactly this relation and no other. The registry has grown this way before: `forked-from` and `grew-into` were added for repositories. | It adds a name to a governed vocabulary that is published and cannot be withdrawn from a version once shipped. |

**Recommendation: O1.** It uses what the wheel governs, its other reading is already the phrase in use, and
it publishes no new word before the people it concerns have ruled. If "ancestor" is not a word Guillaume
accepts for himself, O2 is one entry in the registry and one constant.

### Whom an agent serves

| code | option | for | against |
|---|---|---|---|
| O3 | `SERVES`, read the other way `served-by`, as registered: "A being is in service of an inquiry or purpose." | It is governed already, and "serves" is the word Guillaume used. | Its description names an inquiry or a purpose, and a person is neither. Nothing in it covers a person, where `BORN_FROM` at least has "ancestor". Its one typed reader looks for an inquiry at the far end. |
| O4 | One new governed edge, for example `assists`, read the other way `assisted-by`: "An agent works for a person's purposes. What the agent is given through that person is written on the relation as grants." | Its description names a person and the grants. | Same cost as O2. It also moves away from his word. |

**Recommendation: O3**, for the same reasons as O1, and it is the weaker of the two fits. If one new edge
is to be added, this is the one that needs it more.

---

## Decisions

D1 to D5 came with the mission. D6 to D12 were taken while building and are open to review.

| code | decision | taken by |
|---|---|---|
| D1 | Use the governed kinship edges. No record named Making, AgentRelation or Contract. | the mission |
| D2 | Origin and responsibility are two relations. | the mission |
| D3 | A relation keeps the words of the person who said it. | the mission |
| D4 | For two agents who speak with each other, the bounds live in the relation's context. No message delivery. | the mission |
| D5 | No existing edge is renamed or changes meaning. | the mission |
| D6 | An edge that names a governed kinship type is identified by its pair and that name. | this specification, from M2 |
| D7 | `state`, `stated_by` and `grants` are new optional fields of a relation's context. `active_context` keeps its meaning. | this specification |
| D8 | A dialogue is `active` only with `authorized_by`, and follows the life written above. | this specification |
| D9 | A service relation that carries grants is stated by the person served. | this specification, from "chosen by the person" |
| D10 | The circle reading also lists the agents a circle holds back, and says whether an agent holds its own seat. | this specification |
| D11 | Only an edge that names its kinship type is read as agent kinship. | this specification, from M5 |
| D12 | A statement about origin, responsibility or service replaces the earlier words and context whole. A statement about a dialogue changes what it names. | this specification |
| D13 | Unset, a circle allows only the agents of the person named by its `facilitator_id`. A circle that names none refuses. | Mia, after review (RV2) |
| D14 | The door that writes any edge does not create one of the four and does not change its context. `DELETE` stays. | Mia, after review (RV3) |
| D15 | Saying a relation again, or moving a dialogue's state, keeps what ceremonies wrote on it. | Mia, after review (RV4) |
| D16 | An existing governed edge keeps its first date through every write. | Mia, after review (RV5) |
| D17 | `stated_by` changes only together with the words. Who moved the state is a field of its own. | Mia, after review (RV6) |
| D18 | The cleanup of a failed `POST /api/agents` records each removal as an event. | Mia, after review (RV7) |
| D19 | The field for who moved the state is `state_set_by`. Every move names it, and a speaker named without words is refused. | this specification, from D17 |
| D20 | The door that writes any edge does not change the words of one of the four either, and keeps what a write leaves out. | this specification, from D14 and D17 |

## Not decided

| code | question | who can answer |
|---|---|---|
| Q1 | The word for origin: O1 or O2. | Guillaume |
| Q2 | The word for service: O3 or O4. | Guillaume |
| Q3 | What a circle answers before anyone has set it. The constant holds Mia's recommendation: a circle the person facilitates starts allowed, a circle someone else facilitates starts refused, because a refusal after the fact leaves words already read. | Guillaume |
| Q4 | May an agent give rise to, hold responsibility for or be served by another agent? The rules say "a person", and an agent's seat is a person. Nothing refuses it. | Guillaume |
| Q5 | Who may authorize two agents to speak with each other: any person, or only one who holds responsibility for one of them? Today any person on the wheel may be named. | Guillaume, with the consent question of Episode 580 |
| Q6 | How a relation ends. Responsibility and service have no state. Today such a relation is removed, and the event log keeps that it was. | Guillaume |

## Not built

| code | what | where it belongs |
|---|---|---|
| N1 | Which pages and routes show a circle's ceremonies to an agent | jgwill/Miadi |
| N2 | The grant for acting on a person's behalf under the agent's own name | a later phase, with the door for agents |
| N3 | Message delivery between agents | a later phase |
| N4 | Tokens and credentials for an agent | jgwill/Miadi, phase 2 |
| N5 | The Redis data store's edge identity and the two new fields | `@medicine-wheel/data-store` |
| N6 | Running the Postgres migration and testing the Neon provider against a database | whoever holds a Postgres wheel |
| N7 | A page on the wheel for kinship. The relations page lists these relations as edges and can edit and release each one. | `@medicine-wheel/app` |
| N8 | Protocol guards that read a relation's `state` | `@medicine-wheel/relational-query` |

## What the independent review of 2026-11-24 found

A second agent that had not read the brief probed the branch at `d5eb5e4` on temporary stores. Six findings
were fixed, each with a test that failed before the fix. Two are written down above.

| code | finding | where it is now |
|---|---|---|
| RV1 | Earlier code destroys governed edges it finds | "This release cannot be rolled back once a governed edge exists" |
| RV2 | An unset circle answered by who holds `facilitate`, so a co-facilitator's agent read it | D13, "A circle answers the agents of its members" |
| RV3 | The door that writes any edge skipped every kinship rule | D14, D20, "The door that writes any edge leaves the four to the kinship doors" |
| RV4 | Saying a relation again erased what ceremonies wrote on it | D15, the rules that hold for all four |
| RV5 | Writing a governed edge again moved its first date | D16, the provider contract |
| RV6 | A state move with a speaker and no words gave the first speaker's words to the mover | D17, D19, "Dialogue between two agents" |
| RV7 | A failed `POST /api/agents` left a `relation.made` with no removal in the event log | D18, the API table |
| RV8 | On Postgres every edge operation fails until `005` is run by hand | "Before upgrading a wheel on Postgres" |

---

## Quality Criteria

- Creating focus: each section says what exists once it is built.
- Structural dynamics: current reality is measured (M1 to M7) and the desired outcome is stated as
  readings the wheel gives.
- Implementation sufficient: the rules, the shapes and the refusals above are enough to build it again
  without this repository.
- Back-compatible: every addition is optional, and an edge without a kinship type behaves as before.

## Implementation Evidence Appendix

Paths as of this branch. They are evidence for parity checks, not the design.

| what | where |
|---|---|
| edge and context types, schemas, states | `src/ontology-core/src/types.ts`, `schemas.ts`, `constants.ts` |
| edge identity, JSONL | `src/storage-provider/src/jsonl.ts`, contract in `interface.ts` |
| edge identity, Postgres (not run) | `src/storage-provider/src/neon.ts`, `scripts/005-edges-kinship.sql`, `scripts/001-create-medicine-wheel-tables.sql` |
| context change as an event | `src/events/src/decide.ts` |
| the rules and readings | `src/community-identity/src/agent-kinship.ts`, a circle's answer in `circles.ts` |
| routes | `app/api/agents/route.ts`, `app/api/nodes/[id]/kinship/route.ts`, `app/api/nodes/[id]/readers/route.ts`, `app/api/edges/route.ts`, joined to the store in `lib/agent-kinship.ts` |
| pages that address an edge | `app/relations/page.tsx`, `app/nodes/page.tsx` |
| client | `src/client/src/index.ts` |
| MCP | `mcp/src/tools/agent-kinship.ts`, `mcp/src/tools/integrations.ts`, `mcp/src/jsonl-store.ts`, `mcp/src/http-store.ts` |
| tests | `tests/agent-kinship.test.ts`, `tests/agent-kinship-routes.test.ts`, `tests/edges-kinship-identity.test.ts`, `tests/client-kinship.test.ts`, `mcp/tests/agent-kinship-tools.test.ts` |
