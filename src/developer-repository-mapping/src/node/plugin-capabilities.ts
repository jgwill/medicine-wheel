import { ComponentRefSchema, PluginRefSchema } from '@medicine-wheel/capabilities';
import { capabilityAddress, capabilityId, holdsUnsafeCharacter, parseSkillFrontMatter, type Artefact } from '../capability-scan';
import { CapabilityNameSchema } from '../capability-file';
import type { MappingIssue } from '../types';

const CLAUDE_MANIFEST = '.claude-plugin/plugin.json';
const PI_MANIFEST = 'package.json';
const REF_NAME = /^(?!\.{1,2}(?:\/|$))[A-Za-z0-9_@.+~-]+(?:\/(?!\.{1,2}(?:\/|$))[A-Za-z0-9_@.+~-]+)*$(?![\s\S])/;
const COMPONENT_FIELDS = ['skills', 'agents', 'commands', 'hooks', 'mcpServers'] as const;

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function readObject(text: string): Record<string, unknown> | undefined {
  try {
    return object(JSON.parse(text));
  } catch {
    return undefined;
  }
}

function join(folder: string, file: string): string {
  return folder ? `${folder}/${file}` : file;
}

function repositoryPath(file: string): boolean {
  return file.split('/').every((part) => part && part !== '.' && part !== '..')
    && !/[\\:\s]/.test(file) && !holdsUnsafeCharacter(file);
}

