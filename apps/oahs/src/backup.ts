/**
 * `oahs backup` / `oahs restore` — the durable-state escape hatch.
 *
 * Until now there was none: a grep for backup/restore/dump across `apps/` and
 * `packages/` returned zero implementations, and the only guidance anywhere was the
 * Vietnamese ops doc telling an operator to copy the data directory "when the server
 * has stopped OR is in a stable state". That second clause sanctions copying a LIVE
 * PGlite directory, which yields a torn page/WAL state — a backup that cannot be
 * opened, discovered at restore time, which is the worst moment to discover it.
 *
 * Two design choices make this safe rather than merely documented:
 *
 *  1. **Backup takes the same cross-process lock `serve` takes.** So "don't back up a
 *     running spine" stops being advice and becomes mechanism: if a server holds the
 *     dir, `backup` refuses with the reason. Holding the lock for the duration also
 *     means no writer can start mid-copy. A torn backup is not discouraged here — it
 *     is unreachable.
 *
 *  2. **One artifact, both stores.** Durable state is split across `<dir>/pg` (PGlite)
 *     and `<dir>/tokens.json` (the credential store), which are independent files. A
 *     copy of one taken seconds apart from the other can restore a database whose
 *     actors have no resolvable tokens, or tokens for actors that do not exist. They
 *     travel together, with the schema version that wrote them.
 *
 * `tar` is invoked as argv (never through a shell), the same posture the runner uses
 * for `git`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import { acquireDataDirLock, DataDirLockedError, SCHEMA_VERSION } from '@oahs/db';

/**
 * The path `serve` actually locks (apps/oahs/src/serve.ts): the PGlite subdirectory,
 * not the data dir above it. Backup MUST lock the same path or the two acquire
 * different locks and exclude nothing — which is exactly what an earlier version of
 * this file did: it locked `<dataDir>`, so `oahs backup` cheerfully archived a
 * directory that a live server was writing to, producing the torn copy the lock was
 * added to make impossible. Both call sites derive the path from here now.
 */
export function servedLockPath(dataDir: string): string {
  return join(dataDir, 'pg');
}

/** What a backup asserts about itself, so restore can refuse an incompatible one. */
interface BackupManifest {
  format: 1;
  /** The DDL version that wrote the enclosed `pg/` directory. */
  schemaVersion: number;
  /** Informational: which binary produced it. */
  oahsVersion: string;
  /** Informational: when. Not used for any decision. */
  createdAt: string;
  contents: string[];
}

const MANIFEST_NAME = 'oahs-backup.json';

function runTar(args: string[], cwd: string): void {
  const result = spawnSync('tar', args, { cwd, encoding: 'utf8', shell: false });
  if (result.error !== undefined) {
    throw new Error(`tar could not be run (${result.error.message}). Is tar on your PATH?`);
  }
  if (result.status !== 0) {
    throw new Error(`tar failed (exit ${String(result.status)}): ${result.stderr.trim()}`);
  }
}

export interface BackupOptions {
  dataDir: string;
  out: string;
  oahsVersion: string;
}

/**
 * Archive a data directory. Refuses while a spine is serving it — that refusal is
 * the whole safety property, so it is never downgraded to a warning.
 */
