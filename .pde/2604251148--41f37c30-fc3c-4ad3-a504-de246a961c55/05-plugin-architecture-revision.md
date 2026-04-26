# Plugin Architecture Revision

**Status:** revision applied after architecture review

## Revisions made

1. Centered engineering-direction language on the prompt-decomposition package:
   - East = Vision
   - South = Analysis
   - West = Validation
   - North = Action
2. Named and separated the repo's three phase systems in the plugin spec set.
3. Treated `.pde` as a dual artifact space:
   - decomposition files
   - wave directories
4. Kept the plugin MVP focused on:
   - Fire Keeper
   - direction inquiry
   - wave orchestration
   - wave status
5. Left issue/PR/GitOps automation as proposal-only future phases.

## Result

The plugin proposal is now a tighter, more repo-grounded specification base for `rispecs/plugins`, with clearer MVP boundaries and fewer assumptions about what already exists.
