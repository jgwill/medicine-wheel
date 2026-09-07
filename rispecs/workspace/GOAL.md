# The Goal of Configurable Workspaces

**Document ID:** rispec-workspace-goal-v1
**Status:** Statement of intent — the one page to read before the rest of this folder
**Last Updated:** 2026-09-06

---

> [!NOTE]
> **Corrected 2026-09-06 — see `STATUS.md`.** The requirement is **one server that resolves the store
> per request**: choosing a workspace changes what the running server reads and writes on disk. This
> document has been corrected to that; where older sections still describe one server per location,
> they say so.


The goal is that **one running Medicine Wheel can serve several workspaces.** A wheel is where a set
of relations is kept — a project, a body of research, a community's work — and that keeping only means
something if the boundary is real: what is added here stays here, what is ceremonied here is not
counted there. Today the application can only be one place. Every wheel it has ever served has been
served from the same store, and the six cards in the switcher promise a plurality the data underneath
does not keep. The goal is that choosing a workspace changes what the server actually reads and
writes — not the label above it.

That means the server has to resolve the store **per request**, from the workspace the request names.
Today it resolves once at startup and holds it: `lib/store.ts:32` and `mcp/src/store.ts:49` are
module-level constants, so a running process serves exactly one location and switching means
restarting. Changing that is the feature; everything else in this folder is arrangement around it.
🔥 When it is done, one app on the network serves several wheels at once, a person switches between
them without anything being restarted, and an agent connecting from anywhere says which wheel it is
working in and is answered from that wheel's store.

🌸: A workspace is not a partition of one world. It is the system finally being able to say *where* it
is, out loud, to everyone who asks.
