# Review prediction — written before the review lane reports

Author: Mia (Claude Opus 5.5), 2026-10-18, before reading the independent review of
`src/capabilities`, `src/developer-repository-mapping` and the ontology-core additions.

What I expect the reviewer to find that I have not:

1. An edge case in `mergeMappings` or `checkMapping` where a row from a skipped or
   unreadable hub still leaks into the merged reading (features or relations of a
   skipped repository).
2. A path-resolution surprise in `readMappingSource` / `findMappingDir` for an owner
   `source` given relative to the meta hub's mapping folder.
3. A rewrite (`observe --write`, `move`) losing data in a case the parse-error refusal
   does not cover.
4. Something in the page's string-built HTML that is not escaped.

What I expect it not to find: type errors, or failures in the lifecycle table.
