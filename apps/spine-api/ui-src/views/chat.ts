/**
 * Chat view — the collaborative-chat home (roadmap Phase 3 / §5, D3). Three
 * columns: threads · chat · rails (gate inbox, notifications, agent jobs). It
 * builds its DOM, renders from `state`, subscribes the data channels to its
 * renderers, and kicks off the loaders; the returned cleanup unsubscribes when
 * the router navigates away. The sacred boundary (§5.2) is rendered honestly:
 * the composer's mentions are STRUCTURED actor ids (a separate multi-select),
 * the body textarea is opaque text the server never parses.
 */
import type { Message, Thread } from '@oahs/core';

import { byId, clear, el, run } from '../core/dom.js';
import { loadMessages, loadThreads, refreshAll } from '../core/loaders.js';
import { rpc } from '../core/rpc.js';
import { state, subscribeAll } from '../core/state.js';
import type { View } from '../core/router.js';
import { buildInboxSection, renderInbox } from './inbox.js';
import { buildNotificationSection, renderNotifications } from './notifications.js';
import { buildJobSection, renderJobs } from './jobs.js';

// ---------------------------------------------------------------------------
// Renderers (operate on DOM by id, driven by `state`)
// ---------------------------------------------------------------------------

function renderThreads(): void {
  const list = byId<HTMLDivElement>('thread-list');
  clear(list);
  if (state.threads.length === 0) {
    list.appendChild(el('div', 'empty', 'No threads yet.'));
    return;
  }
  for (const thread of state.threads) {
    const button = el('button', 'thread-item');
    if (thread.id === state.currentThreadId) button.classList.add('active');
    const kind = el('div', 't-kind', thread.kind);
    if (thread.visibility === 'private') {
      kind.classList.add('private');
      kind.textContent = `${thread.kind} · private`;
    }
    button.appendChild(kind);
    button.appendChild(el('div', 't-id', thread.id));
    if (thread.workItemId !== null) {
      button.appendChild(el('div', 't-ref', `task ${thread.workItemId}`));
    } else if (thread.featureId !== null) {
      button.appendChild(el('div', 't-ref', `feature ${thread.featureId}`));
    }
    button.addEventListener('click', () => {
      state.currentThreadId = thread.id;
      state.messages = [];
      renderThreads();
      renderChatHead();
      run(loadMessages);
    });
    list.appendChild(button);
  }
}

function renderChatHead(): void {
  const head = byId<HTMLDivElement>('chat-head');
  const thread = state.threads.find((candidate) => candidate.id === state.currentThreadId);
  head.textContent =
    thread === undefined
      ? 'Select a thread — or create one on the left.'
      : `${thread.kind} thread ${thread.id}` +
        (thread.workItemId !== null ? ` · task ${thread.workItemId}` : '') +
        (thread.visibility === 'private' ? ' · private' : '');
}

function renderMessages(): void {
  const container = byId<HTMLDivElement>('messages');
  const stick =
    container.scrollHeight - container.scrollTop - container.clientHeight < 40 ||
    container.childElementCount === 0;
  clear(container);
  for (const message of state.messages) {
    const wrap = el('div', message.kind === 'system' ? 'msg system' : 'msg');
    const author = message.kind === 'system' ? 'system' : message.authorId;
    const self = message.authorId === state.actorId ? ' (you)' : '';
    wrap.appendChild(el('div', 'm-meta', `#${message.seq} · ${author}${self}`));
    wrap.appendChild(el('div', 'm-body', message.body));
    container.appendChild(wrap);
  }
  if (stick) container.scrollTop = container.scrollHeight;
}

/**
 * Mention picker (Phase 4): a multi-select fed by list_actors, showing
 * `displayName (id)` per option but submitting STRUCTURED actor ids — the
 * §5.2 boundary stays intact: message text is never parsed, and mentions
 * remain data the user explicitly picked.
 */
function renderMentionPicker(): void {
  const picker = document.getElementById('mention-picker') as HTMLSelectElement | null;
  if (picker === null) return;
  const selected = new Set(Array.from(picker.selectedOptions).map((option) => option.value));
  clear(picker);
  for (const actor of state.actors) {
    if (actor.type === 'system') continue; // narration target, not a teammate
    const option = el('option', undefined, `${actor.displayName} (${actor.id})`);
    option.value = actor.id;
    if (selected.has(actor.id)) option.selected = true;
    picker.appendChild(option);
  }
}

// ---------------------------------------------------------------------------
// DOM construction (the three columns)
// ---------------------------------------------------------------------------

