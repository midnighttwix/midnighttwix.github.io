const CELL = 16; // internal grid cell size in px (canvas is scaled up via CSS for a chunky pixel look)
const DISPLAY_SCALE = 2;
const TOTAL_SECONDS = 10 * 60;
const PENALTY_SECONDS = 30;
const MAX_DEX_NUMBER = 1025;
const ORTHWORM_ID = 968;

const BASE_TICK_MS = 190; // snake move speed at level 0
const MIN_TICK_MS = 85; // fastest snake speed at max level
const LEVEL_UP_EVERY = 4; // food eaten per difficulty level
const MAX_LEVEL = 10;

const BASE_FOOD_COUNT = 1;
const MAX_FOOD_COUNT = 4;
const WORM_COUNT_THRESHOLDS = [{ atOrBelow: 5 * 60, count: 2 }];
const BASE_WORM_COUNT = 1;
const BASE_WORM_TICK_MS = 300;
const MIN_WORM_TICK_MS = 120;
const BASE_JOLT_CHANCE = 0.05; // odds a worm bursts/redirects abruptly on a given tick
const MAX_JOLT_CHANCE = 0.4;

const FINAL_RUSH_SECONDS = 2 * 60; // worms turn frantic once this little time is left
const FINAL_RUSH_WORM_TICK_MS = 70;
const FINAL_RUSH_JOLT_CHANCE = 0.6;

const HIGH_SCORE_KEY = "avoidOrthworms.highScore";

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const timerDisplay = document.getElementById("timer-display");
const scoreDisplay = document.getElementById("score-display");
const highScoreDisplay = document.getElementById("high-score-display");
const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const endView = document.getElementById("end-view");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const playField = document.getElementById("play-field");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const endMessage = document.getElementById("end-message");
const finalScoreDisplay = document.getElementById("final-score-display");

let cols = 0;
let rows = 0;
let snake = [];
let direction = DIRS.right;
let pendingDirection = DIRS.right;
let foods = [];
let worms = [];
let eatenCount = 0;
let timeRemaining = TOTAL_SECONDS;
let running = false;
let rafId = null;
let lastFrameTime = null;
let snakeAcc = 0;
let wormAcc = 0;

