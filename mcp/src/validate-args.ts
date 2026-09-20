/**
 * The `required` names a tool's own schema declares, checked before its handler
 * runs.
 *
 * Nothing used to check them. A handler reading `String(args.peer_id)` on a call
 * that omitted `peer_id` produced the *string* `"undefined"` and stored it —
 * `honcho_project_back` wrote a knowledge node with `peer_id: "undefined"` and
 * that word inside its id, and answered `created`. A missing required argument
 * is the caller's error and must be answered as one, never persisted as a
 * record.
 *
 * A schema with no `required` array constrains nothing, which is not the same
 * as a call being valid — a tool that accepts either of two arguments still
 * checks that in its handler.
 */
export function missingRequired(
  inputSchema: unknown,
  args: Record<string, unknown>,
): string[] {
  const required = (inputSchema as { required?: unknown } | null | undefined)?.required;
  if (!Array.isArray(required)) return [];
  return required.filter(
    (name): name is string =>
      typeof name === "string" && (args[name] === undefined || args[name] === null),
  );
}
