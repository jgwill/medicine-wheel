/**
 * Node ids. Deterministic, so a second reading of the same repository lands
 * on the same node instead of beside it.
 */

// GitHub: alphanumerics and single inner hyphens, at most 39 characters.
const OWNER = '[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}';
// Any of GitHub's name characters, except a name that is only `.` or `..`.
const NAME = '(?!\\.\\.?(?:$|#))[A-Za-z0-9._-]{1,100}';
const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';

export const REPOSITORY_ID = new RegExp(`^repository:(${OWNER})/(${NAME})$`);
export const FEATURE_ID = new RegExp(`^feature:(${OWNER})/(${NAME})#(${SLUG})$`);
export const RESEARCH_FIELD_ID = new RegExp(`^research-field:${SLUG}$`);
/** The Miadi prototype seam's node ids (`@miadi/episodic-memory-schema`). */
export const PROTOTYPE_ID = /^prototype:[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
export const OWNER_LOGIN = new RegExp(`^${OWNER}$`);

export function repositoryNodeId(owner: string, name: string): string {
  const id = `repository:${owner}/${name}`;
  if (!REPOSITORY_ID.test(id)) {
    throw new Error(`not a GitHub owner/name: ${JSON.stringify(`${owner}/${name}`)}`);
  }
  return id;
}

/** `{ owner, name }` of a repository id, or `undefined`. */
export function parseRepositoryNodeId(id: string): { owner: string; name: string } | undefined {
  const m = REPOSITORY_ID.exec(id);
  return m ? { owner: m[1], name: m[2] } : undefined;
}

/** Accepts `repository:owner/name` or `owner/name`. */
export function toRepositoryNodeId(value: string): string | undefined {
  const id = value.startsWith('repository:') ? value : `repository:${value}`;
  return REPOSITORY_ID.test(id) ? id : undefined;
}

export function featureNodeId(repositoryId: string, slug: string): string {
  const repo = parseRepositoryNodeId(repositoryId);
  if (!repo) throw new Error(`not a repository id: ${JSON.stringify(repositoryId)}`);
  const id = `feature:${repo.owner}/${repo.name}#${slug}`;
  if (!FEATURE_ID.test(id)) throw new Error(`not a kebab-case slug: ${JSON.stringify(slug)}`);
  return id;
}

/** The repository a feature id names, or `undefined`. */
export function featureRepository(featureId: string): string | undefined {
  const m = FEATURE_ID.exec(featureId);
  return m ? `repository:${m[1]}/${m[2]}` : undefined;
}

export function repositoryUrl(repositoryId: string): string | undefined {
  const repo = parseRepositoryNodeId(repositoryId);
  return repo ? `https://github.com/${repo.owner}/${repo.name}` : undefined;
}

/** `owner/name` from a GitHub remote URL (https or ssh), or `undefined`. */
export function parseGithubRemote(url: string): { owner: string; name: string } | undefined {
  const m = /(?:^|[@/])github\.com[:/]+([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(url.trim());
  if (!m) return undefined;
  return REPOSITORY_ID.test(`repository:${m[1]}/${m[2]}`) ? { owner: m[1], name: m[2] } : undefined;
}
