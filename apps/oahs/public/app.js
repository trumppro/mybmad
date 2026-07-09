"use strict";
(() => {
  // ../spine-api/ui-src/app.ts
  var state = {
    url: "",
    token: "",
    actorId: "",
    connected: false,
    lastSeq: 0,
    threads: [],
    currentThreadId: null,
    messages: [],
    inbox: { awaitingSpec: [], awaitingReview: [] },
    notifications: [],
    jobs: [],
    abort: null
  };
  var LS_URL = "oahs.ui.url";
  var LS_TOKEN = "oahs.ui.token";
  async function rpc(command, input = {}) {
    const response = await fetch(`${state.url}/rpc/${command}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify(input)
    });
    const envelope = await response.json();
    if (envelope.ok) return envelope.result;
    throw new Error(`${envelope.error.name}: ${envelope.error.message}`);
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className !== void 0 && className !== "") node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function byId(id) {
    const node = document.getElementById(id);
    if (node === null) throw new Error(`missing element #${id}`);
    return node;
  }
  var statusTimer;
  function setStatus(text) {
    const node = document.getElementById("status");
    if (node === null) return;
    node.textContent = text;
    if (statusTimer !== void 0) window.clearTimeout(statusTimer);
    if (text !== "") {
      statusTimer = window.setTimeout(() => {
        node.textContent = "";
      }, 6e3);
    }
  }
  function run(action) {
    action().catch((error) => {
      setStatus(error instanceof Error ? error.message : String(error));
    });
  }
  async function loadThreads() {
    state.threads = await rpc("list_threads");
    renderThreads();
  }
  async function loadMessages() {
    if (state.currentThreadId === null) return;
    state.messages = await rpc("list_messages", { threadId: state.currentThreadId });
    renderMessages();
  }
  async function loadInbox() {
    state.inbox = await rpc("inbox");
    renderInbox();
  }
  async function loadNotifications() {
    state.notifications = await rpc("list_notifications");
    renderNotifications();
  }
  async function loadJobs() {
    state.jobs = await rpc("list_agent_jobs");
    renderJobs();
  }
  async function refreshAll() {
    await Promise.all([loadThreads(), loadMessages(), loadInbox(), loadNotifications(), loadJobs()]);
  }
  function handleEvents(events) {
    let refetchMessages = false;
    let refetchThreads = false;
    let refetchJobs = false;
    let refetchNotifications = false;
    let refetchInbox = false;
    for (const event of events) {
      if (event.globalSeq > state.lastSeq) state.lastSeq = event.globalSeq;
      if (event.streamType === "thread") {
        refetchNotifications = true;
        if (event.type === "thread.created" || event.type === "thread.participant_added") {
          refetchThreads = true;
        }
        if (event.type === "message.posted" && event.streamId === state.currentThreadId) {
          refetchMessages = true;
        }
      } else if (event.streamType === "agent_job") {
        refetchJobs = true;
        refetchNotifications = true;
      } else if (event.streamType === "work_item") {
        refetchInbox = true;
      }
    }
    if (refetchThreads) run(loadThreads);
    if (refetchMessages) run(loadMessages);
    if (refetchJobs) run(loadJobs);
    if (refetchNotifications) run(loadNotifications);
    if (refetchInbox) run(loadInbox);
  }
  function parseSseFrames(buffer) {
    const frames = buffer.split("\n\n");
    const rest = frames.pop() ?? "";
    const events = [];
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            events.push(JSON.parse(line.slice("data: ".length)));
          } catch {
          }
        }
      }
    }
    return { events, rest };
  }
  async function streamEvents() {
    while (state.connected) {
      const abort = new AbortController();
      state.abort = abort;
      try {
        const response = await fetch(`${state.url}/events/stream?since=${state.lastSeq}`, {
          headers: { authorization: `Bearer ${state.token}` },
          signal: abort.signal
        });
        if (!response.ok || response.body === null) {
          throw new Error(`event stream: HTTP ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseSseFrames(buffer);
          buffer = rest;
          if (events.length > 0) handleEvents(events);
        }
      } catch {
      }
      if (state.connected) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
  }
  function renderThreads() {
    const list = byId("thread-list");
    clear(list);
    if (state.threads.length === 0) {
      list.appendChild(el("div", "empty", "No threads yet."));
      return;
    }
    for (const thread of state.threads) {
      const button = el("button", "thread-item");
      if (thread.id === state.currentThreadId) button.classList.add("active");
      const kind = el("div", "t-kind", thread.kind);
      if (thread.visibility === "private") {
        kind.classList.add("private");
        kind.textContent = `${thread.kind} \xB7 private`;
      }
      button.appendChild(kind);
      button.appendChild(el("div", "t-id", thread.id));
      if (thread.workItemId !== null) {
        button.appendChild(el("div", "t-ref", `task ${thread.workItemId}`));
      } else if (thread.featureId !== null) {
        button.appendChild(el("div", "t-ref", `feature ${thread.featureId}`));
      }
      button.addEventListener("click", () => {
        state.currentThreadId = thread.id;
        state.messages = [];
        renderThreads();
        renderChatHead();
        run(loadMessages);
      });
      list.appendChild(button);
    }
  }
  function renderChatHead() {
    const head = byId("chat-head");
    const thread = state.threads.find((t) => t.id === state.currentThreadId);
    head.textContent = thread === void 0 ? "Select a thread \u2014 or create one on the left." : `${thread.kind} thread ${thread.id}` + (thread.workItemId !== null ? ` \xB7 task ${thread.workItemId}` : "") + (thread.visibility === "private" ? " \xB7 private" : "");
  }
  function renderMessages() {
    const container = byId("messages");
    const stick = container.scrollHeight - container.scrollTop - container.clientHeight < 40 || container.childElementCount === 0;
    clear(container);
    for (const message of state.messages) {
      const wrap = el("div", message.kind === "system" ? "msg system" : "msg");
      const author = message.kind === "system" ? "system" : message.authorId;
      const self = message.authorId === state.actorId ? " (you)" : "";
      wrap.appendChild(el("div", "m-meta", `#${message.seq} \xB7 ${author}${self}`));
      wrap.appendChild(el("div", "m-body", message.body));
      container.appendChild(wrap);
    }
    if (stick) container.scrollTop = container.scrollHeight;
  }
  function gateCard(item, gate, parent) {
    const card = el("div", "card");
    card.appendChild(el("div", "c-title", `${item.externalKey} \u2014 ${item.title}`));
    card.appendChild(el("div", "c-sub", `${item.state} \xB7 awaiting ${gate}`));
    const actions = el("div", "c-actions");
    const approve = el("button", "approve", "Approve");
    approve.addEventListener("click", () => {
      run(async () => {
        await rpc("approve_gate", { workItemId: item.id, gate });
        await Promise.all([loadInbox(), loadMessages()]);
      });
    });
    const reject = el("button", "reject", "Reject");
    reject.addEventListener("click", () => {
      run(async () => {
        await rpc("reject_gate", { workItemId: item.id, gate });
        await Promise.all([loadInbox(), loadMessages()]);
      });
    });
    actions.appendChild(approve);
    actions.appendChild(reject);
    card.appendChild(actions);
    parent.appendChild(card);
  }
  function renderInbox() {
    const container = byId("inbox-list");
    clear(container);
    const { awaitingSpec, awaitingReview } = state.inbox;
    if (awaitingSpec.length === 0 && awaitingReview.length === 0) {
      container.appendChild(el("div", "empty", "No gates awaiting you."));
      return;
    }
    for (const item of awaitingSpec) gateCard(item, "spec_approval", container);
    for (const item of awaitingReview) gateCard(item, "review_approval", container);
  }
  function renderNotifications() {
    const container = byId("notification-list");
    clear(container);
    if (state.notifications.length === 0) {
      container.appendChild(el("div", "empty", "No notifications."));
      return;
    }
    for (const notification of state.notifications) {
      const card = el("div", notification.read ? "card" : "card unread");
      card.appendChild(
        el(
          "div",
          "c-title",
          notification.source === "mention" ? "You were mentioned" : "Agent job completed"
        )
      );
      card.appendChild(el("div", "c-sub", `ref ${notification.refId}`));
      if (!notification.read) {
        const actions = el("div", "c-actions");
        const mark = el("button", void 0, "Mark read");
        mark.addEventListener("click", () => {
          run(async () => {
            await rpc("mark_notification_read", { notificationId: notification.id });
            await loadNotifications();
          });
        });
        actions.appendChild(mark);
        card.appendChild(actions);
      }
      container.appendChild(card);
    }
  }
  function renderJobs() {
    const container = byId("job-list");
    clear(container);
    if (state.jobs.length === 0) {
      container.appendChild(el("div", "empty", "No agent jobs."));
      return;
    }
    for (const job of state.jobs) {
      const card = el("div", "card");
      const title = el("div", "c-title", `agent ${job.agentActorId}`);
      const badge = el("span", `badge ${job.status}`, job.status);
      title.appendChild(document.createTextNode(" "));
      title.appendChild(badge);
      card.appendChild(title);
      card.appendChild(
        el("div", "c-sub", `job ${job.id}${job.workItemId !== null ? ` \xB7 task ${job.workItemId}` : ""}`)
      );
      if (job.note !== null) card.appendChild(el("div", "c-sub", `note: ${job.note}`));
      container.appendChild(card);
    }
  }
  function renderLogin(root) {
    clear(root);
    const box = el("div");
    box.id = "login";
    box.appendChild(el("h1", void 0, "oahs"));
    box.appendChild(
      el("p", void 0, "Collaborative chat over the rails. Paste the server URL and your API token.")
    );
    const urlInput = el("input");
    urlInput.placeholder = "Server URL";
    urlInput.value = localStorage.getItem(LS_URL) ?? window.location.origin;
    const tokenInput = el("input");
    tokenInput.placeholder = "API token";
    tokenInput.type = "password";
    tokenInput.value = localStorage.getItem(LS_TOKEN) ?? "";
    const connect = el("button", "primary", "Connect");
    connect.addEventListener("click", () => {
      run(async () => {
        state.url = urlInput.value.trim().replace(/\/+$/, "");
        state.token = tokenInput.value.trim();
        if (state.url === "" || state.token === "") throw new Error("URL and token are required");
        const who = await rpc("whoami");
        state.actorId = who.actorId;
        localStorage.setItem(LS_URL, state.url);
        localStorage.setItem(LS_TOKEN, state.token);
        startApp(root);
      });
    });
    const error = el("div", "hint");
    error.id = "status";
    box.appendChild(urlInput);
    box.appendChild(tokenInput);
    box.appendChild(connect);
    box.appendChild(error);
    root.appendChild(box);
  }
  function buildShell(root) {
    clear(root);
    const shell = el("div");
    shell.id = "shell";
    const topbar = el("div");
    topbar.id = "topbar";
    topbar.appendChild(el("span", "brand", "oahs"));
    topbar.appendChild(el("span", "who", `actor ${state.actorId}`));
    const spacer = el("span", "spacer");
    topbar.appendChild(spacer);
    const status = el("span");
    status.id = "status";
    topbar.appendChild(status);
    const logout = el("button", void 0, "Log out");
    logout.addEventListener("click", () => {
      state.connected = false;
      state.abort?.abort();
      localStorage.removeItem(LS_TOKEN);
      renderLogin(byId("app"));
    });
    topbar.appendChild(logout);
    shell.appendChild(topbar);
    const threads = el("div", "col");
    threads.id = "col-threads";
    threads.appendChild(el("h2", void 0, "Threads"));
    const threadList = el("div");
    threadList.id = "thread-list";
    threads.appendChild(threadList);
    const newThread = el("div", "new-thread");
    newThread.appendChild(el("h2", void 0, "New thread"));
    const kindSelect = el("select");
    for (const kind of ["general", "spec", "design", "task", "private"]) {
      const option = el("option", void 0, kind);
      option.value = kind;
      kindSelect.appendChild(option);
    }
    const workItemInput = el("input");
    workItemInput.placeholder = "work item id (optional)";
    const createButton = el("button", "primary", "Create thread");
    createButton.addEventListener("click", () => {
      run(async () => {
        const input = { kind: kindSelect.value };
        const workItemId = workItemInput.value.trim();
        if (workItemId !== "") input.workItemId = workItemId;
        const thread = await rpc("create_thread", input);
        workItemInput.value = "";
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
    const chat = el("div", "col");
    chat.id = "col-chat";
    const chatHead = el("div");
    chatHead.id = "chat-head";
    chat.appendChild(chatHead);
    const messages = el("div");
    messages.id = "messages";
    chat.appendChild(messages);
    const composer = el("div");
    composer.id = "composer";
    const body = el("textarea");
    body.placeholder = "Message \u2014 plain text, never parsed by the server";
    const row = el("div", "row");
    const mentionsInput = el("input");
    mentionsInput.placeholder = "mention actor ids, comma-separated (structured \u2014 not parsed from text)";
    const send = el("button", "primary", "Send");
    send.addEventListener("click", () => {
      run(async () => {
        if (state.currentThreadId === null) throw new Error("select a thread first");
        const text = body.value.trim();
        if (text === "") throw new Error("message body is empty");
        const mentions = mentionsInput.value.split(",").map((id) => id.trim()).filter((id) => id !== "");
        const input = { threadId: state.currentThreadId, body: text };
        if (mentions.length > 0) input.mentions = mentions;
        await rpc("post_message", input);
        body.value = "";
        mentionsInput.value = "";
        await loadMessages();
      });
    });
    row.appendChild(mentionsInput);
    row.appendChild(send);
    composer.appendChild(body);
    composer.appendChild(row);
    composer.appendChild(
      el("div", "hint", "Mentions are structured actor ids \u2014 chat text never drives the rails.")
    );
    chat.appendChild(composer);
    shell.appendChild(chat);
    const rails = el("div", "col");
    rails.id = "col-rails";
    rails.appendChild(
      el("div", "rails-note", "Gates pass through rails, not chat \u2014 Approve/Reject below call /rpc/approve_gate and /rpc/reject_gate directly.")
    );
    const inboxSection = el("section");
    inboxSection.appendChild(el("h2", void 0, "Gate inbox"));
    const inboxList = el("div");
    inboxList.id = "inbox-list";
    inboxSection.appendChild(inboxList);
    rails.appendChild(inboxSection);
    const notificationSection = el("section");
    notificationSection.appendChild(el("h2", void 0, "Notifications"));
    const notificationList = el("div");
    notificationList.id = "notification-list";
    notificationSection.appendChild(notificationList);
    rails.appendChild(notificationSection);
    const jobSection = el("section");
    jobSection.appendChild(el("h2", void 0, "Agent jobs"));
    const jobList = el("div");
    jobList.id = "job-list";
    jobSection.appendChild(jobList);
    rails.appendChild(jobSection);
    shell.appendChild(rails);
    root.appendChild(shell);
  }
  function startApp(root) {
    buildShell(root);
    renderChatHead();
    state.connected = true;
    run(refreshAll);
    void streamEvents();
  }
  function boot() {
    const root = byId("app");
    const savedUrl = localStorage.getItem(LS_URL);
    const savedToken = localStorage.getItem(LS_TOKEN);
    if (savedUrl !== null && savedToken !== null && savedToken !== "") {
      state.url = savedUrl;
      state.token = savedToken;
      rpc("whoami").then((who) => {
        state.actorId = who.actorId;
        startApp(root);
      }).catch(() => {
        renderLogin(root);
      });
    } else {
      renderLogin(root);
    }
  }
  boot();
})();
