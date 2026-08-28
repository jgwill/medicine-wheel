# For people arriving from outside

This suite is published early and in the open. If someone has shared it with
you and you are deciding whether it is worth your time, this page is the
honest version.

## What this is

A TypeScript suite that encodes **Indigenous relational research methodology**
as working software: Four Directions structure, ceremony phases with
governance, relational accountability, OCAP® data-sovereignty surfaces, and a
narrative layer where the moments a piece of work actually turned are recorded
as first-class records rather than as commit messages nobody reads again.

It is used to build things. It is not a demonstration.

## What it is not

- **Not finished.** See [ALPHA.md](./ALPHA.md). APIs move between patch versions.
- **Not an implementation of anyone's protocol.** Where the software touches
  ceremony, consent, or cultural material, it is scaffolding for people doing
  that work — not a substitute for them, and not an authority on it.
- **Not a general-purpose framework.** It has a point of view. If that point of
  view is wrong for your work, the suite will fight you, and you should let it.

## The point of view, stated once

Software usually treats **problem-solving** as the whole of engineering:
identify what is wrong, eliminate it, return to normal. That is correct — when
something worked and stopped working. It is the wrong shape entirely for
bringing into being something that has never existed, because there is no
prior state to return to.

The suite takes that distinction seriously enough to make it mechanical.
`@medicine-wheel/creative-orientation` asks one question — *is there a prior
state you are restoring?* — and routes accordingly, to
`@medicine-wheel/gap-analysis` for the fire, or toward structural tension for
the creating. Neither is the degraded case.

It advises; it never refuses. A tool that blocks you is a tool you learn to
route around.

## Where to start reading

| If you want | Read |
|---|---|
| What the suite is | [`README.md`](./README.md) |
| Whether to depend on it | [`ALPHA.md`](./ALPHA.md) |
| How the design decisions were reached | [`rispecs/`](./rispecs/) — specifications versioned beside the code |
| What a beat is and where it sits | [`rispecs/narrative-beats-lifecycle.spec.md`](./rispecs/narrative-beats-lifecycle.spec.md) |
| Known edges | open issues — stated plainly, not hidden |

## What feedback is genuinely useful

Most useful, in roughly this order:

1. **"This boundary is wrong."** Which responsibility sits in the wrong
   package, and what it costs you.
2. **"This should not be software."** Especially where the suite has modelled
   something that properly belongs to people, relationship, or protocol. This
   is the feedback we are least able to generate ourselves.
3. **"This name teaches the wrong thing."** Names here are load-bearing — one
   package was renamed during design because its first name encoded the exact
   confusion it existed to dissolve.
4. **"I could not install / build / understand this."** Friction reports are
   findings.
5. Bug reports, with what you expected and what happened.

Less useful right now: requests for API stability. That is what alpha means,
and pretending otherwise would waste your time.

## On the cultural material, specifically

Parts of this suite draw on Indigenous — primarily Anishinaabe-associated
Medicine Wheel — structure, and reference Wilson's relational accountability
and the OCAP® principles. Some related work in the wider ecosystem draws on
Haudenosaunee teachings and is handled under CARE/OCAP.

Two commitments:

- Where a design question is properly a **knowledge holder's decision** rather
  than an engineer's, the specifications try to say so explicitly rather than
  resolving it in code and moving on.
- Where we have got that wrong — flattened something, borrowed a form without
  its obligations, or made a correspondence that does not hold — **saying so is
  a contribution**, and it will be treated as one.

If you hold that knowledge and this is being done badly, we would rather hear
it than not.

## Contributing

Issues and discussion are open. There is no CLA, no formal process yet, and a
single maintainer working with AI agents — so expect direct conversation rather
than a machine.

MIT licensed. Attribution to the cultural sources referenced in each package
stays with those sources, not with the license.
