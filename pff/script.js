/* Pokemon Fantasy Football - UI layer. */

const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white";

let L = null;
let GD = null;
let activeTab = "team";
let selectedBench = null;
let draftFilter = "ALL";
let draftSearch = "";
let boardVisible = true;

const $ = (id) => document.getElementById(id);
const setupView = $("setup-view");
const draftView = $("draft-view");
const seasonView = $("season-view");
const gamedayView = $("gameday-view");
const offseasonView = $("offseason-view");
const keepersView = $("keepers-view");
const modalRoot = $("modal-root");

/* --------------------------------------------------------- helpers */

function spriteUrl(dexId) {
  return `${SPRITE_BASE}/${dexId}.png`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* Deterministic 8-bit emblem so each pro team's defense has its own arcade logo. */
function teamEmblem(teamIdx, cls = "sprite") {
  const t = NFL_TEAMS[teamIdx];
  let h = 2166136261;
  for (const ch of `${t.abbr}${t.nick}${t.city}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let cells = "";
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (!((h >>> ((y * 3 + x) % 30)) & 1)) continue;
      cells += `<rect x="${2 + x}" y="${2 + y}" width="1" height="1"/>`;
      if (x < 2) cells += `<rect x="${6 - x}" y="${2 + y}" width="1" height="1"/>`;
    }
  }
  cells += `<rect x="4" y="1" width="1" height="1"/><rect x="4" y="7" width="1" height="1"/>`;
  return `<svg class="${cls} emblem" viewBox="0 0 9 9" shape-rendering="crispEdges" role="img" aria-label="${esc(
    t.city
  )} ${esc(t.nick)}">
    <rect x="0" y="0" width="9" height="9" fill="${t.c2}"/>
    <rect x="1" y="1" width="7" height="7" fill="${t.c1}"/>
    <g fill="#ffffff" opacity="0.92">${cells}</g>
  </svg>`;
}

function avatarHtml(p, cls = "sprite") {
  if (!p) return "";
  if (p.pos === "DEF") return teamEmblem(p.team, cls);
  return `<img class="${cls}" src="${spriteUrl(p.dexId)}" alt="${esc(p.species)}" loading="lazy" />`;
}

function teamOf(p) {
  return NFL_TEAMS[p.team];
}

/* Custom names stick to the player object itself, so they survive trades, drops and re-signs. */
function displayName(p) {
  if (!p) return "";
  return p.customName || p.name;
}

function managerById(id) {
  if (id === -1 || id == null) return { id: -1, name: "The Ditto (phantom)", human: false, roster: [], lineups: {} };
  return L.managers.find((m) => m.id === id);
}

function humanManagers() {
  return L.managers.filter((m) => m.human);
}

function activeManager() {
  return managerById(L.activeManagerId != null ? L.activeManagerId : 0);
}

function shortName(p) {
  if (p.customName) return p.customName;
  if (p.pos === "DEF") return `${teamOf(p).abbr} D`;
  return p.last.replace(/ (Jr\.|Sr\.|II|III)$/, "");
}

function statusTag(p, week) {
  if (p.status.type === "retired") return `<span class="tag tag-out">RET</span>`;
  if (p.status.type === "questionable") return `<span class="tag tag-out" title="${esc(p.status.note)}">QST</span>`;
  if (p.status.weeks > 0) {
    const label = p.status.type === "injured" ? `OUT ${p.status.weeks}` : `SUS ${p.status.weeks}`;
    return `<span class="tag tag-out" title="${esc(p.status.note)}">${label}</span>`;
  }
  if (week && L.byeWeeks[p.team] === week) return `<span class="tag tag-bye">BYE</span>`;
  if (p.form && p.form.mult > 1) return `<span class="tag tag-hot" title="${esc(p.form.note)}">HOT</span>`;
  if (p.form && p.form.mult < 1) return `<span class="tag tag-cold" title="${esc(p.form.note)}">COLD</span>`;
  if (p.rookie) return `<span class="tag tag-rk">RK</span>`;
  return "";
}

function playerRow(p, opts = {}) {
  const t = teamOf(p);
  const week = opts.week;
  const ppg = p.gamesPlayed ? round1(p.seasonPts / p.gamesPlayed) : null;
  const rightMain = opts.rightMain != null ? opts.rightMain : ppg != null ? ppg.toFixed(1) : projectPPG(p).toFixed(1);
  const rightSub = opts.rightSub != null ? opts.rightSub : ppg != null ? "PPG" : "PROJ";
  const badge = opts.slot || p.pos;
  const bye = L.byeWeeks[p.team];
  const flavorBits = [p.customName ? `born ${esc(p.name)}` : null, p.nickname ? `<span class="nick">"${esc(p.nickname)}"</span>` : null]
    .filter(Boolean)
    .map((bit) => ` &middot; ${bit}`)
    .join("");
  const sub =
    p.pos === "DEF"
      ? `D/ST &middot; ${t.abbr} &middot; BYE ${bye}${flavorBits}`
      : `${p.pos} &middot; ${t.abbr} ${esc(t.nick)} &middot; BYE ${bye}${flavorBits}`;
  return `
    <div class="prow pos-tint-${p.pos} ${opts.rowClass || ""}" ${opts.dataAttr || ""}>
      <span class="pos-badge pos-${badge}">${badge}</span>
      <span class="clickable-card" data-card="${p.id}">${avatarHtml(p)}</span>
      <span class="pname clickable-card" data-card="${p.id}">
        <span class="nm">${esc(displayName(p))} ${statusTag(p, week)}</span>
        <span class="sub">${sub}</span>
      </span>
      <button class="btn-rename" data-rename="${p.id}" type="button" title="Rename">&#9998;</button>
      ${opts.adp || ""}
      <span class="stat">${rightMain}<span class="sub">${rightSub}</span></span>
      ${opts.action || ""}
    </div>`;
}

/* Custom names live on the player object, so they follow the player through trades, drops and re-signs. */
function openRenameModal(pid) {
  const p = L.players[pid];
  if (!p) return;
  modalRoot.innerHTML = `
    <div class="modal-back">
      <div class="modal" style="max-width:420px">
        <div class="modal-head">
          <p class="panel-title" style="margin:0;flex:1">RENAME PLAYER</p>
          <button class="btn btn-red btn-sm" id="rn-close" type="button">Close</button>
        </div>
        <p class="note">Give ${esc(p.name)} a custom name for the whole league to see. It sticks with them through trades and drops.</p>
        <input id="rn-input" type="text" maxlength="40" value="${esc(p.customName || "")}" placeholder="${esc(
    p.name
  )}" class="rn-input" />
        <div class="rowbar">
          <button class="btn btn-green btn-sm" id="rn-save" type="button">Save</button>
          ${p.customName ? `<button class="btn btn-blue btn-sm" id="rn-clear" type="button">Reset to Default</button>` : ""}
          <span class="spacer"></span>
          <button class="btn btn-red btn-sm" id="rn-cancel" type="button">Cancel</button>
        </div>
      </div>
    </div>`;

  const close = () => {
    modalRoot.innerHTML = "";
  };
  $("rn-close").addEventListener("click", close);
  $("rn-cancel").addEventListener("click", close);
  $("rn-save").addEventListener("click", () => {
    const val = $("rn-input").value.trim();
    p.customName = val ? val.slice(0, 40) : null;
    save();
    close();
    render();
  });
  const clearBtn = $("rn-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      p.customName = null;
      save();
      close();
      render();
    });
  }
}

/* Player card: season total, last season's total, and a week-by-week fantasy points log. */
function openPlayerCard(pid) {
  const p = L.players[pid];
  if (!p) return;
  const t = teamOf(p);
  const owner = ownerOfPlayer(p.id);
  const ppg = p.gamesPlayed ? round1(p.seasonPts / p.gamesPlayed) : 0;

  const weekRows = [];
  for (let wk = 1; wk <= L.week; wk++) {
    const w = p.weeks[wk];
    weekRows.push(
      `<tr><td>WK ${wk}</td><td class="num">${
        w && w.pts != null ? w.pts.toFixed(1) : `<span class="note">${wk === L.week ? "-" : "DNP"}</span>`
      }</td></tr>`
    );
  }

  modalRoot.innerHTML = `
    <div class="modal-back">
      <div class="modal" style="max-width:480px">
        <div class="modal-head">
          ${avatarHtml(p, "sprite sprite-lg")}
          <div style="flex:1">
            <p class="panel-title" style="margin:0">${esc(displayName(p))}</p>
            <p class="note" style="margin:0.15rem 0 0">
              ${p.customName ? `born ${esc(p.name)} &middot; ` : ""}${p.pos} &middot; ${esc(t.city)} ${esc(t.nick)} &middot; BYE ${
    L.byeWeeks[p.team]
  }${owner ? ` &middot; ${esc(owner.name)}` : ` &middot; <span class="note">Free Agent</span>`}
            </p>
          </div>
          <button class="btn btn-red btn-sm" id="pc-close" type="button">Close</button>
        </div>
        <div class="grid-2">
          <div class="panel">
            <p class="panel-title">THIS SEASON</p>
            <div class="matchup-board" style="grid-template-columns:1fr 1fr">
              <div class="mb-side"><div class="mb-name">TOTAL</div><div class="mb-score">${p.seasonPts.toFixed(1)}</div></div>
              <div class="mb-side"><div class="mb-name">PPG</div><div class="mb-score">${ppg.toFixed(1)}</div></div>
            </div>
            <p class="note">${p.gamesPlayed} game${p.gamesPlayed === 1 ? "" : "s"} played this season.</p>
          </div>
          <div class="panel">
            <p class="panel-title">PAST SEASONS</p>
            ${
              p.lastSeasonPts != null
                ? `<p class="note">Last season: <b style="color:var(--gold)">${p.lastSeasonPts.toFixed(1)} pts</b></p>`
                : `<p class="note">No prior season on record yet.</p>`
            }
            <p class="note">${p.careerSeasons || 0} season${p.careerSeasons === 1 ? "" : "s"} in the league.</p>
          </div>
        </div>
        <p class="panel-title" style="margin-top:0.6rem">WEEK BY WEEK</p>
        <div class="scroll" style="max-height:280px">
          <table class="tbl"><tr><th>Week</th><th class="num">FPTS</th></tr>${weekRows.join("")}</table>
        </div>
      </div>
    </div>`;

  $("pc-close").addEventListener("click", () => {
    modalRoot.innerHTML = "";
  });
}

function statSummary(line) {
  if (!line) return "did not play";
  const bits = [];
  if (line.pass && line.pass.att)
    bits.push(`${line.pass.cmp}/${line.pass.att}, ${line.pass.yds} pass yds, ${line.pass.td} TD, ${line.pass.int} INT`);
  if (line.rush && line.rush.att) bits.push(`${line.rush.att} car, ${line.rush.yds} rush yds, ${line.rush.td} TD`);
  if (line.rec && line.rec.rec) bits.push(`${line.rec.rec}/${line.rec.tgt}, ${line.rec.yds} rec yds, ${line.rec.td} TD`);
  if (line.fumLost) bits.push(`${line.fumLost} fum lost`);
  if (line.kick && (line.kick.fga || line.kick.xpa))
    bits.push(`${line.kick.fgm}/${line.kick.fga} FG, ${line.kick.xpm}/${line.kick.xpa} XP`);
  if (line.def)
    bits.push(
      `${line.def.sack} sk, ${line.def.int} int, ${line.def.fumRec} fr, ${line.def.td} TD, ${line.def.pa} pts allowed`
    );
  return bits.length ? bits.join(" &middot; ") : "no stats recorded";
}

function lineOf(p, wk) {
  const r = L.results[wk];
  if (!r) return null;
  const w = p.weeks[wk];
  if (!w || w.gameIndex == null) return null;
  const g = r.games[w.gameIndex];
  return g && g.box ? g.box[p.id] : null;
}

/* ------------------------------------------------------ persistence */

const SAVE_INDEX_KEY = "pff.saves.index";
const SAVE_PREFIX = "pff.save.";
const LEGACY_SAVE_KEY = "pff.save.v1";

function pruneOldHighlights() {
  Object.values(L.results).forEach((r) => {
    if (r.week !== L.lastPlayedWeek) {
      r.games.forEach((g) => {
        g.plays = [];
        g.box = null;
      });
    }
  });
}

function loadSaveIndex() {
  try {
    const raw = localStorage.getItem(SAVE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeSaveIndex(idx) {
  try {
    localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(idx));
  } catch (e) {
    console.warn("Save index failed", e);
  }
}

function slotMetaFor(league) {
  return {
    id: league.saveId,
    name: league.saveName || (league.settings && league.settings.leagueName) || "Untitled League",
    updatedAt: Date.now(),
    season: league.season,
    week: league.week,
    phase: league.phase,
  };
}

/* Named, multi-slot local saves: index lives at SAVE_INDEX_KEY, each league body at SAVE_PREFIX+id. */
function save() {
  if (!L) return;
  if (!L.saveId) L.saveId = `s${Date.now()}${Math.floor(Math.random() * 1000)}`;
  try {
    localStorage.setItem(SAVE_PREFIX + L.saveId, JSON.stringify(L));
    const idx = loadSaveIndex().filter((s) => s.id !== L.saveId);
    idx.push(slotMetaFor(L));
    writeSaveIndex(idx);
  } catch (e) {
    console.warn("Save failed", e);
  }
}

function loadSlot(id) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function deleteSlot(id) {
  localStorage.removeItem(SAVE_PREFIX + id);
  writeSaveIndex(loadSaveIndex().filter((s) => s.id !== id));
}

function renameSlot(id, name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const idx = loadSaveIndex();
  const entry = idx.find((s) => s.id === id);
  if (entry) {
    entry.name = trimmed;
    writeSaveIndex(idx);
  }
  if (L && L.saveId === id) {
    L.saveName = trimmed;
    save();
  }
}

/* One-time upgrade from the old single-slot save into the named multi-slot system. */
function migrateLegacySave() {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw);
    legacy.saveId = legacy.saveId || `legacy${Date.now()}`;
    legacy.saveName = legacy.saveName || (legacy.settings && legacy.settings.leagueName) || "My League";
    localStorage.setItem(SAVE_PREFIX + legacy.saveId, JSON.stringify(legacy));
    const idx = loadSaveIndex();
    idx.push(slotMetaFor(legacy));
    writeSaveIndex(idx);
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch (e) {
    console.warn("Legacy save migration failed", e);
  }
}

/* ------------------------------------------------------------ setup */

function initSetup() {
  const sel = $("input-managers");
  for (let i = 2; i <= 12; i++) {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = `${i} managers`;
    if (i === 8) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => {
    rebuildHumanOptions();
    rebuildDraftPositionOptions();
    updateSetupSummary();
  });
  $("input-humans").addEventListener("change", () => {
    renderHumanNames();
    updateSetupSummary();
  });
  $("input-mode").addEventListener("change", () => {
    updateModeFieldVisibility();
    updateSetupSummary();
  });
  $("input-draftpos").addEventListener("change", updateModeFieldVisibility);
  rebuildHumanOptions();
  rebuildDraftPositionOptions();
  updateModeFieldVisibility();

  migrateLegacySave();
  renderSaveSlots();

  $("btn-create").addEventListener("click", () => {
    const humanCount = Number($("input-humans").value);
    const humanNames = [];
    for (let i = 0; i < humanCount; i++) {
      const el = $(`human-name-${i}`);
      humanNames.push((el && el.value.trim()) || `Team ${i + 1}`);
    }
    const leagueName = $("input-league").value.trim() || "The Poke Bowl";
    const mode = $("input-mode").value;
    const settings = {
      leagueName,
      teamName: humanNames[0],
      humanNames,
      managerCount: Number($("input-managers").value),
      ppr: Number($("input-ppr").value),
      mode,
      irSpots: Number($("input-ir").value),
      keeperCount: mode === "franchise" ? Number($("input-keepers").value) : 0,
      draftPositionMode: $("input-draftpos").value,
      draftPositionSlot: Number($("input-draftpos-slot").value) || 1,
    };
    L = createLeague(settings);
    L.lastPlayedWeek = 0;
    L.saveId = `s${Date.now()}${Math.floor(Math.random() * 1000)}`;
    L.saveName = leagueName;
    save();
    render();
  });

  $("save-slots").addEventListener("click", (e) => {
    const loadBtn = e.target.closest("[data-slot-load]");
    if (loadBtn) {
      L = loadSlot(loadBtn.dataset.slotLoad);
      if (L) {
        applyRosterSizeForMode(L.mode);
        if (L.activeManagerId == null) L.activeManagerId = 0;
        L.managers.forEach((m) => {
          if (m.human == null) m.human = !!m.isUser;
        });
        render();
      }
      return;
    }
    const renameBtn = e.target.closest("[data-slot-rename]");
    if (renameBtn) {
      openRenameSaveModal(renameBtn.dataset.slotRename);
      return;
    }
    const delBtn = e.target.closest("[data-slot-del]");
    if (delBtn) {
      deleteSlot(delBtn.dataset.slotDel);
      renderSaveSlots();
    }
  });
}

function renderSaveSlots() {
  const wrap = $("save-slots");
  const idx = loadSaveIndex().sort((a, b) => b.updatedAt - a.updatedAt);
  if (!idx.length) {
    wrap.innerHTML = `<p class="note">No saved leagues yet &mdash; start one above.</p>`;
    return;
  }
  wrap.innerHTML =
    `<p class="panel-title" style="margin:0.6rem 0 0.4rem">SAVED LEAGUES</p>` +
    idx
      .map(
        (s) => `
    <div class="save-slot">
      <div class="save-slot-info">
        <b>${esc(s.name)}</b>
        <span class="note">Season ${s.season || 1} &middot; Week ${s.week || 1} &middot; ${esc((s.phase || "").toUpperCase())}</span>
      </div>
      <div class="save-slot-actions">
        <button class="btn btn-blue btn-sm" data-slot-load="${s.id}" type="button">Load</button>
        <button class="btn-rename" data-slot-rename="${s.id}" type="button" title="Rename">&#9998;</button>
        <button class="btn btn-red btn-sm" data-slot-del="${s.id}" type="button">Delete</button>
      </div>
    </div>`
      )
      .join("");
}

function openRenameSaveModal(id) {
  const idx = loadSaveIndex();
  const entry = idx.find((s) => s.id === id);
  if (!entry) return;
  modalRoot.innerHTML = `
    <div class="modal-back">
      <div class="modal" style="max-width:420px">
        <div class="modal-head">
          <p class="panel-title" style="margin:0;flex:1">RENAME SAVE</p>
          <button class="btn btn-red btn-sm" id="rn-close" type="button">Close</button>
        </div>
        <input id="rn-input" type="text" maxlength="40" value="${esc(entry.name)}" class="rn-input" />
        <div class="rowbar">
          <button class="btn btn-green btn-sm" id="rn-save" type="button">Save</button>
          <span class="spacer"></span>
          <button class="btn btn-red btn-sm" id="rn-cancel" type="button">Cancel</button>
        </div>
      </div>
    </div>`;
  const close = () => {
    modalRoot.innerHTML = "";
  };
  $("rn-close").addEventListener("click", close);
  $("rn-cancel").addEventListener("click", close);
  $("rn-save").addEventListener("click", () => {
    renameSlot(id, $("rn-input").value);
    close();
    renderSaveSlots();
  });
}

function rebuildHumanOptions() {
  const total = Number($("input-managers").value);
  const sel = $("input-humans");
  const prev = Number(sel.value) || 1;
  sel.innerHTML = "";
  for (let i = 1; i <= total; i++) {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = i === 1 ? "1 (just me)" : `${i} teams`;
    sel.appendChild(o);
  }
  sel.value = String(Math.min(prev, total));
  renderHumanNames();
}

function renderHumanNames() {
  const n = Number($("input-humans").value);
  const host = $("human-names");
  const existing = {};
  host.querySelectorAll("input").forEach((el) => (existing[el.id] = el.value));
  host.innerHTML = Array.from({ length: n }, (_, i) => {
    const id = `human-name-${i}`;
    const val = existing[id] != null ? existing[id] : i === 0 ? "Team Zane" : `Manager ${i + 1}`;
    return `<div class="field">
      <label for="${id}">Human Team ${i + 1}</label>
      <input id="${id}" type="text" maxlength="26" value="${esc(val)}" />
    </div>`;
  }).join("");
}

function updateSetupSummary() {
  const n = Number($("input-managers").value);
  const h = Number($("input-humans").value);
  const mode = $("input-mode").value;
  const bench = mode === "dynasty" ? DYNASTY_BENCH_SIZE : NORMAL_BENCH_SIZE;
  const rosterSize = ROSTER_SLOTS.length + bench;
  $("setup-summary").innerHTML = `${n} managers (${h} human, ${n - h} CPU) &middot; ${playoffCount(
    n
  )} playoff teams &middot; ${rosterSize}-player rosters &middot; ${REG_SEASON_WEEKS}-week regular season`;
}

function rebuildDraftPositionOptions() {
  const n = Number($("input-managers").value);
  const sel = $("input-draftpos-slot");
  const prev = Number(sel.value) || 1;
  sel.innerHTML = "";
  for (let i = 1; i <= n; i++) {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = `Slot ${i}`;
    sel.appendChild(o);
  }
  sel.value = String(Math.min(prev, n));
}

function updateModeFieldVisibility() {
  const mode = $("input-mode").value;
  $("field-keepers").style.display = mode === "franchise" ? "" : "none";
  $("field-draftpos-slot").style.display = $("input-draftpos").value === "manual" ? "" : "none";
}

/* ------------------------------------------------------------ router */

function render() {
  renderLeagueTicker();
  [setupView, draftView, seasonView, gamedayView, offseasonView, keepersView].forEach((v) => v.classList.add("hidden"));
  if (!L) {
    setupView.classList.remove("hidden");
    return;
  }
  if (GD) {
    gamedayView.classList.remove("hidden");
    renderGameday();
    return;
  }
  if (L.phase === "draft") {
    draftView.classList.remove("hidden");
    renderDraft();
    return;
  }
  if (L.phase === "keepers") {
    keepersView.classList.remove("hidden");
    renderKeepers();
    return;
  }
  if (L.phase === "offseason") {
    offseasonView.classList.remove("hidden");
    renderOffseason();
    return;
  }
  seasonView.classList.remove("hidden");
  renderSeason();
}

/* ------------------------------------------------------------ draft */

function draftSlotFor(overall) {
  const n = L.managers.length;
  const round = Math.floor(overall / n);
  const slot = overall % n;
  return { round, slot, managerId: L.draft.order[overall] };
}

function renderDraftBoard() {
  const d = L.draft;
  const n = L.managers.length;
  const current = d.picksMade.length;
  const header = d.order.slice(0, n)
    .map((mid) => {
      const m = managerById(mid);
      return `<div class="bcell bhead ${m.human ? "bhuman" : ""}">${esc(m.name)}</div>`;
    })
    .join("");

  let rows = "";
  for (let r = 0; r < ROSTER_SIZE; r++) {
    let cells = "";
    for (let col = 0; col < n; col++) {
      // column = manager slot in draft order, so find which overall pick lands here
      const slot = r % 2 === 0 ? col : n - 1 - col;
      const overall = r * n + slot;
      const pk = d.picksMade[overall];
      if (pk) {
        const p = L.players[pk.playerId];
        cells += `<div class="bcell cell-${p.pos}" title="${esc(displayName(p))} (${p.pos}, ${teamOf(p).abbr})">
          <span class="bpos">${p.pos}</span>
          <span class="bname">${esc(shortName(p))}</span>
        </div>`;
      } else if (overall === current) {
        cells += `<div class="bcell bnow"><span class="bpos">NOW</span><span class="bname blink">PICK</span></div>`;
      } else {
        cells += `<div class="bcell bempty">${overall + 1}</div>`;
      }
    }
    rows += `<div class="brow"><div class="bcell bround">R${r + 1}</div>${cells}</div>`;
  }

  $("draft-board").innerHTML = `<div class="board" style="--cols:${n}">
    <div class="brow"><div class="bcell bhead bround">RD</div>${header}</div>
    ${rows}
  </div>`;
}

function needsFor(m) {
  const counts = {};
  m.roster.forEach((pid) => {
    const p = L.players[pid];
    counts[p.pos] = (counts[p.pos] || 0) + 1;
  });
  const need = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };
  return POSITIONS.map((pos) => {
    const have = counts[pos] || 0;
    const ok = have >= need[pos];
    return `<span class="need-chip pos-${pos} ${ok ? "" : "need-open"}">${pos} ${have}/${need[pos]}</span>`;
  }).join("");
}

function renderDraft() {
  const d = L.draft;
  const n = L.managers.length;
  const overall = d.picksMade.length;
  $("draft-round").textContent = Math.floor(overall / n) + 1;
  $("draft-pick").textContent = (overall % n) + 1;
  const onClock = draftOnTheClock(L);
  if (onClock == null) {
    save();
    render();
    return;
  }
  const m = managerById(onClock);
  $("draft-clock").textContent = m.human ? `${m.name} (YOU)` : m.name;
  $("draft-clock").style.color = m.human ? "var(--neon)" : "var(--gold)";

  $("draft-board").parentElement.classList.toggle("hidden", !boardVisible);
  if (boardVisible) renderDraftBoard();

  const pool = availablePlayers(L)
    .slice()
    .sort((a, b) => (a.adp || 9999) - (b.adp || 9999));
  const filtered = pool.filter((p) => {
    if (draftFilter !== "ALL" && p.pos !== draftFilter) return false;
    if (draftSearch && !p.name.toLowerCase().includes(draftSearch)) return false;
    return true;
  });

  const yourTurn = m.human;
  $("draft-pool").innerHTML = filtered
    .slice(0, 120)
    .map((p) => {
      const diff = (p.adp || 9999) - (overall + 1);
      const tag =
        diff >= n ? `<span class="adp-val">VALUE</span>` : diff <= -n ? `<span class="adp-reach">REACH</span>` : "";
      return playerRow(p, {
        adp: `<span class="adp">ADP<span class="adpn">${p.adp || "-"}</span>${tag}</span>`,
        action: yourTurn
          ? `<button class="btn btn-green btn-sm" data-draft="${p.id}" type="button">Draft</button>`
          : "",
      });
    })
    .join("");

  const showFor = m.human ? m : activeManager();
  $("draft-roster-title").textContent = `${showFor.name.toUpperCase()} ROSTER (${showFor.roster.length}/${ROSTER_SIZE})`;
  $("draft-needs").innerHTML = needsFor(showFor);
  $("draft-roster").innerHTML = showFor.roster.length
    ? showFor.roster
        .slice()
        .sort((a, b) => POSITIONS.indexOf(L.players[a].pos) - POSITIONS.indexOf(L.players[b].pos))
        .map((pid) => playerRow(L.players[pid]))
        .join("")
    : `<p class="note">No picks yet. ${ROSTER_SIZE} rounds to fill out this squad.</p>`;

  $("draft-log").innerHTML = d.picksMade
    .slice(-25)
    .reverse()
    .map((pk) => {
      const p = L.players[pk.playerId];
      const mm = managerById(pk.managerId);
      return `<div class="wire-item">${avatarHtml(p, "sprite sprite-sm")}<span>#${pk.overall} <b>${esc(
        mm.name
      )}</b> select ${esc(displayName(p))} (${p.pos}, ${teamOf(p).abbr})</span></div>`;
    })
    .join("");

  if (!yourTurn && !d.complete) setTimeout(runAiPicks, 80);
}

function runAiPicks() {
  const d = L.draft;
  if (d.complete) return;
  const onClock = draftOnTheClock(L);
  if (onClock == null) {
    save();
    render();
    return;
  }
  const m = managerById(onClock);
  if (m.human) {
    renderDraft();
    return;
  }
  const choice = aiDraftPick(L, m, availablePlayers(L));
  makeDraftPick(L, m.id, choice.id);
  if (d.complete) {
    save();
    render();
  } else {
    renderDraft();
  }
}

function bindDraft() {
  $("draft-filter").addEventListener("change", (e) => {
    draftFilter = e.target.value;
    renderDraft();
  });
  $("draft-search").addEventListener("input", (e) => {
    draftSearch = e.target.value.trim().toLowerCase();
    renderDraft();
  });
  $("btn-board-toggle").addEventListener("click", () => {
    boardVisible = !boardVisible;
    $("btn-board-toggle").textContent = boardVisible ? "Hide Board" : "Show Board";
    renderDraft();
  });
  $("draft-pool").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-draft]");
    if (!btn) return;
    const onClock = draftOnTheClock(L);
    if (onClock == null || !managerById(onClock).human) return;
    makeDraftPick(L, onClock, Number(btn.dataset.draft));
    if (L.draft.complete) {
      save();
      render();
    } else {
      renderDraft();
    }
  });
  $("btn-autopick").addEventListener("click", () => {
    const onClock = draftOnTheClock(L);
    if (onClock == null) {
      save();
      render();
      return;
    }
    const m = managerById(onClock);
    if (!m.human) return;
    const choice = aiDraftPick(L, m, availablePlayers(L));
    makeDraftPick(L, m.id, choice.id);
    if (L.draft.complete) {
      save();
      render();
    } else {
      renderDraft();
    }
  });
  $("btn-autodraft").addEventListener("click", () => {
    let guard = 0;
    while (!L.draft.complete && guard < 500) {
      const onClock = draftOnTheClock(L);
      if (onClock == null) break;
      const m = managerById(onClock);
      makeDraftPick(L, m.id, aiDraftPick(L, m, availablePlayers(L)).id);
      guard++;
    }
    save();
    render();
  });
}

/* ----------------------------------------------------------- season */

function ensureLineup(m, week) {
  if (!m.lineups[week]) m.lineups[week] = autoLineup(L, m, week);
  return m.lineups[week];
}

function renderManagerBar() {
  const humans = humanManagers();
  const bar = $("manager-bar");
  if (humans.length < 2) {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");
  bar.innerHTML =
    `<span class="mb-label">MANAGING:</span>` +
    humans
      .map(
        (m) =>
          `<button class="mgr-btn ${m.id === L.activeManagerId ? "active" : ""}" data-mgr="${m.id}" type="button">${esc(
            m.name
          )}</button>`
      )
      .join("");
}

function renderSeason() {
  const you = activeManager();
  renderManagerBar();
  renderLeagueTicker();
  $("hud-season").textContent = L.season;
  $("hud-week").textContent = L.week;
  $("hud-record").textContent = `${you.wins}-${you.losses}${you.ties ? `-${you.ties}` : ""}`;
  $("hud-pf").textContent = you.pointsFor.toFixed(1);
  $("hud-phase").textContent = L.phase === "playoffs" ? roundName(L) : "REGULAR";

  const simBtn = $("btn-sim");
  const fastBtn = $("btn-sim-fast");
  if (L.phase === "done") {
    const continues = ["franchise", "dynasty"].includes(L.mode);
    simBtn.textContent = continues ? "Start Next Season" : "Season Complete";
    simBtn.disabled = !continues;
    fastBtn.classList.add("hidden");
  } else {
    simBtn.disabled = false;
    fastBtn.classList.remove("hidden");
    simBtn.textContent = L.phase === "playoffs" ? `Play ${roundName(L)} Live` : `Play Week ${L.week} Live`;
  }

  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === activeTab));
  document.querySelectorAll(".tabpane").forEach((p) => p.classList.add("hidden"));
  $(`tab-${activeTab}`).classList.remove("hidden");

  const renderers = {
    team: renderTeamTab,
    matchup: renderMatchupTab,
    scores: renderScoresTab,
    standings: renderStandingsTab,
    players: renderPlayersTab,
    stats: renderStatsTab,
    trade: renderTradeTab,
    wire: renderWireTab,
    league: renderLeagueTab,
  };
  renderers[activeTab]();
}

/* -------------------------------------------------------- team tab */

function renderTeamTab() {
  const you = activeManager();
  const week = L.week;
  const lineup = ensureLineup(you, week);
  const startingIds = new Set(Object.values(lineup).filter(Boolean));
  const bench = you.roster.filter((pid) => !startingIds.has(pid)).map((pid) => L.players[pid]);

  const starterRows = ROSTER_SLOTS.map((slot, i) => {
    const key = `${slot}${i}`;
    const pid = lineup[key];
    const p = pid ? L.players[pid] : null;
    const canPut =
      selectedBench && eligibleForSlot(slot, L.players[selectedBench].pos)
        ? `<button class="btn btn-green btn-sm" data-put="${key}" type="button">Put Here</button>`
        : "";
    if (!p) {
      return `<div class="prow"><span class="pos-badge pos-${slot}">${slot}</span><span class="pname"><span class="nm">-- empty --</span></span>${canPut}</div>`;
    }
    const proj = weeklyProjection(L, p, week);
    return playerRow(p, {
      slot,
      week,
      rightMain: proj < 0 ? "--" : proj.toFixed(1),
      rightSub: "PROJ",
      action: canPut,
    });
  }).join("");

  const benchRows = bench.length
    ? bench
        .map((p) => {
          const proj = weeklyProjection(L, p, week);
          return playerRow(p, {
            slot: "BN",
            week,
            rightMain: proj < 0 ? "--" : proj.toFixed(1),
            rightSub: "PROJ",
            rowClass: selectedBench === p.id ? "sel" : "",
            action: `<button class="btn ${
              selectedBench === p.id ? "btn-red" : "btn-blue"
            } btn-sm" data-bench="${p.id}" type="button">${selectedBench === p.id ? "Cancel" : "Start"}</button>
            <button class="btn btn-red btn-sm" data-drop="${p.id}" type="button">Cut</button>${
              L.irSpots && p.status.type === "injured" ? `<button class="btn btn-blue btn-sm" data-ir="${p.id}" type="button">IR</button>` : ""
            }`,
          });
        })
        .join("")
    : `<p class="note">Bench is empty.</p>`;
  const irRows = (you.ir || []).length
    ? you.ir.map((pid) => playerRow(L.players[pid], {
        week,
        rowClass: "ir-row",
        action: `<button class="btn btn-blue btn-sm" data-ir-return="${pid}" type="button" ${you.roster.length >= ROSTER_SIZE ? "disabled" : ""}>Return</button>`,
      })).join("")
    : `<p class="note">No players on IR.</p>`;

  const lastWeekBox = L.lastPlayedWeek
    ? you.roster
        .map((pid) => L.players[pid])
        .filter((p) => p && lineOf(p, L.lastPlayedWeek))
        .sort((a, b) => b.weeks[L.lastPlayedWeek].pts - a.weeks[L.lastPlayedWeek].pts)
        .map(
          (p) =>
            `<div class="wire-item">${avatarHtml(p, "sprite sprite-sm")}<span><b>${esc(displayName(p))}</b> (${
              p.pos
            }) &mdash; <span style="color:var(--gold)">${p.weeks[L.lastPlayedWeek].pts.toFixed(
              1
            )} pts</span><br /><span class="note">${statSummary(lineOf(p, L.lastPlayedWeek))}</span></span></div>`
        )
        .join("")
    : `<p class="note">Nothing played yet.</p>`;

  $("tab-team").innerHTML = `
    <div class="grid-2">
      <div>
        <div class="panel">
          <p class="panel-title">${esc(you.name.toUpperCase())} &middot; STARTING LINEUP &middot; WEEK ${week}</p>
          <p class="note">${
            selectedBench
              ? `Selected <b>${esc(L.players[selectedBench].name)}</b> &mdash; tap "Put Here" on a slot.`
              : `Tap "Start" on a bench player to move them into the lineup.`
          }</p>
          ${starterRows}
          <div class="rowbar" style="margin-top:0.6rem">
            <button id="btn-optimize" class="btn btn-blue btn-sm" type="button">Auto-Set Best Lineup</button>
          </div>
        </div>
        <div class="panel">
          <p class="panel-title">BENCH</p>
          ${benchRows}
        </div>
        <div class="panel">
          <p class="panel-title">INJURED RESERVE (${(you.ir || []).length}/${L.irSpots || 0})</p>
          <p class="note">IR players do not count against the active roster. Return requires an open roster spot.</p>
          ${irRows}
        </div>
      </div>
      <div class="panel">
        <p class="panel-title">LAST WEEK'S BOX SCORE${L.lastPlayedWeek ? ` (WK ${L.lastPlayedWeek})` : ""}</p>
        <div class="scroll">${lastWeekBox}</div>
      </div>
    </div>`;
}

function onTeamClick(e) {
  const you = activeManager();
  const week = L.week;
  const lineup = ensureLineup(you, week);

  const benchBtn = e.target.closest("[data-bench]");
  if (benchBtn) {
    const id = Number(benchBtn.dataset.bench);
    selectedBench = selectedBench === id ? null : id;
    renderTeamTab();
    return;
  }
  const putBtn = e.target.closest("[data-put]");
  if (putBtn && selectedBench) {
    const key = putBtn.dataset.put;
    const outgoing = lineup[key];
    Object.keys(lineup).forEach((k) => {
      if (lineup[k] === selectedBench) lineup[k] = outgoing;
    });
    lineup[key] = selectedBench;
    selectedBench = null;
    save();
    renderTeamTab();
    return;
  }
  const dropBtn = e.target.closest("[data-drop]");
  if (dropBtn) {
    const id = Number(dropBtn.dataset.drop);
    you.roster = you.roster.filter((pid) => pid !== id);
    Object.keys(lineup).forEach((k) => {
      if (lineup[k] === id) lineup[k] = null;
    });
    selectedBench = null;
    save();
    renderTeamTab();
    return;
  }
  const irBtn = e.target.closest("[data-ir]");
  if (irBtn) {
    const id = Number(irBtn.dataset.ir);
    you.ir = you.ir || [];
    if (you.ir.length < (L.irSpots || 0) && !you.ir.includes(id)) {
      you.roster = you.roster.filter((pid) => pid !== id);
      you.ir.push(id);
      Object.values(you.lineups).forEach((lu) => Object.keys(lu).forEach((key) => { if (lu[key] === id) lu[key] = null; }));
      save();
      renderTeamTab();
    }
    return;
  }
  const returnBtn = e.target.closest("[data-ir-return]");
  if (returnBtn && you.roster.length < ROSTER_SIZE) {
    const id = Number(returnBtn.dataset.irReturn);
    you.ir = (you.ir || []).filter((pid) => pid !== id);
    you.roster.push(id);
    save();
    renderTeamTab();
    return;
  }
  if (e.target.id === "btn-optimize") {
    you.lineups[week] = autoLineup(L, you, week);
    selectedBench = null;
    save();
    renderTeamTab();
  }
}

/* ----------------------------------------------------- matchup tab */

let matchupFocusId = null;

function currentMatchupFor(mid) {
  if (L.phase === "playoffs" && L.bracket) {
    const round = L.bracket.rounds[L.bracket.current];
    return round.find((mu) => mu.a === mid || mu.b === mid) || null;
  }
  const games = L.schedule[L.week] || [];
  return games.find((g) => g.a === mid || g.b === mid) || null;
}

/* Every real head-to-head this week, human or CPU, for the "scout the league" picker. */
function weekMatchups() {
  const games =
    L.phase === "playoffs" && L.bracket ? L.bracket.rounds[L.bracket.current] : L.schedule[L.week] || [];
  return games.filter((g) => g.a != null && g.b != null);
}

function lineupPreview(m, week) {
  const lineup = ensureLineup(m, week);
  let proj = 0;
  const rows = ROSTER_SLOTS.map((slot, i) => {
    const pid = lineup[`${slot}${i}`];
    const p = pid ? L.players[pid] : null;
    if (!p) return `<tr><td><span class="pos-badge pos-${slot}">${slot}</span></td><td>--</td><td class="num">0.0</td></tr>`;
    const played = p.weeks[week] && p.weeks[week].pts != null;
    const val = played ? p.weeks[week].pts : Math.max(0, weeklyProjection(L, p, week));
    proj += val;
    return `<tr><td><span class="pos-badge pos-${slot}">${slot}</span></td><td class="clickable-card" data-card="${p.id}">${esc(displayName(p))} <span class="note">${
      p.pos
    } ${teamOf(p).abbr}</span> ${statusTag(p, week)}</td><td class="num" style="color:var(--gold)">${val.toFixed(
      1
    )}</td></tr>`;
  }).join("");
  return { rows, proj: round1(proj) };
}

function renderMatchupTab() {
  const you = activeManager();
  const week = L.week;
  const games = weekMatchups();
  if (!games.length) {
    $("tab-matchup").innerHTML = `<div class="panel"><p class="big-note">${
      L.phase === "playoffs" ? "This team is not in the current playoff round." : "No matchup scheduled."
    }</p></div>`;
    return;
  }

  let mu = games.find((g) => g.a === matchupFocusId || g.b === matchupFocusId);
  if (!mu) {
    mu = games.find((g) => g.a === you.id || g.b === you.id) || games[0];
  }
  matchupFocusId = mu.a;

  const sideA = managerById(mu.a);
  const sideB = managerById(mu.b);
  const previewA = sideA.id === -1 ? { rows: "", proj: 0 } : lineupPreview(sideA, week);
  const previewB = sideB.id === -1 ? { rows: "", proj: 0 } : lineupPreview(sideB, week);

  const pickerRows = games
    .map((g) => {
      const a = managerById(g.a);
      const b = managerById(g.b);
      const active = g === mu;
      const involvesYou = g.a === you.id || g.b === you.id;
      const pa = a.id === -1 ? 0 : lineupPreview(a, week).proj;
      const pb = b.id === -1 ? 0 : lineupPreview(b, week).proj;
      return `<button class="matchup-pick ${active ? "active" : ""} ${involvesYou ? "mine" : ""}" data-mu-focus="${
        g.a
      }" type="button">
        <span class="mp-team">${esc(a.name)}${a.human ? " &#9733;" : ""}<span class="mp-score">${pa.toFixed(
        1
      )}</span></span>
        <span class="mp-at">@</span>
        <span class="mp-team">${esc(b.name)}${b.human ? " &#9733;" : ""}<span class="mp-score">${pb.toFixed(
        1
      )}</span></span>
      </button>`;
    })
    .join("");

  $("tab-matchup").innerHTML = `
    <div class="panel">
      <p class="panel-title">WEEK ${week} MATCHUPS &middot; TAP ANY GAME TO SCOUT IT</p>
      <div class="matchup-list">${pickerRows}</div>
    </div>
    <div class="matchup-board">
      <div class="mb-side"><div class="mb-name">${esc(sideA.name)}</div><div class="mb-score">${previewA.proj.toFixed(
    1
  )}</div></div>
      <div class="mb-vs">VS</div>
      <div class="mb-side"><div class="mb-name">${esc(sideB.name)}</div><div class="mb-score">${previewB.proj.toFixed(
    1
  )}</div></div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <p class="panel-title">${esc(sideA.name.toUpperCase())}</p>
        ${
          sideA.id !== -1
            ? `<table class="tbl"><tbody>${previewA.rows}</tbody></table>`
            : `<p class="note">The Ditto copies the league average score this week. Beat the average, get the win.</p>`
        }
      </div>
      <div class="panel">
        <p class="panel-title">${esc(sideB.name.toUpperCase())}</p>
        ${
          sideB.id !== -1
            ? `<table class="tbl"><tbody>${previewB.rows}</tbody></table>`
            : `<p class="note">The Ditto copies the league average score this week. Beat the average, get the win.</p>`
        }
      </div>
    </div>`;

  $("tab-matchup").onclick = (e) => {
    const btn = e.target.closest("[data-mu-focus]");
    if (!btn) return;
    matchupFocusId = Number(btn.dataset.muFocus);
    renderMatchupTab();
  };
}

/* ------------------------------------------------------ scores tab */

function renderScoresTab() {
  const wk = L.lastPlayedWeek;
  if (!wk || !L.results[wk]) {
    $("tab-scores").innerHTML = `<div class="panel"><p class="big-note blink">PLAY A WEEK TO SEE SCORES</p></div>`;
    return;
  }
  const r = L.results[wk];
  const fantasyRows = r.matchups
    .map((mu) => {
      const a = managerById(mu.a);
      const b = managerById(mu.b);
      const aWin = mu.aScore >= mu.bScore;
      return `<div class="matchup-board">
        <div class="mb-side ${aWin ? "win" : ""}"><div class="mb-name">${esc(a ? a.name : "BYE")}</div><div class="mb-score">${mu.aScore.toFixed(
        1
      )}</div></div>
        <div class="mb-vs">VS</div>
        <div class="mb-side ${!aWin ? "win" : ""}"><div class="mb-name">${esc(b ? b.name : "BYE")}</div><div class="mb-score">${mu.bScore.toFixed(
        1
      )}</div></div>
      </div>`;
    })
    .join("");

  const gameRows = r.games
    .map((g, i) => {
      const h = NFL_TEAMS[g.home];
      const a = NFL_TEAMS[g.away];
      return `<div class="game-row">
        <span class="team"><span class="chip" style="background:${a.c1}">${a.abbr}</span> ${esc(a.nick)} <b style="color:var(--gold)">${
        g.awayScore
      }</b></span>
        <span class="note">@</span>
        <span class="team"><b style="color:var(--gold)">${g.homeScore}</b> ${esc(h.nick)} <span class="chip" style="background:${
        h.c1
      }">${h.abbr}</span></span>
        <button class="btn btn-blue btn-sm" data-hl="${i}" type="button">Highlights</button>
      </div>`;
    })
    .join("");

  const top = Object.entries(r.managerScores)
    .map(([mid, s]) => ({ m: managerById(Number(mid)), s }))
    .sort((x, y) => y.s.total - x.s.total);

  const you = humanManagers().length ? activeManager() : null;

  $("tab-scores").innerHTML = `
    <div class="grid-2">
      <div>
        <div class="panel">
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <p class="panel-title" style="margin:0;flex:1">WEEK ${wk} FANTASY RESULTS</p>
            ${
              you
                ? `<button class="btn btn-pink btn-sm" id="my-hl-btn" type="button">${esc(you.name.toUpperCase())} HIGHLIGHTS</button>`
                : ""
            }
          </div>
          ${fantasyRows}
        </div>
        <div class="panel">
          <p class="panel-title">WEEK ${wk} POK&Eacute;-NFL SCOREBOARD</p>
          <div class="scroll">${gameRows}</div>
        </div>
      </div>
      <div class="panel">
        <p class="panel-title">WEEK SCORING LEADERS</p>
        <table class="tbl">
          <tr><th>#</th><th>Manager</th><th class="num">PTS</th></tr>
          ${top
            .map(
              (t, i) =>
                `<tr class="${t.m.human ? "me" : ""}"><td>${i + 1}</td><td>${esc(t.m.name)}</td><td class="num">${t.s.total.toFixed(
                  1
                )}</td></tr>`
            )
            .join("")}
        </table>
        <p class="panel-title" style="margin-top:0.8rem">TOP PERFORMERS</p>
        ${topPerformers(wk)}
      </div>
    </div>`;

  $("tab-scores").onclick = (e) => {
    const btn = e.target.closest("[data-hl]");
    if (btn) openHighlights(wk, Number(btn.dataset.hl));
    if (e.target.closest("#my-hl-btn")) openMyHighlights(wk);
  };
}

function topPerformers(wk) {
  return L.playerIds
    .map((pid) => L.players[pid])
    .filter((p) => p.weeks[wk] && p.weeks[wk].pts != null)
    .sort((a, b) => b.weeks[wk].pts - a.weeks[wk].pts)
    .slice(0, 8)
    .map(
      (p) =>
        `<div class="wire-item clickable-card" data-card="${p.id}">${avatarHtml(p, "sprite sprite-sm")}<span><b>${esc(displayName(p))}</b> (${p.pos}, ${
          teamOf(p).abbr
        }) <span style="color:var(--gold)">${p.weeks[wk].pts.toFixed(1)}</span><br /><span class="note">${statSummary(
          lineOf(p, wk)
        )}</span></span></div>`
    )
    .join("");
}

/* -------------------------------------------------------- highlights */

function openHighlights(wk, gameIndex) {
  const g = L.results[wk].games[gameIndex];
  const home = NFL_TEAMS[g.home];
  const away = NFL_TEAMS[g.away];
  const plays = (g.plays || []).filter((p) => p.big);
  const total = plays.length;

  modalRoot.innerHTML = `
    <div class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <p class="panel-title" style="margin:0;flex:1">HIGHLIGHTS &middot; ${esc(away.nick)} @ ${esc(home.nick)}</p>
          <button class="btn btn-blue btn-sm" id="hl-skip" type="button">Skip</button>
          <button class="btn btn-red btn-sm" id="hl-close" type="button">Close</button>
        </div>
        <div class="reel">
          <div class="reel-scoreline">
            <span><span class="chip" style="background:${away.c1}">${away.abbr}</span> <span id="hl-away">0</span></span>
            <span id="hl-q">KICKOFF</span>
            <span><span id="hl-home">0</span> <span class="chip" style="background:${home.c1}">${home.abbr}</span></span>
          </div>
          <div id="hl-plays"></div>
        </div>
        <p class="panel-title" style="margin-top:0.8rem">GAME LEADERS</p>
        <div id="hl-box"></div>
      </div>
    </div>`;

  const playsEl = $("hl-plays");
  let idx = 0;
  let timer = null;

  const showPlay = (i, instant) => {
    const p = plays[i];
    const cls =
      p.type === "td" ? "td" : p.type === "turnover" ? "turnover" : p.type.startsWith("fg") ? "fg" : p.type === "sack" ? "sack" : "";
    const quarter = Math.min(4, Math.floor((i / Math.max(1, total)) * 4) + 1);
    const player = p.playerId ? L.players[p.playerId] : null;
    const div = document.createElement("div");
    div.className = `play ${cls}`;
    div.innerHTML = `<span class="play-clock">Q${quarter}</span>${
      player ? avatarHtml(player, "sprite sprite-sm") : ""
    }<span class="play-text">${esc(p.desc)}</span>`;
    playsEl.appendChild(div);
    $("hl-away").textContent = p.score[g.away];
    $("hl-home").textContent = p.score[g.home];
    $("hl-q").textContent = `Q${quarter}`;
    div.scrollIntoView({ block: "nearest" });
  };

  const finish = () => {
    if (timer) clearInterval(timer);
    timer = null;
    while (idx < total) {
      showPlay(idx, true);
      idx++;
    }
    $("hl-away").textContent = g.awayScore;
    $("hl-home").textContent = g.homeScore;
    $("hl-q").textContent = "FINAL";
    $("hl-box").innerHTML = gameLeaders(g);
  };

  if (total === 0) {
    playsEl.innerHTML = `<p class="note">Highlights from earlier weeks aren't archived (saves gotta stay small). Final: ${away.abbr} ${g.awayScore} &ndash; ${home.abbr} ${g.homeScore}.</p>`;
    $("hl-box").innerHTML = gameLeaders(g);
  } else {
    timer = setInterval(() => {
      if (idx >= total) {
        finish();
        return;
      }
      showPlay(idx);
      idx++;
    }, 850);
  }

  $("hl-skip").addEventListener("click", finish);
  $("hl-close").addEventListener("click", () => {
    if (timer) clearInterval(timer);
    modalRoot.innerHTML = "";
  });
}

