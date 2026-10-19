/**
 * The small web server of `mw-repomap serve`. Read-only: it answers GET, and
 * reads the hub again on every request, so a writer can keep editing the
 * JSONL while a person reads it.
 *
 *   GET /             the page
 *   GET /api/mapping  the merged reading, its summary and every issue
 *   GET /api/health   { ok: true }
 */

import * as http from 'node:http';
import { summarize, type MappingSummary } from '../summary';
import type { MergedMapping } from '../merge';
import type { MappingIssue } from '../types';
import type { HubRead, HubStatus } from './hub';
import { MAPPING_PAGE } from './page';

export interface MappingView extends Omit<MergedMapping, 'issues' | 'hubs'> {
  hubs: HubStatus[];
  summary: MappingSummary;
  issues: MappingIssue[];
}

/** What `/api/mapping` answers, or `undefined` when the folder holds no readable manifest. */
export function toView(read: HubRead): MappingView | undefined {
  if (!read.merged) return undefined;
  const { issues: _mergeIssues, hubs: _hubNames, ...merged } = read.merged;
  return { ...merged, hubs: read.hubs, summary: summarize(read.merged), issues: read.issues };
}

function send(res: http.ServerResponse, status: number, body: string, type: string): void {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

export interface MappingServerOptions {
  /**
   * Host header names (without port) the server answers. When set, any other
   * Host is refused with 421, so a web page that rebinds a name to 127.0.0.1
   * cannot read the mapping through the browser. Absent: every Host is answered.
   */
  allowedHosts?: readonly string[];
}

/** The Host names a loopback server answers. */
export const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'] as const;

function hostName(header: string | undefined): string {
  if (!header) return '';
  return (header.startsWith('[') ? header.slice(0, header.indexOf(']') + 1) : header.split(':')[0]).toLowerCase();
}

export function createMappingServer(load: () => Promise<HubRead>, options: MappingServerOptions = {}): http.Server {
  const allowed = options.allowedHosts?.map((h) => h.toLowerCase());
  return http.createServer((req, res) => {
    if (allowed && !allowed.includes(hostName(req.headers.host))) {
      send(res, 421, JSON.stringify({ error: `not served to Host ${req.headers.host ?? '(none)'}` }), 'application/json');
      return;
    }
    let url: URL;
    try {
      url = new URL(req.url ?? '/', 'http://localhost');
    } catch {
      send(res, 400, JSON.stringify({ error: 'not a request path' }), 'application/json');
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, JSON.stringify({ error: 'read-only: GET only' }), 'application/json');
      return;
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      send(res, 200, MAPPING_PAGE, 'text/html; charset=utf-8');
      return;
    }
    if (url.pathname === '/api/health') {
      send(res, 200, JSON.stringify({ ok: true }), 'application/json');
      return;
    }
    if (url.pathname === '/api/mapping') {
      load()
        .then((read) => {
          const view = toView(read);
          if (view) send(res, 200, JSON.stringify(view), 'application/json');
          else send(res, 404, JSON.stringify({ error: 'no mapping here', issues: read.issues }), 'application/json');
        })
        .catch((error) => send(res, 500, JSON.stringify({ error: (error as Error).message }), 'application/json'));
      return;
    }
    send(res, 404, JSON.stringify({ error: `no route ${url.pathname}` }), 'application/json');
  });
}
