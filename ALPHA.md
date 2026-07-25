# This suite is experimental alpha

**Read this before depending on anything here.**

The Medicine Wheel Developer Suite is under active development and is published
in the open so the work can be examined, discussed, and improved. It is not
finished software. Publishing early is deliberate — but so is telling you what
you are installing.

## What that means concretely

- **APIs change between patch versions.** All packages move in lockstep, so a
  bump you would normally read as "nothing changed for me" may still change
  what you depend on. Pin exact versions.
- **Packages appear, and their boundaries move.** Three packages were added in
  `0.5.3`. Where a responsibility lives is still being decided.
- **Some packages are intentionally small first cuts.** They express an
  intention with a working minimum rather than a finished surface. Their
  READMEs say so where it applies.
- **Storage shapes are still settling.** Records written by one version may
  need repair by a later one. Do not treat any store here as an archive of
  record yet.
- **Test coverage is real but uneven.** 210 tests pass at `0.5.3`; that is a
  floor, not a claim of completeness.

## What it does *not* mean

It does not mean the work is careless. Defects found are fixed and written
down, specifications are versioned alongside the code in `rispecs/`, and
sessions are chronicled. The alpha label is about **stability of contract**,
not about standard of care.

## Cultural material

Parts of this suite encode Indigenous relational research methodology —
Four Directions structure, ceremony protocol, OCAP® compliance surfaces,
relational accountability. That material is included because the software is
*for* that way of working, not as decoration.

If you are building on those parts, please read them as an invitation to work
relationally rather than as a finished implementation of anyone's protocol.
Where a design question is properly a knowledge holder's decision rather than
an engineer's, the specs try to say so. Where we have got that wrong, telling
us is a contribution.

## If you are evaluating this

The most useful things to read first:

- `rispecs/` — the specifications, versioned with the code
- `README.md` — what the suite is
- Open issues — where the known edges are, stated plainly

Feedback is genuinely wanted at this stage, including "this boundary is wrong"
and "this should not be software".

## License

MIT — see `LICENSE`.
