# client — RISE Specification *(STUB)*

> A typed HTTP client for the wheel. Extracted from the one that already works and is sealed inside the MCP server.

**Version:** 0.0.0 — **STUB, not yet specified**
**Package:** `@medicine-wheel/client` *(does not exist)*
**Document ID:** rispec-client-v0
**Last Updated:** 2026-09-08
**Status:** stub for reflection — nothing here is settled

---

## Why this stub exists

Measured 2026-09-08: `grep -rln "fetch(" src/*/src/` across all 27 workspace
packages returns **nothing**. Not one package in the suite can talk to a wheel
over HTTP.

The only working client is `mcp/src/http-store.ts` — 745 lines — and
`@medicine-wheel/mcp` exports `.`, `./all-tools`, `./types`. `http-store` is not
among them, and the manifest's `types` field is `undefined`. So the client
exists, works, and is unreachable.

The repo's own code names the cost at `app/api/nodes/route.ts:26-31`:
forgewright's `chronicle/client.ts` and `HttpStore.searchNodes` each hand-roll
the same thing.

**This is why "consume the wheel elsewhere" has never happened.** There is no
door, only a description of one.

---

## Desired Outcome *(draft)*

A consumer outside this repo — Miadi, STPB, a community with neither — installs
one package and reads and writes the wheel with types, without writing a `fetch`
or learning which routes page and which do not.

---

## Creative Intent *(draft)*

**Structural tension:** between a suite that models relational ontology
carefully and a suite that cannot be reached from outside itself. Every
consumer so far has bridged that by hand, differently, and each hand-rolled
bridge drifted from the others.

---

## What it would carry — sketch, not decided

```typescript
interface MedicineWheelClient {
  nodes: {
    list(opts?: { kind?: string; parentId?: string; limit?: number | 'all' }): Promise<Paged<Node>>;
    get(id: string): Promise<Node | null>;
    web(id: string, opts?: { depth?: number; follow?: Follow; hub?: number }): Promise<RelationalWeb>;
  };
  edges: { list(opts?: { limit?: number | 'all' }): Promise<Paged<Edge>> };
  ceremonies: { list(opts?: { direction?: Direction; type?: string }): Promise<Paged<Ceremony>> };
}
```

`Paged<T>` carries `count`, `total`, `truncated` — the honesty contract the
routes gained in `0.9.0`–`0.11.0`. **A client that drops those fields
reintroduces every defect the week removed**, because a caller that cannot see
`truncated` cannot tell a page from an answer.

---

## Open questions — none of these are answered

1. **Does it wrap `storage-provider` or sit beside it?** `mw-store.ts` in Miadi
   reads through the provider directly today and works. A client that is only
   an HTTP path may be the wrong shape.
2. **Where does `mcp` get its client from after extraction?** It must depend on
   this package rather than keep its copy, or there are two again.
3. **Retry, timeout, and a dead port.** The wheel's URL has been unreachable
   for days at a stretch this week. Does the client retry, fail fast, or make
   the caller decide?
4. **Auth.** There is none today. If `community-identity` lands, this client is
   where a token would travel — which means it should not harden a
   no-auth assumption into its shape.

---

## Dependencies *(draft)*

`@medicine-wheel/ontology-core` for the types. Nothing else — a client that
drags the storage layer into a browser bundle is not a client.

**Workspace position:** after `ontology-core`, before `mcp`. The array is
topological, and a wrong position fails `TS2307` on a clean tree.

---

## Related

- `.guillaume/work/EXECUTION.md` — the phase plan this came from (step 2)
- `.guillaume/work/L2-consumable-surface.md` — the export-surface investigation
- `rispecs/storage-provider-abstraction.spec.md` — the provider it does not replace
