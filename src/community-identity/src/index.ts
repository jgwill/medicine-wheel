/**
 * @medicine-wheel/community-identity
 *
 * Measured 2026-09-03 (`rispecs/community-identity.spec.md`): neither the wheel
 * nor Miadi could tell two people apart. This package is the smallest set of
 * facts that lets them: a person is a `human` node with a role, a circle is a
 * `circle` node, membership is a `member_of` relation, and the secrets
 * (tokens, invitation codes) are kept by the consumer, hashed, never on the
 * wheel. Roles and their permission map are copied from STPB.
 *
 * What this package does not decide (the spec's held question): whether a
 * published, unpublishable-after-72h npm package can honour OCAP's right to
 * withdraw. It carries no person's data; it carries the shape.
 */

export * from './roles.js';
export * from './people.js';
export * from './circles.js';
export * from './credentials.js';
export * from './invitations.js';
