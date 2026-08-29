/* Pokemon Crossword - generated grid, dex-entry clues, 90 second clock. */

const TIME_LIMIT = 90;
const PENALTY_SECONDS = 10;
const ACROSS_TARGET = 5;
const DOWN_TARGET = 5;

const FORM_SUFFIXES = [
  "-normal", "-plant", "-altered", "-land", "-red-striped", "-standard", "-male",
  "-incarnate", "-ordinary", "-aria", "-shield", "-average", "-50", "-baile",
  "-midday", "-solo", "-red-meteor", "-disguised", "-amped", "-ice", "-full-belly",
  "-single-strike", "-zero", "-curly", "-two-segment", "-family-of-four",
  "-green-plumage",
];

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const winView = document.getElementById("win-view");
const startBtn = document.getElementById("start-btn");
const checkBtn = document.getElementById("check-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const gridEl = document.getElementById("grid");
const acrossList = document.getElementById("across-list");
const downList = document.getElementById("down-list");
const activeClue = document.getElementById("active-clue");
const timerEl = document.getElementById("timer");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const feedback = document.getElementById("feedback");
const winNote = document.getElementById("win-note");

function speciesName(slug) {
  const suffix = FORM_SUFFIXES.find((end) => slug.endsWith(end));
  return suffix ? slug.slice(0, -suffix.length) : slug;
}

// One clue per species, pulled from its dex flavor text with the name blanked out.
const CLUES = (() => {
  const map = new Map();
  DEX_ENTRIES.forEach(([id, name, text]) => {
    if (!map.has(id)) map.set(id, []);
    map.get(id).push({ name, text });
  });
  return map;
})();

const WORDS = POKEDEX.map((entry) => ({ ...entry, word: speciesName(entry.name).toUpperCase() }))
  .filter((entry) => /^[A-Z]{4,9}$/.test(entry.word) && CLUES.has(entry.id));

let puzzle = null;
let cellInputs = new Map(); // "x,y" -> input
let activeEntry = null;
let direction = "across";
let secondsLeft = TIME_LIMIT;
let clockTimer = null;
let penaltyTimer = null;

function key(x, y) {
  return `${x},${y}`;
}

function randomOf(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clueFor(entry) {
  const options = CLUES.get(entry.id) || [];
  const pick = randomOf(options);
  if (!pick) return "A Pok\u00e9mon.";
  const bare = speciesName(entry.name);
  return pick.text.replace(new RegExp(bare, "gi"), "\u2014\u2014\u2014").replace(/\s+/g, " ").trim();
}

/* --------------------------------------------------------- generation */

function canPlace(grid, word, x, y, dir) {
  const dx = dir === "across" ? 1 : 0;
  const dy = dir === "across" ? 0 : 1;
  let crossings = 0;

  // The cells just before and just after the word must stay empty.
  if (grid.has(key(x - dx, y - dy))) return null;
  if (grid.has(key(x + dx * word.length, y + dy * word.length))) return null;

  for (let i = 0; i < word.length; i += 1) {
    const cx = x + dx * i;
    const cy = y + dy * i;
    const existing = grid.get(key(cx, cy));

    if (existing) {
      if (existing !== word[i]) return null;
      crossings += 1;
      continue;
    }

    // An empty cell must not sit beside another word running the other way.
    const sideA = key(cx + dy, cy + dx);
    const sideB = key(cx - dy, cy - dx);
    if (grid.has(sideA) || grid.has(sideB)) return null;
  }

  return crossings;
}

function buildPuzzle() {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const grid = new Map();
    const pool = shuffle(WORDS).slice(0, 90);
    const placed = [];

    const first = pool.pop();
    for (let i = 0; i < first.word.length; i += 1) {
      grid.set(key(i, 0), first.word[i]);
    }
    placed.push({ entry: first, x: 0, y: 0, dir: "across" });

    let across = 1;
    let down = 0;

    for (const candidate of pool) {
      if (across >= ACROSS_TARGET && down >= DOWN_TARGET) break;

      const wantDown = down < DOWN_TARGET;
      const wantAcross = across < ACROSS_TARGET;
      let done = false;

      for (const anchor of shuffle(placed)) {
        const dir = anchor.dir === "across" ? "down" : "across";
        if (dir === "down" && !wantDown) continue;
        if (dir === "across" && !wantAcross) continue;

        const anchorWord = anchor.entry.word;
        for (let ai = 0; ai < anchorWord.length && !done; ai += 1) {
          const letter = anchorWord[ai];
          for (let ci = 0; ci < candidate.word.length && !done; ci += 1) {
            if (candidate.word[ci] !== letter) continue;

            const ax = anchor.dir === "across" ? anchor.x + ai : anchor.x;
            const ay = anchor.dir === "across" ? anchor.y : anchor.y + ai;
            const x = dir === "across" ? ax - ci : ax;
            const y = dir === "across" ? ay : ay - ci;

            if (canPlace(grid, candidate.word, x, y, dir) === null) continue;

            const dx = dir === "across" ? 1 : 0;
            const dy = dir === "across" ? 0 : 1;
            for (let i = 0; i < candidate.word.length; i += 1) {
              grid.set(key(x + dx * i, y + dy * i), candidate.word[i]);
            }
            placed.push({ entry: candidate, x, y, dir });
            if (dir === "across") across += 1;
            else down += 1;
            done = true;
          }
        }
        if (done) break;
      }
    }

    if (across === ACROSS_TARGET && down === DOWN_TARGET) {
      const built = describe(grid, placed);
      if (built) return built;
    }
  }

  return null;
}

/* Read the finished grid back out so numbering matches what a solver actually sees. */
function describe(grid, placed) {
  const xs = [...grid.keys()].map((k) => Number(k.split(",")[0]));
  const ys = [...grid.keys()].map((k) => Number(k.split(",")[1]));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX + 1;
  const height = Math.max(...ys) - minY + 1;

  const shifted = new Map();
  grid.forEach((letter, k) => {
    const [x, y] = k.split(",").map(Number);
    shifted.set(key(x - minX, y - minY), letter);
  });

  const wordAt = new Map();
  placed.forEach((item) => {
    wordAt.set(`${item.dir}:${key(item.x - minX, item.y - minY)}`, item.entry);
  });

  const entries = [];
  let number = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!shifted.has(key(x, y))) continue;
      const startsAcross = !shifted.has(key(x - 1, y)) && shifted.has(key(x + 1, y));
      const startsDown = !shifted.has(key(x, y - 1)) && shifted.has(key(x, y + 1));
      if (!startsAcross && !startsDown) continue;

      number += 1;
      if (startsAcross) {
        const entry = wordAt.get(`across:${key(x, y)}`);
        if (!entry) return null;
        entries.push({ number, dir: "across", x, y, entry });
      }
      if (startsDown) {
        const entry = wordAt.get(`down:${key(x, y)}`);
        if (!entry) return null;
        entries.push({ number, dir: "down", x, y, entry });
      }
    }
  }

  if (entries.filter((e) => e.dir === "across").length !== ACROSS_TARGET) return null;
  if (entries.filter((e) => e.dir === "down").length !== DOWN_TARGET) return null;

  entries.forEach((item) => {
    item.clue = clueFor(item.entry);
    item.cells = [];
    for (let i = 0; i < item.entry.word.length; i += 1) {
      item.cells.push(
        item.dir === "across" ? key(item.x + i, item.y) : key(item.x, item.y + i)
      );
    }
  });

  return { grid: shifted, width, height, entries };
}

