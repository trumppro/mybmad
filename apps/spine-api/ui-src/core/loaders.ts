/**
 * Read-only loaders over the rails. Each fetches through `rpc`, writes `state`,
 * then `notify(channel)` — decoupled from rendering so the SSE relay and the
 * mounted view never reference each other. The queries are the same read
 * commands every client uses (list_threads, inbox, …).
 */
import type { Actor, AgentJob, Message, Notification, Thread } from '@oahs/core';

import { rpc } from './rpc.js';
import { type InboxResult, notify, state } from './state.js';

export async function loadThreads(): Promise<void> {
  state.threads = await rpc<Thread[]>('list_threads');
  notify('threads');
}

export async function loadMessages(): Promise<void> {
  if (state.currentThreadId === null) return;
  state.messages = await rpc<Message[]>('list_messages', { threadId: state.currentThreadId });
  notify('messages');
}

export async function loadInbox(): Promise<void> {
  state.inbox = await rpc<InboxResult>('inbox');
  notify('inbox');
}

export async function loadNotifications(): Promise<void> {
  state.notifications = await rpc<Notification[]>('list_notifications');
  notify('notifications');
}

export async function loadJobs(): Promise<void> {
  state.jobs = await rpc<AgentJob[]>('list_agent_jobs');
  notify('jobs');
}

/** Everyone on the rails (Phase 4 list_actors) — feeds the mention picker. */
export async function loadActors(): Promise<void> {
  state.actors = await rpc<Actor[]>('list_actors');
  notify('actors');
}

export async function refreshAll(): Promise<void> {
  await Promise.all([
    loadThreads(),
    loadMessages(),
    loadInbox(),
    loadNotifications(),
    loadJobs(),
    loadActors(),
  ]);
}
