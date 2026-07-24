/**
 * Store Router — Backend Selection
 *
 * MW_API_URL decides where every tool call's writes go. A typo in it is worse
 * than an absent value: the tools keep reporting success over requests sent to
 * an address that cannot answer.
 *
 * @see mcp/src/store.ts
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const originalApiUrl = process.env.MW_API_URL;
const originalDataDir = process.env.MW_DATA_DIR;

let dataDir: string;
let createStore: typeof import('../src/store.js').createStore;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  // The module builds its singleton at import time; keep that off the repo.
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-router-'));
  process.env.MW_DATA_DIR = dataDir;
  delete process.env.MW_API_URL;
  ({ createStore } = await import('../src/store.js'));
});

afterAll(() => {
  if (originalApiUrl === undefined) delete process.env.MW_API_URL;
  else process.env.MW_API_URL = originalApiUrl;
  if (originalDataDir === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = originalDataDir;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.MW_API_URL;
  consoleError.mockRestore();
});

describe('createStore backend selection', () => {
  it('uses the local JSONL store when MW_API_URL is absent', () => {
    expect(createStore().name).toBe('jsonl');
  });

  it('uses the local JSONL store when MW_API_URL is only whitespace', () => {
    process.env.MW_API_URL = '   ';
    expect(createStore().name).toBe('jsonl');
  });

  it('uses the HTTP store for a valid absolute URL', () => {
    process.env.MW_API_URL = 'http://127.0.0.1:8040/';
    expect(createStore().name).toBe('http');
  });

  it('refuses a MW_API_URL that is not an absolute URL', () => {
    process.env.MW_API_URL = '127.0.0.1:8040';
    expect(() => createStore()).toThrow(/MW_API_URL is not a valid absolute URL/);
  });

  it('refuses a MW_API_URL on a protocol it cannot speak', () => {
    process.env.MW_API_URL = 'file:///srv/miadi/store';
    expect(() => createStore()).toThrow(/must be http: or https:/);
  });
});