/* Every big play from every game this week that touched the human manager's roster, in one reel. */
function openMyHighlights(wk) {
  const you = activeManager();
  const mine = new Set(you.roster);
  const starting = new Set(startersForWeek(you, wk).map((s) => s.pid));
  const r = L.results[wk];
  const anyPlaysArchived = r.games.some((g) => (g.plays || []).length);

  const items = [];
  r.games.forEach((g) => {
    (g.plays || []).forEach((p) => {
      if (!p.big) return;
      const myPids = new Set(
        (p.playerId && mine.has(p.playerId) ? [p.playerId] : []).concat(
          Object.keys(p.fp || {})
            .map(Number)
            .filter((pid) => mine.has(pid))
        )
      );
      if (!myPids.size) return;
      const fpts = [...myPids].reduce((sum, pid) => sum + ((p.fp || {})[pid] || 0), 0);
      const starter = [...myPids].some((pid) => starting.has(pid));
      const mainPid = myPids.has(p.playerId) ? p.playerId : [...myPids][0];
      items.push({ p, g, starter, fpts, mainPid });
    });
  });

  modalRoot.innerHTML = `
    <div class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <p class="panel-title" style="margin:0;flex:1">${esc(you.name.toUpperCase())} HIGHLIGHTS &middot; WEEK ${wk}</p>
          <button class="btn btn-blue btn-sm" id="hl-skip" type="button">Skip</button>
          <button class="btn btn-red btn-sm" id="hl-close" type="button">Close</button>
        </div>
        <div class="reel">
          <div class="reel-scoreline">
            <span>MY BIG PLAYS</span>
            <span id="hl-q">KICKOFF</span>
            <span><span id="hl-fpts">0.0</span> FPTS</span>
          </div>
          <div id="hl-plays"></div>
        </div>
      </div>
    </div>`;

  const playsEl = $("hl-plays");
  const total = items.length;
  let idx = 0;
  let timer = null;
  let fpts = 0;

  const showItem = (i, instant) => {
    const { p, g, starter, fpts: gain, mainPid } = items[i];
    const home = NFL_TEAMS[g.home];
    const away = NFL_TEAMS[g.away];
    const cls =
      p.type === "td" ? "td" : p.type === "turnover" ? "turnover" : p.type.startsWith("fg") ? "fg" : p.type === "sack" ? "sack" : "";
    const player = mainPid ? L.players[mainPid] : null;
    fpts += gain;
    const div = document.createElement("div");
    div.className = `play ${cls}`;
    div.innerHTML = `<span class="play-clock">${esc(away.abbr)}@${esc(home.abbr)}</span>${
      player ? avatarHtml(player, "sprite sprite-sm") : ""
    }<span class="play-text">${esc(p.desc)}${starter ? "" : ' <span class="tag tag-cold">BENCH</span>'}${
      gain ? ` <span class="tag tag-hot">+${gain.toFixed(1)}</span>` : ""
    }</span>`;
    playsEl.appendChild(div);
    $("hl-fpts").textContent = fpts.toFixed(1);
    $("hl-q").textContent = `PLAY ${i + 1}/${total}`;
    div.scrollIntoView({ block: "nearest" });
  };

  const finish = () => {
    if (timer) clearInterval(timer);
    timer = null;
    while (idx < total) {
      showItem(idx, true);
      idx++;
    }
    $("hl-q").textContent = "FINAL";
  };

  if (total === 0) {
    playsEl.innerHTML = `<p class="note">${
      anyPlaysArchived
        ? `No standout plays from ${esc(you.name)}'s roster this week.`
        : "Highlights from earlier weeks aren't archived (saves gotta stay small)."
    }</p>`;
  } else {
    timer = setInterval(() => {
      if (idx >= total) {
        finish();
        return;
      }
      showItem(idx);
      idx++;
    }, 850);
  }

  $("hl-skip").addEventListener("click", finish);
  $("hl-close").addEventListener("click", () => {
    if (timer) clearInterval(timer);
    modalRoot.innerHTML = "";
  });
}

function gameLeaders(g) {
  const entries = Object.entries(g.box || {})
    .map(([pid, line]) => ({ p: L.players[pid], line, pts: scoreStatLine(line, L.settings.ppr) }))
    .filter((e) => e.p)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 8);
  if (!entries.length) return `<p class="note">Box score unavailable.</p>`;
  return entries
    .map(
      (e) =>
        `<div class="wire-item clickable-card" data-card="${e.p.id}">${avatarHtml(e.p, "sprite sprite-sm")}<span><b>${esc(displayName(e.p))}</b> (${e.p.pos}, ${
          teamOf(e.p).abbr
        }) <span style="color:var(--gold)">${e.pts.toFixed(1)} fpts</span><br /><span class="note">${statSummary(
          e.line
        )}</span></span></div>`
    )
    .join("");
}

/* --------------------------------------------------- standings tab */

function renderStandingsTab() {
  const rows = standings(L)
    .map((m, i) => {
      const inPlayoffs = i < playoffCount(L.managers.length);
      return `<tr class="${m.human ? "me" : ""}">
        <td>${i + 1}${inPlayoffs ? ' <span class="tag tag-hot">x</span>' : ""}</td>
        <td>${esc(m.name)}${
        m.titles ? ` <span class="tag tag-rk">${m.titles}&#9733;</span>` : ""
      }</td>
        <td class="num">${m.wins}-${m.losses}${m.ties ? `-${m.ties}` : ""}</td>
        <td class="num">${m.pointsFor.toFixed(1)}</td>
        <td class="num">${m.pointsAgainst.toFixed(1)}</td>
      </tr>`;
    })
    .join("");

  let bracketHtml = "";
  if (L.bracket) {
    bracketHtml = L.bracket.rounds
      .map((round, ri) => {
        const label =
          L.bracket.totalRounds - ri === 1
            ? "CHAMPIONSHIP"
            : L.bracket.totalRounds - ri === 2
            ? "SEMIFINALS"
            : "QUARTERFINALS";
        const games = round
          .map((mu) => {
            const a = mu.a == null ? "BYE" : managerById(mu.a).name;
            const b = mu.b == null ? "BYE" : managerById(mu.b).name;
            const sc =
              mu.aScore != null ? ` <span style="color:var(--gold)">${mu.aScore.toFixed(1)} - ${mu.bScore.toFixed(1)}</span>` : "";
            const w = mu.winner != null ? ` &rarr; <b style="color:var(--neon)">${esc(managerById(mu.winner).name)}</b>` : "";
            return `<div class="wire-item">${esc(a)} vs ${esc(b)}${sc}${w}</div>`;
          })
          .join("");
        return `<p class="panel-title" style="margin-top:0.6rem">${label}</p>${games}`;
      })
      .join("");
  }

  $("tab-standings").innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <p class="panel-title">${esc(L.settings.leagueName)} &middot; SEASON ${L.season}</p>
        <table class="tbl">
          <tr><th>#</th><th>Team</th><th class="num">REC</th><th class="num">PF</th><th class="num">PA</th></tr>
          ${rows}
        </table>
        <p class="note" style="margin-top:0.5rem">Top ${playoffCount(L.managers.length)} make the playoffs.</p>
      </div>
      <div class="panel">
        <p class="panel-title">PLAYOFF BRACKET</p>
        ${bracketHtml || `<p class="note">Bracket sets after week ${REG_SEASON_WEEKS}.</p>`}
        ${
          L.champions && L.champions.length
            ? `<p class="panel-title" style="margin-top:0.8rem">TITLE HISTORY</p>` +
              L.champions
                .map(
                  (c, i) =>
                    `<div class="wire-item">Season ${i + 1}: <b style="color:var(--gold)">${esc(
                      managerById(c).name
                    )}</b></div>`
                )
                .join("")
            : ""
        }
        ${L.seasonHistory && L.seasonHistory.length ? `<p class="panel-title" style="margin-top:0.8rem">FRANCHISE RECAPS</p>${L.seasonHistory.slice().reverse().map((h) => { const close = h.closest; const wide = h.widest; const nfl = h.nflWinner != null ? NFL_TEAMS[h.nflWinner] : null; const mvps = Object.entries(h.managerMvp || {}).map(([mid, pid]) => { const mvp = L.players[pid]; return mvp ? `${esc(managerById(Number(mid)).name)}: ${esc(displayName(mvp))}` : ""; }).filter(Boolean).join(" · "); return `<div class="wire-item"><span><b>Season ${h.season}</b> &middot; Champion: ${esc(managerById(h.champion).name)}<br /><span class="note">Poké-NFL champion: ${nfl ? `${esc(nfl.city)} ${esc(nfl.nick)}` : "n/a"} &middot; Closest: ${close ? `${esc(managerById(close.a).name)} ${close.aScore.toFixed(1)} - ${close.bScore.toFixed(1)} ${esc(managerById(close.b).name)}` : "n/a"} &middot; Widest: ${wide ? `${Math.abs(wide.aScore - wide.bScore).toFixed(1)} point margin` : "n/a"}<br />Team MVPs: ${mvps || "n/a"}</span></span></div>`; }).join("")}` : ""}
      </div>
    </div>
    <div class="panel">
      <p class="panel-title">POK&Eacute;-NFL STANDINGS</p>
      <div class="scroll" style="max-height:420px">
        <table class="tbl">
          <tr><th>#</th><th>Team</th><th class="num">REC</th><th class="num">PF</th><th class="num">PA</th></tr>
          ${nflStandingsRows()}
        </table>
      </div>
    </div>`;
}

