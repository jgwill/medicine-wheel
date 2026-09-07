# The Goal of Configurable Workspaces

**Document ID:** rispec-workspace-goal-v1
**Status:** Statement of intent — the one page to read before the rest of this folder
**Last Updated:** 2026-09-06

---

> [!CAUTION]
> **Answers the wrong question — see `STATUS.md` (2026-09-06).** The requirement is **one server that
> resolves the store per request**, so choosing a workspace changes what the running server reads and
> writes on disk. This folder assumes one server per location, with switching deferred to a slice it
> does not plan. Do not implement from this document.


The goal is to let one Medicine Wheel installation **hold more than one place at a time without
confusing them.** A wheel is where a set of relations is kept — a project, a body of research, a
community's work — and that keeping only means something if the boundary is real: what is added here
stays here, what is ceremonied here is not counted there, and whoever opens the wheel can trust that
what they see is the whole of *this* context and none of another. Today the application can only be
one place. Every wheel it has ever served has been served from the same store, and the six cards in
the switcher promise a plurality the data underneath does not keep. Configurable workspaces are how
that promise stops being decorative: a wheel gets a name, a place it lives, and a boundary that holds
whether you reach it through the browser, the `mw` command, or an agent somewhere else on the
network.

The second half of the goal is that **the services learn which wheel they are serving.** A wheel is
only usable while a server is running for it, and today you tell that server where the wheel is by
typing it out each time you start one. Nothing writes it down. So nothing in the system can list the
wheels that exist on a machine; two servers started with the defaults quietly fight over the same
port; and an MCP server keeps reading and writing the store it was launched with, long after the
person at the browser has moved to a different wheel. The goal is to write that instruction down once
and give it a name. Then the system can show which wheels exist, refuse to start a second one on a
port that is already taken, and compare what is supposed to be running against what actually is —
including the case that matters most, a server running that nobody wrote down. 🔥 In practice: an
operator can keep several fires without feeding the wrong one, and an agent arriving at any of them
is told by the system, not by a prompt, which fire it is sitting at.

🌸: A workspace is not a partition of one world. It is the system finally being able to say *where* it
is, out loud, to everyone who asks.
