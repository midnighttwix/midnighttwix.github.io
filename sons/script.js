/* Spheal or No Spheal - one case hides a Spheal, then the cases shuffle. */

const GOAL = 3;
const PENALTY_SECONDS = 10;
const CASE_COUNT = 24;
const SPHEAL_SPRITE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/363.png";

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const winView = document.getElementById("win-view");
const startBtn = document.getElementById("start-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const stage = document.getElementById("stage");
const scoreDisplay = document.getElementById("score-display");
const statusDisplay = document.getElementById("status-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const feedback = document.getElementById("feedback");
const winNote = document.getElementById("win-note");

let cases = []; // { number, el, slot }
let sphealCase = null;
let score = 0;
let picking = false;
let penaltyTimer = null;
let timers = [];

function clearTimers() {
  timers.forEach((id) => clearTimeout(id));
  timers = [];
}

function wait(ms) {
  return new Promise((resolve) => {
    timers.push(setTimeout(resolve, ms));
  });
}

function columns() {
  return window.innerWidth < 560 ? 4 : 6;
}

function layout() {
  const cols = columns();
  const rows = Math.ceil(CASE_COUNT / cols);
  const gap = 10;
  const cellWidth = (stage.clientWidth - gap * (cols - 1)) / cols;
  const cellHeight = cellWidth * 0.78;
  stage.style.height = `${rows * cellHeight + gap * (rows - 1)}px`;

  cases.forEach((entry) => {
    const col = entry.slot % cols;
    const row = Math.floor(entry.slot / cols);
    entry.el.style.width = `${cellWidth}px`;
    entry.el.style.height = `${cellHeight}px`;
    entry.el.style.transform = `translate(${col * (cellWidth + gap)}px, ${row * (cellHeight + gap)}px)`;
  });
}

function buildCases() {
  stage.innerHTML = "";
  cases = [];
  for (let i = 0; i < CASE_COUNT; i += 1) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "case";
    el.innerHTML = `
      <span class="case-number">${i + 1}</span>
      <img class="case-spheal" src="${SPHEAL_SPRITE}" alt="Spheal" />
    `;
    const entry = { number: i + 1, el, slot: i };
    el.addEventListener("click", () => pick(entry));
    stage.appendChild(el);
    cases.push(entry);
  }
  layout();
}

function setStatus(text) {
  statusDisplay.textContent = text;
}

function updateScore() {
  scoreDisplay.textContent = `${score} / ${GOAL}`;
}

async function shuffleCases(swapCount) {
  for (let i = 0; i < swapCount; i += 1) {
    const a = cases[Math.floor(Math.random() * cases.length)];
    let b = a;
    while (b === a) b = cases[Math.floor(Math.random() * cases.length)];
    const temp = a.slot;
    a.slot = b.slot;
    b.slot = temp;
    layout();
    // Swaps overlap slightly so the board never looks like it stops moving.
    await wait(Math.max(140, 300 - i * 4));
  }
}

async function newRound() {
  picking = false;
  feedback.textContent = "";
  feedback.className = "feedback";
  stage.classList.remove("pickable");
  cases.forEach((entry) => entry.el.classList.remove("open", "hit", "miss"));

  // Reset to a clean grid before each round so the shuffle reads clearly.
  cases.forEach((entry, index) => {
    entry.slot = index;
  });
  layout();

  sphealCase = cases[Math.floor(Math.random() * cases.length)];
  setStatus("Watch the Spheal...");
  sphealCase.el.classList.add("open");
  await wait(1600);
  sphealCase.el.classList.remove("open");
  await wait(400);

  setStatus("Shuffling!");
  stage.classList.add("shuffling");
  await shuffleCases(12 + score * 5);
  stage.classList.remove("shuffling");

  setStatus("Pick the case");
  stage.classList.add("pickable");
  picking = true;
}

function startPenalty() {
  penaltyEl.classList.remove("hidden");
  setStatus("Locked out");

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
      newRound();
    }
  }, 1000);
}

function win() {
  clearTimers();
  gameView.classList.add("hidden");
  winView.classList.remove("hidden");
  winNote.textContent = `Three Spheals tracked through the shuffle. The banker is furious.`;
}

function pick(entry) {
  if (!picking) return;
  picking = false;
  stage.classList.remove("pickable");

  const correct = entry === sphealCase;
  sphealCase.el.classList.add("open");
  entry.el.classList.add(correct ? "hit" : "miss");

  if (correct) {
    score += 1;
    updateScore();
    if (score >= GOAL) {
      win();
      return;
    }
    feedback.textContent = `Spheal! Case ${entry.number} was right.`;
    feedback.className = "feedback hit";
    timers.push(setTimeout(newRound, 1600));
    return;
  }

  feedback.textContent = `No spheal. It was in case ${sphealCase.number}.`;
  feedback.className = "feedback miss";
  startPenalty();
}

function startGame() {
  clearTimers();
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  penaltyEl.classList.add("hidden");
  score = 0;
  updateScore();
  startView.classList.add("hidden");
  winView.classList.add("hidden");
  gameView.classList.remove("hidden");
  buildCases();
  newRound();
}

startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
window.addEventListener("resize", () => {
  if (cases.length) layout();
});
