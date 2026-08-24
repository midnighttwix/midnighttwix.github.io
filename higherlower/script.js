const MAX_DEX_NUMBER = 1025;

const STAT_LABELS = {
  hp: "Base HP",
  attack: "Base Attack",
  defense: "Base Defense",
  "special-attack": "Base Special Attack",
  "special-defense": "Base Special Defense",
  speed: "Base Speed",
  total: "Base Stat Total",
};
const STAT_KEYS = Object.keys(STAT_LABELS);

const giveUpBtn = document.getElementById("give-up-btn");
const statusMessage = document.getElementById("status-message");
const gameView = document.getElementById("game-view");
const pokemonImg = document.getElementById("pokemon-img");
const pokemonName = document.getElementById("pokemon-name");
const promptNameEl = document.getElementById("prompt-name");
const statLabelEl = document.getElementById("stat-label");
const guessRow = document.getElementById("guess-row");
const guessInput = document.getElementById("guess-input");
const submitGuessBtn = document.getElementById("submit-guess-btn");
const feedbackMessage = document.getElementById("feedback-message");
const guessHistoryEl = document.getElementById("guess-history");
const revealCard = document.getElementById("reveal-card");
const revealMessage = document.getElementById("reveal-message");
const newRoundBtn = document.getElementById("new-round-btn");

let targetValue = null;
let targetPokemon = null;
let statKey = null;
let roundOver = false;

function capitalize(text) {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchRandomPokemon() {
  const id = Math.floor(Math.random() * MAX_DEX_NUMBER) + 1;
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!response.ok) throw new Error(`Failed to load pokemon ${id}`);
  const data = await response.json();

  const statMap = {};
  data.stats.forEach((entry) => {
    statMap[entry.stat.name] = entry.base_stat;
  });
  statMap.total = data.stats.reduce((sum, entry) => sum + entry.base_stat, 0);

  const sprite =
    data.sprites?.other?.["official-artwork"]?.front_default || data.sprites?.front_default || "";

  return {
    id: data.id,
    displayName: capitalize(data.name),
    sprite,
    statMap,
  };
}

function resetGuessUI() {
  guessInput.value = "";
  guessInput.disabled = false;
  submitGuessBtn.disabled = false;
  giveUpBtn.classList.remove("hidden");
  feedbackMessage.textContent = "";
  feedbackMessage.className = "feedback-message";
  guessHistoryEl.innerHTML = "";
  revealCard.classList.add("hidden");
  roundOver = false;
}

async function startRound() {
  statusMessage.classList.remove("hidden");
  gameView.classList.add("hidden");
  statusMessage.textContent = "Loading a Pok\u00e9mon...";

  try {
    targetPokemon = await fetchRandomPokemon();
    statKey = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
    targetValue = targetPokemon.statMap[statKey];

    pokemonImg.src = targetPokemon.sprite;
    pokemonImg.alt = targetPokemon.displayName;
    pokemonName.textContent = targetPokemon.displayName;
    promptNameEl.textContent = targetPokemon.displayName;
    statLabelEl.textContent = STAT_LABELS[statKey];

    resetGuessUI();
    statusMessage.classList.add("hidden");
    gameView.classList.remove("hidden");
    guessInput.focus();
  } catch (error) {
    statusMessage.textContent = "Something went wrong loading a Pok\u00e9mon. Try again.";
  }
}

function addHistoryRow(guess, direction) {
  const row = document.createElement("div");
  row.className = `history-row ${direction}`;

  const guessText = document.createElement("span");
  guessText.textContent = guess;

  const arrow = document.createElement("span");
  arrow.className = "history-arrow";
  arrow.textContent = direction === "higher" ? "\u25b2 Go higher" : "\u25bc Go lower";

  row.appendChild(guessText);
  row.appendChild(arrow);
  guessHistoryEl.appendChild(row);
}

function endRound(success) {
  roundOver = true;
  guessInput.disabled = true;
  submitGuessBtn.disabled = true;
  giveUpBtn.classList.add("hidden");
  revealCard.classList.remove("hidden");

  if (success) {
    revealMessage.textContent = `Correct! ${targetPokemon.displayName}'s ${STAT_LABELS[statKey]} is ${targetValue}.`;
    revealMessage.className = "reveal-message success";
  } else {
    revealMessage.textContent = `${targetPokemon.displayName}'s ${STAT_LABELS[statKey]} was ${targetValue}.`;
    revealMessage.className = "reveal-message gaveup";
  }
}

function submitGuess() {
  if (roundOver) return;

  const raw = guessInput.value.trim();
  if (raw === "") return;

  const guess = Number(raw);
  if (!Number.isFinite(guess)) return;

  if (guess === targetValue) {
    feedbackMessage.textContent = "\ud83c\udfaf Exact match!";
    feedbackMessage.className = "feedback-message correct";
    endRound(true);
    return;
  }

  const direction = targetValue > guess ? "higher" : "lower";
  addHistoryRow(guess, direction);

  feedbackMessage.textContent = direction === "higher" ? "\u25b2 Go higher!" : "\u25bc Go lower!";
  feedbackMessage.className = `feedback-message ${direction}`;

  guessInput.value = "";
  guessInput.focus();
}

submitGuessBtn.addEventListener("click", submitGuess);
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitGuess();
});
giveUpBtn.addEventListener("click", () => endRound(false));
newRoundBtn.addEventListener("click", startRound);

startRound();