const spriteCache = new Map();

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/${id}.png`;
}

function getSprite(id) {
  let img = spriteCache.get(id);
  if (!img) {
    img = new Image();
    img.src = spriteUrl(id);
    spriteCache.set(id, img);
  }
  return img;
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function level() {
  return Math.min(MAX_LEVEL, Math.floor(eatenCount / LEVEL_UP_EVERY));
}

function lerp(base, max, lvl) {
  return base + (lvl / MAX_LEVEL) * (max - base);
}

function currentTickMs() {
  return lerp(BASE_TICK_MS, MIN_TICK_MS, level());
}

function currentWormTickMs() {
  if (timeRemaining <= FINAL_RUSH_SECONDS) return FINAL_RUSH_WORM_TICK_MS;
  return lerp(BASE_WORM_TICK_MS, MIN_WORM_TICK_MS, level());
}

function joltChance() {
  if (timeRemaining <= FINAL_RUSH_SECONDS) return FINAL_RUSH_JOLT_CHANCE;
  return lerp(BASE_JOLT_CHANCE, MAX_JOLT_CHANCE, level());
}

function pickRandomNonOrthwormId() {
  let id = ORTHWORM_ID;
  while (id === ORTHWORM_ID) {
    id = Math.floor(Math.random() * MAX_DEX_NUMBER) + 1;
  }
  return id;
}

function randomGridDir() {
  const keys = Object.keys(DIRS);
  return DIRS[keys[Math.floor(Math.random() * keys.length)]];
}

function setupGrid() {
  const rect = playField.getBoundingClientRect();
  cols = Math.max(16, Math.floor(rect.width / (CELL * DISPLAY_SCALE)));
  rows = Math.max(12, Math.floor(rect.height / (CELL * DISPLAY_SCALE)));
  canvas.width = cols * CELL;
  canvas.height = rows * CELL;
  canvas.style.width = `${cols * CELL * DISPLAY_SCALE}px`;
  canvas.style.height = `${rows * CELL * DISPLAY_SCALE}px`;
}

function cellFree(x, y) {
  if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
  if (snake.some((s) => s.x === x && s.y === y)) return false;
  if (foods.some((f) => f.x === x && f.y === y)) return false;
  if (worms.some((w) => w.x === x && w.y === y)) return false;
  return true;
}

function randomEmptyCell() {
  let x = 0;
  let y = 0;
  let tries = 0;
  do {
    x = Math.floor(Math.random() * cols);
    y = Math.floor(Math.random() * rows);
    tries += 1;
  } while (!cellFree(x, y) && tries < 200);
  return { x, y };
}

function ensureFood() {
  const target = Math.round(lerp(BASE_FOOD_COUNT, MAX_FOOD_COUNT, level()));
  while (foods.length < target) {
    const { x, y } = randomEmptyCell();
    foods.push({ x, y, dexId: pickRandomNonOrthwormId() });
  }
}

function targetWormCount() {
  const match = WORM_COUNT_THRESHOLDS.find((t) => timeRemaining <= t.atOrBelow);
  return match ? match.count : BASE_WORM_COUNT;
}

function ensureWorms() {
  const target = targetWormCount();
  while (worms.length < target) {
    const { x, y } = randomEmptyCell();
    worms.push({ x, y, dir: randomGridDir() });
  }
  while (worms.length > target) {
    worms.pop();
  }
}

function setDirection(dir) {
  if (snake.length > 1 && direction.x === -dir.x && direction.y === -dir.y) return;
  pendingDirection = dir;
}

function stepWorms() {
  worms.forEach((worm) => {
    const jolt = Math.random() < joltChance();
    const steps = jolt ? 2 : 1;
    if (jolt || Math.random() < 0.25) {
      worm.dir = randomGridDir();
    }
    for (let i = 0; i < steps; i += 1) {
      let nx = worm.x + worm.dir.x;
      let ny = worm.y + worm.dir.y;
      if (nx < 0 || nx >= cols) {
        worm.dir = { x: -worm.dir.x, y: worm.dir.y };
        nx = worm.x + worm.dir.x;
      }
      if (ny < 0 || ny >= rows) {
        worm.dir = { x: worm.dir.x, y: -worm.dir.y };
        ny = worm.y + worm.dir.y;
      }
      worm.x = Math.max(0, Math.min(cols - 1, nx));
      worm.y = Math.max(0, Math.min(rows - 1, ny));
    }
  });
}

function stepSnake() {
  direction = pendingDirection;
  const head = snake[0];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
    endGame("wall");
    return;
  }
  if (snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
    endGame("self");
    return;
  }

  snake.unshift(newHead);

  const wormIndex = worms.findIndex((w) => w.x === newHead.x && w.y === newHead.y);
  if (wormIndex !== -1) {
    worms.splice(wormIndex, 1);
    timeRemaining = TOTAL_SECONDS;
    timerDisplay.classList.remove("reset-flash");
    void timerDisplay.offsetWidth; // restart the flash animation
    timerDisplay.classList.add("reset-flash");
    ensureWorms();
    snake.pop();
    return;
  }

  const foodIndex = foods.findIndex((f) => f.x === newHead.x && f.y === newHead.y);
  if (foodIndex !== -1) {
    foods.splice(foodIndex, 1);
    eatenCount += 1;
    timeRemaining = Math.max(0, timeRemaining - PENALTY_SECONDS);
    ensureFood();
    ensureWorms();
  } else {
    snake.pop();
  }
}

function drawSprite(id, gx, gy) {
  const img = getSprite(id);
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, gx * CELL, gy * CELL, CELL, CELL);
  } else {
    ctx.fillStyle = "#ff2d2d";
    ctx.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);
  }
}

function draw() {
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#123c1a" : "#0e320f";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }

  foods.forEach((f) => drawSprite(f.dexId, f.x, f.y));
  worms.forEach((w) => drawSprite(ORTHWORM_ID, w.x, w.y));

  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? "#39ff6a" : "#1fbf4c";
    ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

function loop(timestamp) {
  if (!running) return;

  if (lastFrameTime === null) lastFrameTime = timestamp;
  const dt = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  timeRemaining -= dt / 1000;
  timerDisplay.textContent = formatTime(timeRemaining);
  scoreDisplay.textContent = String(eatenCount).padStart(3, "0");
  ensureWorms();

  if (timeRemaining <= 0) {
    winGame();
    return;
  }

  snakeAcc += dt;
  wormAcc += dt;

  const tickInterval = currentTickMs();
  const wormInterval = currentWormTickMs();

  while (snakeAcc >= tickInterval) {
    stepSnake();
    if (!running) return;
    snakeAcc -= tickInterval;
  }
  while (wormAcc >= wormInterval) {
    stepWorms();
    wormAcc -= wormInterval;
  }

  draw();
  rafId = requestAnimationFrame(loop);
}

function getHighScore() {
  return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
}

function updateHighScore() {
  const best = getHighScore();
  if (eatenCount > best) {
    localStorage.setItem(HIGH_SCORE_KEY, String(eatenCount));
  }
  highScoreDisplay.textContent = `HI: ${Math.max(best, eatenCount)}`;
}

function endGame(cause) {
  running = false;
  cancelAnimationFrame(rafId);
  gameView.classList.add("hidden");
  endView.classList.remove("hidden");
  const messages = {
    wall: "CRASHED INTO THE WALL!",
    self: "YOU BIT YOUR OWN TAIL!",
  };
  endMessage.textContent = messages[cause] || "GAME OVER";
  endMessage.className = "end-message";
  finalScoreDisplay.textContent = `SCORE: ${eatenCount}`;
  updateHighScore();
}

function winGame() {
  running = false;
  cancelAnimationFrame(rafId);
  gameView.classList.add("hidden");
  endView.classList.remove("hidden");
  endMessage.textContent = "YOU SURVIVED!";
  endMessage.className = "end-message success";
  finalScoreDisplay.textContent = `SCORE: ${eatenCount}`;
  updateHighScore();
}

function startGame() {
  setupGrid();

  timeRemaining = TOTAL_SECONDS;
  eatenCount = 0;
  direction = DIRS.right;
  pendingDirection = DIRS.right;

  const startX = Math.floor(cols / 2);
  const startY = Math.floor(rows / 2);
  snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  foods = [];
  worms = [];
  ensureFood();
  ensureWorms();

  startView.classList.add("hidden");
  endView.classList.add("hidden");
  gameView.classList.remove("hidden");

  timerDisplay.textContent = formatTime(timeRemaining);
  scoreDisplay.textContent = "000";
  highScoreDisplay.textContent = `HI: ${getHighScore()}`;

  running = true;
  lastFrameTime = null;
  snakeAcc = 0;
  wormAcc = 0;

  cancelAnimationFrame(rafId);
  draw();
  rafId = requestAnimationFrame(loop);
}

document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      setDirection(DIRS.up);
      e.preventDefault();
      break;
    case "ArrowDown":
    case "s":
    case "S":
      setDirection(DIRS.down);
      e.preventDefault();
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      setDirection(DIRS.left);
      e.preventDefault();
      break;
    case "ArrowRight":
    case "d":
    case "D":
      setDirection(DIRS.right);
      e.preventDefault();
      break;
    default:
      break;
  }
});

document.querySelectorAll(".dpad-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    setDirection(DIRS[btn.dataset.dir]);
  });
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

