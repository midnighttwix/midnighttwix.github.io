const MAX_DEX_NUMBER = 1025;
const GAME_DURATION_SECONDS = 90;
const STREAK_GOAL = 3;
const PENALTY_MS = 10000;

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const endView = document.getElementById("end-view");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const timerDisplay = document.getElementById("timer-display");
const streakDisplay = document.getElementById("streak-display");
const pokemonImg = document.getElementById("pokemon-img");
const pokemonName = document.getElementById("pokemon-name");
const correctBtn = document.getElementById("correct-btn");
const skipBtn = document.getElementById("skip-btn");
const endMessage = document.getElementById("end-message");
const penaltyMessage = document.getElementById("penalty-message");

let secondsLeft = GAME_DURATION_SECONDS;
let timerId = null;
let streak = 0;
let lastId = null;
let penaltyTimer = null;

function capitalize(text) {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function fetchRandomName(id) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!response.ok) throw new Error(`Failed to load pokemon ${id}`);
  const data = await response.json();
  return data.name;
}

function pickRandomId(exclude) {
  let id = exclude;
  while (id === exclude) {
    id = Math.floor(Math.random() * MAX_DEX_NUMBER) + 1;
  }
  return id;
}

async function showNextPokemon() {
  const id = pickRandomId(lastId);
  lastId = id;
  pokemonImg.src = spriteUrl(id);

  try {
    const name = await fetchRandomName(id);
    pokemonName.textContent = capitalize(name);
    pokemonImg.alt = capitalize(name);
  } catch (error) {
    pokemonName.textContent = "";
  }
}

function updateStreakDisplay() {
  streakDisplay.textContent = `${streak} / ${STREAK_GOAL} in a row`;
}

function tick() {
  secondsLeft -= 1;
  timerDisplay.textContent = formatTime(Math.max(0, secondsLeft));
  timerDisplay.classList.toggle("low-time", secondsLeft <= 15);

  if (secondsLeft <= 0) {
    endGame(false);
  }
}

function markCorrect() {
  streak += 1;
  updateStreakDisplay();

  if (streak >= STREAK_GOAL) {
    endGame(true);
    return;
  }

  showNextPokemon();
}

function clearPenalty() {
  if (penaltyTimer) {
    window.clearTimeout(penaltyTimer);
    penaltyTimer = null;
  }
  penaltyMessage.classList.add("hidden");
  correctBtn.disabled = false;
  skipBtn.disabled = false;
}

function startPenalty() {
  const until = Date.now() + PENALTY_MS;
  correctBtn.disabled = true;
  skipBtn.disabled = true;
  penaltyMessage.classList.remove("hidden");

  const tick = () => {
    const secondsRemaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    if (secondsRemaining <= 0) {
      clearPenalty();
      showNextPokemon();
      return;
    }
    penaltyMessage.textContent = `Penalty! Next Pok\u00e9mon in ${secondsRemaining}s...`;
    penaltyTimer = window.setTimeout(tick, 1000);
  };

  if (penaltyTimer) window.clearTimeout(penaltyTimer);
  tick();
}

function markSkip() {
  streak = 0;
  updateStreakDisplay();
  startPenalty();
}

function startGame() {
  secondsLeft = GAME_DURATION_SECONDS;
  streak = 0;
  lastId = null;
  clearPenalty();

  startView.classList.add("hidden");
  endView.classList.add("hidden");
  gameView.classList.remove("hidden");

  timerDisplay.textContent = formatTime(secondsLeft);
  timerDisplay.classList.remove("low-time");
  updateStreakDisplay();
  showNextPokemon();

  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

function endGame(success) {
  clearInterval(timerId);
  clearPenalty();
  gameView.classList.add("hidden");
  endView.classList.remove("hidden");

  if (success) {
    endMessage.textContent = "Congrats! You got 3 in a row!";
    endMessage.className = "end-message success";
  } else {
    endMessage.textContent = "Time's up! Better luck next time.";
    endMessage.className = "end-message failure";
  }
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
correctBtn.addEventListener("click", markCorrect);
skipBtn.addEventListener("click", markSkip);
