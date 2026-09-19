/**
 * The audit log: who did what to whom, kept by the consumer.
 *
 * STPB keeps `audit_logs` (actor, action, entity, metadata, ip) and reads it in
 * the admin's Audit tab. Here the same record, append-only jsonl, with the
 * action names spelled once so every writer and the admin agree.
 */

import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const AUDIT_ACTIONS = [
  'session.signed_in',
  'session.signed_out',
  'person.registered',
  'person.created',
  'person.updated',
  'person.role_changed',
  'person.deactivated',
  'person.reactivated',
  'person.api_access_enabled',
  'person.api_access_disabled',
  'person.deleted',
  'token.issued',
  'token.revoked',
  'circle.created',
  'circle.updated',
  'circle.deactivated',
  'circle.reactivated',
  'circle.deleted',
  'circle.facilitator_changed',
  'circle.member_added',
  'circle.member_removed',
  'circle.joined',
  'invitation.created',
  'invitation.accepted',
  'invitation.revoked',
  'ceremony.opened',
  'ceremony.closed',
  'turn.spoken',
  'turn.witnessed',
  'diary.written',
  'config.updated',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEntityType = 'person' | 'token' | 'circle' | 'invitation' | 'ceremony' | 'beat' | 'diary' | 'config';

export interface AuditRecord {
  id: string;
  at: string;
  actor_id: string;
  actor_name?: string;
  action: AuditAction;
  entity_type?: AuditEntityType;
  entity_id?: string;
  /** Free facts about the change: old and new values, names, counts. Never secrets. */
  metadata?: Record<string, unknown>;
  /** Where the request came from, when the consumer knows. */
  origin?: string;
}

export interface AuditQuery {
  actor_id?: string;
  action?: AuditAction | AuditAction[];
  entity_type?: AuditEntityType;
  entity_id?: string;
  /** ISO timestamps, inclusive. */
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

export interface AuditPage {
  records: AuditRecord[];
  total: number;
  truncated: boolean;
}

export interface AuditStore {
  log(record: Omit<AuditRecord, 'id' | 'at'> & { at?: string }): Promise<AuditRecord>;
  /** Newest first. */
  query(q?: AuditQuery): Promise<AuditPage>;
  /** Counts per action since a moment; the admin's "last 7 days" panel. */
  countSince(since: string): Promise<Record<string, number>>;
}

function auditId(): string {
  return `audit:${Date.now()}:${randomBytes(3).toString('hex')}`;
}

export class JsonlAuditStore implements AuditStore {
  constructor(private readonly file: string) {}

  private readAll(): AuditRecord[] {
    if (!existsSync(this.file)) return [];
    return readFileSync(this.file, 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as AuditRecord);
  }

  async log(input: Omit<AuditRecord, 'id' | 'at'> & { at?: string }): Promise<AuditRecord> {
    const record: AuditRecord = { id: auditId(), at: input.at ?? new Date().toISOString(), ...input };
    mkdirSync(dirname(this.file), { recursive: true });
    appendFileSync(this.file, JSON.stringify(record) + '\n');
    return record;
  }

  async query(q: AuditQuery = {}): Promise<AuditPage> {
    const actions = q.action === undefined ? null : Array.isArray(q.action) ? q.action : [q.action];
    const since = q.since ? Date.parse(q.since) : null;
    const until = q.until ? Date.parse(q.until) : null;
    const matched = this.readAll()
      .filter((r) => (q.actor_id ? r.actor_id === q.actor_id : true))
      .filter((r) => (actions ? actions.includes(r.action) : true))
      .filter((r) => (q.entity_type ? r.entity_type === q.entity_type : true))
      .filter((r) => (q.entity_id ? r.entity_id === q.entity_id : true))
      .filter((r) => (since !== null ? Date.parse(r.at) >= since : true))
      .filter((r) => (until !== null ? Date.parse(r.at) <= until : true))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const offset = q.offset && q.offset > 0 ? q.offset : 0;
    const limit = q.limit && q.limit > 0 ? q.limit : 50;
    const records = matched.slice(offset, offset + limit);
    return { records, total: matched.length, truncated: offset + records.length < matched.length };
  }

  async countSince(since: string): Promise<Record<string, number>> {
    const t = Date.parse(since);
    const counts: Record<string, number> = {};
    for (const r of this.readAll()) {
      if (Date.parse(r.at) >= t) counts[r.action] = (counts[r.action] ?? 0) + 1;
    }
    return counts;
  }
}
