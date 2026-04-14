/**
 * ShotTrack — client-side demo (localStorage).
 * PRD-aligned: versions, kickback row state, JSON export/import.
 */

const STORAGE_KEY = "shottrack_v1_data";

/** @typedef {'not_started'|'in_progress'|'internal_review'|'client_review'|'needs_revision'|'approved'|'final'|'on_hold'} ShotStatus */
/** @typedef {'not_started'|'in_progress'|'blocked'|'internal_review'|'done'} TaskStatus */
/** @typedef {'delivered'|'in_client_review'|'kickback'|'approved'|'superseded'} VersionStatus */

/**
 * @typedef {Object} DeliveryVersion
 * @property {string} id
 * @property {number} versionNumber
 * @property {VersionStatus} status
 * @property {string} deliveredAt ISO date
 * @property {string} note
 * @property {string} createdBy
 */

/**
 * @typedef {Object} ShotTask
 * @property {string} id
 * @property {string} name
 * @property {TaskStatus} status
 * @property {string} assignee
 */

/**
 * @typedef {Object} ShotNote
 * @property {string} id
 * @property {string} body
 * @property {string} createdAt ISO
 * @property {string} createdBy
 */

/**
 * @typedef {Object} AuditEvent
 * @property {string} id
 * @property {string} at ISO
 * @property {string} message
 * @property {string} [actor]
 */

/**
 * @typedef {Object} Shot
 * @property {string} id
 * @property {string} sequence
 * @property {string} code
 * @property {string} description
 * @property {ShotStatus} status
 * @property {'low'|'medium'|'high'|'urgent'} priority
 * @property {string} dueOn
 * @property {string} owner
 * @property {ShotTask[]} tasks
 * @property {DeliveryVersion[]} versions
 * @property {ShotNote[]} notes
 * @property {AuditEvent[]} audit
 */

/** @type {{ export_format_version: number, project: { name: string }, shots: Shot[], ui?: { collapsed: Record<string, boolean> } }} */
let state = createEmptyState();

