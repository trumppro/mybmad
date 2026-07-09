/**
 * @oahs/gateway — token metering (Phase 6, roadmap §2.5).
 *
 * Metering is the billing seam: every completion records its token usage so a
 * per-plan quota / per-tenant invoice can be computed downstream. A Meter is a
 * sink, never a gate — a metering failure must never block a reply (the caller
 * decides how strict to be; the in-memory and jsonl meters here never throw on
 * a well-formed entry).
 *
 * NOTE on Date: workflow *scripts* forbid Date, but this is ordinary runtime
 * code (a usage ledger for billing) — Date.now() for the ledger timestamp is
 * correct and expected here.
 */
import { appendFileSync } from 'node:fs';

import type { Usage } from './provider.js';

/** One usage-ledger entry: which model/route consumed how many tokens. */
export interface MeterEntry {
  model: string;
  usage: Usage;
  /** The persona/route that resolved to this model, when routed. */
  route?: string;
}

/** Aggregate token totals across everything a meter has recorded. */
export interface MeterTotals {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** A token sink. record() is best-effort; total() aggregates. */
export interface Meter {
  record(entry: MeterEntry): void;
  total(): MeterTotals;
}

/** In-memory meter — keeps a running aggregate. Handy for tests and single runs. */
export class InMemoryMeter implements Meter {
  private calls = 0;
  private promptTokens = 0;
  private completionTokens = 0;
  private totalTokens = 0;

  record(entry: MeterEntry): void {
    this.calls += 1;
    this.promptTokens += entry.usage.promptTokens;
    this.completionTokens += entry.usage.completionTokens;
    this.totalTokens += entry.usage.totalTokens;
  }

  total(): MeterTotals {
    return {
      calls: this.calls,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
    };
  }
}

/** One line of the JSONL usage ledger. */
interface JsonlRecord {
  ts: number;
  model: string;
  route: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Append-only JSONL usage ledger. Each record() appends one line
 * {ts, model, route, promptTokens, completionTokens, totalTokens} — an
 * auditable, replayable billing trail. total() re-aggregates in memory as a
 * convenience; the file is the source of truth.
 */
export class JsonlMeter implements Meter {
  private readonly path: string;
  private readonly memory = new InMemoryMeter();

  constructor(path: string) {
    this.path = path;
  }

  record(entry: MeterEntry): void {
    this.memory.record(entry);
    const line: JsonlRecord = {
      ts: Date.now(),
      model: entry.model,
      route: entry.route ?? null,
      promptTokens: entry.usage.promptTokens,
      completionTokens: entry.usage.completionTokens,
      totalTokens: entry.usage.totalTokens,
    };
    appendFileSync(this.path, `${JSON.stringify(line)}\n`, 'utf8');
  }

  total(): MeterTotals {
    return this.memory.total();
  }
}
