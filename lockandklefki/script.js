/* Lock & Klefki - flip two cards, match each Klefki to the lock of its colour. */

const PENALTY_SECONDS = 10;
const MISSES_BEFORE_PENALTY = 1;
const FLIP_BACK_MS = 900;

const KLEFKI_SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/707.png";

/* Eight clearly distinct hues - anything closer and matching becomes a colour
   perception test rather than a memory test. */
const COLORS = [
  { name: "Red", hex: "#d94141" },
  { name: "Orange", hex: "#e08a2e" },
  { name: "Yellow", hex: "#d7bd2b" },
  { name: "Green", hex: "#3fa45c" },
  { name: "Teal", hex: "#28a3a3" },
  { name: "Blue", hex: "#3f77d1" },
  { name: "Purple", hex: "#8a5cc7" },
  { name: "Pink", hex: "#d45a9c" },
];

const boardEl = document.getElementById("board");
const pairsEl = document.getElementById("pairs-display");
const flipsEl = document.getElementById("flips-display");
const statusEl = document.getElementById("status-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const winEl = document.getElementById("win-screen");
const winNoteEl = document.getElementById("win-note");

let firstPick = null;
let busy = false;
let matched = 0;
let flips = 0;
let missStreak = 0;
let penaltyTimer = null;

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function padlockSvg(hex) {
  return `<svg class="art" viewBox="0 0 64 64" role="img" aria-hidden="true">
    <path d="M20 30V22a12 12 0 0 1 24 0v8" fill="none" stroke="${hex}" stroke-width="7" stroke-linecap="round" />
    <rect x="12" y="29" width="40" height="30" rx="6" fill="${hex}" />
    <circle cx="32" cy="42" r="5" fill="#f4f2ec" />
    <rect x="30" y="44" width="4" height="9" rx="2" fill="#f4f2ec" />
  </svg>`;
}

function cardFace(entry) {
  if (entry.kind === "lock") return padlockSvg(entry.color.hex);
  return `<img class="art" src="${KLEFKI_SPRITE}" alt="Klefki" loading="lazy" />`;
}

function buildBoard() {
  const deck = shuffle(
    COLORS.flatMap((color) => [
      { color, kind: "klefki" },
      { color, kind: "lock" },
    ])
  );

  boardEl.innerHTML = deck
    .map((entry, i) => {
      const label = `${entry.color.name} ${entry.kind === "lock" ? "lock" : "Klefki"}`;
      return `<button class="card" type="button" data-i="${i}" data-color="${entry.color.name}" data-kind="${entry.kind}" aria-label="Hidden card ${i + 1}">
        <span class="card-inner">
          <span class="face face-back" aria-hidden="true">?</span>
          <span class="face face-front ${entry.kind}" style="color:${entry.color.hex}" data-label="${label}">
            ${cardFace(entry)}
          </span>
        </span>
      </button>`;
    })
    .join("");
}

function updateGauges() {
  pairsEl.textContent = `${matched} / ${COLORS.length}`;
  flipsEl.textContent = String(flips);
}

function setStatus(text, bad) {
  statusEl.textContent = text;
  statusEl.className = `gauge-value ${bad ? "status-bad" : "status-ok"}`;
}

function startPenalty() {
  let left = PENALTY_SECONDS;
  penaltyCountEl.textContent = String(left);
  penaltyEl.classList.remove("hidden");
  boardEl.classList.add("locked");
  penaltyTimer = setInterval(() => {
    left -= 1;
    penaltyCountEl.textContent = String(Math.max(0, left));
    if (left <= 0) {
      clearInterval(penaltyTimer);
      penaltyTimer = null;
      penaltyEl.classList.add("hidden");
      boardEl.classList.remove("locked");
      setStatus("Back in - pick a card");
    }
  }, 1000);
}

function win() {
  boardEl.classList.add("locked");
  setStatus("All matched!");
  winNoteEl.textContent = `Every Klefki found its lock in ${flips} flips.`;
  winEl.classList.remove("hidden");
}

function onPick(card) {
  if (busy || penaltyTimer) return;
  if (card.classList.contains("flipped") || card.classList.contains("matched")) return;

  card.classList.add("flipped");
  card.disabled = true;
  flips += 1;
  updateGauges();

  if (!firstPick) {
    firstPick = card;
    setStatus("Find its partner");
    return;
  }

  const a = firstPick;
  const b = card;
  firstPick = null;

  const sameColor = a.dataset.color === b.dataset.color;
  const differentKind = a.dataset.kind !== b.dataset.kind;

  if (sameColor && differentKind) {
    a.classList.add("matched");
    b.classList.add("matched");
    matched += 1;
    missStreak = 0;
    updateGauges();
    if (matched === COLORS.length) {
      win();
      return;
    }
    setStatus(`${a.dataset.color} pair locked in`);
    return;
  }

  // Miss: show both briefly, then flip back.
  busy = true;
  missStreak += 1;
  a.classList.add("wrong");
  b.classList.add("wrong");
  setStatus("No match", true);

  setTimeout(() => {
    [a, b].forEach((c) => {
      c.classList.remove("flipped", "wrong");
      c.disabled = false;
    });
    busy = false;
    if (missStreak >= MISSES_BEFORE_PENALTY) {
      missStreak = 0;
      startPenalty();
    }
  }, FLIP_BACK_MS);
}

function reset() {
  if (penaltyTimer) {
    clearInterval(penaltyTimer);
    penaltyTimer = null;
  }
  penaltyEl.classList.add("hidden");
  winEl.classList.add("hidden");
  boardEl.classList.remove("locked");
  firstPick = null;
  busy = false;
  matched = 0;
  flips = 0;
  missStreak = 0;
  buildBoard();
  updateGauges();
  setStatus("Pick a card");
}

boardEl.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) onPick(card);
});
document.getElementById("play-again").addEventListener("click", reset);

reset();
