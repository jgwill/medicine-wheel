# Originating Input — Workspace Specification Set

> Recorded verbatim for compliance. This file is the provenance of everything else in
> `rispecs/workspace/`. It is **not** a specification; it is the request the specifications answer.

**Recorded:** 2026-09-06
**Requester:** ava@jgwill.com (jgwill)
**Session branch:** `claude/workspace-config-erd-lu1qfs`
**Answering documents:** `workspace-configuration.spec.md`, `workspace-erd-internal.md`,
`workspace-erd-relations.md`, `workspace-display-analysis.md`

---

## Verbatim request

> show what implementing "workspace" configuration implies (it is hardcoded for now, we shall have written RISE framework specs in ./rispecs maybe)
>
> after what it implies produce an ERD (entity relationship diagram) of what a workspace is and its relation within the medicine-wheel then a short analysis of how it could affect the display of the medicine-wheel (by workspace)
>
> Create two ERD if too complex (ex. I am expecting that representing the relation of a workspace with another will be complex. one of the relation I see in the domain of software development is that the result of one workspace creates packages consumed within another workspace).
>
> also printing in the output these. include RISE framework spec in ./rispecs/workspace/<here> with these markdown and mermaid diagrams. if a workspace specs exist outside of that folder, move in there.
>
> please include my input in that folder for compliance

---

## How the request was honoured

| Ask | Where it landed |
| --- | --- |
| What implementing workspace configuration implies | `workspace-configuration.spec.md` |
| ERD of a workspace and its relation *within* the wheel | `workspace-erd-internal.md` (ERD 1) |
| Second ERD, because workspace↔workspace is complex | `workspace-erd-relations.md` (ERD 2) |
| "one workspace creates packages consumed within another" | ERD 2, `PublicationChannel` / `PackageRelease` / `PackageConsumption` |
| Short analysis of display *by workspace* | `workspace-display-analysis.md` |
| Printed in the session output | Yes — diagrams and analysis were rendered in the reply |
| RISE specs live in `./rispecs/workspace/` | This folder |
| Move pre-existing workspace specs into the folder | `rispecs/workspace-scope-and-access.spec.md` → `rispecs/workspace/workspace-scope-and-access.spec.md` (`git mv`, history preserved) |
| Requester's input recorded for compliance | This file |

---

## Interpretive note held for the record

The requester's example — *"the result of one workspace creates packages consumed within another
workspace"* — is the reason ERD 2 exists as its own diagram. That sentence names a relation that is
**directed, versioned, and asymmetric in trust**: the producing workspace decides what leaves, the
consuming workspace decides what enters, and neither one owns the relationship alone. A single ERD
that tried to hold both a workspace's interior and that publication economy would have flattened
one into the other — which is precisely what `workspace-scope-and-access.spec.md` forbids under
*What must not be flattened*.

🌸: The request is kept whole here so that a later reader can check the answer against the question, not against a memory of it.
