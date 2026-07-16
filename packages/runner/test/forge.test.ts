/**
 * Unit: the GitHub forge client (roadmap §9.6) — fetch is injected, so these
 * assert request shape + response parsing without touching the network.
 */
import { describe, expect, it } from 'vitest';

import { ForgeError, GitHubForge, type FetchImpl } from '../src/index.js';

interface Call {
  url: string;
  method: string;
  body: unknown;
  auth: string | undefined;
}

/** A fake fetch that records calls and returns queued responses by URL predicate. */
function fakeFetch(
  handler: (call: Call) => { status?: number; body: unknown },
): { fetchImpl: FetchImpl; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl: FetchImpl = (input, init) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: Call = {
      url: input,
      method: init?.method ?? 'GET',
      body: init?.body !== undefined ? JSON.parse(String(init.body)) : undefined,
      auth: headers['authorization'],
    };
    calls.push(call);
    const { status = 200, body } = handler(call);
    return Promise.resolve(
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
    );
  };
  return { fetchImpl, calls };
}

const base = 'https://api.github.test';

describe('GitHubForge (§9.6)', () => {
  it('openPr POSTs to /repos/{owner}/{repo}/pulls with head/base/title + bearer auth', async () => {
    const { fetchImpl, calls } = fakeFetch(() => ({
      body: { number: 42, html_url: 'https://gh/pr/42', base: { ref: 'main' } },
    }));
    const forge = new GitHubForge({ owner: 'acme', repo: 'widgets', token: 'ght_xxx', baseUrl: base, fetchImpl });
    const pr = await forge.openPr({ head: 'claim/c1', base: 'main', title: 's-1: Login' });

    expect(pr).toEqual({ number: 42, url: 'https://gh/pr/42', merged: false, mergedSha: null, base: 'main' });
    expect(calls[0]!.url).toBe(`${base}/repos/acme/widgets/pulls`);
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.body).toEqual({ title: 's-1: Login', head: 'claim/c1', base: 'main' });
    expect(calls[0]!.auth).toBe('Bearer ght_xxx');
  });

  it('findPrByHead GETs the owner-qualified head and returns the first open PR (or null)', async () => {
    const withPr = fakeFetch(() => ({ body: [{ number: 7, html_url: 'https://gh/pr/7', base: { ref: 'main' } }] }));
    const forgeA = new GitHubForge({ owner: 'acme', repo: 'widgets', token: 't', baseUrl: base, fetchImpl: withPr.fetchImpl });
    const found = await forgeA.findPrByHead({ head: 'claim/c1' });
    expect(found?.number).toBe(7);
    expect(withPr.calls[0]!.url).toContain('/repos/acme/widgets/pulls?');
    expect(withPr.calls[0]!.url).toContain('head=acme%3Aclaim%2Fc1'); // owner:branch, url-encoded
    expect(withPr.calls[0]!.url).toContain('state=open');

    const empty = fakeFetch(() => ({ body: [] }));
    const forgeB = new GitHubForge({ owner: 'acme', repo: 'widgets', token: 't', baseUrl: base, fetchImpl: empty.fetchImpl });
    expect(await forgeB.findPrByHead({ head: 'claim/c1' })).toBeNull();
  });

  it('getPrMergeState reports merged + mergedSha + base', async () => {
    const { fetchImpl } = fakeFetch(() => ({
      body: { number: 7, html_url: 'https://gh/pr/7', merged: true, merge_commit_sha: 'abc123', base: { ref: 'main' } },
    }));
    const forge = new GitHubForge({ owner: 'acme', repo: 'widgets', token: 't', baseUrl: base, fetchImpl });
    const pr = await forge.getPrMergeState({ number: 7 });
    expect(pr).toEqual({ number: 7, url: 'https://gh/pr/7', merged: true, mergedSha: 'abc123', base: 'main' });
  });

  it('a non-2xx response becomes a ForgeError carrying status + body head', async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 422, body: { message: 'Validation Failed' } }));
    const forge = new GitHubForge({ owner: 'acme', repo: 'widgets', token: 't', baseUrl: base, fetchImpl });
    await expect(forge.openPr({ head: 'h', base: 'main', title: 't' })).rejects.toMatchObject({
      name: 'ForgeError',
      status: 422,
    });
    await expect(forge.openPr({ head: 'h', base: 'main', title: 't' })).rejects.toBeInstanceOf(ForgeError);
  });
});
