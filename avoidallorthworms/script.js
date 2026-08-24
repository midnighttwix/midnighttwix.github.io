const TOTAL_SECONDS = 6 * 60 * 60;
const PENALTY_SECONDS = 10;
const MAX_DEX_NUMBER = 1025;
const ORTHWORM_ID = 966;

const BASE_COUNT = 10;
const MAX_COUNT = 22;
const BASE_ORTHWORM_RATIO = 0.15;
const MAX_ORTHWORM_RATIO = 0.55;
const BASE_SPEED = 40; // px per second
const MAX_SPEED = 110;
const LEVEL_UP_EVERY = 5; // successful clicks per difficulty level
const MAX_LEVEL = 10;

const timerDisplay = document.getElementById("timer-display");
const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const endView = document.getElementById("end-view");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const playField = document.getElementById("play-field");
const endMessage = document.getElementById("end-message");

let timeRemaining = TOTAL_SECONDS;
let successClicks = 0;
let pokemonList = [];
let rafId = null;
let lastFrameTime = null;
let nextEntryId = 0;
let running = false;

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function currentLevel() {
  return Math.min(MAX_LEVEL, Math.floor(successClicks / LEVEL_UP_EVERY));
}

function lerp(base, max, level) {
  return base + (level / MAX_LEVEL) * (max - base);
}

function targetCount() {
  return Math.round(lerp(BASE_COUNT, MAX_COUNT, currentLevel()));
}

function orthwormRatio() {
  return lerp(BASE_ORTHWORM_RATIO, MAX_ORTHWORM_RATIO, currentLevel());
}

function currentSpeed() {
  return lerp(BASE_SPEED, MAX_SPEED, currentLevel());
}

function pickRandomNonOrthwormId() {
  let id = ORTHWORM_ID;
  while (id === ORTHWORM_ID) {
    id = Math.floor(Math.random() * MAX_DEX_NUMBER) + 1;
  }
  return id;
}

function randomAngleVector() {
  const angle = Math.random() * Math.PI * 2;
  return { dx: Math.cos(angle), dy: Math.sin(angle) };
}

function createEntry() {
  const fieldRect = playField.getBoundingClientRect();
  const size = 56;
  const maxX = Math.max(10, fieldRect.width - size);
  const maxY = Math.max(10, fieldRect.height - size);
  const isOrthworm = Math.random() < orthwormRatio();
  const dexId = isOrthworm ? ORTHWORM_ID : pickRandomNonOrthwormId();
  const { dx, dy } = randomAngleVector();

  const el = document.createElement("img");
  el.className = "field-pokemon";
  el.src = spriteUrl(dexId);
  el.alt = isOrthworm ? "Orthworm" : "Pokémon";
  el.draggable = false;

  const entry = {
    id: nextEntryId++,
    isOrthworm,
    x: Math.random() * maxX,
    y: Math.random() * maxY,
    dx,
    dy,
    el,
  };

  el.style.left = `${entry.x}px`;
  el.style.top = `${entry.y}px`;
  el.addEventListener("click", () => handleClick(entry));

  playField.appendChild(el);
  return entry;
}

function ensurePopulation() {
  const target = targetCount();
  while (pokemonList.length < target) {
    pokemonList.push(createEntry());
  }
}

function respawnEntry(entry) {
  const index = pokemonList.indexOf(entry);
  entry.el.remove();
  const fresh = createEntry();
  if (index !== -1) pokemonList[index] = fresh;
  else pokemonList.push(fresh);
}

function showPopup(x, y, text, kind) {
  const popup = document.createElement("div");
  popup.className = `click-popup ${kind}`;
  popup.textContent = text;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  playField.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

function handleClick(entry) {
  if (!running) return;

  const x = entry.x;
  const y = entry.y;

  if (entry.isOrthworm) {
    timeRemaining = TOTAL_SECONDS;
    timerDisplay.classList.remove("reset-flash");
    void timerDisplay.offsetWidth; // restart the flash animation
    timerDisplay.classList.add("reset-flash");
    showPopup(x, y, "Orthworm! Time reset", "bad");
  } else {
    successClicks += 1;
    timeRemaining = Math.max(0, timeRemaining - PENALTY_SECONDS);
    showPopup(x, y, `-${PENALTY_SECONDS}s`, "good");
  }

  respawnEntry(entry);
  ensurePopulation();

  if (timeRemaining <= 0) {
    endGame();
  }
}

function step(timestamp) {
  if (!running) return;

  if (lastFrameTime === null) lastFrameTime = timestamp;
  const dt = Math.min(0.1, (timestamp - lastFrameTime) / 1000);
  lastFrameTime = timestamp;

  timeRemaining -= dt;
  timerDisplay.textContent = formatTime(timeRemaining);

  if (timeRemaining <= 0) {
    endGame();
    return;
  }

  const fieldRect = playField.getBoundingClientRect();
  const size = 56;
  const maxX = Math.max(10, fieldRect.width - size);
  const maxY = Math.max(10, fieldRect.height - size);
  const speed = currentSpeed();

  pokemonList.forEach((entry) => {
    entry.x += entry.dx * speed * dt;
    entry.y += entry.dy * speed * dt;

    if (entry.x <= 0) {
      entry.x = 0;
      entry.dx = Math.abs(entry.dx);
    } else if (entry.x >= maxX) {
      entry.x = maxX;
      entry.dx = -Math.abs(entry.dx);
    }

    if (entry.y <= 0) {
      entry.y = 0;
      entry.dy = Math.abs(entry.dy);
    } else if (entry.y >= maxY) {
      entry.y = maxY;
      entry.dy = -Math.abs(entry.dy);
    }

    entry.el.style.left = `${entry.x}px`;
    entry.el.style.top = `${entry.y}px`;
  });

  ensurePopulation();
  rafId = requestAnimationFrame(step);
}

function startGame() {
  timeRemaining = TOTAL_SECONDS;
  successClicks = 0;
  lastFrameTime = null;

  playField.innerHTML = "";
  pokemonList = [];

  startView.classList.add("hidden");
  endView.classList.add("hidden");
  gameView.classList.remove("hidden");

  timerDisplay.textContent = formatTime(timeRemaining);

  running = true;
  ensurePopulation();

  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(step);
}

function endGame() {
  running = false;
  cancelAnimationFrame(rafId);
  gameView.classList.add("hidden");
  endView.classList.remove("hidden");
  endMessage.textContent = "Congrats! You made it to zero!";
  endMessage.className = "end-message success";
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
