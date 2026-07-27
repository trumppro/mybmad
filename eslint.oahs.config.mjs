/**
 * ESLint for the oahs platform workspaces (`packages/**`, `apps/**`).
 *
 * SEPARATE from `eslint.config.mjs` on purpose. That config is upstream BMAD's
 * JavaScript ecosystem and globally ignores these trees; the note there said the
 * oahs workspaces have "their own toolchain (TS strict + vitest)" — but that
 * toolchain contained no linter at all, so ~49k LOC of net-new TypeScript had
 * `tsc --noEmit` as its only static gate. Three things that cost:
 *
 *  1. `no-floating-promises` never ran on `packages/runner` (2.8k LOC of async
 *     orchestration) or `apps/oahs/src/dispatcher.ts`. A dropped `await` there
 *     loses a claim silently — the worst failure shape this system has.
 *  2. The §0.1 spine-purity invariant had to be expressed as two CI greps over
 *     four directories, because the natural mechanism (an import-boundary lint)
 *     was unavailable. A grep cannot see `ui-src`, a bare `fetch()` to a provider,
 *     or any vendor whose name is not one of six literals. `no-restricted-imports`
 *     below is that invariant as a rule the compiler's own module graph enforces.
 *  3. Nothing flagged unused code in a 3k-line `pg-engine.ts`.
 *
 * The ruleset is deliberately narrow rather than `recommended-type-checked`:
 * turning on ~90 rules across 49k LOC at once produces a backlog nobody reads.
 * These are the rules whose violations are bugs, not style.
 */
import { fileURLToPath } from 'node:url';

import tseslint from 'typescript-eslint';

// Not `import.meta.dirname`: that is unsupported below Node 22.16, and this repo's
// engines floor is >=22 — the repo's own lint catches the gap.
const ROOT = fileURLToPath(new URL('.', import.meta.url));

/** The spine (§0.1): no model provider, no gateway, no interpretation. */
const SPINE_FORBIDDEN = [
  {
    group: ['@oahs/gateway', '@oahs/gateway/*'],
    message:
      '§0.1/§2.5: the spine must not import the model gateway. Model calls belong to the runtime layer (runner/dispatcher/jobs), never behind a command handler.',
  },
  {
    group: [
      '@anthropic-ai/*',
      'openai',
      'openai/*',
      '@google/generative-ai',
      '@google/genai',
      'mistralai',
      '@mistralai/*',
      'cohere-ai',
      'ollama',
      '@aws-sdk/client-bedrock*',
      '@azure/openai',
      'langchain',
      'langchain/*',
      '@langchain/*',
    ],
    message: '§0.1: no LLM-provider SDK inside the spine. The spine never interprets — it checks.',
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/bin/**', // committed esbuild bundles
      '**/public/**', // built UI bundle
      '**/*.d.ts',
      '**/coverage/**',
    ],
  },
  // Type-aware linting needs a program; each workspace has its own tsconfig.
  {
    files: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts', 'apps/*/ui-src/**/*.ts'],
    extends: [tseslint.configs.base],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: ROOT },
    },
    rules: {
      // A dropped await in the runner or dispatcher loses a claim silently.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      // `catch (e) { }` hiding a real failure, and dead code.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-constant-condition': 'error',
    },
  },
  // §0.1 as a rule rather than a grep. Scope = exactly the four spine trees the
  // CI greps name, plus the UI bundle the greps cannot see but the spine serves.
  {
    files: [
      'packages/core/src/**/*.ts',
      'packages/db/src/**/*.ts',
      'packages/contracts/src/**/*.ts',
      'apps/spine-api/src/**/*.ts',
      'apps/spine-api/ui-src/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: SPINE_FORBIDDEN }],
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: SPINE_FORBIDDEN }],
    },
  },
  // Tests: same bug-class rules, but a test may legitimately hold an unused
  // binding while pinning a shape, and fixtures throw away promises deliberately.
  {
    files: ['packages/*/test/**/*.ts', 'apps/*/test/**/*.ts'],
    extends: [tseslint.configs.base],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: ROOT },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'no-constant-condition': 'error',
    },
  },
);