/* ------------------------------------------------------------ render */

function renderGrid() {
  gridEl.innerHTML = "";
  gridEl.style.setProperty("--cols", puzzle.width);
  cellInputs = new Map();

  const numbers = new Map();
  puzzle.entries.forEach((item) => {
    if (!numbers.has(key(item.x, item.y))) numbers.set(key(item.x, item.y), item.number);
  });

  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      const cell = document.createElement("div");
      const id = key(x, y);

      if (!puzzle.grid.has(id)) {
        cell.className = "cell block";
        gridEl.appendChild(cell);
        continue;
      }

      cell.className = "cell";
      if (numbers.has(id)) {
        const tag = document.createElement("span");
        tag.className = "cell-number";
        tag.textContent = numbers.get(id);
        cell.appendChild(tag);
      }

      const input = document.createElement("input");
      input.className = "cell-input";
      input.type = "text";
      input.maxLength = 1;
      input.autocomplete = "off";
      input.dataset.pos = id;
      input.addEventListener("focus", () => onFocusCell(id));
      input.addEventListener("input", () => onType(input, id));
      input.addEventListener("keydown", (event) => onKey(event, id));
      cell.appendChild(input);
      cellInputs.set(id, input);
      gridEl.appendChild(cell);
    }
  }
}

function renderClues() {
  acrossList.innerHTML = "";
  downList.innerHTML = "";

  puzzle.entries.forEach((item) => {
    const li = document.createElement("li");
    li.className = "clue";
    li.dataset.number = item.number;
    li.dataset.dir = item.dir;
    li.innerHTML = `<span class="clue-number">${item.number}</span><span class="clue-text">${item.clue}</span>`;
    li.addEventListener("click", () => {
      direction = item.dir;
      cellInputs.get(item.cells[0])?.focus();
    });
    (item.dir === "across" ? acrossList : downList).appendChild(li);
  });
}

function entriesAt(id) {
  return puzzle.entries.filter((item) => item.cells.includes(id));
}

function highlight() {
  cellInputs.forEach((input) => input.parentElement.classList.remove("active-word"));
  document.querySelectorAll(".clue").forEach((li) => li.classList.remove("active"));

  if (!activeEntry) {
    activeClue.textContent = "";
    return;
  }

  activeEntry.cells.forEach((id) => {
    cellInputs.get(id)?.parentElement.classList.add("active-word");
  });
  const li = document.querySelector(
    `.clue[data-number="${activeEntry.number}"][data-dir="${activeEntry.dir}"]`
  );
  li?.classList.add("active");
  activeClue.textContent = `${activeEntry.number} ${
    activeEntry.dir === "across" ? "Across" : "Down"
  }: ${activeEntry.clue}`;
}

