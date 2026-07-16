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
  /** §10.1 job-bound scope: the claim this token may act on (undefined = unscoped). */
  claimId?: string;
  /** §10.1: the work item this token may act on — confines the workItemId-addressed commands. */
  workItemId?: string;
  /** §10.1: the ONLY commands a scoped token may call (undefined = unrestricted). */
  allowedCommands?: readonly string[];
  /** §10.1: engine-clock ms when the token dies (= the lease expiry); past it, resolve() returns null. */
  expiresAt?: number;
}

interface PersistShape {
  version: 1;
  tokens: Record<string, ResolvedToken>; // sha256(token) hex -> record
  /**
   * Phase 2 (roadmap §3): the REAL engine actor the bootstrap admin token
   * acts as ('Workspace Admin', governance role 'admin'). Persisted so a
   * `--data` restart reuses the same actor instead of minting a new one.
   */
  adminActorId?: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * A short, non-reversible fingerprint of a token for the audit log (roadmap §8):
 * the first 8 hex of its sha256. Enough to correlate a credential op with the
 * store's hashed record; never enough to reconstruct the token.
 */
export function tokenHashPrefix(token: string): string {
  return hashToken(token).slice(0, 8);
}

export class TokenStore {
  private readonly byHash = new Map<string, ResolvedToken>();
  private readonly persistPath: string | undefined;
  private adminActorId: string | undefined;

  constructor(options?: { persistPath?: string }) {
    this.persistPath = options?.persistPath;
    if (this.persistPath !== undefined && existsSync(this.persistPath)) {
      const raw = JSON.parse(readFileSync(this.persistPath, 'utf8')) as PersistShape;
      for (const [hash, record] of Object.entries(raw.tokens)) {
        // §10.1: carry the scope fields too (claimId/allowedCommands/expiresAt)
        // so a `--data` restart honours a still-live job-bound token.
        this.byHash.set(hash, { ...record });
      }
      this.adminActorId = raw.adminActorId;
    }
  }

  /** Persisted engine-actor id the bootstrap admin token maps to (if any). */
  getAdminActorId(): string | undefined {
    return this.adminActorId;
  }

  /** Remember (and persist) the bootstrap admin actor mapping. */
  setAdminActorId(actorId: string): void {
    this.adminActorId = actorId;
    this.save();
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

  /**
   * §10.1: issue a JOB-BOUND token — scoped to one claim, a fixed command
   * allowlist, and the lease's expiry. The container/runner uses it for dispatch
   * mutations; it can never mint another token or step outside the claim.
   */
  issueScoped(
    actorId: string,
    scope: {
      claimId: string;
      workItemId: string;
      allowedCommands: readonly string[];
      expiresAt: number;
    },
  ): string {
    const token = randomBytes(32).toString('hex');
    this.byHash.set(hashToken(token), {
      actorId,
      isAdmin: false,
      claimId: scope.claimId,
      workItemId: scope.workItemId,
      allowedCommands: [...scope.allowedCommands],
      expiresAt: scope.expiresAt,
    });
    this.save();
    return token;
  }

  /**
   * §10.2: extend every live scoped token bound to `claimId` out to `expiresAt`
   * (the claim's freshly heartbeated lease). The container that runs a claim
   * holds a MUTATION-ONLY token it can neither re-mint nor mint anew, so its
   * credential would otherwise freeze at the lease-as-of-mint and die mid-run on
   * any dispatch longer than the initial TTL. Renewing on heartbeat makes the
   * token track the claim's life: the container sustains it with the very
   * heartbeats it already sends, and a crashed container's token lapses with its
   * lease. Never SHORTENS a token (a stale heartbeat cannot cut a run short).
   */
  renewScopedForClaim(claimId: string, expiresAt: number): void {
    let changed = false;
    for (const record of this.byHash.values()) {
      if (record.claimId === claimId && record.expiresAt !== undefined && expiresAt > record.expiresAt) {
        record.expiresAt = expiresAt;
        changed = true;
      }
    }
    if (changed) this.save();
  }

  /**
   * Issued-token inventory: actor id + count, nothing else. The store holds
   * only sha256 hashes, so there is no secret HERE to leak — but the wire
   * gets counts, not hashes. Admin bootstrap entries are configuration and
   * stay out (mirrors save()).
   */
  list(): Array<{ actorId: string; tokens: number }> {
    const counts = new Map<string, number>();
    for (const record of this.byHash.values()) {
      if (record.isAdmin) continue;
      counts.set(record.actorId, (counts.get(record.actorId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([actorId, tokens]) => ({ actorId, tokens }));
  }

  /**
   * Lost-credential recovery: revoke EVERY issued token of the actor, issue
   * one fresh token. The old credential dies the moment the new one exists.
   */
  reissue(actorId: string): string {
    for (const [hash, record] of this.byHash) {
      if (!record.isAdmin && record.actorId === actorId) this.byHash.delete(hash);
    }
    return this.issue(actorId); // issue() saves
  }

  /**
   * Resolve a bearer token. A scoped token past its `expiresAt` resolves to
   * null (unauthenticated-equivalent → 401), so an expired lease invalidates the
   * credential exactly when it invalidates the claim. `now` is injected (the
   * served spine passes wall-clock; tests pass a controlled clock) because the
   * expiry is an engine-clock value.
   */
  resolve(token: string, now: number = Date.now()): ResolvedToken | null {
    const record = this.byHash.get(hashToken(token));
    if (!record) return null;
    if (record.expiresAt !== undefined && record.expiresAt <= now) return null;
    return { ...record };
  }

  private save(): void {
    if (this.persistPath === undefined) return;
    const shape: PersistShape = {
      version: 1,
      tokens: {},
      ...(this.adminActorId !== undefined ? { adminActorId: this.adminActorId } : {}),
    };
    for (const [hash, record] of this.byHash) {
      // Admin bootstrap entries are configuration; persist only issued tokens.
      if (record.isAdmin) continue;
      shape.tokens[hash] = { ...record };
    }
    mkdirSync(dirname(this.persistPath), { recursive: true });
    writeFileSync(this.persistPath, JSON.stringify(shape, null, 2), 'utf8');
  }
}
