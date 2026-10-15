/**
 * The event log on disk: `events.jsonl`, one envelope per line, append only.
 *
 * Node only — import it as `@medicine-wheel/events/log`. The main entry stays
 * free of `node:fs` so a browser can read the catalog and the types.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { isWheelEvent, type WheelEvent } from './envelope';

/** `MW_EVENTS_FILE`, else `events.jsonl` in the given data directory. */
export function eventLogPath(dataDir: string, env: Record<string, string | undefined> = process.env): string {
  return env.MW_EVENTS_FILE || path.join(dataDir, 'events.jsonl');
}

/**
 * Append one event. A line torn by a crash must not swallow the next one, so
 * this starts on a fresh line when the file does not end with one. Throws on
 * failure; a caller whose own write already stands catches and reports.
 */
export function appendEvent(file: string, event: WheelEvent): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let lead = '';
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const { size } = fs.fstatSync(fd);
      if (size > 0) {
        const last = Buffer.alloc(1);
        fs.readSync(fd, last, 0, 1, size - 1);
        if (last[0] !== 0x0a) lead = '\n';
      }
    } finally {
      fs.closeSync(fd);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  fs.appendFileSync(file, `${lead}${JSON.stringify(event)}\n`);
}

/** Every event, oldest first. A torn or foreign line is skipped, not fatal. A missing file is an empty log. */
export function readEventLog(file: string): WheelEvent[] {
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const events: WheelEvent[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (isWheelEvent(parsed)) events.push(parsed);
    } catch {
      // torn line
    }
  }
  return events;
}