export function pluginManifestCandidates(folder: string): string[] {
  const input = folder.trim();
  if (!input || input.startsWith('/')) return [];
  const dir = input.replace(/^\.\//, '').replace(/\/+$/, '');
  if (dir === '' || dir === '.') return [CLAUDE_MANIFEST, PI_MANIFEST];
  if (!repositoryPath(dir)) return [];
  return [join(dir, CLAUDE_MANIFEST), join(dir, PI_MANIFEST)];
}

function isManifest(file: string, name: string): boolean {
  return file === name || file.endsWith(`/${name}`);
}

export function pluginManifestOf(grounding: readonly string[]): string | undefined {
  return grounding.find((file) => repositoryPath(file) && (
    isManifest(file, CLAUDE_MANIFEST) || isManifest(file, PI_MANIFEST)
  ));
}

interface Manifest {
  name: string;
  description?: string;
  claude: boolean;
  customComponents: ReadonlyArray<(typeof COMPONENT_FIELDS)[number]>;
}

export function readPluginManifest(file: string, text: string): Manifest | undefined {
  const value = readObject(text);
  if (!value || typeof value.name !== 'string' || !REF_NAME.test(value.name)) return undefined;
  const claude = isManifest(file, CLAUDE_MANIFEST);
  if (!claude) {
    const extensions = object(value.pi)?.extensions;
    if (!Array.isArray(extensions) || !extensions.some((entry) => typeof entry === 'string' && entry.trim())) return undefined;
  }
  return {
    name: value.name,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    claude,
    customComponents: claude ? COMPONENT_FIELDS.filter((field) => Object.hasOwn(value, field)) : [],
  };
}

type Show = (file: string) => Promise<string | undefined>;

async function claudeComponents(
  folder: string,
  plugin: string,
  custom: Manifest['customComponents'],
  files: ReadonlySet<string>,
  show: Show,
  issues: MappingIssue[],
): Promise<Artefact[]> {
  const out: Artefact[] = [];
  const agentDir = join(folder, 'agents/');
  const commandDir = join(folder, 'commands/');
  for (const file of files) {
    if (!file.endsWith('.md') || !repositoryPath(file)) continue;
    const kind = file.startsWith(agentDir) ? 'agent' : file.startsWith(commandDir) ? 'command' : undefined;
    if (!kind || custom.includes(kind === 'agent' ? 'agents' : 'commands')) continue;
    const { name, description } = parseSkillFrontMatter((await show(file)) ?? '');
    const localName = kind === 'agent' ? name : file.slice(commandDir.length, -3);
    if (localName === undefined) continue;
    if (!REF_NAME.test(localName)) {
      issues.push({ severity: 'warning', file, message: `the ${kind} name has no capability address` });
      continue;
    }
    out.push({ kind, name: `${plugin}/${localName}`, path: file, ...(description ? { description } : {}) });
  }

  const config = async (relative: string) => {
    const file = join(folder, relative);
    if (!files.has(file)) return undefined;
    const json = readObject((await show(file)) ?? '');
    if (!json) issues.push({ severity: 'error', file, message: 'expected a JSON object for plugin configuration' });
    return json;
  };

  const hooksFile = 'hooks/hooks.json';
  const hooks = await config(hooksFile);
  for (const [event, handlers] of Object.entries(object(hooks?.hooks) ?? {})) {
    if (Array.isArray(handlers) && handlers.length && REF_NAME.test(event)) {
      out.push({ kind: 'hook', name: `${plugin}/${event}`, path: join(folder, hooksFile), description: `Handles the ${event} event for ${plugin}.` });
    }
  }

  const mcpFile = '.mcp.json';
  const mcp = await config(mcpFile);
  for (const [server, definition] of Object.entries(object(mcp?.mcpServers) ?? mcp ?? {})) {
    if (object(definition) && REF_NAME.test(server)) {
      out.push({ kind: 'mcp-server', name: `${plugin}/${server}`, path: join(folder, mcpFile), description: `MCP server ${server} declared by ${plugin}.` });
    }
  }
  return out;
}

/** Read enrolled plugins, using only blobs in the selected Git revision. */
export async function scanPlugins(
  repository: string,
  rows: readonly { kind: string; name: string; grounding: readonly string[] }[],
  files: ReadonlySet<string>,
  show: Show,
  artefacts: Artefact[],
  issues: MappingIssue[],
): Promise<void> {
  const occurrences = new Map<string, number>();
  const count = (a: Artefact) => {
    const id = capabilityId(a.kind, a.name);
    occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
  };
  artefacts.forEach(count);
  const skills = artefacts.filter((a) => a.kind === 'skill');
  const discoveries: { plugin: Artefact; components: Artefact[] }[] = [];
  for (const row of rows) {
    if (row.kind !== 'plugin') continue;
    const file = pluginManifestOf(row.grounding);
    if (file === undefined || !files.has(file)) continue;
    const manifest = readPluginManifest(file, (await show(file)) ?? '');
    if (manifest === undefined) {
      issues.push({ severity: 'error', file, message: 'expected a named Claude plugin or Pi extension package manifest' });
      continue;
    }
    if (manifest.name !== row.name) {
      issues.push({ severity: 'warning', file, message: `the manifest does not name the enrolled plugin ${row.name}` });
      continue;
    }
    const root = file.slice(0, -(manifest.claude ? CLAUDE_MANIFEST.length : PI_MANIFEST.length)).replace(/\/$/, '');
    const skillDir = join(root, 'skills/');
    const ownSkills = skills.filter((skill) => skill.path.startsWith(skillDir) && /^[^/]+\/SKILL\.md$/.test(skill.path.slice(skillDir.length)));
    const found = manifest.claude ? await claudeComponents(root, row.name, manifest.customComponents, files, show, issues) : [];
    if (manifest.customComponents.length) {
      issues.push({ severity: 'warning', file, message: `custom ${manifest.customComponents.join(', ')} declarations are outside the default-layout inventory` });
    }
    const plugin: Artefact = {
      kind: 'plugin',
      name: row.name,
      path: file,
      ...(manifest.description ? { description: manifest.description } : {}),
    };
    count(plugin);
    found.forEach(count);
    discoveries.push({ plugin, components: [...ownSkills, ...found] });
  }

  for (const { plugin, components: discovered } of discoveries) {
    const pluginAddress = capabilityAddress(repository, 'plugin', plugin.name);
    if (!PluginRefSchema.safeParse(pluginAddress).success || occurrences.get(capabilityId('plugin', plugin.name)) !== 1) {
      issues.push({ severity: 'warning', file: plugin.path, message: `unusable or ambiguous plugin capability address for ${plugin.name}` });
      continue;
    }
    const components: string[] = [];
    for (const a of discovered) {
      const address = capabilityAddress(repository, a.kind, a.name);
      if (!ComponentRefSchema.safeParse(address).success || !CapabilityNameSchema.safeParse(a.name).success || occurrences.get(capabilityId(a.kind, a.name)) !== 1) {
        issues.push({ severity: 'warning', file: a.path, message: `unusable or ambiguous ${a.kind} capability address; no membership attributed to ${plugin.name}` });
        continue;
      }
      a.plugin = pluginAddress;
      components.push(address);
      if (a.kind !== 'skill') artefacts.push(a);
    }
    artefacts.push({ ...plugin, ...(components.length ? { components: components.sort() } : {}) });
  }
}