function buildThreadsColumn(): HTMLElement {
  const threads = el('div', 'col');
  threads.id = 'col-threads';
  threads.appendChild(el('h2', undefined, 'Threads'));
  const threadList = el('div');
  threadList.id = 'thread-list';
  threads.appendChild(threadList);

  const newThread = el('div', 'new-thread');
  newThread.appendChild(el('h2', undefined, 'New thread'));
  const kindSelect = el('select');
  for (const kind of ['general', 'spec', 'design', 'task', 'private']) {
    const option = el('option', undefined, kind);
    option.value = kind;
    kindSelect.appendChild(option);
  }
  const workItemInput = el('input');
  workItemInput.placeholder = 'work item id (optional)';
  const createButton = el('button', 'primary', 'Create thread');
  createButton.addEventListener('click', () => {
    run(async () => {
      const input: Record<string, unknown> = { kind: kindSelect.value };
      const workItemId = workItemInput.value.trim();
      if (workItemId !== '') input.workItemId = workItemId;
      const thread = await rpc<Thread>('create_thread', input);
      workItemInput.value = '';
      state.currentThreadId = thread.id;
      await loadThreads();
      renderChatHead();
      await loadMessages();
    });
  });
  newThread.appendChild(kindSelect);
  newThread.appendChild(workItemInput);
  newThread.appendChild(createButton);
  threads.appendChild(newThread);
  return threads;
}

function buildChatColumn(): HTMLElement {
  const chat = el('div', 'col');
  chat.id = 'col-chat';
  const chatHead = el('div');
  chatHead.id = 'chat-head';
  chat.appendChild(chatHead);
  const messages = el('div');
  messages.id = 'messages';
  chat.appendChild(messages);

  const composer = el('div');
  composer.id = 'composer';
  const body = el('textarea');
  body.placeholder = 'Message — plain text, never parsed by the server';
  const row = el('div', 'row');
  const mentionPicker = el('select');
  mentionPicker.id = 'mention-picker';
  mentionPicker.multiple = true;
  mentionPicker.size = 3;
  mentionPicker.title = 'mention actors (structured ids — not parsed from text)';
  const send = el('button', 'primary', 'Send');
  send.addEventListener('click', () => {
    run(async () => {
      if (state.currentThreadId === null) throw new Error('select a thread first');
      const text = body.value.trim();
      if (text === '') throw new Error('message body is empty');
      const mentions = Array.from(mentionPicker.selectedOptions).map((option) => option.value);
      const input: Record<string, unknown> = { threadId: state.currentThreadId, body: text };
      if (mentions.length > 0) input.mentions = mentions;
      await rpc('post_message', input);
      body.value = '';
      for (const option of Array.from(mentionPicker.options)) option.selected = false;
      await loadMessages();
    });
  });
  row.appendChild(mentionPicker);
  row.appendChild(send);
  composer.appendChild(body);
  composer.appendChild(row);
  composer.appendChild(
    el('div', 'hint', 'Mentions are structured actor ids — chat text never drives the rails.'),
  );
  chat.appendChild(composer);
  return chat;
}

function buildRailsColumn(): HTMLElement {
  const rails = el('div', 'col');
  rails.id = 'col-rails';
  rails.appendChild(
    el(
      'div',
      'rails-note',
      'Gates pass through rails, not chat — Approve/Reject below call /rpc/approve_gate and /rpc/reject_gate directly.',
    ),
  );
  rails.appendChild(buildInboxSection());
  rails.appendChild(buildNotificationSection());
  rails.appendChild(buildJobSection());
  return rails;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export const chatView: View = {
  mount(container: HTMLElement): () => void {
    const shell = el('div', 'chat-shell');
    shell.appendChild(buildThreadsColumn());
    shell.appendChild(buildChatColumn());
    shell.appendChild(buildRailsColumn());
    container.appendChild(shell);

    // First paint from whatever state is already loaded, then refresh.
    renderThreads();
    renderChatHead();
    renderMessages();
    renderInbox();
    renderNotifications();
    renderJobs();
    renderMentionPicker();

    const unsubscribe = subscribeAll([
      ['threads', renderThreads],
      ['messages', renderMessages],
      ['inbox', renderInbox],
      ['notifications', renderNotifications],
      ['jobs', renderJobs],
      ['actors', renderMentionPicker],
    ]);

    run(refreshAll); // includes loadActors → feeds the mention picker

    return unsubscribe;
  },
};
