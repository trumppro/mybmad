/**
 * TokenStore — bearer-token authentication for both surfaces (HTTP + MCP).
 *
 * Tokens are opaque 32-byte random hex strings; only their sha256 hash is
 * stored (and optionally persisted), so a leaked store file never leaks a
 * usable credential. The bootstrap admin token arrives as a PARAMETER — this
 * module never reads the environment (env handling lives in index.ts start()).
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface ResolvedToken {
  actorId: string;
  isAdmin: boolean;
}

interface PersistShape {
  version: 1;
  tokens: Record<string, ResolvedToken>; // sha256(token) hex -> record
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export class TokenStore {
  private readonly byHash = new Map<string, ResolvedToken>();
  private readonly persistPath: string | undefined;

  constructor(options?: { persistPath?: string }) {
    this.persistPath = options?.persistPath;
    if (this.persistPath !== undefined && existsSync(this.persistPath)) {
      const raw = JSON.parse(readFileSync(this.persistPath, 'utf8')) as PersistShape;
      for (const [hash, record] of Object.entries(raw.tokens)) {
        this.byHash.set(hash, { actorId: record.actorId, isAdmin: record.isAdmin });
      }
    }
  }

  /**
   * Register the bootstrap admin token (survives restarts by re-bootstrap,
   * not persistence — the admin credential is configuration, not state).
   */
  bootstrapAdmin(token: string, actorId = 'admin'): void {
    this.byHash.set(hashToken(token), { actorId, isAdmin: true });
  }

  /** Issue a fresh token for an actor. The plaintext is returned exactly once. */
  issue(actorId: string): string {
    const token = randomBytes(32).toString('hex');
    this.byHash.set(hashToken(token), { actorId, isAdmin: false });
    this.save();
    return token;
  }

  resolve(token: string): ResolvedToken | null {
    const record = this.byHash.get(hashToken(token));
    return record ? { ...record } : null;
  }

  private save(): void {
    if (this.persistPath === undefined) return;
    const shape: PersistShape = { version: 1, tokens: {} };
    for (const [hash, record] of this.byHash) {
      // Admin bootstrap entries are configuration; persist only issued tokens.
      if (record.isAdmin) continue;
      shape.tokens[hash] = { ...record };
    }
    mkdirSync(dirname(this.persistPath), { recursive: true });
    writeFileSync(this.persistPath, JSON.stringify(shape, null, 2), 'utf8');
  }
}
