import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  circleFromNode,
  circleNode,
  circlesOf,
  hasPermission,
  hasRoleLevel,
  invitationState,
  JsonlCredentialStore,
  JsonlInvitationStore,
  membersOf,
  membershipEdge,
  personFromNode,
  personNode,
  publicCredential,
  roleGrant,
  rolesAtOrAbove,
  TOKEN_PREFIX,
} from "../src/community-identity/src/index";

let tempDir: string;
beforeEach(() => { tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-identity-")); });
afterEach(() => { fs.rmSync(tempDir, { recursive: true, force: true }); });

describe("roles", () => {
  it("copies STPB's permission map and hierarchy", () => {
    expect(hasPermission("participant", "join_circles")).toBe(true);
    expect(hasPermission("participant", "create_circles")).toBe(false);
    expect(hasPermission("ceremony_facilitator", "invite_members")).toBe(true);
    expect(hasPermission("admin", "manage_people")).toBe(true);
    expect(hasRoleLevel("story_keeper", "firekeeper")).toBe(true);
    expect(hasRoleLevel("emerging_guide", "firekeeper")).toBe(false);
    expect(rolesAtOrAbove("firekeeper")).toEqual(["firekeeper", "story_keeper", "admin"]);
  });
});

describe("people and circles on the wheel", () => {
  it("a person is a human node with kind and role; a circle is a circle node; membership is an edge", () => {
    const g = personNode({ name: "Guillaume", role: "admin", email: "g@example.org" });
    expect(g.type).toBe("human");
    expect(personFromNode(g)).toMatchObject({ id: g.id, name: "Guillaume", role: "admin", email: "g@example.org" });
    expect(personFromNode({ ...g, metadata: {} })).toBeNull();
    expect(roleGrant("firekeeper", { email: "x" })).toEqual({ email: "x", kind: "person", role: "firekeeper" });

    const c = circleNode({ name: "Ep349", intention: "one ceremony", facilitator_id: g.id });
    expect(c.type).toBe("circle");
    const circle = circleFromNode(c)!;
    expect(circle.container.private_by_default).toBe(true);
    expect(circle.facilitator_id).toBe(g.id);

    const m = personNode({ name: "Mia", role: "participant" });
    const edges = [membershipEdge(g.id, c.id, "facilitator"), membershipEdge(m.id, c.id)];
    expect(membersOf(c.id, edges).map((x) => x.role)).toEqual(["facilitator", "member"]);
    expect(circlesOf(m.id, edges)).toHaveLength(1);
  });
});

describe("credentials (never on the wheel)", () => {
  it("issues a token once, verifies by hash, lists without the hash, revokes", async () => {
    const store = new JsonlCredentialStore(path.join(tempDir, "creds.jsonl"));
    const { token, record } = await store.issue("node:human:g", "laptop");
    expect(token.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(record.token_hash).not.toContain(token);
    expect(await store.verify(token)).toMatchObject({ id: record.id, person_id: "node:human:g" });
    expect(await store.verify("mwt_nope")).toBeNull();
    expect(await store.verify("")).toBeNull();
    const listed = await store.list("node:human:g");
    expect(listed).toHaveLength(1);
    expect(listed[0].last_used_at).toBeDefined();
    expect(publicCredential(listed[0])).not.toHaveProperty("token_hash");
    expect(await store.revoke(record.id, "node:human:other")).toBe(false);
    expect(await store.revoke(record.id, "node:human:g")).toBe(true);
    expect(await store.verify(token)).toBeNull();
    expect((fs.statSync(path.join(tempDir, "creds.jsonl")).mode & 0o077)).toBe(0);
  });
});

describe("invitations (the door into a circle)", () => {
  it("mints a code, accepts once per person, honours max_uses, expiry and revocation", async () => {
    const store = new JsonlInvitationStore(path.join(tempDir, "invites.jsonl"));
    const inv = await store.create({ circle_id: "circle:1", invited_by: "node:human:g", max_uses: 2 });
    expect(inv.code).toHaveLength(8);
    expect(invitationState(inv)).toBe("open");
    expect((await store.accept(inv.code.toLowerCase(), "node:human:m")).ok).toBe(true);
    expect(await store.accept(inv.code, "node:human:m")).toEqual({ ok: false, reason: "already" });
    expect((await store.accept(inv.code, "node:human:a")).ok).toBe(true);
    expect(await store.accept(inv.code, "node:human:z")).toEqual({ ok: false, reason: "exhausted" });
    expect(await store.accept("NOPE1234", "x")).toEqual({ ok: false, reason: "unknown" });

    const expired = await store.create({ circle_id: "circle:1", invited_by: "g", expires_at: new Date(Date.now() - 1000).toISOString() });
    expect(await store.accept(expired.code, "x")).toEqual({ ok: false, reason: "expired" });
    const revoked = await store.create({ circle_id: "circle:1", invited_by: "g" });
    expect(await store.revoke(revoked.code)).toBe(true);
    expect(await store.accept(revoked.code, "x")).toEqual({ ok: false, reason: "revoked" });
    expect(await store.listForCircle("circle:1")).toHaveLength(3);
  });

  it("a code minted without an expiry lives DEFAULT_INVITATION_TTL_HOURS; the address stays out of the public view", async () => {
    const { DEFAULT_INVITATION_TTL_HOURS, publicInvitation } = await import("../src/community-identity/src/index");
    const store = new JsonlInvitationStore(path.join(tempDir, "invites-ttl.jsonl"));
    const before = Date.now();
    const inv = await store.create({ circle_id: "circle:1", invited_by: "g", intended_for: "Jane", intended_email: " Jane@Example.org " });
    expect(DEFAULT_INVITATION_TTL_HOURS).toBe(96);
    const ttl = Date.parse(inv.expires_at!) - before;
    expect(ttl).toBeGreaterThanOrEqual(96 * 3600_000 - 1000);
    expect(ttl).toBeLessThanOrEqual(96 * 3600_000 + 1000);
    expect(inv.intended_email).toBe("jane@example.org");
    expect(invitationState(inv, before + 97 * 3600_000)).toBe("expired");

    const view = publicInvitation(inv, { circle_name: "Fire circle", invited_by_name: "G" });
    expect(view).toEqual({ code: inv.code, role: "member", state: "open", circle_name: "Fire circle", invited_by_name: "G", intended_for: "Jane", expires_at: inv.expires_at, has_email: true });
    expect(JSON.stringify(view)).not.toContain("example.org");
    expect(view).not.toHaveProperty("accepted_by");

    const explicit = await store.create({ circle_id: "circle:1", invited_by: "g", expires_at: "2030-01-01T00:00:00.000Z" });
    expect(explicit.expires_at).toBe("2030-01-01T00:00:00.000Z");
    expect(publicInvitation(explicit, { circle_name: "C" }).has_email).toBe(false);
  });
});

describe("status, circle fields, audit and config (0.14.1)", () => {
  it("a person can be deactivated and reactivated through metadata patches", async () => {
    const { personNode, personFromNode, deactivatePatch, reactivatePatch } = await import("../src/community-identity/src/index");
    const g = personNode({ name: "G", role: "admin" });
    expect(personFromNode(g)!.status).toBe("active");
    const off = { ...g, metadata: deactivatePatch(g.metadata) };
    expect(personFromNode(off)!.status).toBe("deactivated");
    const on = { ...off, metadata: reactivatePatch(off.metadata) };
    expect(personFromNode(on)!.status).toBe("active");
    expect(on.metadata.deactivated_at).toBeUndefined();
  });
  it("a circle has a type, visibility and status, and a patch applies to its node", async () => {
    const { circleNode, circleFromNode, circleNodePatch, CirclePatchSchema } = await import("../src/community-identity/src/index");
    const c = circleNode({ name: "C", intention: "i", facilitator_id: "g" });
    const circle = circleFromNode(c)!;
    expect(circle).toMatchObject({ circle_type: "ongoing", is_public: false, active: true });
    const patch = CirclePatchSchema.parse({ active: false, capacity: 12, is_public: true, circle_type: "seasonal", container: { hide_engagement_metrics: false } });
    const np = circleNodePatch(c, patch);
    const after = circleFromNode({ ...c, metadata: np.metadata })!;
    expect(after).toMatchObject({ active: false, capacity: 12, is_public: true, circle_type: "seasonal" });
    expect(after.container.hide_engagement_metrics).toBe(false);
    expect(after.container.private_by_default).toBe(true);
    expect(() => CirclePatchSchema.parse({ nope: 1 })).toThrow();
  });
  it("a circle opened for an episode carries its folder name, and a patch binds or releases it", async () => {
    const { circleNode, circleFromNode, circleNodePatch, CirclePatchSchema, NewCircleSchema } = await import("../src/community-identity/src/index");
    const ep = "2026-07-30-episode-303-state-diagrams-as-the-design-surface";
    const input = NewCircleSchema.parse({ name: "Diagrams", intention: "draw together", facilitator_id: "g", episode_path: ` ${ep} ` });
    const c = circleNode(input);
    expect(c.metadata!.episode_path).toBe(ep);
    expect(circleFromNode(c)!.episode_path).toBe(ep);
    expect(circleFromNode(circleNode({ name: "Free", intention: "i", facilitator_id: "g" }))!.episode_path).toBeUndefined();
    const released = circleFromNode({ ...c, metadata: circleNodePatch(c, CirclePatchSchema.parse({ episode_path: null })).metadata })!;
    expect(released.episode_path).toBeUndefined();
    const rebound = circleFromNode({ ...c, metadata: circleNodePatch(c, CirclePatchSchema.parse({ episode_path: "2026-09-17-episode-349-x" })).metadata })!;
    expect(rebound.episode_path).toBe("2026-09-17-episode-349-x");
  });
  it("the audit store appends, queries newest first with filters, and counts since", async () => {
    const { JsonlAuditStore } = await import("../src/community-identity/src/index");
    const store = new JsonlAuditStore(path.join(tempDir, "audit.jsonl"));
    await store.log({ actor_id: "g", action: "person.created", entity_type: "person", entity_id: "m", at: "2026-09-18T01:00:00.000Z" });
    await store.log({ actor_id: "g", action: "token.issued", entity_type: "token", entity_id: "t1", at: "2026-09-18T02:00:00.000Z" });
    await store.log({ actor_id: "m", action: "turn.spoken", entity_type: "beat", entity_id: "b1", at: "2026-09-18T03:00:00.000Z" });
    const all = await store.query();
    expect(all.total).toBe(3);
    expect(all.records[0].action).toBe("turn.spoken");
    expect((await store.query({ actor_id: "g" })).total).toBe(2);
    expect((await store.query({ action: ["token.issued", "turn.spoken"], since: "2026-09-18T02:30:00.000Z" })).records.map((r) => r.action)).toEqual(["turn.spoken"]);
    expect((await store.query({ limit: 1 })).truncated).toBe(true);
    expect(await store.countSince("2026-09-18T01:30:00.000Z")).toEqual({ "token.issued": 1, "turn.spoken": 1 });
  });
  it("the config store validates, applies grants to permissions, and keeps who changed it", async () => {
    const { JsonConfigStore, DEFAULT_CONFIG, validateConfigPatch, mayDo, permissionsFor } = await import("../src/community-identity/src/index");
    const store = new JsonConfigStore(path.join(tempDir, "config.json"));
    expect(await store.get()).toEqual(DEFAULT_CONFIG);
    const { patch, errors } = validateConfigPatch({ registration: "open", default_role: "emerging_guide", role_grants: { participant: ["witness"] }, site_notice: "hello", bogus: 1 });
    expect(errors).toEqual([]);
    const saved = await store.set(patch, "g");
    expect(saved).toMatchObject({ registration: "open", default_role: "emerging_guide", updated_by: "g", site_notice: "hello" });
    expect(mayDo("participant", "witness", saved)).toBe(true);
    expect(mayDo("participant", "witness")).toBe(false);
    expect(permissionsFor("participant", saved)).toContain("witness");
    expect(validateConfigPatch({ registration: "sometimes" }).errors.length).toBe(1);
    expect(validateConfigPatch({ role_grants: { participant: ["fly"] } }).errors.length).toBe(1);
    const cleared = await store.set({ site_notice: undefined }, "g");
    expect(cleared.site_notice).toBeUndefined();
  });
  it("API access is off until granted; the config may grant it to newcomers", async () => {
    const { personNode, personFromNode, apiAccessPatch, DEFAULT_CONFIG, validateConfigPatch } = await import("../src/community-identity/src/index");
    const p = personNode({ name: "P", role: "participant" });
    expect(personFromNode(p)!.api_access).toBe(false);
    expect(personFromNode({ ...p, metadata: apiAccessPatch(true, p.metadata) })!.api_access).toBe(true);
    expect(personFromNode(personNode({ name: "Q", role: "participant", api_access: true }))!.api_access).toBe(true);
    expect(DEFAULT_CONFIG.default_api_access).toBe(false);
    expect(validateConfigPatch({ default_api_access: true }).patch.default_api_access).toBe(true);
    expect(validateConfigPatch({ default_api_access: "yes" }).errors.length).toBe(1);
  });
});
