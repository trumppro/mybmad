/**
 * oahs chat UI — the first web surface (roadmap Phase 3 / §5, D3).
 *
 * Chat-first, zero framework: plain DOM over the SAME rails as every other
 * surface. Every mutation in this file is a `fetch POST /rpc/<command>` with
 * the bearer token — the UI never has a privileged path.
 *
 * Sacred boundary (§5.2) rendered honestly:
 *  - the composer's mentions are STRUCTURED actor ids (a separate input,
 *    comma-separated) — the body textarea is opaque text, never parsed;
 *  - Approve/Reject in the inbox call /rpc/approve_gate | /rpc/reject_gate
 *    DIRECTLY — a client-side affordance next to chat, not a chat command;
 *  - system narration (message.kind === 'system') renders visibly different:
 *    rails speaking INTO chat, the only cross-direction that exists.
 *
 * Live updates ride the read-only SSE relay (/events/stream). EventSource
 * cannot send an Authorization header, so we read the stream with fetch and
 * parse the frames ourselves, resuming from the last seen globalSeq.
 */

// Type-only imports: erased by esbuild, so no server code lands in the bundle.
import type {
  AgentJob,
  Message,
  Notification,
  SpineEvent,
  Thread,
  WorkItem,
} from '@oahs/core';
import type { Envelope } from '@oahs/contracts';

interface InboxResult {
  awaitingSpec: WorkItem[];
  awaitingReview: WorkItem[];
}

interface WhoAmI {
  actorId: string;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface AppState {
  url: string;
  token: string;
  actorId: string;
  connected: boolean;
  lastSeq: number;
  threads: Thread[];
  currentThreadId: string | null;
  messages: Message[];
  inbox: InboxResult;
  notifications: Notification[];
  jobs: AgentJob[];
  abort: AbortController | null;
}

const state: AppState = {
  url: '',
  token: '',
  actorId: '',
  connected: false,
  lastSeq: 0,
  threads: [],
  currentThreadId: null,
  messages: [],
  inbox: { awaitingSpec: [], awaitingReview: [] },
  notifications: [],
  jobs: [],
  abort: null,
};

const LS_URL = 'oahs.ui.url';
const LS_TOKEN = 'oahs.ui.token';

// ---------------------------------------------------------------------------
// RPC — the only write path (same command bus as CLI/MCP)
// ---------------------------------------------------------------------------

async function rpc<T>(command: string, input: unknown = {}): Promise<T> {
  const response = await fetch(`${state.url}/rpc/${command}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${state.token}`,
    },
    body: JSON.stringify(input),
  });
  const envelope = (await response.json()) as Envelope<T>;
  if (envelope.ok) return envelope.result;
  throw new Error(`${envelope.error.name}: ${envelope.error.message}`);
}

// ---------------------------------------------------------------------------
// DOM helpers (no innerHTML for user content — everything via textContent)
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined && className !== '') node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (node === null) throw new Error(`missing element #${id}`);
  return node as T;
}

let statusTimer: number | undefined;
function setStatus(text: string): void {
  const node = document.getElementById('status');
  if (node === null) return;
  node.textContent = text;
  if (statusTimer !== undefined) window.clearTimeout(statusTimer);
  if (text !== '') {
    statusTimer = window.setTimeout(() => {
      node.textContent = '';
    }, 6000);
  }
}

function run(action: () => Promise<void>): void {
  action().catch((error: unknown) => {
    setStatus(error instanceof Error ? error.message : String(error));
  });
}

// ---------------------------------------------------------------------------
// Loaders (read-only queries over the rails)
// ---------------------------------------------------------------------------

async function loadThreads(): Promise<void> {
  state.threads = await rpc<Thread[]>('list_threads');
  renderThreads();
}

async function loadMessages(): Promise<void> {
  if (state.currentThreadId === null) return;
  state.messages = await rpc<Message[]>('list_messages', { threadId: state.currentThreadId });
  renderMessages();
}

async function loadInbox(): Promise<void> {
  state.inbox = await rpc<InboxResult>('inbox');
  renderInbox();
}

async function loadNotifications(): Promise<void> {
  state.notifications = await rpc<Notification[]>('list_notifications');
  renderNotifications();
}

async function loadJobs(): Promise<void> {
  state.jobs = await rpc<AgentJob[]>('list_agent_jobs');
  renderJobs();
}

async function refreshAll(): Promise<void> {
  await Promise.all([loadThreads(), loadMessages(), loadInbox(), loadNotifications(), loadJobs()]);
}

// ---------------------------------------------------------------------------
// SSE relay client — fetch-based reader (bearer header + since cursor)
// ---------------------------------------------------------------------------