function nflStandingsRows() {
  const records = NFL_TEAMS.map((t, i) => ({
    team: t,
    idx: i,
    ...(L.nflRecords && L.nflRecords[i] ? L.nflRecords[i] : { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }),
  }));
  records.sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.pointsFor - a.pointsFor);
  return records
    .map(
      (r, i) => `<tr>
        <td>${i + 1}</td>
        <td><span class="chip" style="background:${r.team.c1}">${r.team.abbr}</span> ${esc(r.team.city)} ${esc(r.team.nick)}</td>
        <td class="num">${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ""}</td>
        <td class="num">${r.pointsFor}</td>
        <td class="num">${r.pointsAgainst}</td>
      </tr>`
    )
    .join("");
}

/* ------------------------------------------------------ player stats */

let statsFilter = "ALL";
let statsSearch = "";

function renderStatsTab() {
  const you = activeManager();
  const allPlayers = L.playerIds.map((pid) => L.players[pid]);
  const fantasyOwner = (pid) => L.managers.find((manager) => manager.roster.includes(pid) || (manager.ir || []).includes(pid));
  const players = allPlayers
    .filter((p) => statsFilter === "ALL" || p.pos === statsFilter)
    .filter((p) => !statsSearch || p.name.toLowerCase().includes(statsSearch) || (p.customName || "").toLowerCase().includes(statsSearch))
    .sort((a, b) => b.seasonPts - a.seasonPts);
  const leaders = POSITIONS.map((pos) => {
    const p = allPlayers.filter((x) => x.pos === pos).sort((a, b) => b.seasonPts - a.seasonPts)[0];
    const owner = p && fantasyOwner(p.id);
    return p ? `<tr><td><span class="pos-badge pos-${pos}">${pos}</span></td><td class="clickable-card" data-card="${p.id}">${esc(displayName(p))}</td><td>${owner ? esc(owner.name) : "<span class=\"note\">Free Agent</span>"}</td><td class="num">${p.seasonPts.toFixed(1)}</td></tr>` : "";
  }).join("");
  const rows = players.slice(0, 160).map((p, i) => {
    const stats = p.seasonStats || {};
    const positionRank = allPlayers.filter((x) => x.pos === p.pos).sort((a, b) => b.seasonPts - a.seasonPts).findIndex((x) => x.id === p.id) + 1;
    const owner = fantasyOwner(p.id);
    const action = owner
      ? esc(owner.name)
      : `<span class="note">Free Agent</span> <button class="btn btn-green btn-sm" data-add="${p.id}" type="button">Add</button>`;
    return `<tr><td>${positionRank}</td><td class="clickable-card" data-card="${p.id}">${esc(displayName(p))} ${statusTag(p, L.week)}</td><td>${p.pos}</td><td>${action}</td><td class="num">${p.seasonPts.toFixed(1)}</td><td class="num">${p.gamesPlayed}</td><td class="num">${stats.passYds || 0}</td><td class="num">${stats.passTd || 0}</td><td class="num">${stats.passInt || 0}</td><td class="num">${stats.rushYds || 0}</td><td class="num">${stats.rushTd || 0}</td><td class="num">${stats.recYds || 0}</td><td class="num">${stats.rec || 0}</td><td class="num">${stats.recTd || 0}</td></tr>`;
  }).join("");
  $("tab-stats").innerHTML = `<div class="grid-2"><div class="panel"><p class="panel-title">LEAGUE LEADERS BY POSITION</p><table class="tbl"><tr><th>POS</th><th>PLAYER</th><th>FANTASY TEAM</th><th class="num">PTS</th></tr>${leaders}</table></div><div class="panel"><p class="panel-title">PLAYER SEARCH</p><div class="rowbar"><select id="stats-filter">${["ALL", ...POSITIONS].map((p) => `<option value="${p}" ${p === statsFilter ? "selected" : ""}>${p === "ALL" ? "All Positions" : p}</option>`).join("")}</select><input id="stats-search" type="text" placeholder="search name..." value="${esc(statsSearch)}" /></div><p class="note">Rank is within the selected position. Season totals include every completed game. Free agents can be added to ${esc(you.name)} straight from the table below.</p></div></div><div class="panel"><p class="panel-title">SEASON PLAYER TOTALS</p><div class="scroll"><table class="tbl"><tr><th>#</th><th>PLAYER</th><th>POS</th><th>FANTASY TEAM</th><th class="num">PTS</th><th class="num">GP</th><th class="num">PASS YDS</th><th class="num">PASS TD</th><th class="num">INT</th><th class="num">RUSH YDS</th><th class="num">RUSH TD</th><th class="num">REC YDS</th><th class="num">REC</th><th class="num">REC TD</th></tr>${rows || `<tr><td colspan="14">No player stats yet. Play a week.</td></tr>`}</table></div></div>`;
  $("stats-filter").addEventListener("change", (e) => { statsFilter = e.target.value; renderStatsTab(); });
  $("stats-search").addEventListener("input", (e) => { statsSearch = e.target.value.trim().toLowerCase(); renderStatsTab(); });
  $("tab-stats").onclick = (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    addFreeAgent(Number(btn.dataset.add));
  };
}

