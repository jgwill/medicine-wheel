#!/usr/bin/env node
/**
 * mw-events — follow a Medicine Wheel's events from a clone of its data
 * repository, anywhere git can reach.
 *
 *   mw-events follow <clone> [--exec "<command>"] [--name <follower>]
 *                    [--file <path in clone>] [--state-dir <dir>]
 *                    [--no-pull] [--every <seconds>]
 *   mw-events schema [--asyncapi]
 *
 * `follow` pulls, then hands every event this follower has not handled yet to
 * `--exec`, one at a time, oldest first: the event's JSON on stdin, and
 * MW_EVENT_ID, MW_EVENT_TYPE, MW_EVENT_SUBJECT_KIND, MW_EVENT_SUBJECT_ID,
 * MW_EVENT_CORRELATION and MW_EVENT_OBSERVED_AT in the environment. Exit 0
 * and the follower moves past it; anything else and it stops, to try that
 * event again on the next run. Without `--exec`, each event is printed as one
 * JSON line. The cursor lives in --state-dir (default
 * $XDG_STATE_HOME/medicine-wheel-events, else ~/.local/state/…), never in
 * the clone.
 *
 * Exit codes: 0 done, 1 a pull or a handler failed, 2 usage error.
 */

import { spawn } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';
import { followEventLog } from './git';
import { asyncApiDocument, wheelEventsJsonSchema } from './schema';
import type { WheelEvent } from './envelope';

function usage(error?: string): never {
  if (error) console.error(`mw-events: ${error}`);
  console.error('usage: mw-events follow <clone> [--exec "<command>"] [--name <follower>] [--file <path>] [--state-dir <dir>] [--no-pull] [--every <seconds>]');
  console.error('       mw-events schema [--asyncapi]');
  process.exit(2);
}

function parse(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const key = arg.slice(2);
    if (key === 'no-pull' || key === 'asyncapi') { flags[key] = true; continue; }
    const value = argv[++i];
    if (value === undefined) usage(`--${key} needs a value`);
    flags[key] = value;
  }
  return { positional, flags };
}

function runHandler(command: string, event: WheelEvent): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      stdio: ['pipe', 'inherit', 'inherit'],
      env: {
        ...process.env,
        MW_EVENT_ID: event.id,
        MW_EVENT_TYPE: event.event_type,
        MW_EVENT_SUBJECT_KIND: event.subject.kind,
        MW_EVENT_SUBJECT_ID: event.subject.id,
        MW_EVENT_CORRELATION: event.correlation_id ?? '',
        MW_EVENT_OBSERVED_AT: event.observed_at,
      },
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
    child.stdin.end(JSON.stringify(event) + '\n');
  });
}

async function follow(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const repo = positional[1];
  if (!repo) usage('follow needs the clone to follow');
  const stateDir = typeof flags['state-dir'] === 'string'
    ? flags['state-dir']
    : path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'medicine-wheel-events');
  const exec = typeof flags.exec === 'string' ? flags.exec : undefined;
  const every = typeof flags.every === 'string' ? Number(flags.every) : 0;
  if (Number.isNaN(every) || every < 0) usage('--every needs a number of seconds');

  const once = async (): Promise<number> => {
    const result = await followEventLog({
      repo: path.resolve(repo),
      file: typeof flags.file === 'string' ? flags.file : undefined,
      name: typeof flags.name === 'string' ? flags.name : 'follow',
      stateDir,
      pull: flags['no-pull'] !== true,
      handle: async (event) => {
        if (exec) return runHandler(exec, event);
        console.log(JSON.stringify(event));
        return true;
      },
    });
    if (result.pullError) console.error(`mw-events: pull failed, read the clone as it is: ${result.pullError}`);
    console.error(`mw-events: ${result.arrived} handled, ${result.pending} waiting${result.stopped ? ' — stopped on a handler that failed' : ''} (${result.file})`);
    return result.pullError || result.stopped ? 1 : 0;
  };

  if (!every) return once();
  for (;;) {
    await once().catch((error) => console.error(`mw-events: ${(error as Error).message}`));
    await new Promise((r) => setTimeout(r, every * 1000));
  }
}

async function main(): Promise<number> {
  const { positional, flags } = parse(process.argv.slice(2));
  switch (positional[0]) {
    case 'follow':
      return follow(positional, flags);
    case 'schema':
      console.log(JSON.stringify(flags.asyncapi ? asyncApiDocument() : wheelEventsJsonSchema(), null, 2));
      return 0;
    case undefined:
    case 'help':
      return usage();
    default:
      return usage(`unknown command: ${positional[0]}`);
  }
}

main().then((code) => { process.exitCode = code; }, (error) => {
  console.error(`mw-events: ${(error as Error).message}`);
  process.exitCode = 1;
});
