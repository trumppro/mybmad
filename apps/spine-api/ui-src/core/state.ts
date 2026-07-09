/**
 * App state + a tiny pub/sub store — the modular successor to the single-file
 * `state` object (roadmap Phase 3, D3). Zero framework: loaders mutate `state`
 * and `notify(channel)`; the mounted view re-renders whatever it subscribed to.
 * No reactive library, no dependency — just a Map of channel → callbacks.
 */
import type {
  Actor,
  AgentJob,
  Message,
  Notification,
  Thread,
  WorkItem,
} from '@oahs/core';

export interface InboxResult {
  awaitingSpec: WorkItem[];
  awaitingReview: WorkItem[];
}

export interface WhoAmI {
  actorId: string;
  isAdmin: boolean;
}

export interface AppState {
  url: string;
  token: string;
  actorId: string;
  isAdmin: boolean;
  connected: boolean;
  lastSeq: number;
  threads: Thread[];
  currentThreadId: string | null;
  messages: Message[];
  inbox: InboxResult;
  notifications: Notification[];
  jobs: AgentJob[];
  actors: Actor[];
  abort: AbortController | null;
}

export const state: AppState = {
  url: '',
  token: '',
  actorId: '',
  isAdmin: false,
  connected: false,
  lastSeq: 0,
  threads: [],
  currentThreadId: null,
  messages: [],
  inbox: { awaitingSpec: [], awaitingReview: [] },
  notifications: [],
  jobs: [],
  actors: [],
  abort: null,
};

export const LS_URL = 'oahs.ui.url';
export const LS_TOKEN = 'oahs.ui.token';

// ---------------------------------------------------------------------------
// Store — channel-scoped subscriptions
// ---------------------------------------------------------------------------

/**
 * Data channels a view can subscribe to. A loader updates `state` then calls
 * `notify(channel)`; every callback registered for that channel runs. This is
 * how the SSE relay drives re-renders without any view holding a socket.
 */
export type Channel =
  | 'threads'
  | 'messages'
  | 'inbox'
  | 'notifications'
  | 'jobs'
  | 'actors';

const subscribers = new Map<Channel, Set<() => void>>();

export function subscribe(channel: Channel, callback: () => void): () => void {
  let set = subscribers.get(channel);
  if (set === undefined) {
    set = new Set();
    subscribers.set(channel, set);
  }
  set.add(callback);
  return () => {
    set.delete(callback);
  };
}

/** Subscribe many channels at once; returns one unsubscribe for all of them. */
export function subscribeAll(pairs: readonly [Channel, () => void][]): () => void {
  const unsubscribes = pairs.map(([channel, callback]) => subscribe(channel, callback));
  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
  };
}

export function notify(channel: Channel): void {
  const set = subscribers.get(channel);
  if (set === undefined) return;
  for (const callback of set) callback();
}