/* ---------------------------------------------------- free agent tab */

let faFilter = "ALL";
let faSearch = "";

/* Unowned players worth grabbing right now: on a heater, or lit up the box score last week. */
function hotFreeAgents() {
  const wk = L.lastPlayedWeek;
  return freeAgents(L)
    .map((p) => {
      const lastPts = wk && p.weeks[wk] ? p.weeks[wk].pts : null;
      const boosted = !!(p.form && p.form.mult > 1);
      const score = (boosted ? 50 : 0) + (lastPts || 0);
      return { p, lastPts, boosted, score };
    })
    .filter((e) => e.boosted || (e.lastPts != null && e.lastPts >= 10))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function renderPlayersTab() {
  const you = activeManager();
  const fas = freeAgents(L)
    .filter((p) => {
      if (faFilter !== "ALL" && p.pos !== faFilter) return false;
      if (faSearch && !p.name.toLowerCase().includes(faSearch) && !(p.customName || "").toLowerCase().includes(faSearch)) return false;
      return true;
    })
    .sort((a, b) => tradeValue(L, b) - tradeValue(L, a))
    .slice(0, 100);

  const hot = hotFreeAgents();

  $("tab-players").innerHTML = `
    <div class="panel">
      <p class="panel-title">&#128293; HOT PICKUPS</p>
      <div class="trend-strip">
        ${
          hot.length
            ? hot
                .map(({ p, lastPts, boosted }) => {
                  const t = teamOf(p);
                  const reason = lastPts != null ? `${lastPts.toFixed(1)} PTS` : boosted ? "TRENDING" : "";
                  return `<div class="trend-card">
                    <button class="trend-add" data-add="${p.id}" type="button" title="Add ${esc(displayName(p))}">+</button>
                    <span class="trend-info clickable-card" data-card="${p.id}">
                      <span class="trend-name">${esc(displayName(p))}</span>
                      <span class="trend-sub"><span class="trend-pos tpos-${p.pos}">${p.pos}</span> &middot; ${t.abbr} &middot; ${reason}</span>
                    </span>
                  </div>`;
                })
                .join("")
            : `<p class="note">No standout free agents right now &mdash; check back after the next games.</p>`
        }
      </div>
    </div>
    <div class="panel">
      <p class="panel-title">FREE AGENTS &middot; ${esc(you.name.toUpperCase())} ROSTER ${you.roster.length}/${ROSTER_SIZE}</p>
      <div class="rowbar">
        <select id="fa-filter">
          ${["ALL", "QB", "RB", "WR", "TE", "K", "DEF"]
            .map((p) => `<option value="${p}" ${p === faFilter ? "selected" : ""}>${p === "ALL" ? "All Positions" : p}</option>`)
            .join("")}
        </select>
        <input id="fa-search" type="text" placeholder="search name..." value="${esc(faSearch)}" />
        <span class="spacer"></span>
        <span class="note">Adds are instant. If you're full, you'll pick someone to cut.</span>
      </div>
      <div class="scroll">
        ${fas
          .map((p) =>
            playerRow(p, {
              week: L.week,
              action: `<button class="btn btn-green btn-sm" data-add="${p.id}" type="button">Add</button>`,
            })
          )
          .join("") || `<p class="note">Nobody left.</p>`}
      </div>
    </div>`;

  $("fa-filter").addEventListener("change", (e) => {
    faFilter = e.target.value;
    renderPlayersTab();
  });
  $("fa-search").addEventListener("input", (e) => {
    faSearch = e.target.value.trim().toLowerCase();
    renderPlayersTab();
  });
  $("tab-players").onclick = (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    addFreeAgent(Number(btn.dataset.add));
  };
}

function addFreeAgent(pid) {
  const you = activeManager();
  if (you.roster.length < ROSTER_SIZE) {
    you.roster.push(pid);
    save();
    renderSeason();
    return;
  }
  const incoming = L.players[pid];
  modalRoot.innerHTML = `
    <div class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <p class="panel-title" style="margin:0;flex:1">CUT SOMEONE TO ADD ${esc(displayName(incoming)).toUpperCase()}</p>
          <button class="btn btn-red btn-sm" id="cut-close" type="button">Cancel</button>
        </div>
        ${you.roster
          .map((rid) =>
            playerRow(L.players[rid], {
              week: L.week,
              action: `<button class="btn btn-red btn-sm" data-cut="${rid}" type="button">Cut</button>`,
            })
          )
          .join("")}
      </div>
    </div>`;
  $("cut-close").addEventListener("click", () => (modalRoot.innerHTML = ""));
  modalRoot.onclick = (e) => {
    const btn = e.target.closest("[data-cut]");
    if (!btn) return;
    const cutId = Number(btn.dataset.cut);
    you.roster = you.roster.filter((x) => x !== cutId);
    you.roster.push(pid);
    Object.values(you.lineups).forEach((lu) => {
      Object.keys(lu).forEach((k) => {
        if (lu[k] === cutId) lu[k] = null;
      });
    });
    modalRoot.innerHTML = "";
    save();
    renderSeason();
  };
}

/* -------------------------------------------------------- trade tab */

let tradePartner = null;
let tradeGive = new Set();
let tradeGet = new Set();
let pendingTrade = null;

function renderTradeTab() {
  const you = activeManager();
  const others = L.managers.filter((m) => m.id !== you.id);
  if (!others.length) {
    $("tab-trade").innerHTML = `<div class="panel"><p class="note">No trade partners in a solo league.</p></div>`;
    return;
  }
  if (tradePartner == null || !others.find((m) => m.id === tradePartner)) tradePartner = others[0].id;
  const partner = managerById(tradePartner);

  const col = (m, set, attr) => `
    <div class="panel">
      <p class="panel-title">${esc(m.name)}</p>
      <div class="scroll" style="max-height:330px">
        ${m.roster
          .map((pid) => {
            const p = L.players[pid];
            return `<label class="pick-row ${set.has(pid) ? "sel" : ""}">
              <input type="checkbox" ${attr}="${pid}" ${set.has(pid) ? "checked" : ""} />
              ${avatarHtml(p, "sprite sprite-sm")}
              <span class="pname"><span class="nm">${esc(displayName(p))}</span><span class="sub">${p.pos} &middot; ${
              teamOf(p).abbr
            } &middot; val ${tradeValue(L, p).toFixed(0)}</span></span>
            </label>`;
          })
          .join("")}
      </div>
    </div>`;

  $("tab-trade").innerHTML = `
    <div class="rowbar">
      <span class="note">${esc(you.name)} trades with:</span>
      <select id="trade-partner">
        ${others
          .map((m) => `<option value="${m.id}" ${m.id === tradePartner ? "selected" : ""}>${esc(m.name)}</option>`)
          .join("")}
      </select>
      <span class="spacer"></span>
      <button id="btn-propose" class="btn btn-green btn-sm" type="button">Propose Trade</button>
    </div>
    <p id="trade-result" class="note"></p>
    <div class="trade-cols">
      ${col(you, tradeGive, "data-give")}
      ${col(partner, tradeGet, "data-get")}
    </div>`;

  $("trade-partner").addEventListener("change", (e) => {
    tradePartner = Number(e.target.value);
    tradeGet = new Set();
    renderTradeTab();
  });
  $("tab-trade").onchange = (e) => {
    const g = e.target.closest("[data-give]");
    if (g) {
      const id = Number(g.dataset.give);
      L.irSpots = Number(L.irSpots) || 0;
      if (g.checked) tradeGive.add(id);
      else tradeGive.delete(id);
        if (!m.ir) m.ir = [];
      renderTradeTab();
      return;
    }
    const r = e.target.closest("[data-get]");
    if (r) {
      const id = Number(r.dataset.get);
      if (r.checked) tradeGet.add(id);
      else tradeGet.delete(id);
      renderTradeTab();
    }
  };
  $("btn-propose").addEventListener("click", proposeTrade);
}

function executeTrade(you, partner, give, get) {
  you.roster = you.roster.filter((pid) => !give.includes(pid)).concat(get);
  partner.roster = partner.roster.filter((pid) => !get.includes(pid)).concat(give);
  [you, partner].forEach((m) =>
    Object.values(m.lineups).forEach((lu) =>
      Object.keys(lu).forEach((k) => {
        if (!m.roster.includes(lu[k])) lu[k] = null;
      })
    )
  );
  L.wire.unshift({
    week: L.week,
    kind: "boost",
    playerId: get[0],
    text: `TRADE: ${you.name} sends ${give.map((p) => displayName(L.players[p])).join(", ")} to ${partner.name} for ${get
      .map((p) => displayName(L.players[p]))
      .join(", ")}.`,
  });
  tradeGive = new Set();
  tradeGet = new Set();
  pendingTrade = null;
  save();
  renderTradeTab();
  $("trade-result").innerHTML = `<span style="color:var(--neon)">Trade accepted!</span>`;
}

function chooseTradeCuts(you, partner, give, get) {
  const resulting = [
    { manager: you, roster: you.roster.filter((pid) => !give.includes(pid)).concat(get) },
    { manager: partner, roster: partner.roster.filter((pid) => !get.includes(pid)).concat(give) },
  ];
  const next = resulting.find((entry) => entry.roster.length > ROSTER_SIZE && !(pendingTrade && pendingTrade.cuts[entry.manager.id]));
  if (!next) {
    executeTrade(you, partner, give, get);
    return;
  }
  pendingTrade = pendingTrade || { cuts: {} };
  const candidates = next.roster.filter((pid) => !give.includes(pid) && !get.includes(pid)).map((pid) => L.players[pid]);
  if (!next.manager.human) {
    const cut = candidates.sort((a, b) => tradeValue(L, a) - tradeValue(L, b))[0];
    next.manager.roster = next.manager.roster.filter((pid) => pid !== cut.id);
    pendingTrade.cuts[next.manager.id] = cut.id;
    chooseTradeCuts(you, partner, give, get);
    return;
  }
  modalRoot.innerHTML = `<div class="modal-back"><div class="modal"><p class="panel-title">${esc(next.manager.name.toUpperCase())}: CUT TO MAKE ROOM</p><p class="note">This trade leaves ${next.manager.roster.length + (next.manager === you ? get.length - give.length : give.length - get.length)} players. Choose someone to drop.</p>${candidates.map((p) => playerRow(p, { week: L.week, action: `<button class="btn btn-red btn-sm" data-trade-cut="${p.id}" type="button">Drop</button>` })).join("")}</div></div>`;
  modalRoot.onclick = (e) => {
    const button = e.target.closest("[data-trade-cut]");
    if (!button) return;
    pendingTrade.cuts[next.manager.id] = Number(button.dataset.tradeCut);
    const dropId = pendingTrade.cuts[next.manager.id];
    if (next.manager === you) you.roster = you.roster.filter((pid) => pid !== dropId);
    else partner.roster = partner.roster.filter((pid) => pid !== dropId);
    modalRoot.innerHTML = "";
    modalRoot.onclick = null;
    chooseTradeCuts(you, partner, give, get);
  };
}

function proposeTrade() {
  const you = activeManager();
  const partner = managerById(tradePartner);
  const give = [...tradeGive];
  const get = [...tradeGet];
  const out = $("trade-result");
  if (!give.length || !get.length) {
    out.innerHTML = `<span style="color:var(--red)">Pick at least one player from each side.</span>`;
    return;
  }
  if (partner.human) {
    const giveVal = give.reduce((s, pid) => s + tradeValue(L, L.players[pid]), 0);
    const getVal = get.reduce((s, pid) => s + tradeValue(L, L.players[pid]), 0);
    modalRoot.innerHTML = `
      <div class="modal-back">
        <div class="modal">
          <p class="panel-title">${esc(partner.name.toUpperCase())}, DO YOU ACCEPT?</p>
          <p class="note">You give up ${get.map((p) => esc(L.players[p].name)).join(", ")} (value ${round1(
      getVal
    )}) and receive ${give.map((p) => esc(L.players[p].name)).join(", ")} (value ${round1(giveVal)}).</p>
          <div class="rowbar" style="margin-top:0.7rem">
            <button id="tr-yes" class="btn btn-green btn-sm" type="button">Accept</button>
            <button id="tr-no" class="btn btn-red btn-sm" type="button">Decline</button>
          </div>
        </div>
      </div>`;
    $("tr-no").addEventListener("click", () => {
      modalRoot.innerHTML = "";
      out.innerHTML = `<span style="color:var(--red)">${esc(partner.name)} declined.</span>`;
    });
    $("tr-yes").addEventListener("click", () => {
      modalRoot.innerHTML = "";
      chooseTradeCuts(you, partner, give, get);
    });
    return;
  }
  const verdict = evaluateTrade(L, partner, get, give);
  if (!verdict.accept) {
    out.innerHTML = `<span style="color:var(--red)">${esc(partner.name)} says no.</span> They value what they'd give up at ${
      verdict.giveVal
    } and what they'd get at ${verdict.getVal}. Sweeten it.`;
    return;
  }
  chooseTradeCuts(you, partner, give, get);
}

/* --------------------------------------------------------- wire tab */

function renderWireTab() {
  const items = L.wire.slice(0, 120);
  $("tab-wire").innerHTML = `
    <div class="panel">
      <p class="panel-title">LEAGUE WIRE</p>
      <div class="scroll" style="max-height:520px">
        ${
          items.length
            ? items
                .map((it) => {
                  const p = it.playerId ? L.players[it.playerId] : null;
                  return `<div class="wire-item ${it.kind}">${p ? avatarHtml(p, "sprite sprite-sm") : ""}<span><span class="note">WK ${
                    it.week
                  }</span> ${esc(it.text)}</span></div>`;
                })
                .join("")
            : `<p class="note">Quiet week. Nobody has gotten arrested yet.</p>`
        }
      </div>
    </div>`;
}

/* ------------------------------------------------------- league tab */

let leagueTeamIdx = 0;

function renderLeagueTab() {
  const t = NFL_TEAMS[leagueTeamIdx];
  const roster = teamRoster(L, leagueTeamIdx).sort(
    (a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.skill - a.skill
  );
  const ownerOf = (pid) => {
    const m = L.managers.find((mm) => mm.roster.includes(pid));
    return m ? `<span class="tag ${m.human ? "tag-hot" : "tag-bye"}">${esc(m.name)}</span>` : "";
  };

  $("tab-league").innerHTML = `
    <div class="panel">
      <div class="rowbar">
        <select id="league-team">
          ${NFL_TEAMS.map((tt, i) => ({ tt, i })).sort((a, b) => `${a.tt.city} ${a.tt.nick}`.localeCompare(`${b.tt.city} ${b.tt.nick}`)).map(
            ({ tt, i }) => `<option value="${i}" ${i === leagueTeamIdx ? "selected" : ""}>${tt.city} ${tt.nick}</option>`
          ).join("")}
        </select>
        ${teamEmblem(leagueTeamIdx, "sprite sprite-sm")}
        <span class="chip" style="background:${t.c1}">${t.abbr}</span>
        <span class="note">Bye week ${L.byeWeeks[leagueTeamIdx]}</span>
      </div>
      <div class="scroll">
        ${roster.map((p) => playerRow(p, { week: L.week, action: ownerOf(p.id) })).join("")}
      </div>
    </div>`;
  $("league-team").addEventListener("change", (e) => {
    leagueTeamIdx = Number(e.target.value);
    renderLeagueTab();
  });
}

/* ========================================================= GAMEDAY */

function buildTimeline(games) {
  const max = games.reduce((n, g) => Math.max(n, g.plays.length), 0);
  const tl = [];
  for (let i = 0; i < max; i++) {
    games.forEach((g, gi) => {
      if (g.plays[i]) tl.push({ gi, play: g.plays[i] });
    });
  }
  return tl;
}

function startGameday() {
  const { week, wire } = prepareWeek(L);
  L.managers.forEach((m) => ensureLineup(m, week));
  const games = runWeekGames(L, week);

  const played = new Set();
  games.forEach((g) => Object.keys(g.box).forEach((pid) => played.add(Number(pid))));

  GD = {
    week,
    wire,
    games,
    played,
    totals: {},
    mods: {},
    sat: {},
    risks: [],
    liveWire: [],
    alerts: [],
    feed: [],
    flash: {},
    timeline: buildTimeline(games),
    idx: 0,
    speed: 1,
    paused: true,
    timer: null,
    stage: "PREGAME",
    waves: 0,
    focus: humanManagers().length ? humanManagers()[0].id : 0,
    finished: false,
  };
  if (humanManagers().some((m) => m.id === L.activeManagerId)) GD.focus = L.activeManagerId;
  played.forEach((pid) => (GD.totals[pid] = 0));

  render();
  wire.slice(0, 25).forEach((w) => pushFeed(w.text, w.kind, w.playerId));
  const recoveries = wire.filter((w) => w.kind === "return");
  const beginPreGame = () => runDecisionWave("pre", () => {
    GD.stage = "LIVE";
    GD.paused = false;
    startTicker();
  });
  if (!recoveries.length) {
    beginPreGame();
    return;
  }
  modalRoot.innerHTML = `<div class="modal-back"><div class="modal"><p class="panel-title">CLEARED TO PLAY</p>${recoveries.map((w) => `<div class="wire-item boost">${w.playerId ? avatarHtml(L.players[w.playerId], "sprite sprite-sm") : ""}<span>${esc(w.text)}</span></div>`).join("")}<button class="btn btn-green btn-sm" id="recoveries-close" type="button">Back To The Game</button></div></div>`;
  $("recoveries-close").addEventListener("click", () => { modalRoot.innerHTML = ""; beginPreGame(); });
}

function pushFeed(text, cls, playerId) {
  GD.feed.unshift({ text, cls: cls || "", playerId: playerId || null });
  if (GD.feed.length > 80) GD.feed.length = 80;
}

function showLiveHealthAlert(alert) {
  GD.paused = true;
  stopTicker();
  modalRoot.innerHTML = `<div class="modal-back"><div class="modal"><p class="panel-title">${esc(alert.title)}</p><div class="wire-item injury">${alert.playerId ? avatarHtml(L.players[alert.playerId], "sprite sprite-sm") : ""}<span>${esc(alert.text)}</span></div><button class="btn btn-red btn-sm" id="health-alert-close" type="button">Continue</button></div></div>`;
  $("health-alert-close").addEventListener("click", () => {
    modalRoot.innerHTML = "";
    if (!GD.finished) {
      GD.paused = false;
      startTicker();
    }
  });
}

function startersForWeek(m, wk) {
  const lineup = m.lineups[wk] || {};
  return ROSTER_SLOTS.map((slot, i) => ({ slot, pid: lineup[`${slot}${i}`] })).filter((s) => s.pid);
}

function startersOf(m) {
  return startersForWeek(m, GD.week);
}

function liveScore(m) {
  return round1(
    startersOf(m).reduce((sum, s) => sum + (GD.totals[s.pid] != null ? GD.totals[s.pid] : 0), 0)
  );
}

/* ------------------------------------------------ coach decisions */

function decisionCandidates(m) {
  return startersOf(m)
    .map((s) => L.players[s.pid])
    .filter((p) => p && p.pos !== "DEF" && p.pos !== "K" && GD.played.has(p.id) && !GD.sat[p.id]);
}

function runDecisionWave(when, done) {
  const bank = when === "pre" ? PREGAME_DECISIONS : MIDGAME_DECISIONS;
  const queue = [];
  L.managers.forEach((m) => {
    const cands = decisionCandidates(m);
    if (!cands.length) return;
    if (!m.human) {
      if (!chance(0.18)) return;
      const player = pick(cands);
      const scenario = pick(bank);
      const opt = pick(scenario.options);
      applyDecision(m, player, opt, true);
      return;
    }
    if (!chance(when === "pre" ? 0.9 : 0.8)) return;
    queue.push({ m, player: pick(cands), scenario: pick(bank), when });
  });

  const step = () => {
    if (!queue.length) {
      done();
      return;
    }
    showDecisionModal(queue.shift(), step);
  };
  step();
}

function applyDecision(m, player, opt, isCpu) {
  let mult = opt.mult != null ? opt.mult : 1;
  if (opt.swing != null && chance(0.5)) mult = opt.swing;
  if (opt.sit) {
    GD.sat[player.id] = true;
  } else {
    GD.mods[player.id] = (GD.mods[player.id] || 1) * mult;
  }
  if (opt.risk) GD.risks.push({ pid: player.id, risk: opt.risk });
  const text = isCpu
    ? `${m.name} ${pick(CPU_DECISION_FLAVOR)} with ${displayName(player)}: "${opt.label}".`
    : `${m.name} &rarr; ${(opt.text || opt.label).replace(/\{name\}/g, displayName(player))}`;
  pushFeed(text, opt.sit ? "slump" : mult >= 1.1 ? "boost" : mult < 1 ? "slump" : "", player.id);
  GD.liveWire.push({
    week: GD.week,
    kind: opt.sit ? "absence" : mult >= 1.1 ? "boost" : "slump",
    playerId: player.id,
    text: `COACH CALL &mdash; ${m.name}: ${displayName(player)}, "${opt.label}".`,
  });
}

function showDecisionModal(entry, next) {
  const { m, player, scenario, when } = entry;
  const prompt = scenario.prompt.replace(/\{name\}/g, displayName(player));
  modalRoot.innerHTML = `
    <div class="modal-back">
      <div class="modal decision">
        <p class="decision-team">${esc(m.name)} &middot; ${when === "pre" ? "PREGAME" : "IN-GAME"} DECISION &middot; TEAM ${liveScore(m).toFixed(1)} PTS</p>
        <div class="decision-head">
          ${avatarHtml(player, "sprite sprite-lg")}
          <div>
            <p class="decision-name">${esc(displayName(player))}</p>
            <p class="note">${player.pos} &middot; ${teamOf(player).city} ${esc(teamOf(player).nick)}${
    player.nickname ? ` &middot; "${esc(player.nickname)}"` : ""
  } &middot; CURRENT ${((GD.totals[player.id] || 0)).toFixed(1)} FANTASY PTS</p>
          </div>
        </div>
        <p class="decision-prompt">${esc(prompt)}</p>
        <div class="decision-opts">
          ${scenario.options
            .map(
              (o, i) =>
                `<button class="btn ${i === 0 ? "btn-green" : "btn-blue"}" data-opt="${i}" type="button">${esc(
                  o.label
                )}</button>`
            )
            .join("")}
        </div>
        <p class="note" style="margin-top:0.6rem">Choices swing this week's output. Some of them come with risk.</p>
      </div>
    </div>`;
  modalRoot.onclick = (e) => {
    const btn = e.target.closest("[data-opt]");
    if (!btn) return;
    const opt = scenario.options[Number(btn.dataset.opt)];
    applyDecision(m, player, opt, false);
    modalRoot.innerHTML = "";
    modalRoot.onclick = null;
    renderGamedayLive();
    next();
  };
}

/* -------------------------------------------------------- ticker */

function startTicker() {
  if (GD.timer) clearInterval(GD.timer);
  GD.timer = setInterval(gdTick, 110);
  renderGameday();
}

function stopTicker() {
  if (GD.timer) clearInterval(GD.timer);
  GD.timer = null;
}

function applyPlayToTotals(entry) {
  const fp = entry.play.fp || {};
  Object.keys(fp).forEach((pid) => {
    const id = Number(pid);
    if (GD.sat[id]) return;
    const mult = GD.mods[id] || 1;
    const delta = fp[pid] * mult;
    if (!delta) return;
    GD.totals[id] = (GD.totals[id] || 0) + delta;
    GD.flash[id] = Date.now();
  });
}

function ownerOfPlayer(pid) {
  return L.managers.find((m) => m.roster.includes(pid));
}

function gdTick() {
  if (GD.paused) return;
  const perTick = 5 * GD.speed;
  for (let i = 0; i < perTick && GD.idx < GD.timeline.length; i++) {
    const entry = GD.timeline[GD.idx];
    applyPlayToTotals(entry);
    if (entry.play.big) {
      const owner = entry.play.playerId ? ownerOfPlayer(entry.play.playerId) : null;
      const cls = entry.play.type === "td" ? "boost" : entry.play.type === "turnover" ? "injury" : "";
      pushFeed(
        `${entry.play.desc}${owner ? ` <span class="owner-tag">${esc(owner.name)}</span>` : ""}`,
        cls,
        entry.play.playerId
      );
    }
    GD.idx++;
  }

  const progress = GD.idx / Math.max(1, GD.timeline.length);
  GD.stage = `Q${Math.min(4, Math.floor(progress * 4) + 1)}`;

  maybeLiveEvent(progress);

  if (GD.waves === 0 && progress >= 0.42) {
    GD.waves = 1;
    pauseForDecisions("mid");
    return;
  }
  if (GD.waves === 1 && progress >= 0.76) {
    GD.waves = 2;
    if (chance(0.7)) {
      pauseForDecisions("mid");
      return;
    }
  }

  if (GD.idx >= GD.timeline.length) {
    endGameday();
    return;
  }
  renderGamedayLive();
}

function pauseForDecisions(when) {
  GD.paused = true;
  stopTicker();
  renderGamedayLive();
  runDecisionWave(when, () => {
    GD.paused = false;
    startTicker();
  });
}

function maybeLiveEvent(progress) {
  if (!chance(0.035)) return;
  const ids = [...GD.played];
  const p = L.players[ids[rnd(ids.length)]];
  if (!p || p.pos === "DEF" || GD.sat[p.id]) return;
  const owner = ownerOfPlayer(p.id);
  if (owner && owner.human) return; // human-owned guys get a decision instead
  const roll = Math.random();
  if (roll < 0.12) {
    GD.sat[p.id] = true;
    const note = pick(RETIRE_EVENTS);
    pushFeed(`${displayName(p)} ${note}`, "slump", p.id);
    GD.liveWire.push({ week: GD.week, kind: "retire", playerId: p.id, text: `${displayName(p)} ${note}` });
    p.status = { type: "retired", weeks: 99, note };
  } else if (roll < 0.3) {
    GD.sat[p.id] = true;
    const inj = pick(INJURY_EVENTS);
    p.status = { type: "questionable", weeks: 0, note: inj.note };
    const alert = { title: "QUESTIONABLE", text: `${displayName(p)} is out for the day: ${inj.note}.`, playerId: p.id };
    GD.alerts.push(alert);
    showLiveHealthAlert(alert);
    pushFeed(`${displayName(p)} is down. ${inj.note}. He's out for the day.`, "injury", p.id);
    GD.risks.push({ pid: p.id, risk: 1, weeks: inj.weeks, note: inj.note });
  } else if (roll < 0.65) {
    GD.mods[p.id] = (GD.mods[p.id] || 1) * 1.35;
    const note = pick(BOOST_EVENTS);
    pushFeed(`${displayName(p)} is heating up &mdash; ${note}.`, "boost", p.id);
  } else {
    GD.mods[p.id] = (GD.mods[p.id] || 1) * 0.7;
    const note = pick(SLUMP_EVENTS);
    pushFeed(`${displayName(p)} is unraveling &mdash; ${note}.`, "slump", p.id);
  }
}

function skipToEnd() {
  GD.paused = true;
  stopTicker();
  while (GD.idx < GD.timeline.length) {
    applyPlayToTotals(GD.timeline[GD.idx]);
    GD.idx++;
  }
  endGameday();
}

function endGameday() {
  stopTicker();
  GD.paused = true;
  GD.stage = "FINAL";
  GD.finished = true;

  GD.games.forEach((g) => {
    Object.entries(g.paBonus || {}).forEach(([pid, v]) => {
      const id = Number(pid);
      if (GD.totals[id] == null) GD.totals[id] = 0;
      GD.totals[id] += v;
    });
  });
  Object.keys(GD.totals).forEach((pid) => (GD.totals[pid] = round1(GD.totals[pid])));

  GD.risks.forEach((r) => {
    const p = L.players[r.pid];
    if (!p || p.status.type === "retired") return;
    if (!chance(r.risk)) return;
    const inj = r.weeks ? { weeks: r.weeks, note: r.note } : pick(INJURY_EVENTS);
    p.status = { type: "injured", weeks: inj.weeks + 1, note: inj.note };
    GD.alerts.push({ title: "INJURY REPORT", text: `${displayName(p)} left the game: ${inj.note}. Out ${inj.weeks + 1} week${inj.weeks > 0 ? "s" : ""}.`, playerId: p.id });
    const text = `${displayName(p)} left Week ${GD.week} banged up &mdash; ${inj.note}. Out ${inj.weeks} week${
      inj.weeks > 1 ? "s" : ""
    }.`;
    GD.liveWire.push({ week: GD.week, kind: "injury", playerId: p.id, text });
    pushFeed(text, "injury", p.id);
  });

  const wire = GD.liveWire.reverse().concat(GD.wire);
  finalizeWeek(L, GD.games, wire, GD.totals);
  L.lastPlayedWeek = GD.week;
  pruneOldHighlights();
  save();
  renderGameday();
  renderLeagueTicker();
  if (GD.alerts.length) {
    modalRoot.innerHTML = `<div class="modal-back"><div class="modal"><p class="panel-title">GAME HEALTH REPORT</p>${GD.alerts.map((alert) => `<div class="wire-item injury">${alert.playerId ? avatarHtml(L.players[alert.playerId], "sprite sprite-sm") : ""}<span><b>${esc(alert.title)}</b><br />${esc(alert.text)}</span></div>`).join("")}<button class="btn btn-blue btn-sm" id="alerts-close" type="button">Continue</button></div></div>`;
    $("alerts-close").addEventListener("click", () => { modalRoot.innerHTML = ""; });
  }
}

function finishWeekButton() {
  GD = null;
  advanceAfterWeek();
}

/* ---------------------------------------------------- gameday view */

function renderGameday() {
  [setupView, draftView, seasonView, offseasonView].forEach((v) => v.classList.add("hidden"));
  gamedayView.classList.remove("hidden");
  $("gd-title").textContent = `${L.phase === "playoffs" ? roundName(L) : `WEEK ${GD.week}`} · GAMEDAY`;
  $("gd-play").textContent = GD.paused ? "Resume" : "Pause";
  $("gd-play").classList.toggle("hidden", GD.finished);
  $("gd-skip").classList.toggle("hidden", GD.finished);
  document.querySelectorAll(".gd-speed").forEach((b) => {
    b.classList.toggle("btn-green", Number(b.dataset.speed) === GD.speed);
    b.classList.toggle("hidden", GD.finished);
  });
  $("gd-done").classList.toggle("hidden", !GD.finished);

  const humans = humanManagers();
  $("gd-manager-pick").innerHTML =
    humans.length > 1
      ? `<select id="gd-focus"><option value="all" ${GD.focus === "all" ? "selected" : ""}>ALL HUMAN TEAMS</option>${humans
          .map((m) => `<option value="${m.id}" ${m.id === GD.focus ? "selected" : ""}>${esc(m.name)}</option>`)
          .join("")}</select>`
      : "";
  if (humans.length > 1) {
    $("gd-focus").addEventListener("change", (e) => {
      GD.focus = e.target.value === "all" ? "all" : Number(e.target.value);
      renderGamedayLive();
    });
  }
  renderGamedayLive();
}

function renderGamedayLive() {
  if (!GD) return;
  const progress = GD.idx / Math.max(1, GD.timeline.length);
  $("gd-bar").style.width = `${Math.round(progress * 100)}%`;
  $("gd-quarter").textContent = GD.stage;

  const matchups =
    L.phase === "playoffs" && L.bracket
      ? L.bracket.rounds[L.bracket.current].filter((mu) => mu.a != null && mu.b != null && mu.winner == null)
      : L.schedule[GD.week] || [];

  const avg =
    L.managers.reduce((s, m) => s + liveScore(m), 0) / Math.max(1, L.managers.length);

  $("gd-matchups").innerHTML = matchups
    .map((mu) => {
      const a = managerById(mu.a);
      const b = managerById(mu.b);
      const as = mu.a === -1 ? round1(avg) : liveScore(a);
      const bs = mu.b === -1 ? round1(avg) : liveScore(b);
      const focused = GD.focus === "all" || mu.a === GD.focus || mu.b === GD.focus;
      return `<div class="matchup-board live ${focused ? "focus" : ""}">
        <div class="mb-side ${as >= bs ? "win" : ""}"><div class="mb-name">${esc(
        a.name
      )}</div><div class="mb-score">${as.toFixed(1)}</div></div>
        <div class="mb-vs">VS</div>
        <div class="mb-side ${bs > as ? "win" : ""}"><div class="mb-name">${esc(
        b.name
      )}</div><div class="mb-score">${bs.toFixed(1)}</div></div>
      </div>`;
    })
    .join("");

  const lineupManagers = GD.focus === "all" ? humans : [managerById(GD.focus)];
  $("gd-lineup-title").textContent = GD.focus === "all" ? "ALL HUMAN TEAMS · LIVE STARTERS" : `${lineupManagers[0].name.toUpperCase()} · LIVE STARTERS`;
  const now = Date.now();
  $("gd-lineup").innerHTML = lineupManagers.map((manager) => `<div class="live-manager-block"><p class="panel-title">${esc(manager.name)}</p>${startersOf(manager).map(({ slot, pid }) => {
      const p = L.players[pid];
      if (!p) return "";
      const playing = GD.played.has(p.id);
      const pts = GD.totals[p.id] != null ? GD.totals[p.id] : 0;
      const hot = GD.flash[p.id] && now - GD.flash[p.id] < 1200;
      const mod = GD.mods[p.id];
      const tag = GD.sat[p.id]
        ? `<span class="tag tag-out">OUT</span>`
        : !playing
        ? `<span class="tag tag-bye">BYE/INACTIVE</span>`
        : mod && mod > 1.05
        ? `<span class="tag tag-hot">&#9650;</span>`
        : mod && mod < 0.95
        ? `<span class="tag tag-cold">&#9660;</span>`
        : "";
      return `<div class="gd-row ${hot ? "flash" : ""}">
        <span class="pos-badge pos-${slot}">${slot}</span>
        ${avatarHtml(p, "sprite sprite-sm")}
        <span class="pname"><span class="nm">${esc(displayName(p))} ${tag}</span><span class="sub">${p.pos} &middot; ${
        teamOf(p).abbr
      }</span></span>
        <span class="stat">${pts.toFixed(1)}</span>
      </div>`;
    }).join("")}</div>`).join("");

  $("gd-feed").innerHTML = GD.feed
    .map(
      (f) =>
        `<div class="wire-item ${f.cls}">${
          f.playerId && L.players[f.playerId] ? avatarHtml(L.players[f.playerId], "sprite sprite-sm") : ""
        }<span>${f.text}</span></div>`
    )
    .join("");
}

/* --------------------------------------------------------- sim flow */

function advanceAfterWeek() {
  if (L.phase === "regular") {
    if (L.week >= REG_SEASON_WEEKS) startPlayoffs(L);
    else L.week++;
  } else if (L.phase === "playoffs") {
    const isFinal = L.bracket.current >= L.bracket.totalRounds - 1;
    if (isFinal) {
      L.champions.push(L.bracket.rounds[L.bracket.current][0].winner);
      L.phase = "done";
    } else {
      advanceBracket(L);
      L.week = NFL_WEEKS - (L.bracket.totalRounds - L.bracket.current) + 1;
    }
  }
  selectedBench = null;
  activeTab = "scores";
  save();
  render();
  if (L.phase === "done") showChampionModal();
}

function playWeek(live) {
  if (L.phase === "done") {
    const changes = nextSeason(L);
    L.lastPlayedWeek = 0;
    L.offseasonReport = {
      retired: changes.retired.map((p) => `${displayName(p)} (${p.pos}, ${NFL_TEAMS[p.team].abbr}) hangs it up at ${p.age}.`),
      rookies: changes.rookies.slice(0, 20).map((p) => `${p.name} (${p.pos}) drafted by the ${NFL_TEAMS[p.team].nick}.`),
    };
    L.postOffseasonPhase = L.phase;
    L.phase = "offseason";
    save();
    render();
    return;
  }

  const notes = aiRosterMoves(L);
  if (live) {
    startGameday();
    notes.forEach((n) => GD.liveWire.push({ week: GD.week, kind: "boost", playerId: null, text: n }));
    return;
  }
  simulateWeek(L);
  L.lastPlayedWeek = L.week;
  notes.forEach((n) => L.wire.unshift({ week: L.week, kind: "boost", playerId: null, text: n }));
  pruneOldHighlights();
  advanceAfterWeek();
}

function showChampionModal() {
  const champ = managerById(L.champions[L.champions.length - 1]);
  modalRoot.innerHTML = `
    <div class="modal-back">
      <div class="modal">
        <div class="champ-banner">
          <p class="panel-title" style="color:var(--gold)">SEASON ${L.season} CHAMPION</p>
          <p class="big-note">&#127942; ${esc(champ.name)} &#127942;</p>
          <p class="note">${
            champ.human
              ? "You did it. Somewhere a Magikarp is crying tears of joy."
              : "A CPU won your league. Sit with that."
          }</p>
        </div>
        <div class="rowbar">
          ${["franchise", "dynasty"].includes(L.mode) ? `<button class="btn btn-green" id="champ-next" type="button">Start Next Season</button>` : ""}
          <button class="btn btn-blue btn-sm" id="champ-close" type="button">Look Around First</button>
        </div>
      </div>
    </div>`;
  $("champ-close").addEventListener("click", () => (modalRoot.innerHTML = ""));
  if ($("champ-next")) $("champ-next").addEventListener("click", () => {
    modalRoot.innerHTML = "";
    playWeek(false);
  });
}

/* ------------------------------------------------------- offseason */

function renderOffseason() {
  const rep = L.offseasonReport || { retired: [], rookies: [] };
  offseasonView.innerHTML = `
    <div class="panel">
      <p class="panel-title">OFFSEASON REPORT &middot; SEASON ${L.season}</p>
      <div class="grid-2">
        <div>
          <p class="panel-title">RETIREMENTS</p>
          <div class="scroll" style="max-height:260px">${
            rep.retired.map((r) => `<div class="wire-item retire">${esc(r)}</div>`).join("") ||
            `<p class="note">Everybody's back.</p>`
          }</div>
        </div>
        <div>
          <p class="panel-title">ROOKIE CLASS</p>
          <div class="scroll" style="max-height:260px">${
            rep.rookies.map((r) => `<div class="wire-item boost">${esc(r)}</div>`).join("") ||
            `<p class="note">No rookies.</p>`
          }</div>
        </div>
      </div>
      <div class="rowbar" style="margin-top:0.8rem">
        <button class="btn btn-green" id="btn-to-draft" type="button">${
          L.postOffseasonPhase === "keepers" ? "Pick Your Keepers" : "To The Draft"
        }</button>
      </div>
    </div>`;
  $("btn-to-draft").addEventListener("click", () => {
    L.phase = L.postOffseasonPhase || "draft";
    save();
    render();
  });
}

/* --------------------------------------------------------- keepers */

function renderKeepers() {
  const you = activeManager();
  const max = Number((L.settings && L.settings.keeperCount) || 0);
  L.keeperSelections = L.keeperSelections || {};
  const mine = new Set(L.keeperSelections[you.id] || []);
  const humans = humanManagers();

  const switcher =
    humans.length > 1
      ? `<div class="manager-bar">
          <span class="mb-label">MANAGING:</span>
          ${humans
            .map(
              (m) =>
                `<button class="mgr-btn ${m.id === L.activeManagerId ? "active" : ""}" data-keeper-mgr="${
                  m.id
                }" type="button">${esc(m.name)}</button>`
            )
            .join("")}
        </div>`
      : "";

  const rows = you.roster
    .map((pid) => L.players[pid])
    .filter(Boolean)
    .sort((a, b) => b.seasonPts - a.seasonPts)
    .map((p) => {
      const costLabel = p.draftedRound != null ? `Round ${p.draftedRound} pick` : "Your last pick";
      const checked = mine.has(p.id);
      return playerRow(p, {
        rowClass: checked ? "kept" : "",
        rightMain: p.seasonPts.toFixed(1),
        rightSub: "PTS",
        action: `<label class="keeper-pick"><input type="checkbox" data-keep="${p.id}" ${
          checked ? "checked" : ""
        } />${esc(costLabel)}</label>`,
      });
    })
    .join("");

  keepersView.innerHTML = `
    ${switcher}
    <div class="panel">
      <p class="panel-title">${esc(you.name.toUpperCase())} &middot; PICK UP TO ${max} KEEPER${max === 1 ? "" : "S"}</p>
      <p class="note">
        A kept player skips the redraft but costs you the draft slot they cost last year (undrafted pickups cost
        your very last pick). Selected: <b>${mine.size}</b>/${max}
      </p>
      <div class="scroll" style="max-height:520px">${rows || `<p class="note">No roster from last season.</p>`}</div>
    </div>
    <div class="rowbar" style="margin-top:0.6rem">
      <button class="btn btn-green" id="btn-confirm-keepers" type="button">Confirm &amp; Start The Draft</button>
    </div>`;

  keepersView.querySelectorAll("[data-keeper-mgr]").forEach((btn) => {
    btn.addEventListener("click", () => {
      L.activeManagerId = Number(btn.dataset.keeperMgr);
      renderKeepers();
    });
  });

  keepersView.querySelectorAll("[data-keep]").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const pid = Number(e.target.dataset.keep);
      const set = new Set(L.keeperSelections[you.id] || []);
      if (e.target.checked) {
        if (set.size >= max) {
          e.target.checked = false;
          return;
        }
        set.add(pid);
      } else {
        set.delete(pid);
      }
      L.keeperSelections[you.id] = [...set];
      save();
      renderKeepers();
    });
  });

  $("btn-confirm-keepers").addEventListener("click", () => {
    finalizeKeepersAndDraft(L);
    save();
    render();
  });
}

/* --------------------------------------------------- league ticker */

/* Builds a bottom-line-style scroll of NFL scores, fantasy leaders, and league storylines. */
function buildTickerItems() {
  if (!L || !L.players) return [];
  const items = [];
  const wk = L.lastPlayedWeek;

  if (wk && L.results[wk]) {
    L.results[wk].games.forEach((g) => {
      const home = NFL_TEAMS[g.home];
      const away = NFL_TEAMS[g.away];
      items.push(`FINAL: ${away.abbr} ${g.awayScore} @ ${home.abbr} ${g.homeScore}`);
    });
  }

  const allPlayers = L.playerIds.map((pid) => L.players[pid]);
  POSITIONS.forEach((pos) => {
    const best = allPlayers.filter((p) => p.pos === pos && p.seasonPts > 0).sort((a, b) => b.seasonPts - a.seasonPts)[0];
    if (best) items.push(`${pos} LEADER: ${displayName(best)} (${teamOf(best).abbr}) &mdash; ${best.seasonPts.toFixed(1)} FPTS`);
  });

  if (wk) {
    L.wire
      .filter((w) => w.week === wk)
      .slice(0, 10)
      .forEach((w) => items.push(w.text));
  }

  if (wk && L.results[wk]) {
    const weekly = allPlayers.filter((p) => p.weeks[wk] && p.weeks[wk].pts != null);
    if (weekly.length) {
      const owned = weekly.filter((p) => ownerOfPlayer(p.id));
      const best = weekly.slice().sort((a, b) => b.weeks[wk].pts - a.weeks[wk].pts)[0];
      if (best) items.push(`BREAKOUT: ${displayName(best)} exploded for ${best.weeks[wk].pts.toFixed(1)} FPTS in Week ${wk}!`);

      const bust = owned.slice().sort((a, b) => a.weeks[wk].pts - b.weeks[wk].pts)[0];
      if (bust && bust.weeks[wk].pts < 3)
        items.push(`BUST ALERT: ${displayName(bust)} managed just ${bust.weeks[wk].pts.toFixed(1)} points, fantasy managers are fuming.`);

      const fa = weekly.filter((p) => !ownerOfPlayer(p.id)).sort((a, b) => b.weeks[wk].pts - a.weeks[wk].pts)[0];
      if (fa && fa.weeks[wk].pts >= 12)
        items.push(`WAIVER GOLD: unowned ${displayName(fa)} quietly put up ${fa.weeks[wk].pts.toFixed(1)} points.`);

      const benched = owned.filter((p) => {
        const m = ownerOfPlayer(p.id);
        const lu = m && m.lineups[wk];
        return lu && !Object.values(lu).includes(p.id);
      });
      const stud = benched.slice().sort((a, b) => b.weeks[wk].pts - a.weeks[wk].pts)[0];
      if (stud && stud.weeks[wk].pts >= 15) {
        const m = ownerOfPlayer(stud.id);
        items.push(`WOULDA COULDA: ${displayName(stud)} dropped ${stud.weeks[wk].pts.toFixed(1)} on ${esc(m.name)}'s bench.`);
      }
    }
  }

  return items.length ? items : ["Welcome to the league &mdash; play a week to get the wire rolling."];
}