function onFocusCell(id) {
  const options = entriesAt(id);
  activeEntry =
    options.find((item) => item.dir === direction) || options[0] || null;
  if (activeEntry) direction = activeEntry.dir;
  highlight();
}

function moveWithin(id, delta) {
  if (!activeEntry) return;
  const index = activeEntry.cells.indexOf(id);
  const next = activeEntry.cells[index + delta];
  if (next) cellInputs.get(next)?.focus();
}

function onType(input, id) {
  input.value = input.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 1);
  input.parentElement.classList.remove("wrong");
  if (input.value) moveWithin(id, 1);
  if (isComplete()) checkGrid({ auto: true });
}

function onKey(event, id) {
  const input = cellInputs.get(id);
  if (event.key === "Backspace" && !input.value) {
    event.preventDefault();
    moveWithin(id, -1);
    return;
  }
  const moves = {
    ArrowRight: [1, 0],
    ArrowLeft: [-1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  if (moves[event.key]) {
    event.preventDefault();
    const [dx, dy] = moves[event.key];
    direction = dx !== 0 ? "across" : "down";
    const [x, y] = id.split(",").map(Number);
    for (let step = 1; step < 20; step += 1) {
      const target = cellInputs.get(key(x + dx * step, y + dy * step));
      if (target) {
        target.focus();
        return;
      }
    }
    onFocusCell(id);
  } else if (event.key === " ") {
    event.preventDefault();
    direction = direction === "across" ? "down" : "across";
    onFocusCell(id);
  }
}

function isComplete() {
  return [...cellInputs.values()].every((input) => input.value);
}

/* ------------------------------------------------------------- flow */

function formatTime(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function stopClock() {
  clearInterval(clockTimer);
  clockTimer = null;
}

function startClock() {
  secondsLeft = TIME_LIMIT;
  timerEl.textContent = formatTime(secondsLeft);
  timerEl.classList.remove("low");
  stopClock();
  clockTimer = setInterval(() => {
    secondsLeft -= 1;
    timerEl.textContent = formatTime(Math.max(0, secondsLeft));
    timerEl.classList.toggle("low", secondsLeft <= 15);
    if (secondsLeft <= 0) timeUp();
  }, 1000);
}

function revealAnswers() {
  cellInputs.forEach((input, id) => {
    input.value = puzzle.grid.get(id);
    input.disabled = true;
    input.parentElement.classList.add("revealed");
  });
}

function timeUp() {
  stopClock();
  revealAnswers();
  feedback.textContent = "Time! Here's the finished grid.";
  feedback.className = "feedback miss";
  penaltyEl.classList.remove("hidden");

  let left = PENALTY_SECONDS;
  penaltyCountEl.textContent = String(left);
  clearInterval(penaltyTimer);
  penaltyTimer = setInterval(() => {
    left -= 1;
    penaltyCountEl.textContent = String(Math.max(0, left));
    if (left <= 0) {
      clearInterval(penaltyTimer);
      penaltyTimer = null;
      penaltyEl.classList.add("hidden");
      newPuzzle();
    }
  }, 1000);
}

function win() {
  stopClock();
  gameView.classList.add("hidden");
  winView.classList.remove("hidden");
  const used = TIME_LIMIT - secondsLeft;
  winNote.textContent = `Filled in ${used} second${used === 1 ? "" : "s"} with ${secondsLeft} to spare.`;
}

function checkGrid({ auto } = {}) {
  let wrong = 0;
  cellInputs.forEach((input, id) => {
    const ok = input.value === puzzle.grid.get(id);
    input.parentElement.classList.toggle("wrong", Boolean(input.value) && !ok);
    if (!ok) wrong += 1;
  });

  if (wrong === 0) {
    win();
    return;
  }

  if (!auto) {
    feedback.textContent = `${wrong} square${wrong === 1 ? "" : "s"} still off.`;
    feedback.className = "feedback miss";
  }
}

/* Generation is cheap, so sample a handful and keep the most compact grid -
   sprawling 22-wide boards are unreadable on a phone. */
function pickPuzzle() {
  let best = null;
  for (let i = 0; i < 40; i += 1) {
    const candidate = buildPuzzle();
    if (!candidate) continue;
    if (candidate.width <= 14 && candidate.height <= 14) return candidate;
    const area = candidate.width * candidate.height;
    if (!best || area < best.width * best.height) best = candidate;
  }
  return best;
}

function newPuzzle() {
  puzzle = pickPuzzle();
  if (!puzzle) {
    feedback.textContent = "Couldn't build a grid \u2014 try again.";
    feedback.className = "feedback miss";
    return;
  }
  activeEntry = null;
  direction = "across";
  feedback.textContent = "";
  feedback.className = "feedback";
  renderGrid();
  renderClues();
  highlight();
  startClock();
  cellInputs.get(puzzle.entries[0].cells[0])?.focus();
}

function startGame() {
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  penaltyEl.classList.add("hidden");
  startView.classList.add("hidden");
  winView.classList.add("hidden");
  gameView.classList.remove("hidden");
  newPuzzle();
}

startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
checkBtn.addEventListener("click", () => checkGrid());
