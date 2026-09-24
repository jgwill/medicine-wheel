/**
 * Invitations: the door into a circle.
 *
 * STPB invites by circle (`circles/[id]/invite`) and admits by ceremony code
 * (`admin/ceremony-codes`). Here one record does both: a code, minted by
 * someone allowed to invite, bound to a circle, with a role for whoever
 * accepts it. Codes are operational, not relational, so like credentials they
 * stay with the consumer, not on the wheel; accepting one weaves the
 * `member_of` edge, which is the relational fact.
 */

import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CircleRole } from './circles.js';

export interface InvitationRecord {
  code: string;
  circle_id: string;
  invited_by: string;
  role: CircleRole;
  /** The name the invitation was meant for; informational. */
  intended_for?: string;
  /** The address the code was sent to. Never part of the public view. */
  intended_email?: string;
  created_at: string;
  expires_at?: string;
  max_uses: number;
  accepted_by: string[];
  revoked_at?: string;
}

export interface InvitationInput {
  circle_id: string;
  invited_by: string;
  role?: CircleRole;
  intended_for?: string;
  intended_email?: string;
  /** ISO date. Without it the code lives DEFAULT_INVITATION_TTL_HOURS. */
  expires_at?: string;
  max_uses?: number;
}

/** How long a code stays open when its minter names no expiry. */
export const DEFAULT_INVITATION_TTL_HOURS = 96;

export interface InvitationStore {
  create(input: InvitationInput): Promise<InvitationRecord>;
  get(code: string): Promise<InvitationRecord | null>;
  listForCircle(circle_id: string): Promise<InvitationRecord[]>;
  /** Record an acceptance. Returns the record, or a reason it could not be accepted. */
  accept(code: string, person_id: string): Promise<{ ok: true; record: InvitationRecord } | { ok: false; reason: 'unknown' | 'revoked' | 'expired' | 'exhausted' | 'already' }>;
  revoke(code: string): Promise<boolean>;
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function mintInvitationCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function invitationState(record: InvitationRecord, now = Date.now()): 'open' | 'revoked' | 'expired' | 'exhausted' {
  if (record.revoked_at) return 'revoked';
  if (record.expires_at && Date.parse(record.expires_at) < now) return 'expired';
  if (record.accepted_by.length >= record.max_uses) return 'exhausted';
  return 'open';
}

/** What a code holder may see before registering: no address, no acceptances. */
export interface PublicInvitation {
  code: string;
  role: CircleRole;
  state: ReturnType<typeof invitationState>;
  circle_name: string;
  invited_by_name?: string;
  intended_for?: string;
  expires_at?: string;
  /** True when the invitation names an address the registration may take. */
  has_email: boolean;
}

export function publicInvitation(record: InvitationRecord, names: { circle_name: string; invited_by_name?: string }, now = Date.now()): PublicInvitation {
  return {
    code: record.code,
    role: record.role,
    state: invitationState(record, now),
    circle_name: names.circle_name,
    ...(names.invited_by_name ? { invited_by_name: names.invited_by_name } : {}),
    ...(record.intended_for ? { intended_for: record.intended_for } : {}),
    ...(record.expires_at ? { expires_at: record.expires_at } : {}),
    has_email: Boolean(record.intended_email),
  };
}

export class JsonlInvitationStore implements InvitationStore {
  constructor(private readonly file: string) {}

  private readAll(): InvitationRecord[] {
    if (!existsSync(this.file)) return [];
    return readFileSync(this.file, 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as InvitationRecord);
  }

  private writeAll(records: InvitationRecord[]): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : ''));
  }

  async create(input: InvitationInput): Promise<InvitationRecord> {
    const now = Date.now();
    const record: InvitationRecord = {
      code: mintInvitationCode(),
      circle_id: input.circle_id,
      invited_by: input.invited_by,
      role: input.role ?? 'member',
      ...(input.intended_for ? { intended_for: input.intended_for } : {}),
      ...(input.intended_email ? { intended_email: input.intended_email.trim().toLowerCase() } : {}),
      created_at: new Date(now).toISOString(),
      expires_at: input.expires_at ?? new Date(now + DEFAULT_INVITATION_TTL_HOURS * 3600_000).toISOString(),
      max_uses: input.max_uses && input.max_uses > 0 ? input.max_uses : 1,
      accepted_by: [],
    };
    mkdirSync(dirname(this.file), { recursive: true });
    appendFileSync(this.file, JSON.stringify(record) + '\n');
    return record;
  }

  async get(code: string): Promise<InvitationRecord | null> {
    return this.readAll().find((r) => r.code === code.trim().toUpperCase()) ?? null;
  }

  async listForCircle(circle_id: string): Promise<InvitationRecord[]> {
    return this.readAll().filter((r) => r.circle_id === circle_id);
  }

  async accept(code: string, person_id: string) {
    const records = this.readAll();
    const index = records.findIndex((r) => r.code === code.trim().toUpperCase());
    if (index < 0) return { ok: false as const, reason: 'unknown' as const };
    const record = records[index];
    if (record.accepted_by.includes(person_id)) return { ok: false as const, reason: 'already' as const };
    const state = invitationState(record);
    if (state !== 'open') return { ok: false as const, reason: state };
    records[index] = { ...record, accepted_by: [...record.accepted_by, person_id] };
    this.writeAll(records);
    return { ok: true as const, record: records[index] };
  }

  async revoke(code: string): Promise<boolean> {
    const records = this.readAll();
    const index = records.findIndex((r) => r.code === code.trim().toUpperCase());
    if (index < 0) return false;
    if (!records[index].revoked_at) {
      records[index] = { ...records[index], revoked_at: new Date().toISOString() };
      this.writeAll(records);
    }
    return true;
  }
}
