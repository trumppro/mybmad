# oahs — self-host container (product-roadmap.md §7). Multi-stage:
#  builder  — pnpm installs ONLY the @oahs/cli dependency graph (skips the
#             BMAD root devDeps), then `pnpm -C apps/oahs build` esbuild-bundles
#             every @oahs/* source INTO bin/oahs.mjs (+ dist/worker.mjs for the
#             PGlite synckit worker + public/ UI). One command → every artifact.
#  runtime  — a self-contained `pnpm deploy` of the CLI (bin + dist + public +
#             the external runtime deps only), run as a non-root user against a
#             /data volume (durable PGlite). No DB service required (§ compose).
#
# Node 22 matches .nvmrc and the esbuild target (node22).

# ---------------------------------------------------------------------------
FROM node:22-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# Pin pnpm to the version the lockfile was generated with. Without a pin,
# corepack pulls the latest pnpm (11.x), whose default minimum-release-age
# supply-chain policy rejects freshly published lockfile entries.
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

# Manifests first — a dependency layer that caches until a package.json changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/gateway/package.json packages/gateway/
COPY packages/runner/package.json packages/runner/
COPY apps/oahs/package.json apps/oahs/
COPY apps/spine-api/package.json apps/spine-api/

# Only the CLI's workspace graph — the BMAD-method root project is out of scope.
# --ignore-scripts: the `prepare` hook builds the CLI (needs sources not copied
# yet); we run the build explicitly below. Not --frozen-lockfile: pnpm-lock.yaml
# is .gitignored here (not a committed anchor), so resolve against manifests.
RUN pnpm install --ignore-scripts --filter "@oahs/cli..."

# Sources, then the one build that produces bin + dist worker + public UI.
COPY packages/ packages/
COPY apps/ apps/
RUN pnpm --filter @oahs/cli run build

# Flatten the CLI into a self-contained, prod-only deployment (real node_modules,
# no workspace symlinks) — everything the runtime needs, nothing it doesn't.
RUN pnpm --filter @oahs/cli deploy --prod /app

# ---------------------------------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV OAHS_PORT=4521
WORKDIR /app

# Run unprivileged; /data is the durable PGlite root (a mounted volume).
RUN useradd --system --uid 10001 --create-home oahs \
  && mkdir -p /data && chown oahs:oahs /data
COPY --from=builder --chown=oahs:oahs /app ./
USER oahs

EXPOSE 4521
VOLUME ["/data"]

# Liveness: the same /healthz every client can hit (honours $OAHS_PORT).
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.OAHS_PORT||4521)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The bundle entrypoint IS the executable. Port/flags come from compose (CMD).
# serve binds 0.0.0.0 by default (serve.ts); compose passes --port.
ENTRYPOINT ["node", "bin/oahs.mjs"]
CMD ["serve", "--data", "/data"]
