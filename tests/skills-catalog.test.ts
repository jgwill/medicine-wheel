/**
 * The skill catalog `mw skill install` and `mwsrv skill install` write.
 *
 * A skill body tells an agent which calls to make. These tests hold it to the
 * calls that exist: every MCP tool a body calls is registered by the MCP
 * server, every `mw` command it names is one the CLI dispatches, and every
 * installed SKILL.md opens with front matter carrying its name and description.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { installSkill, listSkills, renderSkill, type SkillDefinition } from '../cli/skills';

const root = path.resolve(__dirname, '..');
const all: SkillDefinition[] = [...listSkills('cli'), ...listSkills('srv')];

const registeredTools = new Set(
  fs
    .readdirSync(path.join(root, 'mcp/src/tools'))
    .filter((f) => f.endsWith('.ts'))
    .flatMap((f) => [...fs.readFileSync(path.join(root, 'mcp/src/tools', f), 'utf8').matchAll(/^\s+name: "([a-z_]+)",$/gm)].map((m) => m[1])),
);

const mwCommands = new Set(
  [...fs.readFileSync(path.join(root, 'cli/mw.ts'), 'utf8').matchAll(/case '([a-z-]+)'/g)].map((m) => m[1]),
);

/** The lines inside a body's code fences. */
function fencedLines(body: string): string[] {
  return [...body.matchAll(/```\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n'));
}

describe('skill catalog', () => {
  it('reads the registered MCP tools and mw commands it checks against', () => {
    expect(registeredTools.size).toBeGreaterThan(90);
    expect(registeredTools.has('mw_decompose_prompt')).toBe(true);
    expect(mwCommands.has('ceremony')).toBe(true);
    // the checks below must find calls to check, or they pass on nothing
    const lines = all.flatMap((s) => fencedLines(s.body));
    expect(new Set(lines.map((l) => /^\s*([a-z][a-z_]+) +\{/.exec(l)?.[1]).filter(Boolean)).size).toBeGreaterThanOrEqual(18);
    expect(new Set(lines.map((l) => /^\s*mw ([a-z-]+)/.exec(l)?.[1]).filter(Boolean)).size).toBeGreaterThanOrEqual(5);
  });

  it.each(all.map((s) => [s.name, s] as const))('%s calls only MCP tools the server registers', (_, skill) => {
    const called = fencedLines(skill.body)
      .map((line) => /^\s*([a-z][a-z_]+) +\{/.exec(line)?.[1])
      .filter((name): name is string => Boolean(name));
    for (const tool of called) expect(registeredTools, `${skill.name} calls ${tool}`).toContain(tool);
  });

  it.each(all.map((s) => [s.name, s] as const))('%s names only mw commands the CLI dispatches', (_, skill) => {
    const commands = fencedLines(skill.body)
      .map((line) => /^\s*mw ([a-z-]+)/.exec(line)?.[1])
      .filter((name): name is string => Boolean(name));
    for (const command of commands) expect(mwCommands, `${skill.name} names mw ${command}`).toContain(command);
  });

  it.each(all.map((s) => [s.name, s] as const))('%s installs with front matter naming it', (_, skill) => {
    const text = renderSkill(skill);
    const front = /^---\nname: (.+)\ndescription: (.+)\n---\n\n/.exec(text);
    expect(front?.[1]).toBe(skill.name);
    expect(front?.[2]).toBe(skill.description);
    // a plain YAML scalar: no indicator first, no ": " or " #" inside
    expect(skill.description).not.toMatch(/^[-?:,[\]{}#&*!|>'"%@`]/);
    expect(skill.description).not.toMatch(/: | #/);
    expect(text.endsWith(skill.body)).toBe(true);
  });

  it.each(all.map((s) => [s.name, s] as const))('%s keeps its Usage block under the planned invocation', (_, skill) => {
    expect(skill.body).toContain('## Usage');
    expect(skill.body).toContain('Planned invocation (does not run yet):');
  });

  it('pairs each complement with a skill of the other binary', () => {
    for (const skill of all.filter((s) => s.complement)) {
      const other = all.find((s) => s.name === skill.complement);
      expect(other, `${skill.name} ↔ ${skill.complement}`).toBeDefined();
      expect(other!.target).not.toBe(skill.target);
    }
  });
});

describe('skill install', () => {
  const saved = process.env.MW_DATA_DIR;
  let dir: string | undefined;
  afterEach(() => {
    if (saved === undefined) delete process.env.MW_DATA_DIR;
    else process.env.MW_DATA_DIR = saved;
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('writes the rendered SKILL.md and reads an identical copy as installed', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-skills-'));
    process.env.MW_DATA_DIR = dir;
    const skill = listSkills('cli')[0];
    expect(installSkill('cli', skill.name)).toBe(1);
    expect(fs.readFileSync(path.join(dir, 'skills', skill.name, 'SKILL.md'), 'utf8')).toBe(renderSkill(skill));
    expect(installSkill('cli', skill.name)).toBe(0);
    expect(installSkill('cli', 'no-such-skill')).toBe(-1);
  });
});
