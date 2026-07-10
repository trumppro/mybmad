/**
 * RunnerRegistry — operational liveness for worker processes (Wave 3).
 *
 * Like the TokenStore, this is spine-api OPERATIONAL state, not engine
 * state: runner liveness carries no lifecycle authority, appends no events,
 * and vanishes on server restart (runners re-register — their heartbeat
 * fails with a clear error and the loop re-registers). The deterministic
 * engine never sees it.
 */
import { randomBytes } from 'node:crypto';

export interface RunnerRecord {
  runnerId: string;
  /** From the authenticated context — never the request body. */
  actorId: string;
  mode: 'coding' | 'jobs';
  projectId?: string;
  repoPath?: string;
  host?: string;
  pid?: number;
  startedAt: number;
  lastSeenAt: number;
}

export class RunnerRegistry {
  private readonly byId = new Map<string, RunnerRecord>();

  register(
    actorId: string,
    input: {
      mode: 'coding' | 'jobs';
      projectId?: string;
      repoPath?: string;
      host?: string;
      pid?: number;
    },
  ): RunnerRecord {
    const now = Date.now();
    const record: RunnerRecord = {
      runnerId: `rn_${randomBytes(6).toString('hex')}`,
      actorId,
      mode: input.mode,
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.host !== undefined ? { host: input.host } : {}),
      ...(input.pid !== undefined ? { pid: input.pid } : {}),
      startedAt: now,
      lastSeenAt: now,
    };
    this.byId.set(record.runnerId, record);
    return { ...record };
  }

  /** Returns false for an unknown id (server restarted) — caller re-registers. */
  heartbeat(runnerId: string): boolean {
    const record = this.byId.get(runnerId);
    if (!record) return false;
    record.lastSeenAt = Date.now();
    return true;
  }

  list(): RunnerRecord[] {
    return [...this.byId.values()].map((record) => ({ ...record }));
  }
}
