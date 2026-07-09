/**
 * SSE relay client — a fetch-based reader of /events/stream. EventSource
 * cannot send an Authorization header, so we read the stream with fetch and
 * parse the frames ourselves, resuming from the last seen globalSeq. Runs once
 * globally after login; on each frame it fires the affected loaders, which
 * notify their channels so whichever view is mounted re-renders itself.
 */
import type { SpineEvent } from '@oahs/core';

import { run } from './dom.js';
import {
  loadActors,
  loadInbox,
  loadJobs,
  loadMessages,
  loadNotifications,
  loadThreads,
} from './loaders.js';
import { state } from './state.js';

function handleEvents(events: SpineEvent[]): void {
  let refetchMessages = false;
  let refetchThreads = false;
  let refetchJobs = false;
  let refetchNotifications = false;
  let refetchInbox = false;
  let refetchActors = false;

  for (const event of events) {
    if (event.globalSeq > state.lastSeq) state.lastSeq = event.globalSeq;
    if (event.streamType === 'thread') {
      refetchNotifications = true; // mentions materialize notifications
      if (event.type === 'thread.created' || event.type === 'thread.participant_added') {
        refetchThreads = true;
      }
      if (event.type === 'message.posted' && event.streamId === state.currentThreadId) {
        refetchMessages = true;
      }
    } else if (event.streamType === 'agent_job') {
      refetchJobs = true;
      refetchNotifications = true;
    } else if (event.streamType === 'work_item') {
      refetchInbox = true; // gate/lifecycle movement changes the gate-holder inbox
    } else if (event.streamType === 'actor') {
      refetchActors = true; // new actors/personas appear in the mention picker
    }
  }

  if (refetchThreads) run(loadThreads);
  if (refetchMessages) run(loadMessages);
  if (refetchJobs) run(loadJobs);
  if (refetchNotifications) run(loadNotifications);
  if (refetchInbox) run(loadInbox);
  if (refetchActors) run(loadActors);
}

function parseSseFrames(buffer: string): { events: SpineEvent[]; rest: string } {
  const frames = buffer.split('\n\n');
  const rest = frames.pop() ?? '';
  const events: SpineEvent[] = [];
  for (const frame of frames) {
    for (const line of frame.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          events.push(JSON.parse(line.slice('data: '.length)) as SpineEvent);
        } catch {
          // partial/foreign frame — the cursor resume covers us on reconnect
        }
      }
    }
  }
  return { events, rest };
}

export async function streamEvents(): Promise<void> {
  while (state.connected) {
    const abort = new AbortController();
    state.abort = abort;
    try {
      const response = await fetch(`${state.url}/events/stream?since=${state.lastSeq}`, {
        headers: { authorization: `Bearer ${state.token}` },
        signal: abort.signal,
      });
      if (!response.ok || response.body === null) {
        throw new Error(`event stream: HTTP ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseFrames(buffer);
        buffer = rest;
        if (events.length > 0) handleEvents(events);
      }
    } catch {
      // network hiccup or logout abort — the while-guard decides
    }
    if (state.connected) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
