# @medicine-wheel/community-identity

Who is in the circle. A person is a `human` node on the wheel with `metadata.kind = 'person'` and a `role`; a circle is a `circle` node; membership is a `member_of` edge; ceremonies held in a circle carry `circle_id`; a circle opened for a chronicle episode carries the episode folder name in `episode_path`, the binding a ceremony carries too. Tokens and invitation codes are kept by the consumer (hashed, jsonl or your own store), never on the wheel.

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

An invitation code opens one circle. A code minted without `expires_at` lives `DEFAULT_INVITATION_TTL_HOURS` (96). `intended_email` records where it was sent. `publicInvitation()` is what a code holder may see before registering: no address, no acceptances.

```ts
const invites = new JsonlInvitationStore('/srv/miadi/identity/invitations.jsonl');
const inv = await invites.create({ circle_id: circle.id, invited_by: node.id, intended_for: 'Jane', intended_email: 'jane@example.org' });
publicInvitation(inv, { circle_name: 'Ep349 circle', invited_by_name: 'Guillaume' });  // { code, role, state, circle_name, …, has_email: true }
```

Added in 0.14.0 for jgwill/Miadi#647 (episode 349). Spec: `rispecs/community-identity.spec.md`.