function createEmptyState() {
  return {
    export_format_version: 1,
    project: { name: "ASD" },
    shots: [],
    ui: { collapsed: {} },
  };
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

/** @param {Shot} shot */
function sortVersionsDesc(shot) {
  return [...(shot.versions || [])].sort((a, b) => b.versionNumber - a.versionNumber);
}

/**
 * Latest non-superseded delivery (highest version that still counts for status).
 * @param {Shot} shot
 */
function latestMeaningfulVersion(shot) {
  const sorted = sortVersionsDesc(shot);
  return sorted.find((v) => v.status !== "superseded") ?? sorted[0] ?? null;
}

/**
 * Apply PRD automation from delivery versions to shot status + row flags.
 * @param {Shot} shot
 */
function applyVersionAutomation(shot) {
  const latest = latestMeaningfulVersion(shot);

  if (!latest) {
    return;
  }

  if (latest.status === "kickback") {
    shot.status = "needs_revision";
    return;
  }
  if (latest.status === "approved") {
    shot.status = "approved";
    return;
  }
  if (latest.status === "in_client_review") {
    if (shot.status !== "on_hold") shot.status = "client_review";
    return;
  }
  if (latest.status === "delivered") {
    if (shot.status === "not_started") shot.status = "in_progress";
    else if (shot.status !== "on_hold" && shot.status !== "approved") {
      shot.status = "in_progress";
    }
    return;
  }
}

/**
 * @param {Shot} shot
 */
function onFirstVersionCreated(shot) {
  if (shot.status === "not_started") shot.status = "in_progress";
}

/**
 * @param {Shot} shot
 */
function rowVisualClass(shot) {
  const latest = latestMeaningfulVersion(shot);
  if (latest && latest.status === "kickback") return "kickback";
  if (shot.status === "approved" || shot.status === "final") return "approved";
  return "";
}

const SHOT_STATUS_OPTIONS = /** @type {const} */ ([
  "not_started",
  "in_progress",
  "internal_review",
  "client_review",
  "needs_revision",
  "approved",
  "final",
  "on_hold",
]);

const VERSION_STATUS_OPTIONS = /** @type {const} */ ([
  "delivered",
  "in_client_review",
  "kickback",
  "approved",
  "superseded",
]);

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function toast(message, isError = false) {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const el = document.createElement("div");
  el.className = `toast${isError ? " is-error" : ""}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 4200);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      seedDemo();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.shots)) {
      seedDemo();
      return;
    }
    state = {
      export_format_version: parsed.export_format_version ?? 1,
      project: parsed.project ?? { name: "ASD" },
      shots: parsed.shots,
      ui: parsed.ui ?? { collapsed: {} },
    };
  } catch {
    seedDemo();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast("Could not save locally (storage full?)", true);
  }
}

function seedDemo() {
  state = createEmptyState();
  state.project.name = "ASD";
  const owners = ["Ada Park", "Ben Cho", "Chen Wei", "Dana Ortiz"];
  const seqs = ["BES", "FRE"];
  let n = 0;
  for (const seq of seqs) {
    for (let i = 0; i < 3; i++) {
      n += 1;
      const code = `${seq}_${String(20 + i * 10).padStart(3, "0")}`;
      /** @type {Shot} */
      const shot = {
        id: newId(),
        sequence: seq,
        code,
        description: i === 0 ? "Hero comp — rain + CG integration" : "Roto cleanup and edge fix",
        status: "in_progress",
        priority: i === 0 ? "high" : "medium",
        dueOn: `2026-04-${String(18 + i).padStart(2, "0")}`,
        owner: owners[n % owners.length],
        tasks: [
          {
            id: newId(),
            name: "Comp",
            status: i === 0 ? "in_progress" : "done",
            assignee: owners[n % owners.length],
          },
          {
            id: newId(),
            name: "Roto",
            status: "done",
            assignee: owners[(n + 1) % owners.length],
          },
        ],
        versions: [],
        notes: [],
        audit: [],
      };

      if (seq === "BES" && i === 0) {
        shot.versions = [
          {
            id: newId(),
            versionNumber: 4,
            status: "kickback",
            deliveredAt: "2026-04-12T14:00:00.000Z",
            note: "Client: soften edge on left, add grain match.",
            createdBy: "Ada Park",
          },
          {
            id: newId(),
            versionNumber: 3,
            status: "superseded",
            deliveredAt: "2026-04-10T10:00:00.000Z",
            note: "Submitted for review",
            createdBy: "Ada Park",
          },
        ];
        applyVersionAutomation(shot);
      } else if (seq === "FRE" && i === 1) {
        shot.versions = [
          {
            id: newId(),
            versionNumber: 2,
            status: "approved",
            deliveredAt: "2026-04-11T16:30:00.000Z",
            note: "Approved as final for this shot.",
            createdBy: "Producer",
          },
        ];
        applyVersionAutomation(shot);
      } else {
        shot.versions = [
          {
            id: newId(),
            versionNumber: 1,
            status: "in_client_review",
            deliveredAt: "2026-04-14T09:00:00.000Z",
            note: "First client review",
            createdBy: shot.owner,
          },
        ];
        applyVersionAutomation(shot);
      }

      shot.audit.push({
        id: newId(),
        at: nowIso(),
        message: "Shot seeded for demo",
        actor: "system",
      });

      state.shots.push(shot);
    }
  }
  state.ui = { collapsed: {} };
  save();
}

function getFilterEls() {
  return {
    search: /** @type {HTMLInputElement} */ (document.getElementById("filter-search")),
    sequence: /** @type {HTMLSelectElement} */ (document.getElementById("filter-sequence")),
    status: /** @type {HTMLSelectElement} */ (document.getElementById("filter-status")),
    owner: /** @type {HTMLSelectElement} */ (document.getElementById("filter-owner")),
    group: /** @type {HTMLSelectElement} */ (document.getElementById("filter-group")),
    sort: /** @type {HTMLSelectElement} */ (document.getElementById("filter-sort")),
    project: /** @type {HTMLInputElement} */ (document.getElementById("project-name")),
  };
}

function filteredShots() {
  const els = getFilterEls();
  const q = (els.search?.value ?? "").trim().toLowerCase();
  const seq = els.sequence?.value ?? "all";
  const st = els.status?.value ?? "all";
  const own = els.owner?.value ?? "all";

  return state.shots.filter((s) => {
    if (seq !== "all" && s.sequence !== seq) return false;
    if (st !== "all" && s.status !== st) return false;
    if (own !== "all" && s.owner !== own) return false;
    if (!q) return true;
    const hay = `${s.code} ${s.description} ${s.owner} ${s.sequence}`.toLowerCase();
    return hay.includes(q);
  });
}

function sortShots(list) {
  const els = getFilterEls();
  const key = els.sort?.value ?? "code";
  const copy = [...list];
  copy.sort((a, b) => {
    if (key === "due") return (a.dueOn || "").localeCompare(b.dueOn || "");
    if (key === "status") return a.status.localeCompare(b.status);
    if (key === "priority") {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
    }
    return a.code.localeCompare(b.code, undefined, { numeric: true });
  });
  return copy;
}

function populateFilterSelects() {
  const els = getFilterEls();
  const sequences = [...new Set(state.shots.map((s) => s.sequence))].sort();
  const owners = [...new Set(state.shots.map((s) => s.owner))].sort();

  const fill = (sel, items, includeAll) => {
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = "";
    if (includeAll) {
      const o = document.createElement("option");
      o.value = "all";
      o.textContent = "All";
      sel.appendChild(o);
    }
    for (const it of items) {
      const o = document.createElement("option");
      o.value = it;
      o.textContent = it;
      sel.appendChild(o);
    }
    if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
  };

  fill(els.sequence, sequences, true);
  fill(els.owner, owners, true);

  if (els.status) {
    els.status.innerHTML = "";
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All";
    els.status.appendChild(all);
    for (const s of SHOT_STATUS_OPTIONS) {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s.replace(/_/g, " ");
      els.status.appendChild(o);
    }
  }

  if (els.project) els.project.value = state.project.name;
}

let drawerShotId = null;

function renderTable() {
  const tbody = document.getElementById("shot-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = sortShots(filteredShots());
  const groupMode = getFilterEls().group?.value ?? "sequence";

  if (list.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 11;
    td.className = "empty-state";
    td.style.padding = "2.5rem 1rem";
    td.style.textAlign = "center";
    td.style.color = "var(--text-muted)";
    td.textContent =
      state.shots.length === 0
        ? "No shots yet — use + Shot or Import JSON."
        : "No shots match filters — adjust search or filters.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  if (groupMode === "flat") {
    for (const shot of list) {
      tbody.appendChild(renderShotRow(shot));
    }
    return;
  }

  const bySeq = new Map();
  for (const shot of list) {
    const k = shot.sequence || "—";
    if (!bySeq.has(k)) bySeq.set(k, []);
    bySeq.get(k).push(shot);
  }
  const keys = [...bySeq.keys()].sort((a, b) => a.localeCompare(b));

  for (const seq of keys) {
    const shots = bySeq.get(seq) ?? [];
    const collapsed = state.ui?.collapsed?.[seq];
    const tr = document.createElement("tr");
    tr.className = "group-header";
    const td = document.createElement("td");
    td.colSpan = 11;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "group-toggle";
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    btn.dataset.sequence = seq;
    btn.innerHTML = `<span aria-hidden="true">${collapsed ? "▶" : "▼"}</span> ${escapeHtml(seq)} <span style="opacity:.7">(${shots.length})</span>`;
    td.appendChild(btn);
    tr.appendChild(td);
    tbody.appendChild(tr);

    if (!collapsed) {
      for (const shot of shots) {
        tbody.appendChild(renderShotRow(shot));
      }
    }
  }
}

/**
 * @param {Shot} shot
 */
function renderShotRow(shot) {
  const tr = document.createElement("tr");
  const vis = rowVisualClass(shot);
  if (vis === "kickback") tr.classList.add("row-kickback");
  if (vis === "approved") tr.classList.add("row-approved");
  tr.dataset.shotId = shot.id;

  const sorted = sortVersionsDesc(shot);
  const latest = sorted[0];
  const meaningful = latestMeaningfulVersion(shot);
  const latestLabel = latest ? `v${latest.versionNumber}` : "—";
  const latestState = meaningful ? meaningful.status.replace(/_/g, " ") : "";

  const tasksHtml = shot.tasks
    .slice(0, 4)
    .map(
      (t) =>
        `<span class="task-pill ${t.status === "done" ? "is-done" : ""}">${escapeHtml(t.name)}</span>`
    )
    .join("");

  const noteFlag =
    shot.notes && shot.notes.length > 0
      ? '<span class="note-flag has-notes" title="Has notes">◆</span>'
      : '<span class="note-flag">—</span>';

  tr.innerHTML = `
    <td class="td-fixed td-check"></td>
    <td class="td-fixed td-seq">${escapeHtml(shot.sequence)}</td>
    <td class="td-fixed td-code"><button type="button" class="js-open-shot" data-shot-id="${escapeHtml(shot.id)}">${escapeHtml(shot.code)}</button></td>
    <td class="desc-cell" title="${escapeHtml(shot.description)}">${escapeHtml(shot.description)}</td>
    <td><span class="badge badge-status" data-status="${escapeHtml(shot.status)}">${escapeHtml(shot.status.replace(/_/g, " "))}</span></td>
    <td><span class="badge badge-priority" data-priority="${escapeHtml(shot.priority)}">${escapeHtml(shot.priority)}</span></td>
    <td>${escapeHtml(shot.dueOn || "—")}</td>
    <td>${escapeHtml(shot.owner)}</td>
    <td>${tasksHtml || "—"}</td>
    <td class="ver-cell"><span class="v-label">${escapeHtml(latestLabel)}</span><span class="v-state">${escapeHtml(latestState)}</span></td>
    <td>${noteFlag}</td>
  `;

  tr.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.closest("button")) return;
    openDrawer(shot.id);
  });

  const openBtn = tr.querySelector(".js-open-shot");
  openBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openDrawer(shot.id);
  });

  return tr;
}

function openDrawer(shotId) {
  drawerShotId = shotId;
  const shot = state.shots.find((s) => s.id === shotId);
  if (!shot) return;

  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (!drawer || !backdrop) return;

  document.getElementById("drawer-seq") && (document.getElementById("drawer-seq").textContent = `Sequence ${shot.sequence}`);
  const title = document.getElementById("drawer-title");
  if (title) title.textContent = shot.code;

  const statusSel = document.getElementById("drawer-status");
  if (statusSel) {
    statusSel.innerHTML = "";
    for (const s of SHOT_STATUS_OPTIONS) {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s.replace(/_/g, " ");
      statusSel.appendChild(o);
    }
    statusSel.value = shot.status;
    statusSel.onchange = () => {
      shot.status = /** @type {ShotStatus} */ (statusSel.value);
      pushAudit(shot, `Shot status set to ${shot.status} (manual)`);
      save();
      renderTable();
      toast("Status updated");
    };
  }

  renderVersionList(shot);
  renderTaskList(shot);
  renderNoteList(shot);
  renderAuditList(shot);

  backdrop.hidden = false;
  drawer.hidden = false;
  backdrop.classList.add("is-open");
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  backdrop.setAttribute("aria-hidden", "false");

  activateTab("versions");
}

function closeDrawer() {
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  drawer?.classList.remove("is-open");
  backdrop?.classList.remove("is-open");
  if (drawer) {
    drawer.setAttribute("aria-hidden", "true");
    drawer.hidden = true;
  }
  if (backdrop) {
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
  }
  drawerShotId = null;
}

/**
 * @param {Shot} shot
 */
function renderVersionList(shot) {
  const ul = document.getElementById("version-list");
  if (!ul) return;
  ul.innerHTML = "";
  const sorted = sortVersionsDesc(shot);
  for (const v of sorted) {
    const li = document.createElement("li");
    const head = document.createElement("div");
    head.className = "timeline-head";
    head.innerHTML = `<span class="timeline-v">${escapeHtml(`v${v.versionNumber}`)}</span> <span class="timeline-meta">${escapeHtml(v.deliveredAt.slice(0, 10))} · ${escapeHtml(v.createdBy)}</span>`;

    const note = document.createElement("div");
    note.className = "timeline-meta";
    note.style.marginTop = "0.25rem";
    note.textContent = v.note || "—";

    const actions = document.createElement("div");
    actions.className = "version-actions";

    const sel = document.createElement("select");
    sel.className = "select";
    sel.setAttribute("aria-label", `Version ${v.versionNumber} outcome`);
    for (const opt of VERSION_STATUS_OPTIONS) {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt.replace(/_/g, " ");
      sel.appendChild(o);
    }
    sel.value = v.status;
    sel.addEventListener("change", () => {
      v.status = /** @type {VersionStatus} */ (sel.value);
      applyVersionAutomation(shot);
      pushAudit(shot, `Version v${v.versionNumber} set to ${v.status}`);
      save();
      renderTable();
      renderVersionList(shot);
      const ds = document.getElementById("drawer-status");
      if (ds) ds.value = shot.status;
      toast("Version updated");
    });

    actions.appendChild(sel);
    li.appendChild(head);
    li.appendChild(note);
    li.appendChild(actions);
    ul.appendChild(li);
  }
}

/**
 * @param {Shot} shot
 */
function renderTaskList(shot) {
  const ul = document.getElementById("task-list");
  if (!ul) return;
  ul.innerHTML = "";
  for (const t of shot.tasks) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${escapeHtml(t.name)}</strong> · ${escapeHtml(t.assignee)} — ${escapeHtml(t.status)}`;
    ul.appendChild(li);
  }
}