function handleEvents(events: SpineEvent[]): void {
  let refetchMessages = false;
  let refetchThreads = false;
  let refetchJobs = false;
  let refetchNotifications = false;
  let refetchInbox = false;

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
    }
  }

  if (refetchThreads) run(loadThreads);
  if (refetchMessages) run(loadMessages);
  if (refetchJobs) run(loadJobs);
  if (refetchNotifications) run(loadNotifications);
  if (refetchInbox) run(loadInbox);
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

async function streamEvents(): Promise<void> {
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

// ---------------------------------------------------------------------------
// Renderers
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
  const thread = state.threads.find((t) => t.id === state.currentThreadId);
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

function gateCard(
  item: WorkItem,
  gate: 'spec_approval' | 'review_approval',
  parent: HTMLElement,
): void {
  const card = el('div', 'card');
  card.appendChild(el('div', 'c-title', `${item.externalKey} — ${item.title}`));
  card.appendChild(el('div', 'c-sub', `${item.state} · awaiting ${gate}`));
  const actions = el('div', 'c-actions');
  const approve = el('button', 'approve', 'Approve');
  approve.addEventListener('click', () => {
    run(async () => {
      await rpc('approve_gate', { workItemId: item.id, gate });
      await Promise.all([loadInbox(), loadMessages()]);
    });
  });
  const reject = el('button', 'reject', 'Reject');
  reject.addEventListener('click', () => {
    run(async () => {
      await rpc('reject_gate', { workItemId: item.id, gate });
      await Promise.all([loadInbox(), loadMessages()]);
    });
  });
  actions.appendChild(approve);
  actions.appendChild(reject);
  card.appendChild(actions);
  parent.appendChild(card);
}

function renderInbox(): void {
  const container = byId<HTMLDivElement>('inbox-list');
  clear(container);
  const { awaitingSpec, awaitingReview } = state.inbox;
  if (awaitingSpec.length === 0 && awaitingReview.length === 0) {
    container.appendChild(el('div', 'empty', 'No gates awaiting you.'));
    return;
  }
  for (const item of awaitingSpec) gateCard(item, 'spec_approval', container);
  for (const item of awaitingReview) gateCard(item, 'review_approval', container);
}

function renderNotifications(): void {
  const container = byId<HTMLDivElement>('notification-list');
  clear(container);
  if (state.notifications.length === 0) {
    container.appendChild(el('div', 'empty', 'No notifications.'));
    return;
  }
  for (const notification of state.notifications) {
    const card = el('div', notification.read ? 'card' : 'card unread');
    card.appendChild(
      el(
        'div',
        'c-title',
        notification.source === 'mention' ? 'You were mentioned' : 'Agent job completed',
      ),
    );
    card.appendChild(el('div', 'c-sub', `ref ${notification.refId}`));
    if (!notification.read) {
      const actions = el('div', 'c-actions');
      const mark = el('button', undefined, 'Mark read');
      mark.addEventListener('click', () => {
        run(async () => {
          await rpc('mark_notification_read', { notificationId: notification.id });
          await loadNotifications();
        });
      });
      actions.appendChild(mark);
      card.appendChild(actions);
    }
    container.appendChild(card);
  }
}

function renderJobs(): void {
  const container = byId<HTMLDivElement>('job-list');
  clear(container);
  if (state.jobs.length === 0) {
    container.appendChild(el('div', 'empty', 'No agent jobs.'));
    return;
  }
  for (const job of state.jobs) {
    const card = el('div', 'card');
    const title = el('div', 'c-title', `agent ${job.agentActorId}`);
    const badge = el('span', `badge ${job.status}`, job.status);
    title.appendChild(document.createTextNode(' '));
    title.appendChild(badge);
    card.appendChild(title);
    card.appendChild(
      el('div', 'c-sub', `job ${job.id}${job.workItemId !== null ? ` · task ${job.workItemId}` : ''}`),
    );
    if (job.note !== null) card.appendChild(el('div', 'c-sub', `note: ${job.note}`));
    container.appendChild(card);
  }
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function renderLogin(root: HTMLElement): void {
  clear(root);
  const box = el('div');
  box.id = 'login';
  box.appendChild(el('h1', undefined, 'oahs'));
  box.appendChild(
    el('p', undefined, 'Collaborative chat over the rails. Paste the server URL and your API token.'),
  );

  const urlInput = el('input');
  urlInput.placeholder = 'Server URL';
  urlInput.value = localStorage.getItem(LS_URL) ?? window.location.origin;
  const tokenInput = el('input');
  tokenInput.placeholder = 'API token';
  tokenInput.type = 'password';
  tokenInput.value = localStorage.getItem(LS_TOKEN) ?? '';

  const connect = el('button', 'primary', 'Connect');
  connect.addEventListener('click', () => {
    run(async () => {
      state.url = urlInput.value.trim().replace(/\/+$/, '');
      state.token = tokenInput.value.trim();
      if (state.url === '' || state.token === '') throw new Error('URL and token are required');
      const who = await rpc<WhoAmI>('whoami');
      state.actorId = who.actorId;
      localStorage.setItem(LS_URL, state.url);
      localStorage.setItem(LS_TOKEN, state.token);
      startApp(root);
    });
  });

  const error = el('div', 'hint');
  error.id = 'status';

  box.appendChild(urlInput);
  box.appendChild(tokenInput);
  box.appendChild(connect);
  box.appendChild(error);
  root.appendChild(box);
}

function buildShell(root: HTMLElement): void {
  clear(root);
  const shell = el('div');
  shell.id = 'shell';

  // -- top bar
  const topbar = el('div');
  topbar.id = 'topbar';
  topbar.appendChild(el('span', 'brand', 'oahs'));
  topbar.appendChild(el('span', 'who', `actor ${state.actorId}`));
  const spacer = el('span', 'spacer');
  topbar.appendChild(spacer);
  const status = el('span');
  status.id = 'status';
  topbar.appendChild(status);
  const logout = el('button', undefined, 'Log out');
  logout.addEventListener('click', () => {
    state.connected = false;
    state.abort?.abort();
    localStorage.removeItem(LS_TOKEN);
    renderLogin(byId<HTMLDivElement>('app'));
  });
  topbar.appendChild(logout);
  shell.appendChild(topbar);

  // -- left: threads
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
  shell.appendChild(threads);

  // -- middle: chat
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
  const mentionsInput = el('input');
  mentionsInput.placeholder = 'mention actor ids, comma-separated (structured — not parsed from text)';
  const send = el('button', 'primary', 'Send');
  send.addEventListener('click', () => {
    run(async () => {
      if (state.currentThreadId === null) throw new Error('select a thread first');
      const text = body.value.trim();
      if (text === '') throw new Error('message body is empty');
      const mentions = mentionsInput.value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '');
      const input: Record<string, unknown> = { threadId: state.currentThreadId, body: text };
      if (mentions.length > 0) input.mentions = mentions;
      await rpc('post_message', input);
      body.value = '';
      mentionsInput.value = '';
      await loadMessages();
    });
  });
  row.appendChild(mentionsInput);
  row.appendChild(send);
  composer.appendChild(body);
  composer.appendChild(row);
  composer.appendChild(
    el('div', 'hint', 'Mentions are structured actor ids — chat text never drives the rails.'),
  );
  chat.appendChild(composer);
  shell.appendChild(chat);

  // -- right: rails (inbox / notifications / agent jobs)
  const rails = el('div', 'col');
  rails.id = 'col-rails';
  rails.appendChild(
    el('div', 'rails-note', 'Gates pass through rails, not chat — Approve/Reject below call /rpc/approve_gate and /rpc/reject_gate directly.'),
  );

  const inboxSection = el('section');
  inboxSection.appendChild(el('h2', undefined, 'Gate inbox'));
  const inboxList = el('div');
  inboxList.id = 'inbox-list';
  inboxSection.appendChild(inboxList);
  rails.appendChild(inboxSection);

  const notificationSection = el('section');
  notificationSection.appendChild(el('h2', undefined, 'Notifications'));
  const notificationList = el('div');
  notificationList.id = 'notification-list';
  notificationSection.appendChild(notificationList);
  rails.appendChild(notificationSection);

  const jobSection = el('section');
  jobSection.appendChild(el('h2', undefined, 'Agent jobs'));
  const jobList = el('div');
  jobList.id = 'job-list';
  jobSection.appendChild(jobList);
  rails.appendChild(jobSection);

  shell.appendChild(rails);
  root.appendChild(shell);
}

function startApp(root: HTMLElement): void {
  buildShell(root);
  renderChatHead();
  state.connected = true;
  run(refreshAll);
  void streamEvents();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function boot(): void {
  const root = byId<HTMLDivElement>('app');
  const savedUrl = localStorage.getItem(LS_URL);
  const savedToken = localStorage.getItem(LS_TOKEN);
  if (savedUrl !== null && savedToken !== null && savedToken !== '') {
    state.url = savedUrl;
    state.token = savedToken;
    rpc<WhoAmI>('whoami')
      .then((who) => {
        state.actorId = who.actorId;
        startApp(root);
      })
      .catch(() => {
        renderLogin(root);
      });
  } else {
    renderLogin(root);
  }
}

boot();
