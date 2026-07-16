/**
 * @oahs/runner — minimal GitHub forge client (roadmap §9.6).
 *
 * The SPINE never talks to a forge (§2.3): the runner and the gate-holder's CLI
 * MEASURE (open a PR, read its merge state) and submit the facts as `pr`
 * evidence; the core JUDGES. Credentials (a GitHub token) live only in
 * runner/CLI env (`OAHS_GITHUB_TOKEN`), never in the spine or its DB.
 *
 * fetch is constructor-injected (like the gateway's OpenAICompatibleProvider),
 * so tests never touch the network and the base URL is overridable.
 */

/** The fetch shape the client depends on — injectable so tests never hit the network. */
export type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

export class ForgeError extends Error {
  override readonly name = 'ForgeError';
  readonly status: number | undefined;
  readonly body: string | undefined;
  constructor(message: string, options: { status?: number; body?: string } = {}) {
    super(message);
    this.status = options.status;
    this.body = options.body;
  }
}

/** Response bodies over this length are truncated in ForgeError.body. */
const ERROR_BODY_HEAD = 2000;

export interface PullRequest {
  number: number;
  url: string;
  /** true once the PR has merged. */
  merged: boolean;
  /** the merge commit sha once merged (null before). */
  mergedSha: string | null;
  /** the base branch the PR targets. */
  base: string;
}

interface GitHubPr {
  number?: unknown;
  html_url?: unknown;
  merged?: unknown;
  merge_commit_sha?: unknown;
  base?: { ref?: unknown };
}

function toPullRequest(raw: GitHubPr): PullRequest {
  return {
    number: typeof raw.number === 'number' ? raw.number : 0,
    url: typeof raw.html_url === 'string' ? raw.html_url : '',
    merged: raw.merged === true,
    mergedSha: typeof raw.merge_commit_sha === 'string' ? raw.merge_commit_sha : null,
    base: typeof raw.base?.ref === 'string' ? raw.base.ref : '',
  };
}

/**
 * GitHub REST v3 client for the three operations §9.6 needs: open a PR, find an
 * open PR by head branch (idempotent re-dispatch), and read a PR's merge state.
 */
export class GitHubForge {
  private readonly owner: string;
  private readonly repo: string;
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchImpl;

  constructor(config: {
    owner: string;
    repo: string;
    token: string;
    /** Default https://api.github.com — overridable for tests / GHES. */
    baseUrl?: string;
    fetchImpl?: FetchImpl;
  }) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.token = config.token;
    this.baseUrl = (config.baseUrl ?? 'https://api.github.com').replace(/\/+$/, '');
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private headers(): Record<string, string> {
    return {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${this.token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    };
  }

  private async json(res: Response, context: string): Promise<unknown> {
    const text = await res.text();
    if (!res.ok) {
      throw new ForgeError(`GitHub ${context} failed (${String(res.status)})`, {
        status: res.status,
        body: text.slice(0, ERROR_BODY_HEAD),
      });
    }
    return text === '' ? {} : (JSON.parse(text) as unknown);
  }

  private repoPath(): string {
    return `${this.baseUrl}/repos/${this.owner}/${this.repo}`;
  }

  /** Open a PR from `head` into `base`. */
  async openPr(input: { head: string; base: string; title: string }): Promise<PullRequest> {
    const res = await this.fetchImpl(`${this.repoPath()}/pulls`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ title: input.title, head: input.head, base: input.base }),
    });
    return toPullRequest((await this.json(res, 'open PR')) as GitHubPr);
  }

  /** The open PR whose head is `head` (owner-qualified), or null when none exists. */
  async findPrByHead(input: { head: string }): Promise<PullRequest | null> {
    const q = new URLSearchParams({ head: `${this.owner}:${input.head}`, state: 'open' });
    const res = await this.fetchImpl(`${this.repoPath()}/pulls?${q.toString()}`, {
      method: 'GET',
      headers: this.headers(),
    });
    const list = (await this.json(res, 'find PR by head')) as GitHubPr[];
    const first = Array.isArray(list) ? list[0] : undefined;
    return first !== undefined ? toPullRequest(first) : null;
  }

  /** The merge state of PR #number (merged flag + merge sha + base branch). */
  async getPrMergeState(input: { number: number }): Promise<PullRequest> {
    const res = await this.fetchImpl(`${this.repoPath()}/pulls/${String(input.number)}`, {
      method: 'GET',
      headers: this.headers(),
    });
    return toPullRequest((await this.json(res, 'get PR')) as GitHubPr);
  }
}
