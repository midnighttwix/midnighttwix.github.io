/* iSpidops - name the Pokemon from an extremely zoomed-in crop. */

const GOAL = 10;
const PENALTY_SECONDS = 10;
const MAX_SUGGESTIONS = 6;
const ZOOM_STEPS = [800, 550, 380, 260];

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
const playAgainBtn = document.getElementById("play-again-btn");
const cropEl = document.getElementById("crop");
const zoomBtn = document.getElementById("zoom-btn");
const guessArea = document.getElementById("guess-area");
const guessInput = document.getElementById("guess-input");
const submitBtn = document.getElementById("submit-btn");
const suggestionsEl = document.getElementById("suggestions");
const revealEl = document.getElementById("reveal");
const revealImg = document.getElementById("reveal-img");
const revealName = document.getElementById("reveal-name");
const scoreDisplay = document.getElementById("score-display");
const statusDisplay = document.getElementById("status-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const feedback = document.getElementById("feedback");
const winNote = document.getElementById("win-note");

let target = null;
let score = 0;
let zoomIndex = 0;
let locked = false;
let penaltyTimer = null;

function speciesName(slug) {
  const suffix = FORM_SUFFIXES.find((end) => slug.endsWith(end));
  return suffix ? slug.slice(0, -suffix.length) : slug;
}

function capitalize(name) {
  return speciesName(name)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalize(text) {
  return speciesName(text.toLowerCase().trim()).replace(/[^a-z0-9]/g, "");
}

function artworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function hideSuggestions() {
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
}

function updateScore() {
  scoreDisplay.textContent = `${score} / ${GOAL}`;
}

function applyZoom() {
  const zoom = ZOOM_STEPS[zoomIndex];
  cropEl.style.backgroundSize = `${zoom}% ${zoom}%`;
  zoomBtn.disabled = zoomIndex >= ZOOM_STEPS.length - 1;
  zoomBtn.textContent =
    zoomIndex >= ZOOM_STEPS.length - 1 ? "That's As Far As It Goes" : "Zoom Out A Little";
}

function nextPokemon() {
  target = POKEDEX[Math.floor(Math.random() * POKEDEX.length)];
  zoomIndex = 0;
  locked = false;

  // Crops are pulled from the middle of the artwork so we never land on empty canvas.
  const x = 28 + Math.random() * 44;
  const y = 24 + Math.random() * 44;
  cropEl.style.backgroundImage = `url("${artworkUrl(target.id)}")`;
  cropEl.style.backgroundPosition = `${x}% ${y}%`;
  applyZoom();

  revealEl.classList.add("hidden");
  guessArea.classList.remove("hidden");
  guessInput.value = "";
  guessInput.disabled = false;
  submitBtn.disabled = false;
  hideSuggestions();
  statusDisplay.textContent = "Take a look";
  guessInput.focus();
}

function showReveal() {
  revealImg.src = artworkUrl(target.id);
  revealImg.alt = capitalize(target.name);
  revealName.textContent = capitalize(target.name);
  revealEl.classList.remove("hidden");
}

function startPenalty() {
  guessArea.classList.add("hidden");
  penaltyEl.classList.remove("hidden");
  statusDisplay.textContent = "Locked out";

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
      feedback.textContent = "";
      feedback.className = "feedback";
      nextPokemon();
    }
  }, 1000);
}

function win() {
  gameView.classList.add("hidden");
  winView.classList.remove("hidden");
  winNote.textContent = `${GOAL} Pok\u00e9mon identified from almost nothing.`;
}

function submitGuess() {
  if (locked) return;
  const typed = guessInput.value.trim();
  if (!typed) return;

  locked = true;
  hideSuggestions();
  guessInput.disabled = true;
  submitBtn.disabled = true;

  if (normalize(typed) === normalize(target.name)) {
    score += 1;
    updateScore();
    showReveal();
    if (score >= GOAL) {
      win();
      return;
    }
    feedback.textContent = `Congrats! That was ${capitalize(target.name)}.`;
    feedback.className = "feedback hit";
    statusDisplay.textContent = "Spotted it";
    setTimeout(() => {
      feedback.textContent = "";
      feedback.className = "feedback";
      nextPokemon();
    }, 1800);
    return;
  }

  showReveal();
  feedback.textContent = `Nope \u2014 that was ${capitalize(target.name)}.`;
  feedback.className = "feedback miss";
  startPenalty();
}

function startGame() {
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  penaltyEl.classList.add("hidden");
  feedback.textContent = "";
  feedback.className = "feedback";
  score = 0;
  updateScore();
  startView.classList.add("hidden");
  winView.classList.add("hidden");
  gameView.classList.remove("hidden");
  nextPokemon();
}

startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
submitBtn.addEventListener("click", submitGuess);
zoomBtn.addEventListener("click", () => {
  if (zoomIndex < ZOOM_STEPS.length - 1) {
    zoomIndex += 1;
    applyZoom();
  }
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
