/* Maze Runner - memorize the lit path, then walk it from memory. */

const SIZE = 7;
const PENALTY_SECONDS = 10;
const MIN_PATH = 12;
const MAX_PATH = 18;

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const winView = document.getElementById("win-view");
const startBtn = document.getElementById("start-btn");
const readyBtn = document.getElementById("ready-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const mazeEl = document.getElementById("maze");
const stepsDisplay = document.getElementById("steps-display");
const statusDisplay = document.getElementById("status-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const feedback = document.getElementById("feedback");
const winNote = document.getElementById("win-note");

const DIRECTIONS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

let path = []; // [{x, y}] from entrance to exit
let cells = new Map(); // "x,y" -> element
let progress = 0;
let running = false;
let penaltyTimer = null;

function key(x, y) {
  return `${x},${y}`;
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPath() {
  const start = { x: 0, y: SIZE - 1 };
  const goal = { x: SIZE - 1, y: 0 };

  // Randomised depth-first search: the first route it finds to the goal is the maze.
  const stack = [start];
  const seen = new Set([key(start.x, start.y)]);

  while (stack.length) {
    const current = stack[stack.length - 1];
    if (current.x === goal.x && current.y === goal.y && stack.length >= MIN_PATH) {
      return stack.slice();
    }

    const options = shuffle(Object.values(DIRECTIONS))
      .map(([dx, dy]) => ({ x: current.x + dx, y: current.y + dy }))
      .filter(
        (next) =>
          next.x >= 0 &&
          next.y >= 0 &&
          next.x < SIZE &&
          next.y < SIZE &&
          !seen.has(key(next.x, next.y))
      );

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const next = options[0];
    seen.add(key(next.x, next.y));
    stack.push(next);
  }

  return null;
}

function findPath() {
  // The first DFS hit is often a long rambling route, so resample for a memorable length.
  let best = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const candidate = buildPath();
    if (!candidate) continue;
    if (candidate.length <= MAX_PATH) return candidate;
    if (!best || candidate.length < best.length) best = candidate;
  }
  return best;
}

function buildGrid() {
  mazeEl.innerHTML = "";
  cells = new Map();
  mazeEl.style.setProperty("--size", SIZE);

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener("click", () => tapCell(x, y));
      mazeEl.appendChild(cell);
      cells.set(key(x, y), cell);
    }
  }
}

function paint({ showPath }) {
  cells.forEach((cell) => {
    cell.className = "cell";
  });

  path.forEach((point, index) => {
    const cell = cells.get(key(point.x, point.y));
    if (showPath) cell.classList.add("path");
    if (index === 0) cell.classList.add("entrance");
    if (index === path.length - 1) cell.classList.add("exit");
    if (!showPath && index <= progress) cell.classList.add("walked");
  });

  const runner = path[progress];
  cells.get(key(runner.x, runner.y)).classList.add("runner");
}

function newMaze() {
  path = findPath();
  progress = 0;
  running = false;
  stepsDisplay.textContent = "0";
  statusDisplay.textContent = "Memorize it";
  feedback.textContent = "";
  feedback.className = "feedback";
  readyBtn.classList.remove("hidden");
  paint({ showPath: true });
}

function beginRun() {
  running = true;
  statusDisplay.textContent = "Run it!";
  readyBtn.classList.add("hidden");
  paint({ showPath: false });
}

function startPenalty() {
  running = false;
  penaltyEl.classList.remove("hidden");
  statusDisplay.textContent = "Locked out";
  paint({ showPath: true });

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
      newMaze();
    }
  }, 1000);
}

function win() {
  running = false;
  gameView.classList.add("hidden");
  winView.classList.remove("hidden");
  winNote.textContent = `You walked all ${path.length - 1} steps from memory.`;
}

function step(dx, dy) {
  if (!running) return;

  const current = path[progress];
  const target = { x: current.x + dx, y: current.y + dy };
  if (target.x < 0 || target.y < 0 || target.x >= SIZE || target.y >= SIZE) return;

  const expected = path[progress + 1];
  if (expected && target.x === expected.x && target.y === expected.y) {
    progress += 1;
    stepsDisplay.textContent = String(progress);
    paint({ showPath: false });
    if (progress === path.length - 1) win();
    return;
  }

  const cell = cells.get(key(target.x, target.y));
  cell.classList.add("wrong");
  feedback.textContent = "Wrong turn! Here's the route you missed.";
  feedback.className = "feedback miss";
  startPenalty();
}

function tapCell(x, y) {
  if (!running) return;
  const current = path[progress];
  const dx = x - current.x;
  const dy = y - current.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return;
  step(dx, dy);
}

function startGame() {
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  penaltyEl.classList.add("hidden");
  startView.classList.add("hidden");
  winView.classList.add("hidden");
  gameView.classList.remove("hidden");
  buildGrid();
  newMaze();
}

startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
readyBtn.addEventListener("click", beginRun);

document.querySelectorAll(".dpad-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const [dx, dy] = DIRECTIONS[button.dataset.dir];
    step(dx, dy);
  });
});

document.addEventListener("keydown", (event) => {
  const map = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };
  const dir = map[event.key] || map[event.key.toLowerCase?.()];
  if (!dir) return;
  event.preventDefault();
  const [dx, dy] = DIRECTIONS[dir];
  step(dx, dy);
});