export async function backupCommand(opts: BackupOptions): Promise<string> {
  const dataDir = resolve(opts.dataDir);
  const out = resolve(opts.out);
  if (!existsSync(dataDir)) {
    throw new Error(`no data directory at ${dataDir} — nothing to back up`);
  }
  if (existsSync(out)) {
    throw new Error(`refusing to overwrite ${out} (move it aside, or pass a different --out)`);
  }

  if (!existsSync(servedLockPath(dataDir))) {
    throw new Error(
      `${dataDir} has no pg/ subdirectory — it is not a durable oahs data dir (an --ephemeral serve persists nothing)`,
    );
  }
  let release: (() => Promise<void>) | undefined;
  try {
    release = await acquireDataDirLock(servedLockPath(dataDir));
  } catch (error) {
    if (error instanceof DataDirLockedError) {
      throw new Error(
        `${dataDir} is being served right now, so a copy of it would be torn and unopenable. ` +
          `Stop the spine (or back up a different --data dir) and run this again. ` +
          `If you are certain no server is running, an abandoned lock clears itself within 20s.`,
      );
    }
    throw error;
  }

  try {
    const contents = readdirSync(dataDir).filter((name) => name !== MANIFEST_NAME && !name.endsWith('.lock'));
    const manifest: BackupManifest = {
      format: 1,
      schemaVersion: SCHEMA_VERSION,
      oahsVersion: opts.oahsVersion,
      createdAt: new Date().toISOString(),
      contents,
    };
    // The manifest is written INTO the dir so it is inside the archive, then removed:
    // a backup that cannot state its own schema version cannot be safely restored.
    const manifestPath = join(dataDir, MANIFEST_NAME);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    try {
      mkdirSync(dirname(out), { recursive: true });
      runTar(['-czf', out, MANIFEST_NAME, ...contents], dataDir);
    } finally {
      rmSync(manifestPath, { force: true });
    }
    return [
      `backed up ${dataDir} → ${out}`,
      `  schemaVersion ${String(SCHEMA_VERSION)} · ${contents.join(', ')}`,
      `  restore with: oahs restore ${basename(out)} --data <empty-dir>`,
    ].join('\n');
  } finally {
    await release();
  }
}

export interface RestoreOptions {
  archive: string;
  dataDir: string;
}

/**
 * Restore an archive into an EMPTY data directory.
 *
 * Refuses a non-empty target, because merging a backup into live state produces a
 * dir that is neither — and refuses an archive written by a newer schema, mirroring
 * the guard `serve` already applies (an old binary cannot know what a newer schema
 * changed, so it must not open it).
 */
export async function restoreCommand(opts: RestoreOptions): Promise<string> {
  const archive = resolve(opts.archive);
  const dataDir = resolve(opts.dataDir);
  if (!existsSync(archive)) throw new Error(`no such archive: ${archive}`);
  if (existsSync(dataDir) && readdirSync(dataDir).some((n) => !n.endsWith('.lock'))) {
    throw new Error(
      `${dataDir} is not empty. Restore never merges into existing state — point --data at a new ` +
        `directory, or move the current one aside first.`,
    );
  }

  // Lock the target too: a concurrent `serve` racing a restore is the same class of
  // corruption the lock exists to prevent. acquireDataDirLock mkdirs its target, and
  // tar will extract pg/ over it.
  mkdirSync(dataDir, { recursive: true });
  let release: (() => Promise<void>) | undefined;
  try {
    release = await acquireDataDirLock(servedLockPath(dataDir));
  } catch (error) {
    if (error instanceof DataDirLockedError) {
      throw new Error(`${dataDir} is locked by another process — stop it before restoring into that dir`);
    }
    throw error;
  }

  try {
    runTar(['-xzf', archive, '-C', dataDir], dirname(archive));
    const manifestPath = join(dataDir, MANIFEST_NAME);
    if (!existsSync(manifestPath)) {
      throw new Error(
        `${archive} carries no ${MANIFEST_NAME} — it was not produced by \`oahs backup\`, so its schema ` +
          `version is unknown and it will not be restored`,
      );
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BackupManifest;
    if (manifest.schemaVersion > SCHEMA_VERSION) {
      throw new Error(
        `this archive was written at schema v${String(manifest.schemaVersion)} but this binary enforces ` +
          `v${String(SCHEMA_VERSION)}. An older binary cannot know what a newer schema changed. Upgrade oahs and retry.`,
      );
    }
    rmSync(manifestPath, { force: true });
    return [
      `restored ${archive} → ${dataDir}`,
      `  schemaVersion ${String(manifest.schemaVersion)} (backup taken ${manifest.createdAt} by oahs ${manifest.oahsVersion})`,
      `  start it with: oahs serve --data ${dataDir}`,
    ].join('\n');
  } finally {
    await release();
  }
}