const TICKER_KEY = "pff.ticker.enabled";

function tickerEnabled() {
  return localStorage.getItem(TICKER_KEY) !== "off";
}

function setTickerEnabled(on) {
  try {
    localStorage.setItem(TICKER_KEY, on ? "on" : "off");
  } catch (e) {
    console.warn("Couldn't save ticker preference", e);
  }
}

function renderLeagueTicker() {
  const bar = $("league-ticker");
  if (!bar) return;
  if (!L || L.phase === "draft" || L.phase === "offseason" || L.phase === "keepers") {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");
  const on = tickerEnabled();
  bar.classList.toggle("off", !on);
  $("league-ticker-toggle").textContent = on ? "LEAGUE WIRE \u25be ON" : "LEAGUE WIRE \u25b8 OFF";
  if (!on) return;

  const items = buildTickerItems();
  const track = $("league-ticker-track");
  const html = items.map((t) => `<span class="ticker-item">${t}</span>`).join(`<span class="ticker-dot">&#9679;</span>`);
  // Duplicated so the CSS scroll loop has no visible seam.
  track.innerHTML = html + `<span class="ticker-dot">&#9679;</span>` + html;
  // A few seconds per item so it stays readable no matter how much is queued up.
  track.style.animationDuration = `${Math.max(70, items.length * 7)}s`;
}

/* ------------------------------------------------------------- boot */

function bindSeason() {
  $("tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    activeTab = tab.dataset.tab;
    selectedBench = null;
    renderSeason();
  });
  $("manager-bar").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mgr]");
    if (!btn) return;
    L.activeManagerId = Number(btn.dataset.mgr);
    selectedBench = null;
    matchupFocusId = null;
    tradeGive = new Set();
    tradeGet = new Set();
    tradePartner = null;
    save();
    renderSeason();
  });
  $("tab-team").onclick = onTeamClick;
  $("btn-sim").addEventListener("click", () => playWeek(L.phase !== "done"));
  $("btn-sim-fast").addEventListener("click", () => playWeek(false));
  $("btn-save").addEventListener("click", () => {
    save();
    $("btn-save").textContent = "Saved!";
    setTimeout(() => ($("btn-save").textContent = "Save"), 900);
  });
  $("btn-rename-save").addEventListener("click", () => {
    if (L && L.saveId) openRenameSaveModal(L.saveId);
  });
  $("btn-quit").addEventListener("click", () => {
    save();
    L = null;
    GD = null;
    renderSaveSlots();
    render();
  });
}

function bindGameday() {
  $("gd-play").addEventListener("click", () => {
    GD.paused = !GD.paused;
    $("gd-play").textContent = GD.paused ? "Resume" : "Pause";
  });
  document.querySelectorAll(".gd-speed").forEach((b) =>
    b.addEventListener("click", () => {
      GD.speed = Number(b.dataset.speed);
      renderGameday();
    })
  );
  $("gd-skip").addEventListener("click", skipToEnd);
  $("gd-done").addEventListener("click", finishWeekButton);
}

document.addEventListener("click", (e) => {
  const rename = e.target.closest("[data-rename]");
  if (rename) {
    openRenameModal(Number(rename.dataset.rename));
    return;
  }
  const card = e.target.closest("[data-card]");
  if (card) openPlayerCard(Number(card.dataset.card));
});

$("league-ticker-toggle").addEventListener("click", () => {
  setTickerEnabled(!tickerEnabled());
  renderLeagueTicker();
});

initSetup();
bindDraft();
bindSeason();
bindGameday();
updateSetupSummary();
render();
