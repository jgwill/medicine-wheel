# Repository mapping — relational context

Why the mapping is shaped the way `repository-mapping.spec.md` and `capabilities.spec.md` describe. Read this before loosening a rule.

## What relational means here

The prompt that asked for this work set two meanings side by side and noticed they collide. One is kinship and accountability: a fork carries an obligation to the work and the people it came from, a prototype stays the place an intent was first seen after it grows into something else, two repositories that give the same capability are kin to name. The other is entity-relationship: rows, keys and references. The mapping holds both by keeping them at different levels. The entity-relationship drawing is how the relations are stored. The relation names come from the governed kinship registry in `ontology-core`, each with its inverse reading and the obligations it carries, so a fork reads with the grammar of every other kinship on the wheel.

The grounding is Wilson (2008), held privately in `miadisabelle/Etuaptmumk-RSM/sources/wilson-2008-research-is-ceremony/` (read its `GUIDANCE.md`). No text of it is copied here. The pages this design leans on: p. 71, where the paradigm is relational and keeps relational accountability; p. 77, where axiology is built on relational accountability and the researcher asks six questions about their relationships and obligations; p. 34, choosing what is worth knowing as an ethical act; p. 99, a piece lifted out of its whole losing what it hooked onto.

## Every row starts pending

The prompt asks the mapping agent to assume its output is biased: most of its training comes from one culture's way of knowing, and many of the repositories were written with earlier models whose claims may be wrong. So a row says who wrote it, when, and from what evidence, and starts `pending`. Only a person makes a row `affirmed`, and an affirmed row names them. The page counts pending rows in its header, so the amount of unread model output stays visible.

This is also the p. 99 rule applied to a mapping: a 55-word purpose is a selection, and its `grounding` is the link back to the whole it was lifted from.

## What no function here judges

Wilson's six questions (p. 77) are asked by people. `GUIDANCE.md` in the source folder warns against turning the book into a checker or a gate. The validator in this package checks form: the word limit, the evidence list, ids, endpoints, who revised a row. It does not score whether a repository, a relation or a mapping is respectful, reciprocal or responsible, and nothing here may be presented as doing so.

## Why 55 words, and three features

A mapping of a hundred repositories is read by a person, and a statement a model cannot make in 55 words is usually one it is inventing. The limit stops the writer at the point where it would start describing more than it read; `needs-resolution` keeps the place for a person. A prototype is read for three core features for the same reason.

## Why the hub holds only its owner's repositories

Each owner speaks for their own repositories, including the agents' accounts and the community forks they hold. The meta hub reads other hubs where they live and copies nothing, so a correction made in an owner's hub is the one everyone reads, and an owner can withdraw their hub by removing its folder.

## Why lifecycle and activity are separate

What a repository is (declared) and how recently anyone touched it (observed from git) are different facts. Keeping them apart is what lets the mapping report drift instead of overwriting a person's classification with a heuristic: a quiet maintained package is stable, and a prototype untouched for years is still a prototype.

## Directions

A capability rides west, for the reason a service does. A repository carries no direction, like a host. A feature carries none yet: whether an observed feature is a vision, a growth or an act is not settled, and giving it one is an ontology revision with its own issue, held like `jgwill/medicine-wheel#113` for someone who carries that knowledge.

## The two reference prototypes

The prompt names two prototypes to read first: the author's desk (`jgwill/Miadi`, `packages/authors-desk`) and the recreation of GitHub Copilot Workspace (`miadisabelle/Etuaptmumk-RSM`, `prototypes/artefacts/MiAICo-251203-CopilotWorkspace-…`, reverse-engineered in `copilot-workspace-specs.md`). A factory team is building a similar chain of events; mapping these two first gives that team the features and capabilities to compare against.
