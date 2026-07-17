/**
 * Thrown when a data directory was written by a NEWER binary than the one now opening it.
 *
 * The refusal is deliberately one-directional. A newer binary opening an older dir is fine —
 * the DDL is additive (CREATE/ALTER ... IF NOT EXISTS), so it upgrades the dir in place. An
 * OLDER binary opening a newer dir is the dangerous case: it cannot know what the newer schema
 * changed, and PGlite offers no protection (two processes on one dir already destroy it — see
 * data-lock.ts). So we stop before touching the data rather than risk corrupting it.
 */
export class SchemaVersionError extends Error {
  constructor(
    readonly storedVersion: number,
    readonly binaryVersion: number,
  ) {
    super(
      `data directory was written by a newer oahs (schema v${storedVersion}); this binary ` +
        `speaks schema v${binaryVersion} and will not open it — upgrade oahs, or point --data ` +
        `at a directory this version created.`,
    );
    this.name = 'SchemaVersionError';
  }
}
