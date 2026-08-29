/* Hot and Cold - one secret Pokemon, guesses only report warmth. */

const PENALTY_SECONDS = 10;
const MAX_SUGGESTIONS = 6;

const FORM_SUFFIXES = [
  "-normal", "-plant", "-altered", "-land", "-red-striped", "-standard", "-male",
  "-incarnate", "-ordinary", "-aria", "-shield", "-average", "-50", "-baile",
  "-midday", "-solo", "-red-meteor", "-disguised", "-amped", "-ice", "-full-belly",
  "-single-strike", "-zero", "-curly", "-two-segment", "-family-of-four",
  "-green-plumage",
];

const BANDS = [
  { min: 93, label: "You're basically touching it", cls: "b6" },
  { min: 80, label: "Hot", cls: "b5" },
  { min: 66, label: "Warm", cls: "b4" },
  { min: 50, label: "Lukewarm", cls: "b3" },
  { min: 34, label: "Cool", cls: "b2" },
  { min: 18, label: "Cold", cls: "b1" },
  { min: 0, label: "Freezing", cls: "b0" },
];

const guessInput = document.getElementById("guess-input");
const submitBtn = document.getElementById("submit-btn");
const suggestionsEl = document.getElementById("suggestions");
const thermoFill = document.getElementById("thermo-fill");
const thermoLabel = document.getElementById("thermo-label");
const guessCount = document.getElementById("guess-count");
const closestDisplay = document.getElementById("closest-display");
const statusDisplay = document.getElementById("status-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const feedback = document.getElementById("feedback");
const historyEl = document.getElementById("history");
const winView = document.getElementById("win-view");
const winImg = document.getElementById("win-img");
const winNote = document.getElementById("win-note");
const playAgainBtn = document.getElementById("play-again-btn");

let target = null;
let guesses = 0;
let best = 0;
let tried = new Set();
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

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function logCloseness(a, b, spread) {
  const diff = Math.abs(Math.log(Math.max(a, 0.05)) - Math.log(Math.max(b, 0.05)));
  return Math.max(0, 1 - diff / spread);
}

/* Warmth blends typing, dex proximity, generation and raw size so a guess can be
   "hot" for more than one reason - which is what makes the trail fun to follow.
   Neighbouring dex numbers get a bonus because evolution lines are almost always
   consecutive, and landing on the right family should feel obviously warmer. */
function warmth(guess) {
  const shared = guess.types.filter((type) => target.types.includes(type)).length;
  const typeScore = shared / Math.max(guess.types.length, target.types.length);
  const gap = Math.abs(guess.id - target.id);
  const dexScore = Math.max(0, 1 - gap / 150);
  const familyBonus = gap <= 2 ? 0.1 : 0;
  const genScore = Math.max(0, 1 - Math.abs(guess.gen - target.gen) / 5);
  const heightScore = logCloseness(guess.heightM, target.heightM, 1.7);
  const weightScore = logCloseness(guess.weightKg, target.weightKg, 3.4);
  const stageScore = guess.stage === target.stage ? 1 : 0;

  const total =
    0.34 * typeScore +
    0.2 * dexScore +
    0.12 * genScore +
    0.11 * heightScore +
    0.11 * weightScore +
    0.06 * stageScore +
    familyBonus;

  return Math.min(99, Math.round(total * 100));
}

function band(value) {
  return BANDS.find((entry) => value >= entry.min);
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

  suggestionsEl.innerHTML = "";
  [...starts, ...contains].slice(0, MAX_SUGGESTIONS).forEach((entry) => {
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

function setThermo(value, label) {
  const info = band(value);
  thermoFill.style.width = `${Math.max(4, value)}%`;
  thermoFill.className = `thermo-fill ${info.cls}`;
  thermoLabel.textContent = label;
}

function addHistory(entry, value) {
  const info = band(value);
  const row = document.createElement("div");
  row.className = `history-row ${info.cls}`;

  const name = document.createElement("span");
  name.className = "history-name";
  name.textContent = capitalize(entry.name);

  const bar = document.createElement("span");
  bar.className = "history-bar";
  const barFill = document.createElement("span");
  barFill.className = `history-bar-fill ${info.cls}`;
  barFill.style.width = `${Math.max(3, value)}%`;
  bar.appendChild(barFill);

  const score = document.createElement("span");
  score.className = "history-score";
  score.textContent = `${value}`;

  row.append(name, bar, score);
  historyEl.prepend(row);
}

function startPenalty() {
  locked = true;
  guessInput.disabled = true;
  submitBtn.disabled = true;
  penaltyEl.classList.remove("hidden");
  statusDisplay.textContent = "Cooling off";

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
      locked = false;
      guessInput.disabled = false;
      submitBtn.disabled = false;
      statusDisplay.textContent = "Guess away";
      guessInput.focus();
    }
  }, 1000);
}

function win() {
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  penaltyEl.classList.add("hidden");
  winView.classList.remove("hidden");
  winImg.src = spriteUrl(target.id);
  winImg.alt = capitalize(target.name);
  winNote.textContent = `It was ${capitalize(target.name)} \u2014 found in ${guesses} guess${
    guesses === 1 ? "" : "es"
  }.`;
  locked = true;
  guessInput.disabled = true;
  submitBtn.disabled = true;
  statusDisplay.textContent = "Found it";
}

function submitGuess() {
  if (locked) return;
  const typed = guessInput.value.trim();
  if (!typed) return;

  const needle = normalize(typed);
  const entry = POKEDEX.find((item) => normalize(item.name) === needle);
  if (!entry) {
    feedback.textContent = `"${typed}" isn't a Pok\u00e9mon I know.`;
    feedback.className = "feedback miss";
    return;
  }

  if (tried.has(entry.id)) {
    feedback.textContent = `You already tried ${capitalize(entry.name)}.`;
    feedback.className = "feedback miss";
    return;
  }

  tried.add(entry.id);
  guesses += 1;
  guessCount.textContent = String(guesses);
  guessInput.value = "";
  hideSuggestions();

  if (entry.id === target.id) {
    setThermo(100, "Found it!");
    addHistory(entry, 100);
    win();
    return;
  }

  const value = warmth(entry);
  const info = band(value);
  setThermo(value, info.label);
  addHistory(entry, value);

  if (value > best) {
    best = value;
    closestDisplay.textContent = capitalize(entry.name);
  }

  feedback.textContent = `${capitalize(entry.name)} \u2014 ${info.label.toLowerCase()}.`;
  feedback.className = "feedback";
  startPenalty();
}

function startGame() {
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  penaltyEl.classList.add("hidden");
  winView.classList.add("hidden");
  historyEl.innerHTML = "";
  target = POKEDEX[Math.floor(Math.random() * POKEDEX.length)];
  guesses = 0;
  best = 0;
  tried = new Set();
  locked = false;
  guessCount.textContent = "0";
  closestDisplay.textContent = "\u2014";
  statusDisplay.textContent = "Guess away";
  feedback.textContent = "";
  feedback.className = "feedback";
  guessInput.value = "";
  guessInput.disabled = false;
  submitBtn.disabled = false;
  setThermo(0, "Take a shot");
  guessInput.focus();
}

submitBtn.addEventListener("click", submitGuess);
playAgainBtn.addEventListener("click", startGame);
guessInput.addEventListener("input", () => renderSuggestions(guessInput.value));
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    hideSuggestions();
    submitGuess();
  } else if (event.key === "Escape") {
    hideSuggestions();
  }
});

startGame();
