/**
 * Credentials: the secret that proves a person is who the wheel says.
 *
 * Never stored on the wheel. The wheel holds the relational truth (who, in
 * which circle, with which role); the consumer that lets people sign in holds
 * the secrets, hashed. A person issues their own tokens (STPB's
 * `api/user/tokens`), an admin issues the first one for a newcomer.
 *
 * The store is an interface so a community can keep credentials where it
 * chooses. `JsonlCredentialStore` is the file-backed one Miadi uses.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const TOKEN_PREFIX = 'mwt_';

export interface CredentialRecord {
  id: string;
  person_id: string;
  label: string;
  /** sha256 hex of the token. The token itself is shown once, at issue. */
  token_hash: string;
  created_at: string;
  last_used_at?: string;
  revoked_at?: string;
}

export interface IssuedCredential {
  /** The bearer token, shown once. */
  token: string;
  record: CredentialRecord;
}

export interface CredentialStore {
  issue(person_id: string, label: string): Promise<IssuedCredential>;
  /** The live record for a token, or null when unknown or revoked. Touches `last_used_at`. */
  verify(token: string): Promise<CredentialRecord | null>;
  list(person_id: string): Promise<CredentialRecord[]>;
  /** Revoke by record id. Returns false when unknown. */
  revoke(id: string, person_id?: string): Promise<boolean>;
}

export function mintToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function sameHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function credentialId(): string {
  return `cred:${Date.now()}:${randomBytes(3).toString('hex')}`;
}

/**
 * One append-only jsonl file: issues append, revocations and last-use rewrite
 * the record in place. Small by design; a community with thousands of people
 * puts the same interface over a database.
 */
export class JsonlCredentialStore implements CredentialStore {
  constructor(private readonly file: string) {}

  private readAll(): CredentialRecord[] {
    if (!existsSync(this.file)) return [];
    return readFileSync(this.file, 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as CredentialRecord);
  }

  private writeAll(records: CredentialRecord[]): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : ''), { mode: 0o600 });
  }

  async issue(person_id: string, label: string): Promise<IssuedCredential> {
    const token = mintToken();
    const record: CredentialRecord = {
      id: credentialId(),
      person_id,
      label: label.trim() || 'token',
      token_hash: hashToken(token),
      created_at: new Date().toISOString(),
    };
    mkdirSync(dirname(this.file), { recursive: true });
    if (!existsSync(this.file)) writeFileSync(this.file, '', { mode: 0o600 });
    appendFileSync(this.file, JSON.stringify(record) + '\n');
    return { token, record };
  }

  async verify(token: string): Promise<CredentialRecord | null> {
    if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
    const hash = hashToken(token);
    const records = this.readAll();
    const index = records.findIndex((r) => !r.revoked_at && sameHash(r.token_hash, hash));
    if (index < 0) return null;
    records[index] = { ...records[index], last_used_at: new Date().toISOString() };
    this.writeAll(records);
    return records[index];
  }

  async list(person_id: string): Promise<CredentialRecord[]> {
    return this.readAll().filter((r) => r.person_id === person_id);
  }

  async revoke(id: string, person_id?: string): Promise<boolean> {
    const records = this.readAll();
    const index = records.findIndex((r) => r.id === id && (person_id === undefined || r.person_id === person_id));
    if (index < 0) return false;
    if (!records[index].revoked_at) {
      records[index] = { ...records[index], revoked_at: new Date().toISOString() };
      this.writeAll(records);
    }
    return true;
  }
}

/** Public view of a credential: never the hash. */
export function publicCredential(record: CredentialRecord): Omit<CredentialRecord, 'token_hash'> {
  const { token_hash: _hash, ...rest } = record;
  return rest;
}
