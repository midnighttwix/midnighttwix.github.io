/* Go Farfetch - giver fetches household objects, guesser names the Pokemon. */

const GOAL = 3;
const PENALTY_SECONDS = 10;
const MAX_SUGGESTIONS = 6;

// POKEDEX stores one entry per dex number, so a handful of species carry their default
// form in the slug (e.g. "urshifu-single-strike"). Nobody guesses those, so trim them.
const FORM_SUFFIXES = [
  "-normal", "-plant", "-altered", "-land", "-red-striped", "-standard", "-male",
  "-incarnate", "-ordinary", "-aria", "-shield", "-average", "-50", "-baile",
  "-midday", "-solo", "-red-meteor", "-disguised", "-amped", "-ice", "-full-belly",
  "-single-strike", "-zero", "-curly", "-two-segment", "-family-of-four",
  "-green-plumage",
];

function speciesName(slug) {
  const suffix = FORM_SUFFIXES.find((end) => slug.endsWith(end));
  return suffix ? slug.slice(0, -suffix.length) : slug;
}

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const winView = document.getElementById("win-view");
const startBtn = document.getElementById("start-btn");
const rerollBtn = document.getElementById("reroll-btn");
const readyBtn = document.getElementById("ready-btn");
const submitBtn = document.getElementById("submit-btn");
const revealBtn = document.getElementById("reveal-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const giverPhase = document.getElementById("giver-phase");
const guessPhase = document.getElementById("guess-phase");
const targetImg = document.getElementById("target-img");
const targetName = document.getElementById("target-name");
const guessInput = document.getElementById("guess-input");
const suggestionsEl = document.getElementById("suggestions");
const scoreDisplay = document.getElementById("score-display");
const phaseDisplay = document.getElementById("phase-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const resultMessage = document.getElementById("result-message");
const winNote = document.getElementById("win-note");

let target = null;
let score = 0;
let rounds = 0;
let penaltyTimer = null;

function capitalize(name) {
  return speciesName(name)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalize(text) {
  return speciesName(text.toLowerCase().trim()).replace(/[^a-z0-9]/g, "");
}

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function pickPokemon(excludeId) {
  let pick = null;
  while (!pick || pick.id === excludeId) {
    pick = POKEDEX[Math.floor(Math.random() * POKEDEX.length)];
  }
  return pick;
}

function hideSuggestions() {
  suggestionsEl.classList.add("hidden");
  suggestionsEl.innerHTML = "";
}

function renderSuggestions(query) {
  const needle = normalize(query);
  if (!needle) {
    hideSuggestions();
    return;
  }

  const starts = [];
  const contains = [];
  for (const entry of POKEDEX) {
    const flat = normalize(entry.name);
    if (flat.startsWith(needle)) starts.push(entry);
    else if (flat.includes(needle)) contains.push(entry);
    if (starts.length >= MAX_SUGGESTIONS) break;
  }
  const matches = [...starts, ...contains].slice(0, MAX_SUGGESTIONS);

  if (matches.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsEl.innerHTML = "";
  matches.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion";
    button.textContent = capitalize(entry.name);
    button.addEventListener("click", () => {
      guessInput.value = capitalize(entry.name);
      hideSuggestions();
      submitGuess();
    });
    suggestionsEl.appendChild(button);
  });
  suggestionsEl.classList.remove("hidden");
}

function updateScore() {
  scoreDisplay.textContent = `${score} / ${GOAL}`;
}

function setPhase(name) {
  const giving = name === "give";
  giverPhase.classList.toggle("hidden", !giving);
  guessPhase.classList.toggle("hidden", giving);
  phaseDisplay.textContent = giving ? "Giver's turn" : "Guesser's turn";
}

function newTarget() {
  target = pickPokemon(target?.id);
  targetImg.src = spriteUrl(target.id);
  targetImg.alt = capitalize(target.name);
  targetName.textContent = capitalize(target.name);
  guessInput.value = "";
  hideSuggestions();
  setPhase("give");
}

function startPenalty(message) {
  resultMessage.textContent = message;
  resultMessage.className = "result-message miss";
  guessPhase.classList.add("hidden");
  giverPhase.classList.add("hidden");
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
      resultMessage.textContent = "";
      resultMessage.className = "result-message";
      newTarget();
    }
  }, 1000);
}

function win() {
  gameView.classList.add("hidden");
  winView.classList.remove("hidden");
  winNote.textContent = `${GOAL} Pok\u00e9mon fetched in ${rounds} round${rounds === 1 ? "" : "s"}.`;
}

function submitGuess() {
  if (penaltyTimer || guessPhase.classList.contains("hidden")) return;
  const typed = guessInput.value.trim();
  if (!typed) return;

  rounds += 1;
  hideSuggestions();

  if (normalize(typed) === normalize(target.name)) {
    score += 1;
    updateScore();
    if (score >= GOAL) {
      win();
      return;
    }
    resultMessage.textContent = `Congrats! It was ${capitalize(target.name)}. Next Pok\u00e9mon is up.`;
    resultMessage.className = "result-message hit";
    newTarget();
    return;
  }

  startPenalty(`Not quite \u2014 it was ${capitalize(target.name)}.`);
}

function startGame() {
  score = 0;
  rounds = 0;
  updateScore();
  resultMessage.textContent = "";
  resultMessage.className = "result-message";
  startView.classList.add("hidden");
  winView.classList.add("hidden");
  gameView.classList.remove("hidden");
  newTarget();
}

startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
rerollBtn.addEventListener("click", newTarget);
readyBtn.addEventListener("click", () => {
  setPhase("guess");
  resultMessage.textContent = "";
  resultMessage.className = "result-message";
  guessInput.focus();
});
submitBtn.addEventListener("click", submitGuess);
revealBtn.addEventListener("click", () => {
  startPenalty(`It was ${capitalize(target.name)}.`);
});

guessInput.addEventListener("input", () => renderSuggestions(guessInput.value));
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    hideSuggestions();
    submitGuess();
  } else if (event.key === "Escape") {
    hideSuggestions();
  }
});
