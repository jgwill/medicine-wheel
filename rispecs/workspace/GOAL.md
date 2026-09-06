# The Goal of Configurable Workspaces

**Document ID:** rispec-workspace-goal-v1
**Status:** Statement of intent — the one page to read before the rest of this folder
**Last Updated:** 2026-09-06

---

The goal is to let one Medicine Wheel installation **hold more than one place at a time without
confusing them.** A wheel is where a set of relations is kept — a project, a body of research, a
community's work — and that keeping only means something if the boundary is real: what is added here
stays here, what is ceremonied here is not counted there, and a person or an agent opening the wheel
can trust that what they see is the whole of *this* context and none of another. Today the
application can only be one place. Every wheel that has ever been served by it has been served by the
same store, and the six cards in the switcher are a promise of plurality that the data underneath
does not keep. Configurable workspaces are how that promise stops being decorative: a wheel gets a
name, a location it lives in, and a boundary that holds whether you reach it through the browser, the
`mw` command, or an agent on the far side of the network.

The second half of the goal — the half that makes the first half work — is that **the services
themselves learn which wheel they are serving.** That binding is already being made every time
someone runs `mwsrv --directory ~/some-project --port 4000`; it is simply anonymous, re-typed by
hand, and invisible to everything else in the system, which is why two wheels quietly collide on one
port, an MCP server keeps writing to the store it was booted with long after the browser moved on,
and nothing can answer "which wheels exist on this machine, and is what is running what we said we
wanted?" Naming that binding turns a tuple of flags into something the system can enumerate, check
before it starts, and reconcile against what is actually running. 🔥 The practical shape of the goal
is that an operator can keep several fires without one of them being fed by mistake, and an agent
arriving at any of them can be told, plainly and by the system rather than by a prompt, which fire it
is sitting at.

🌸: A workspace is not a partition of one world. It is the system finally being able to say *where* it
is, out loud, to everyone who asks.