/**
 * @param {Shot} shot
 */
function renderNoteList(shot) {
  const ul = document.getElementById("note-list");
  if (!ul) return;
  ul.innerHTML = "";
  for (const n of [...shot.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const li = document.createElement("li");
    li.innerHTML = `<div class="timeline-meta">${escapeHtml(n.createdAt.slice(0, 16))} · ${escapeHtml(n.createdBy)}</div><div>${escapeHtml(n.body)}</div>`;
    ul.appendChild(li);
  }
}

/**
 * @param {Shot} shot
 */
function renderAuditList(shot) {
  const ul = document.getElementById("audit-list");
  if (!ul) return;
  ul.innerHTML = "";
  for (const a of [...shot.audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50)) {
    const li = document.createElement("li");
    li.textContent = `${a.at.slice(0, 19)} · ${a.message}${a.actor ? ` (${a.actor})` : ""}`;
    ul.appendChild(li);
  }
}

/**
 * @param {Shot} shot
 * @param {string} message
 */
function pushAudit(shot, message) {
  shot.audit.unshift({
    id: newId(),
    at: nowIso(),
    message,
    actor: "you",
  });
}

/**
 * @param {string} name
 */
function activateTab(name) {
  const tabs = document.querySelectorAll(".tab");
  const panels = {
    versions: document.getElementById("panel-versions"),
    tasks: document.getElementById("panel-tasks"),
    notes: document.getElementById("panel-notes"),
    activity: document.getElementById("panel-activity"),
  };

  for (const t of tabs) {
    const is = t.dataset.tab === name;
    t.classList.toggle("is-active", is);
    t.setAttribute("aria-selected", is ? "true" : "false");
  }

  for (const [k, el] of Object.entries(panels)) {
    if (!el) continue;
    const hidden = k !== name;
    el.classList.toggle("is-hidden", hidden);
    el.hidden = hidden;
  }
}

function addVersionToOpenShot() {
  const shot = state.shots.find((s) => s.id === drawerShotId);
  if (!shot) return;
  const maxN = shot.versions.reduce((m, v) => Math.max(m, v.versionNumber), 0);
  const next = maxN + 1;
  const wasEmpty = shot.versions.length === 0;
  shot.versions.push({
    id: newId(),
    versionNumber: next,
    status: "delivered",
    deliveredAt: nowIso(),
    note: "",
    createdBy: shot.owner,
  });
  if (wasEmpty) onFirstVersionCreated(shot);
  applyVersionAutomation(shot);
  pushAudit(shot, `Created delivery v${next}`);
  save();
  renderTable();
  renderVersionList(shot);
  const ds = document.getElementById("drawer-status");
  if (ds) ds.value = shot.status;
  toast(`Added v${next}`);
}

function addTaskToOpenShot() {
  const shot = state.shots.find((s) => s.id === drawerShotId);
  if (!shot) return;
  const name = window.prompt("Task name (e.g. Comp, Roto):", "FX");
  if (!name) return;
  shot.tasks.push({
    id: newId(),
    name: name.trim(),
    status: "not_started",
    assignee: shot.owner,
  });
  pushAudit(shot, `Added task ${name.trim()}`);
  save();
  renderTable();
  renderTaskList(shot);
  toast("Task added");
}

function addNoteToOpenShot() {
  const shot = state.shots.find((s) => s.id === drawerShotId);
  if (!shot) return;
  const input = document.getElementById("note-input");
  const body = (input && "value" in input ? input.value : "").trim();
  if (!body) {
    toast("Note is empty", true);
    return;
  }
  shot.notes.push({
    id: newId(),
    body,
    createdAt: nowIso(),
    createdBy: "you",
  });
  if (input) input.value = "";
  pushAudit(shot, "Added note");
  save();
  renderTable();
  renderNoteList(shot);
  toast("Note saved");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `shottrack-${state.project.name || "project"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("JSON exported");
}

function exportCsv() {
  const rows = sortShots(filteredShots());
  const header = [
    "sequence",
    "code",
    "description",
    "status",
    "priority",
    "due_on",
    "owner",
    "latest_version",
    "latest_version_status",
  ];
  const lines = [header.join(",")];
  for (const s of rows) {
    const latest = sortVersionsDesc(s)[0];
    const vals = [
      s.sequence,
      s.code,
      `"${(s.description || "").replace(/"/g, '""')}"`,
      s.status,
      s.priority,
      s.dueOn || "",
      s.owner,
      latest ? `v${latest.versionNumber}` : "",
      latest ? latest.status : "",
    ];
    lines.push(vals.join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `shottrack-${state.project.name || "project"}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("CSV exported");
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.shots)) {
        toast("Invalid JSON", true);
        return;
      }
      state = {
        export_format_version: parsed.export_format_version ?? 1,
        project: parsed.project ?? { name: "Imported" },
        shots: parsed.shots,
        ui: parsed.ui ?? { collapsed: {} },
      };
      save();
      populateFilterSelects();
      renderTable();
      toast("Import complete");
    } catch {
      toast("Could not parse JSON", true);
    }
  };
  reader.readAsText(file);
}

function addShot() {
  const code = window.prompt("Shot code (e.g. BES_050):", "");
  if (!code || !code.trim()) return;
  const seq = window.prompt("Sequence code:", "BES") || "BES";
  /** @type {Shot} */
  const shot = {
    id: newId(),
    sequence: seq.trim(),
    code: code.trim(),
    description: "",
    status: "not_started",
    priority: "medium",
    dueOn: "",
    owner: "Unassigned",
    tasks: [],
    versions: [],
    notes: [],
    audit: [{ id: newId(), at: nowIso(), message: "Shot created", actor: "you" }],
  };
  state.shots.push(shot);
  save();
  populateFilterSelects();
  renderTable();
  openDrawer(shot.id);
  toast("Shot created");
}

function bindEvents() {
  const els = getFilterEls();
  const debounce = (fn, ms) => {
    let t = 0;
    return () => {
      window.clearTimeout(t);
      t = window.setTimeout(fn, ms);
    };
  };

  els.search?.addEventListener("input", debounce(() => renderTable(), 200));
  els.sequence?.addEventListener("change", () => renderTable());
  els.status?.addEventListener("change", () => renderTable());
  els.owner?.addEventListener("change", () => renderTable());
  els.group?.addEventListener("change", () => renderTable());
  els.sort?.addEventListener("change", () => renderTable());

  els.project?.addEventListener("change", () => {
    state.project.name = els.project?.value?.trim() || "Project";
    save();
  });

  document.getElementById("shot-tbody")?.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    const btn = t.closest(".group-toggle");
    if (!btn || !btn.dataset.sequence) return;
    const seq = btn.dataset.sequence;
    state.ui = state.ui ?? { collapsed: {} };
    state.ui.collapsed = state.ui.collapsed ?? {};
    state.ui.collapsed[seq] = !state.ui.collapsed[seq];
    save();
    renderTable();
  });

  document.getElementById("drawer-close")?.addEventListener("click", closeDrawer);
  document.getElementById("drawer-backdrop")?.addEventListener("click", closeDrawer);

  document.getElementById("btn-add-version")?.addEventListener("click", addVersionToOpenShot);
  document.getElementById("btn-add-task")?.addEventListener("click", addTaskToOpenShot);
  document.getElementById("btn-add-note")?.addEventListener("click", addNoteToOpenShot);

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = /** @type {HTMLElement} */ (tab).dataset.tab;
      if (name) activateTab(name);
    });
  });

  document.getElementById("btn-export-json")?.addEventListener("click", exportJson);
  document.getElementById("btn-export-csv")?.addEventListener("click", exportCsv);
  document.getElementById("btn-add-shot")?.addEventListener("click", addShot);

  const fileInput = document.getElementById("file-import-json");
  document.getElementById("btn-import-json")?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (f) importJsonFile(f);
    fileInput.value = "";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

function init() {
  load();
  bindEvents();
  populateFilterSelects();
  renderTable();
}

init();
