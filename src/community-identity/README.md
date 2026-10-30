# @medicine-wheel/community-identity

Who is in the circle. A person is a seat-holder: a `human` node, or an `agent` node when software holds the seat (0.17.0), with `metadata.kind = 'person'` and a `role`. `person.being` says which; the role says only what the seat may do. `personNode({ …, agent: true })` creates an agent's seat, and `speakerKindOf(node)` answers `person` or `agent` for a speaker (an AI role on a `human` node recorded before 0.17.0 still reads as `agent`); a circle is a `circle` node; membership is a `member_of` edge; ceremonies held in a circle carry `circle_id`; a circle opened for a chronicle episode carries the episode folder name in `episode_path`, the binding a ceremony carries too. Tokens and invitation codes are kept by the consumer (hashed, jsonl or your own store), never on the wheel.

Roles and the permission map are copied from STPB (`lib/types/roles.ts`): `participant → emerging_guide → ceremony_facilitator → firekeeper → admin`, with `story_keeper` parallel to firekeeper, plus `companion_ai` and `integration_ai`.

```ts
import { personNode, circleNode, membershipEdge, hasPermission, JsonlCredentialStore, JsonlInvitationStore } from '@medicine-wheel/community-identity';

const node = personNode({ name: 'Guillaume', role: 'admin' });           // POST to /api/nodes
const circle = circleNode({ name: 'Ep349 circle', intention: '…', facilitator_id: node.id });
const edge = membershipEdge(node.id, circle.id, 'facilitator');          // POST to /api/edges
hasPermission('ceremony_facilitator', 'invite_members');                 // true

const creds = new JsonlCredentialStore('/srv/miadi/identity/credentials.jsonl');
const { token } = await creds.issue(node.id, 'laptop');                  // shown once
const record = await creds.verify(token);                                // who is calling
```

A person may carry a `github_handle` (0.27.1, jgwill/medicine-wheel#170): the GitHub login the seat answers to, stored in `metadata.github_handle` without the `@`. `NewPersonSchema` accepts it, `normalizeGithubHandle(input)` returns the login or `null` when GitHub would not accept it, and `githubHandlePatch(handle, metadata)` sets it, or removes it with `null`. Keeping one handle to one person is the consumer's check, as it is for `email`.

```ts
personNode(NewPersonSchema.parse({ name: 'Mia', role: 'ceremony_facilitator', github_handle: '@miadisabelle' }));  // metadata.github_handle = 'miadisabelle'
await wheel.nodes.patch(id, { metadata: githubHandlePatch('miadisabelle', node.metadata) });
```

A person may record the accounts on a host that act for them in `local_accounts` (0.27.3, jgwill/medicine-wheel#172): a list of `{ host, user }`, a host name and a POSIX user name. `normalizeLocalAccount` returns the stored form or `null`, `sameLocalAccount` compares two, and `localAccountsPatch(list, metadata)` sets the whole list, or removes it with `null` or `[]`. Which person holds an account is the consumer's check, as it is for `email` and `github_handle`.

An invitation code opens one circle, `circle_id`, or several: `circle_ids` holds the circles after the first (0.17.5), and `invitationCircles(record)` lists them all in order. A code minted without `expires_at` lives `DEFAULT_INVITATION_TTL_HOURS` (96). `intended_email` records where it was sent. `publicInvitation()` is what a code holder may see before registering: no address, no acceptances. An invitation minted from an approved proposal also carries `intended_github_handle`, `intended_local_account` and `person_role` (0.27.3), for the consumer to give the newcomer at registration. None of the three is in the public view.

```ts
const invites = new JsonlInvitationStore('/srv/miadi/identity/invitations.jsonl');
const inv = await invites.create({ circle_id: circle.id, invited_by: node.id, intended_for: 'Jane', intended_email: 'jane@example.org' });
publicInvitation(inv, { circle_name: 'Ep349 circle', invited_by_name: 'Guillaume' });  // { code, role, state, circle_name, …, has_email: true }
```

An episode's main circle (0.26.1, jgwill/medicine-wheel#168) is the circle opened for the episode with `episode_role: 'main'`: the one place its people and agent-spirits talk as the episode develops. Its main ceremony is the `talking_circle` in it whose `subject_id` is the episode's node. `episodeCircleNames` gives the default name, "Episode <N> Root Circle" since 0.26.2, and its variations for the person to choose from; opening stays the consumer's act, because a person opens a circle.

```ts
const episode = { path: '2026-10-25-episode-563-an-episode-is-born-with-its-talking-circle', number: 563, title: 'An episode is born with its talking circle' };
episodeCircleNames(episode);          // Episode 563 Root Circle · Episode 563 circle · Episode 563 main circle · Episode 563 talking circle · Episode 563 · An episode is born…
const main = circleNode(episodeMainCircle(episode, person.id));          // episode_role: 'main', east, ongoing, private
mainCircleOf(episode.path, circles);                                     // the episode's active main circle, or null
mainCeremonyOf(records, { episode_path: episode.path, circle_id: main.id });  // its open talking circle about chronicle:<folder>
```

Added in 0.14.0 for jgwill/Miadi#647 (episode 349). Spec: `rispecs/community-identity.spec.md`.
