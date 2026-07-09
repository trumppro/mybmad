"use strict";
(() => {
  // ../spine-api/ui-src/core/dom.ts
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

  // ../spine-api/ui-src/core/state.ts
  var state = {
    url: "",
    token: "",
    actorId: "",
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
    abort: null
  };
  var LS_URL = "oahs.ui.url";
  var LS_TOKEN = "oahs.ui.token";
  var subscribers = /* @__PURE__ */ new Map();
  function subscribe(channel, callback) {
    let set = subscribers.get(channel);
    if (set === void 0) {
      set = /* @__PURE__ */ new Set();
      subscribers.set(channel, set);
    }
    set.add(callback);
    return () => {
      set.delete(callback);
    };
  }
  function subscribeAll(pairs) {
    const unsubscribes = pairs.map(([channel, callback]) => subscribe(channel, callback));
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }
  function notify(channel) {
    const set = subscribers.get(channel);
    if (set === void 0) return;
    for (const callback of set) callback();
  }

  // ../spine-api/ui-src/core/router.ts
  var routes = [];
  var contentEl = null;
  var currentCleanup = null;
  var onNavigate = null;
  function defineRoutes(next) {
    routes = next;
  }
  function getRoutes() {
    return routes;
  }
  function currentPath() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    return hash === "" ? routes[0]?.path ?? "" : hash;
  }
  function renderCurrent() {
    if (contentEl === null) return;
    const path = currentPath();
    const route = routes.find((candidate) => candidate.path === path) ?? routes[0];
    if (route === void 0) return;
    if (currentCleanup !== null) {
      currentCleanup();
      currentCleanup = null;
    }
    clear(contentEl);
    currentCleanup = route.view.mount(contentEl);
    onNavigate?.(route.path);
  }
  function navigate(path) {
    const target = `#/${path}`;
    if (window.location.hash === target) {
      renderCurrent();
      return;
    }
    window.location.hash = target;
  }
  function startRouter(content, navCallback) {
    contentEl = content;
    onNavigate = navCallback;
    window.addEventListener("hashchange", renderCurrent);
    renderCurrent();
  }
  function stopRouter() {
    window.removeEventListener("hashchange", renderCurrent);
    if (currentCleanup !== null) {
      currentCleanup();
      currentCleanup = null;
    }
    contentEl = null;
    onNavigate = null;
    state.abort?.abort();
  }

  // ../spine-api/ui-src/components/shell.ts
  function buildAppShell(root, onLogout) {
    clear(root);
    const shell = el("div");
    shell.id = "shell";
    const topbar = el("div");
    topbar.id = "topbar";
    topbar.appendChild(el("span", "brand", "oahs"));
    topbar.appendChild(el("span", "who", `actor ${state.actorId}`));
    topbar.appendChild(el("span", "spacer"));
    const status = el("span");
    status.id = "status";
    topbar.appendChild(status);
    const logout2 = el("button", void 0, "Log out");
    logout2.addEventListener("click", onLogout);
    topbar.appendChild(logout2);
    shell.appendChild(topbar);
    const sidebar = el("nav");
    sidebar.id = "sidebar";
    for (const route of getRoutes()) {
      if (route.adminOnly === true && !state.isAdmin) continue;
      const item = el("button", "nav-item", route.label);
      item.dataset["path"] = route.path;
      item.addEventListener("click", () => navigate(route.path));
      sidebar.appendChild(item);
    }
    shell.appendChild(sidebar);
    const content = el("div");
    content.id = "content";
    shell.appendChild(content);
    root.appendChild(shell);
    startRouter(content, (path) => {
      for (const child of Array.from(sidebar.children)) {
        const item = child;
        item.classList.toggle("active", item.dataset["path"] === path);
      }
    });
  }

  // ../spine-api/ui-src/core/rpc.ts
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

  // ../spine-api/ui-src/core/loaders.ts
  async function loadThreads() {
    state.threads = await rpc("list_threads");
    notify("threads");
  }
  async function loadMessages() {
    if (state.currentThreadId === null) return;
    state.messages = await rpc("list_messages", { threadId: state.currentThreadId });
    notify("messages");
  }
  async function loadInbox() {
    state.inbox = await rpc("inbox");
    notify("inbox");
  }
  async function loadNotifications() {
    state.notifications = await rpc("list_notifications");
    notify("notifications");
  }
  async function loadJobs() {
    state.jobs = await rpc("list_agent_jobs");
    notify("jobs");
  }
  async function loadActors() {
    state.actors = await rpc("list_actors");
    notify("actors");
  }
  async function refreshAll() {
    await Promise.all([
      loadThreads(),
      loadMessages(),
      loadInbox(),
      loadNotifications(),
      loadJobs(),
      loadActors()
    ]);
  }

  // ../spine-api/ui-src/core/sse.ts
  function handleEvents(events) {
    let refetchMessages = false;
    let refetchThreads = false;
    let refetchJobs = false;
    let refetchNotifications = false;
    let refetchInbox = false;
    let refetchActors = false;
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
      } else if (event.streamType === "actor") {
        refetchActors = true;
      }
    }
    if (refetchThreads) run(loadThreads);
    if (refetchMessages) run(loadMessages);
    if (refetchJobs) run(loadJobs);
    if (refetchNotifications) run(loadNotifications);
    if (refetchInbox) run(loadInbox);
    if (refetchActors) run(loadActors);
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

  // ../spine-api/ui-src/core/vocab.ts
  var WORK_ITEM_STATES = [
    "backlog",
    "draft",
    "ready_for_dev",
    "in_progress",
    "in_review",
    "done"
  ];
  var DELIVERY_ROLE_CODES = [
    "product_owner",
    "tech_lead",
    "reviewer",
    "developer",
    "qa",
    "contributor"
  ];
  var PLANS = ["free", "team", "enterprise"];
  var GOVERNANCE_ROLES = ["admin", "member", "auditor"];
  var GATES = ["spec_approval", "review_approval"];
  var ACTOR_TYPES = ["user", "agent"];
  var MEMORY_KINDS = ["episodic", "procedural", "entity"];
  var PERMISSIONS = [
    "task.plan",
    "task.claim",
    "task.advance",
    "task.block",
    "gate.spec.approve",
    "gate.review.approve",
    "gate.review.reject",
    "feature.init",
    "feature.advance",
    "dispatch.release_hold",
    "intent.edit",
    "state.downgrade",
    "ops.force_release_claim",
    "governance.admin",
    "thread.post",
    "thread.read",
    "thread.invite",
    "agent_job.complete"
  ];

  // ../spine-api/ui-src/components/widgets.ts
  function badge(status) {
    return el("span", `badge ${status}`, status);
  }
  function emptyState(text) {
    return el("div", "empty", text);
  }
  function card(className = "card") {
    return el("div", className);
  }
  function cardTitle(text) {
    return el("div", "c-title", text);
  }
  function cardSub(text) {
    return el("div", "c-sub", text);
  }
  function button(label, onClick, className) {
    const node = el("button", className, label);
    node.addEventListener("click", onClick);
    return node;
  }
  function section(title) {
    const wrapper = el("section");
    wrapper.appendChild(el("h2", void 0, title));
    const body = el("div", "section-body");
    wrapper.appendChild(body);
    return { section: wrapper, body };
  }
  function field(labelText, control) {
    const label = el("label", "field");
    label.appendChild(el("span", "field-label", labelText));
    label.appendChild(control);
    return label;
  }
  function textInput(placeholder, value = "") {
    const input = el("input");
    input.placeholder = placeholder;
    input.value = value;
    return input;
  }
  function select(options, selected) {
    const node = el("select");
    for (const value of options) {
      const option = el("option", void 0, value);
      option.value = value;
      if (value === selected) option.selected = true;
      node.appendChild(option);
    }
    return node;
  }
  function table(columns, rows, emptyText = "Nothing here.") {
    const scroller = el("div", "table-scroll");
    if (rows.length === 0) {
      scroller.appendChild(emptyState(emptyText));
      return scroller;
    }
    const tableEl = el("table", "data-table");
    const thead = el("thead");
    const headRow = el("tr");
    for (const column of columns) headRow.appendChild(el("th", void 0, column));
    thead.appendChild(headRow);
    tableEl.appendChild(thead);
    const tbody = el("tbody");
    for (const row of rows) {
      const tr = el("tr");
      for (const cell of row) {
        const td = el("td");
        if (typeof cell === "string") td.textContent = cell;
        else td.appendChild(cell);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tableEl.appendChild(tbody);
    scroller.appendChild(tableEl);
    return scroller;
  }

  // ../spine-api/ui-src/views/actors.ts
  var actorsView = {
    mount(container) {
      const view = el("div", "view");
      const head = el("div", "view-head");
      head.appendChild(el("h2", void 0, "Actors & personas"));
      const toolbar = el("div", "toolbar");
      toolbar.appendChild(
        button("Provision BMAD personas", () => {
          run(async () => {
            await rpc("provision_personas", {});
            setStatus("personas provisioned");
            reload();
          });
        })
      );
      toolbar.appendChild(button("Refresh", () => reload()));
      head.appendChild(toolbar);
      view.appendChild(head);
      const create = section("Create actor");
      const typeSel = select(ACTOR_TYPES, "user");
      const nameInput = textInput("display name");
      const govSel = select(["(none)", ...GOVERNANCE_ROLES], "(none)");
      const createdOut = el("div", "section-body");
      const row = el("div", "toolbar");
      row.appendChild(field("Type", typeSel));
      row.appendChild(field("Name", nameInput));
      row.appendChild(field("Governance", govSel));
      row.appendChild(
        button(
          "Create",
          () => {
            run(async () => {
              const displayName = nameInput.value.trim();
              if (displayName === "") throw new Error("display name is required");
              const input = { type: typeSel.value, displayName };
              if (govSel.value !== "(none)") input.governanceRole = govSel.value;
              const created = await rpc("create_actor", input);
              nameInput.value = "";
              const line = card();
              line.appendChild(cardTitle(`${created.actor.displayName} \u2014 ${created.actor.id}`));
              line.appendChild(cardSub(`token (copy now): ${created.token}`));
              createdOut.prepend(line);
              reload();
            });
          },
          "primary"
        )
      );
      create.body.appendChild(row);
      create.body.appendChild(createdOut);
      view.appendChild(create.section);
      const perm = section("Grant / revoke permission");
      const grantActor = textInput("actorId");
      const permSel = select(PERMISSIONS, "task.claim");
      const permRow = el("div", "toolbar");
      permRow.appendChild(field("Actor", grantActor));
      permRow.appendChild(field("Permission", permSel));
      permRow.appendChild(
        button("Grant", () => {
          run(async () => {
            const actorId = grantActor.value.trim();
            if (actorId === "") throw new Error("actorId is required");
            await rpc("grant_permission", { actorId, permission: permSel.value });
            setStatus(`granted ${permSel.value} to ${actorId}`);
          });
        })
      );
      permRow.appendChild(
        button(
          "Revoke",
          () => {
            run(async () => {
              const actorId = grantActor.value.trim();
              if (actorId === "") throw new Error("actorId is required");
              await rpc("revoke_permission", { actorId, permission: permSel.value });
              setStatus(`revoked ${permSel.value} from ${actorId}`);
            });
          },
          "danger"
        )
      );
      perm.body.appendChild(permRow);
      view.appendChild(perm.section);
      const listSection = section("All actors");
      const body = el("div", "view-body");
      listSection.body.appendChild(body);
      view.appendChild(listSection.section);
      container.appendChild(view);
      function reload() {
        run(async () => {
          const actors = await rpc("list_actors");
          clear(body);
          if (actors.length === 0) {
            body.appendChild(emptyState("No actors."));
            return;
          }
          const rows = actors.map((actor) => [
            actor.id,
            badge(actor.type),
            actor.displayName,
            actor.personaCode ?? "\u2014"
          ]);
          body.appendChild(table(["Id", "Type", "Name", "Persona"], rows));
        });
      }
      reload();
      return () => {
      };
    }
  };

  // ../spine-api/ui-src/views/inbox.ts
  function gateCard(item, gate, parent) {
    const card2 = el("div", "card");
    card2.appendChild(el("div", "c-title", `${item.externalKey} \u2014 ${item.title}`));
    card2.appendChild(el("div", "c-sub", `${item.state} \xB7 awaiting ${gate}`));
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
    card2.appendChild(actions);
    parent.appendChild(card2);
  }
  function renderInbox() {
    const container = byId("inbox-list");
    clear(container);
    const { awaitingSpec, awaitingReview } = state.inbox;
    if (awaitingSpec.length === 0 && awaitingReview.length === 0) {
      container.appendChild(emptyState("No gates awaiting you."));
      return;
    }
    for (const item of awaitingSpec) gateCard(item, "spec_approval", container);
    for (const item of awaitingReview) gateCard(item, "review_approval", container);
  }
  function buildInboxSection() {
    const wrapper = el("section");
    wrapper.appendChild(el("h2", void 0, "Gate inbox"));
    const list = el("div");
    list.id = "inbox-list";
    wrapper.appendChild(list);
    return wrapper;
  }

  // ../spine-api/ui-src/views/notifications.ts
  function renderNotifications() {
    const container = byId("notification-list");
    clear(container);
    if (state.notifications.length === 0) {
      container.appendChild(emptyState("No notifications."));
      return;
    }
    for (const notification of state.notifications) {
      const card2 = el("div", notification.read ? "card" : "card unread");
      card2.appendChild(
        el(
          "div",
          "c-title",
          notification.source === "mention" ? "You were mentioned" : "Agent job completed"
        )
      );
      card2.appendChild(el("div", "c-sub", `ref ${notification.refId}`));
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
        card2.appendChild(actions);
      }
      container.appendChild(card2);
    }
  }
  function buildNotificationSection() {
    const wrapper = el("section");
    wrapper.appendChild(el("h2", void 0, "Notifications"));
    const list = el("div");
    list.id = "notification-list";
    wrapper.appendChild(list);
    return wrapper;
  }

  // ../spine-api/ui-src/views/jobs.ts
  function renderJobs() {
    const container = byId("job-list");
    clear(container);
    if (state.jobs.length === 0) {
      container.appendChild(emptyState("No agent jobs."));
      return;
    }
    for (const job of state.jobs) {
      const card2 = el("div", "card");
      const title = el("div", "c-title", `agent ${job.agentActorId}`);
      title.appendChild(document.createTextNode(" "));
      title.appendChild(badge(job.status));
      card2.appendChild(title);
      card2.appendChild(
        el(
          "div",
          "c-sub",
          `job ${job.id}${job.workItemId !== null ? ` \xB7 task ${job.workItemId}` : ""}`
        )
      );
      if (job.note !== null) card2.appendChild(el("div", "c-sub", `note: ${job.note}`));
      container.appendChild(card2);
    }
  }
  function buildJobSection() {
    const wrapper = el("section");
    wrapper.appendChild(el("h2", void 0, "Agent jobs"));
    const list = el("div");
    list.id = "job-list";
    wrapper.appendChild(list);
    return wrapper;
  }

  // ../spine-api/ui-src/views/chat.ts
  function renderThreads() {
    const list = byId("thread-list");
    clear(list);
    if (state.threads.length === 0) {
      list.appendChild(el("div", "empty", "No threads yet."));
      return;
    }
    for (const thread of state.threads) {
      const button2 = el("button", "thread-item");
      if (thread.id === state.currentThreadId) button2.classList.add("active");
      const kind = el("div", "t-kind", thread.kind);
      if (thread.visibility === "private") {
        kind.classList.add("private");
        kind.textContent = `${thread.kind} \xB7 private`;
      }
      button2.appendChild(kind);
      button2.appendChild(el("div", "t-id", thread.id));
      if (thread.workItemId !== null) {
        button2.appendChild(el("div", "t-ref", `task ${thread.workItemId}`));
      } else if (thread.featureId !== null) {
        button2.appendChild(el("div", "t-ref", `feature ${thread.featureId}`));
      }
      button2.addEventListener("click", () => {
        state.currentThreadId = thread.id;
        state.messages = [];
        renderThreads();
        renderChatHead();
        run(loadMessages);
      });
      list.appendChild(button2);
    }
  }
  function renderChatHead() {
    const head = byId("chat-head");
    const thread = state.threads.find((candidate) => candidate.id === state.currentThreadId);
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
  function renderMentionPicker() {
    const picker = document.getElementById("mention-picker");
    if (picker === null) return;
    const selected = new Set(Array.from(picker.selectedOptions).map((option) => option.value));
    clear(picker);
    for (const actor of state.actors) {
      if (actor.type === "system") continue;
      const option = el("option", void 0, `${actor.displayName} (${actor.id})`);
      option.value = actor.id;
      if (selected.has(actor.id)) option.selected = true;
      picker.appendChild(option);
    }
  }
  function buildThreadsColumn() {
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
    return threads;
  }
  function buildChatColumn() {
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
    const mentionPicker = el("select");
    mentionPicker.id = "mention-picker";
    mentionPicker.multiple = true;
    mentionPicker.size = 3;
    mentionPicker.title = "mention actors (structured ids \u2014 not parsed from text)";
    const send = el("button", "primary", "Send");
    send.addEventListener("click", () => {
      run(async () => {
        if (state.currentThreadId === null) throw new Error("select a thread first");
        const text = body.value.trim();
        if (text === "") throw new Error("message body is empty");
        const mentions = Array.from(mentionPicker.selectedOptions).map((option) => option.value);
        const input = { threadId: state.currentThreadId, body: text };
        if (mentions.length > 0) input.mentions = mentions;
        await rpc("post_message", input);
        body.value = "";
        for (const option of Array.from(mentionPicker.options)) option.selected = false;
        await loadMessages();
      });
    });
    row.appendChild(mentionPicker);
    row.appendChild(send);
    composer.appendChild(body);
    composer.appendChild(row);
    composer.appendChild(
      el("div", "hint", "Mentions are structured actor ids \u2014 chat text never drives the rails.")
    );
    chat.appendChild(composer);
    return chat;
  }
  function buildRailsColumn() {
    const rails = el("div", "col");
    rails.id = "col-rails";
    rails.appendChild(
      el(
        "div",
        "rails-note",
        "Gates pass through rails, not chat \u2014 Approve/Reject below call /rpc/approve_gate and /rpc/reject_gate directly."
      )
    );
    rails.appendChild(buildInboxSection());
    rails.appendChild(buildNotificationSection());
    rails.appendChild(buildJobSection());
    return rails;
  }
  var chatView = {
    mount(container) {
      const shell = el("div", "chat-shell");
      shell.appendChild(buildThreadsColumn());
      shell.appendChild(buildChatColumn());
      shell.appendChild(buildRailsColumn());
      container.appendChild(shell);
      renderThreads();
      renderChatHead();
      renderMessages();
      renderInbox();
      renderNotifications();
      renderJobs();
      renderMentionPicker();
      const unsubscribe = subscribeAll([
        ["threads", renderThreads],
        ["messages", renderMessages],
        ["inbox", renderInbox],
        ["notifications", renderNotifications],
        ["jobs", renderJobs],
        ["actors", renderMentionPicker]
      ]);
      run(refreshAll);
      return unsubscribe;
    }
  };

  // ../spine-api/ui-src/views/claims.ts
  var claimsView = {
    mount(container) {
      const view = el("div", "view");
      const head = el("div", "view-head");
      head.appendChild(el("h2", void 0, "Claims"));
      view.appendChild(head);
      const toolbar = el("div", "toolbar");
      const workItemId = textInput("workItemId or externalKey");
      toolbar.appendChild(field("Work item", workItemId));
      toolbar.appendChild(button("Load claims", () => reload(), "primary"));
      toolbar.appendChild(
        button(
          "Force-release live claim",
          () => {
            run(async () => {
              const id = workItemId.value.trim();
              if (id === "") throw new Error("workItemId is required");
              await rpc("force_release_claim", { workItemId: id });
              setStatus(`forced release on ${id}`);
              reload();
            });
          },
          "danger"
        )
      );
      view.appendChild(toolbar);
      const body = el("div", "view-body");
      view.appendChild(body);
      container.appendChild(view);
      function reload() {
        run(async () => {
          const id = workItemId.value.trim();
          if (id === "") throw new Error("workItemId is required");
          const claims = await rpc("get_claims", { workItemId: id });
          clear(body);
          if (claims.length === 0) {
            body.appendChild(emptyState("No claims on this work item."));
            return;
          }
          const rows = claims.map((claim) => [
            claim.id,
            claim.actorId,
            String(claim.fencingToken),
            claim.released ? badge("released") : badge("live"),
            claim.released ? "\u2014" : button("Release", () => {
              run(async () => {
                await rpc("release_claim", { claimId: claim.id });
                reload();
              });
            })
          ]);
          body.appendChild(table(["Claim", "Actor", "Fence", "Status", "Action"], rows));
        });
      }
      return () => {
      };
    }
  };

  // ../spine-api/ui-src/views/entitlements.ts
  function triState() {
    return select(["(unchanged)", "true", "false"], "(unchanged)");
  }
  function checkbox(label) {
    const wrap = el("label", "field");
    const input = el("input");
    input.type = "checkbox";
    input.style.width = "auto";
    wrap.appendChild(input);
    wrap.appendChild(el("span", "field-label", label));
    return { wrap, input };
  }
  var entitlementsView = {
    mount(container) {
      const view = el("div", "view");
      view.appendChild(el("h2", void 0, "Entitlements"));
      const authz = section("Authz trace (authz_explain)");
      const authzActor = textInput("actorId");
      const authzPerm = select(PERMISSIONS, "gate.review.approve");
      const authzOut = el("div", "section-body");
      const authzRow = el("div", "toolbar");
      authzRow.appendChild(field("Actor", authzActor));
      authzRow.appendChild(field("Permission", authzPerm));
      authzRow.appendChild(
        button(
          "Explain",
          () => {
            run(async () => {
              const actorId = authzActor.value.trim();
              if (actorId === "") throw new Error("actorId is required");
              const trace = await rpc("authz_explain", {
                actorId,
                permission: authzPerm.value
              });
              clear(authzOut);
              const line = card();
              const title = el("div", "c-title");
              title.textContent = `${trace.permission} `;
              title.appendChild(badge(trace.allowed ? "done" : "blocked"));
              title.appendChild(document.createTextNode(trace.allowed ? " ALLOWED" : " DENIED"));
              line.appendChild(title);
              line.appendChild(cardSub(`source: ${trace.source ?? "none"}`));
              line.appendChild(
                cardSub(
                  `governance ${trace.governanceRole} \xB7 plan ${trace.plan} \xB7 planAllows ${trace.planAllows} \xB7 policyAllows ${trace.policyAllows}`
                )
              );
              line.appendChild(cardSub(`versions: plan ${trace.versions.plan} \xB7 policy ${trace.versions.policy}`));
              authzOut.appendChild(line);
            });
          },
          "primary"
        )
      );
      authz.body.appendChild(authzRow);
      authz.body.appendChild(authzOut);
      view.appendChild(authz.section);
      const roles = section("Delivery roles");
      const roleActor = textInput("actorId");
      const roleSel = select(DELIVERY_ROLE_CODES, "reviewer");
      const roleOut = el("div", "section-body");
      const roleRow = el("div", "toolbar");
      roleRow.appendChild(field("Actor", roleActor));
      roleRow.appendChild(field("Role", roleSel));
      roleRow.appendChild(
        button("Assign", () => {
          run(async () => {
            const actorId = roleActor.value.trim();
            if (actorId === "") throw new Error("actorId is required");
            await rpc("assign_role", { actorId, roleCode: roleSel.value });
            setStatus(`assigned ${roleSel.value} to ${actorId}`);
            loadAssignments();
          });
        })
      );
      roleRow.appendChild(
        button(
          "Revoke",
          () => {
            run(async () => {
              const actorId = roleActor.value.trim();
              if (actorId === "") throw new Error("actorId is required");
              await rpc("revoke_role", { actorId, roleCode: roleSel.value });
              setStatus(`revoked ${roleSel.value} from ${actorId}`);
              loadAssignments();
            });
          },
          "danger"
        )
      );
      roleRow.appendChild(button("List assignments", () => loadAssignments()));
      roles.body.appendChild(roleRow);
      roles.body.appendChild(roleOut);
      view.appendChild(roles.section);
      function loadAssignments() {
        run(async () => {
          const assignments = await rpc("list_role_assignments", {});
          clear(roleOut);
          if (assignments.length === 0) {
            roleOut.appendChild(emptyState("No role assignments."));
            return;
          }
          const rows = assignments.map((assignment) => [
            assignment.actorId,
            assignment.roleCode,
            assignment.grantedBy,
            assignment.revoked ? badge("revoked") : badge("active")
          ]);
          roleOut.appendChild(table(["Actor", "Role", "Granted by", "Status"], rows));
        });
      }
      const plan = section("Workspace plan & governance");
      const planSel = select(PLANS, "enterprise");
      const planRow = el("div", "toolbar");
      planRow.appendChild(field("Plan", planSel));
      planRow.appendChild(
        button("Set plan", () => {
          run(async () => {
            await rpc("set_plan", { plan: planSel.value });
            setStatus(`plan set to ${planSel.value}`);
          });
        })
      );
      const govActor = textInput("actorId");
      const govSel = select(GOVERNANCE_ROLES, "member");
      planRow.appendChild(field("Actor", govActor));
      planRow.appendChild(field("Gov role", govSel));
      planRow.appendChild(
        button("Set governance", () => {
          run(async () => {
            const actorId = govActor.value.trim();
            if (actorId === "") throw new Error("actorId is required");
            await rpc("set_governance_role", { actorId, role: govSel.value });
            setStatus(`governance role of ${actorId} set to ${govSel.value}`);
          });
        })
      );
      plan.body.appendChild(planRow);
      view.appendChild(plan.section);
      const policy = section("Workspace policy (restrict-only)");
      const gateApprovals = triState();
      const selfDispatch = triState();
      const policyRow = el("div", "toolbar");
      policyRow.appendChild(field("agentGateApprovals", gateApprovals));
      policyRow.appendChild(field("agentSelfDispatch", selfDispatch));
      policyRow.appendChild(
        button("Set policy", () => {
          run(async () => {
            const body = {};
            if (gateApprovals.value !== "(unchanged)") body.agentGateApprovals = gateApprovals.value === "true";
            if (selfDispatch.value !== "(unchanged)") body.agentSelfDispatch = selfDispatch.value === "true";
            if (Object.keys(body).length === 0) throw new Error("choose at least one policy key");
            await rpc("set_workspace_policy", { policy: body });
            setStatus("workspace policy updated");
          });
        })
      );
      policy.body.appendChild(policyRow);
      view.appendChild(policy.section);
      const gatePolicy = section("Gate policy (quorum as data)");
      const gateSel = select(GATES, "review_approval");
      const minApprovals = textInput("min approvals (e.g. 2)");
      minApprovals.type = "number";
      const reqUser = checkbox("require user");
      const reqAgent = checkbox("require agent");
      const gateRow = el("div", "toolbar");
      gateRow.appendChild(field("Gate", gateSel));
      gateRow.appendChild(field("Min approvals", minApprovals));
      gateRow.appendChild(reqUser.wrap);
      gateRow.appendChild(reqAgent.wrap);
      gateRow.appendChild(
        button("Set gate policy", () => {
          run(async () => {
            const gatePolicyBody = {};
            const min = minApprovals.value.trim();
            if (min !== "") gatePolicyBody.minApprovals = Number(min);
            const types = [];
            if (reqUser.input.checked) types.push("user");
            if (reqAgent.input.checked) types.push("agent");
            if (types.length > 0) gatePolicyBody.requiredActorTypes = types;
            if (Object.keys(gatePolicyBody).length === 0) {
              throw new Error("set min approvals and/or a required actor type");
            }
            await rpc("set_gate_policy", { gate: gateSel.value, policy: gatePolicyBody });
            setStatus(`gate policy for ${gateSel.value} updated`);
          });
        })
      );
      gatePolicy.body.appendChild(gateRow);
      view.appendChild(gatePolicy.section);
      container.appendChild(view);
      return () => {
      };
    }
  };

  // ../spine-api/ui-src/views/events.ts
  var eventsView = {
    mount(container) {
      const view = el("div", "view");
      const head = el("div", "view-head");
      head.appendChild(el("h2", void 0, "Audit events"));
      view.appendChild(head);
      const toolbar = el("div", "toolbar");
      const streamId = textInput("streamId (optional \u2014 blank = all)");
      toolbar.appendChild(field("Stream", streamId));
      toolbar.appendChild(button("Query", () => reload(), "primary"));
      view.appendChild(toolbar);
      const body = el("div", "view-body");
      view.appendChild(body);
      container.appendChild(view);
      function reload() {
        run(async () => {
          const id = streamId.value.trim();
          const input = id === "" ? {} : { streamId: id };
          const events = await rpc("query_events", input);
          clear(body);
          if (events.length === 0) {
            body.appendChild(emptyState("No events."));
            return;
          }
          const rows = [...events].reverse().map((event) => {
            const full = JSON.stringify(event.payload);
            const payload = el("span", void 0, full.length > 100 ? `${full.slice(0, 100)}\u2026` : full);
            payload.title = full;
            return [
              String(event.globalSeq),
              `${event.streamType} ${event.streamId}`,
              event.type,
              event.actorId,
              payload
            ];
          });
          body.appendChild(table(["Seq", "Stream", "Type", "Actor", "Payload"], rows));
        });
      }
      reload();
      return () => {
      };
    }
  };

  // ../spine-api/ui-src/views/features.ts
  var featuresView = {
    mount(container) {
      const view = el("div", "view");
      view.appendChild(el("h2", void 0, "Features"));
      const create = section("Create feature");
      const createdList = el("div", "section-body");
      create.body.appendChild(
        button(
          "Create feature",
          () => {
            run(async () => {
              const feature = await rpc("create_feature", {});
              const line = card();
              line.appendChild(cardTitle(`feature ${feature.id}`));
              line.appendChild(cardSub(`state ${feature.state} \xB7 dispatchHold ${feature.dispatchHold}`));
              createdList.prepend(line);
            });
          },
          "primary"
        )
      );
      create.body.appendChild(createdList);
      view.appendChild(create.section);
      const inspect = section("Inspect feature");
      const inspectId = textInput("featureId");
      const inspectOut = el("div", "section-body");
      inspect.body.appendChild(field("Feature id", inspectId));
      inspect.body.appendChild(
        button("Load", () => {
          run(async () => {
            const featureId = inspectId.value.trim();
            if (featureId === "") throw new Error("featureId is required");
            const feature = await rpc("get_feature", { featureId });
            clear(inspectOut);
            const line = card();
            line.appendChild(cardTitle(`feature ${feature.id}`));
            line.appendChild(cardSub(`state ${feature.state} \xB7 dispatchHold ${feature.dispatchHold}`));
            if (feature.dispatchHold) {
              const actions = el("div", "c-actions");
              actions.appendChild(
                button("Release dispatch hold", () => {
                  run(async () => {
                    await rpc("release_dispatch_hold", { featureId: feature.id });
                    setStatus(`dispatch hold released on ${feature.id}`);
                  });
                })
              );
              line.appendChild(actions);
            }
            inspectOut.appendChild(line);
          });
        })
      );
      inspect.body.appendChild(inspectOut);
      view.appendChild(inspect.section);
      const importSection = section("Import stories.yaml");
      const importId = textInput("featureId");
      const yaml = el("textarea");
      yaml.placeholder = "paste stories.yaml content here";
      yaml.rows = 8;
      const importOut = el("div", "section-body");
      importSection.body.appendChild(field("Feature id", importId));
      importSection.body.appendChild(field("stories.yaml", yaml));
      importSection.body.appendChild(
        button(
          "Import",
          () => {
            run(async () => {
              const featureId = importId.value.trim();
              const content = yaml.value;
              if (featureId === "" || content.trim() === "") {
                throw new Error("featureId and stories.yaml content are required");
              }
              const result = await rpc("import_stories", { featureId, yaml: content });
              clear(importOut);
              const line = card();
              line.appendChild(cardTitle("Import result"));
              line.appendChild(
                cardSub(
                  `imported ${result.imported.length} \xB7 updated ${result.updated.length} \xB7 warnings ${result.warnings.length}`
                )
              );
              if (result.warnings.length > 0) line.appendChild(cardSub(result.warnings.join(" \xB7 ")));
              importOut.appendChild(line);
            });
          },
          "primary"
        )
      );
      importSection.body.appendChild(importOut);
      view.appendChild(importSection.section);
      container.appendChild(view);
      return () => {
      };
    }
  };

  // ../spine-api/ui-src/views/insights.ts
  var insightsView = {
    mount(container) {
      const view = el("div", "view");
      view.appendChild(el("h2", void 0, "Insights"));
      const memory = section("My agent memories (owner-scoped)");
      memory.body.appendChild(
        el("div", "hint", "Owner-scoped by construction \u2014 you see only your own token\u2019s memories.")
      );
      const kindSel = select(["all", ...MEMORY_KINDS], "all");
      const queryInput = textInput("substring filter (optional)");
      const memOut = el("div", "section-body");
      const memRow = el("div", "toolbar");
      memRow.appendChild(field("Kind", kindSel));
      memRow.appendChild(field("Query", queryInput));
      memRow.appendChild(
        button(
          "Search",
          () => {
            run(async () => {
              const input = {};
              if (kindSel.value !== "all") input.kind = kindSel.value;
              const query = queryInput.value.trim();
              if (query !== "") input.query = query;
              const memories = await rpc("search_agent_memory", input);
              clear(memOut);
              if (memories.length === 0) {
                memOut.appendChild(emptyState("No memories."));
                return;
              }
              const rows = memories.map((mem) => [
                String(mem.seq),
                badge(mem.kind),
                mem.content,
                mem.sourceThreadId ?? "\u2014"
              ]);
              memOut.appendChild(table(["#", "Kind", "Content", "Source thread"], rows));
            });
          },
          "primary"
        )
      );
      memory.body.appendChild(memRow);
      memory.body.appendChild(memOut);
      view.appendChild(memory.section);
      const reconcile = section("Reconcile (detect-only)");
      reconcile.body.appendChild(
        el("div", "hint", "Reports file\u2194DB divergence for one work item \u2014 never mutates.")
      );
      const wiInput = textInput("workItemId");
      const fmInput = textInput("frontmatter status (e.g. done)");
      const recOut = el("div", "section-body");
      const recRow = el("div", "toolbar");
      recRow.appendChild(field("Work item", wiInput));
      recRow.appendChild(field("Frontmatter", fmInput));
      recRow.appendChild(
        button("Check", () => {
          run(async () => {
            const workItemId = wiInput.value.trim();
            const frontmatterStatus = fmInput.value.trim();
            if (workItemId === "" || frontmatterStatus === "") {
              throw new Error("workItemId and frontmatter status are required");
            }
            const reports = await rpc("reconcile", {
              files: [{ workItemId, frontmatterStatus }]
            });
            clear(recOut);
            if (reports.length === 0) {
              recOut.appendChild(emptyState("No divergence \u2014 file and DB agree."));
              return;
            }
            const rows = reports.map((report) => [
              report.workItemId,
              report.fileState,
              report.dbState,
              badge(report.kind)
            ]);
            recOut.appendChild(table(["Work item", "File", "DB", "Divergence"], rows));
          });
        })
      );
      reconcile.body.appendChild(recRow);
      reconcile.body.appendChild(recOut);
      view.appendChild(reconcile.section);
      container.appendChild(view);
      return () => {
      };
    }
  };

  // ../spine-api/ui-src/views/login.ts
  function renderLogin(root, onConnected) {
    clear(root);
    const box = el("div");
    box.id = "login";
    box.appendChild(el("h1", void 0, "oahs"));
    box.appendChild(
      el(
        "p",
        void 0,
        "Operations console over the rails. Paste the server URL and your API token."
      )
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
        state.isAdmin = who.isAdmin;
        localStorage.setItem(LS_URL, state.url);
        localStorage.setItem(LS_TOKEN, state.token);
        onConnected();
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

  // ../spine-api/ui-src/views/work.ts
  async function fetchItems(stateFilter) {
    const input = stateFilter === "all" ? {} : { state: stateFilter };
    return rpc("list_work_items", input);
  }
  function actionsCell(item, reload) {
    const wrap = el("div", "c-actions");
    const to = select(WORK_ITEM_STATES, item.state);
    to.title = "advance to state";
    wrap.appendChild(to);
    wrap.appendChild(
      button("Advance", () => {
        run(async () => {
          await rpc("advance_state", { workItemId: item.id, to: to.value });
          reload();
        });
      })
    );
    if (item.blockedReason !== null) {
      wrap.appendChild(
        button(
          "Unblock",
          () => {
            run(async () => {
              await rpc("unblock_task", { workItemId: item.id });
              reload();
            });
          },
          "danger"
        )
      );
    }
    return wrap;
  }
  var workView = {
    mount(container) {
      const view = el("div", "view");
      const head = el("div", "view-head");
      head.appendChild(el("h2", void 0, "Work items"));
      const toolbar = el("div", "toolbar");
      const stateFilter = select(["all", ...WORK_ITEM_STATES], "all");
      stateFilter.title = "filter by state";
      toolbar.appendChild(stateFilter);
      const refresh = button("Refresh", () => reload());
      toolbar.appendChild(refresh);
      head.appendChild(toolbar);
      view.appendChild(head);
      const body = el("div", "view-body");
      view.appendChild(body);
      container.appendChild(view);
      function reload() {
        run(async () => {
          const items = await fetchItems(stateFilter.value);
          clear(body);
          if (items.length === 0) {
            body.appendChild(emptyState("No work items for this filter."));
            return;
          }
          const rows = items.map((item) => [
            item.externalKey,
            item.title,
            badge(item.kind),
            badge(item.state),
            item.blockedReason ?? "\u2014",
            String(item.reviewLoopIteration),
            actionsCell(item, reload)
          ]);
          body.appendChild(
            table(["Key", "Title", "Kind", "State", "Blocked", "Review#", "Actions"], rows)
          );
        });
      }
      stateFilter.addEventListener("change", () => reload());
      reload();
      return () => {
      };
    }
  };

  // ../spine-api/ui-src/app.ts
  function routeTable() {
    return [
      { path: "chat", label: "Chat", view: chatView },
      { path: "work", label: "Work items", view: workView },
      { path: "features", label: "Features", view: featuresView },
      { path: "claims", label: "Claims", view: claimsView },
      { path: "events", label: "Audit events", view: eventsView },
      { path: "entitlements", label: "Entitlements", view: entitlementsView, adminOnly: true },
      { path: "actors", label: "Actors", view: actorsView, adminOnly: true },
      { path: "insights", label: "Insights", view: insightsView }
    ];
  }
  function startApp(root) {
    defineRoutes(routeTable());
    state.connected = true;
    buildAppShell(root, () => logout(root));
    void streamEvents();
  }
  function logout(root) {
    state.connected = false;
    stopRouter();
    state.abort?.abort();
    localStorage.removeItem(LS_TOKEN);
    renderLogin(root, () => startApp(root));
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
        state.isAdmin = who.isAdmin;
        startApp(root);
      }).catch(() => {
        renderLogin(root, () => startApp(root));
      });
    } else {
      renderLogin(root, () => startApp(root));
    }
  }
  boot();
})();
