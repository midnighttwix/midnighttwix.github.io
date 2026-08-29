/* Pokemon Hangman - six misses, three solves to win. */

const GOAL = 3;
const MAX_MISSES = 6;
const PENALTY_SECONDS = 10;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PARTS = ["part-head", "part-body", "part-arm-l", "part-arm-r", "part-leg-l", "part-leg-r"];

const FORM_SUFFIXES = [
  "-normal", "-plant", "-altered", "-land", "-red-striped", "-standard", "-male",
  "-incarnate", "-ordinary", "-aria", "-shield", "-average", "-50", "-baile",
  "-midday", "-solo", "-red-meteor", "-disguised", "-amped", "-ice", "-full-belly",
  "-single-strike", "-zero", "-curly", "-two-segment", "-family-of-four",
  "-green-plumage",
];

const wordEl = document.getElementById("word");
const keyboardEl = document.getElementById("keyboard");
const wrongLettersEl = document.getElementById("wrong-letters");
const scoreDisplay = document.getElementById("score-display");
const missesDisplay = document.getElementById("misses-display");
const hintDisplay = document.getElementById("hint-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const penaltyLabel = document.querySelector(".penalty-label");
const feedback = document.getElementById("feedback");
const gameView = document.getElementById("game-view");
const winView = document.getElementById("win-view");
const winNote = document.getElementById("win-note");
const playAgainBtn = document.getElementById("play-again-btn");

// Names with hyphens or odd characters make for miserable hangman boards.
const WORDS = POKEDEX.filter((entry) => /^[a-z]{4,11}$/.test(speciesName(entry.name)));

let target = null;
let letters = [];
let guessed = new Set();
let misses = 0;
let score = 0;
let locked = false;
let penaltyTimer = null;

function speciesName(slug) {
  const suffix = FORM_SUFFIXES.find((end) => slug.endsWith(end));
  return suffix ? slug.slice(0, -suffix.length) : slug;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function updateGauges() {
  scoreDisplay.textContent = `${score} / ${GOAL}`;
  missesDisplay.textContent = `${misses} / ${MAX_MISSES}`;
}

function renderWord({ reveal } = {}) {
  wordEl.innerHTML = "";
  letters.forEach((letter) => {
    const slot = document.createElement("span");
    const shown = guessed.has(letter) || reveal;
    slot.className = `slot${shown ? " filled" : ""}${reveal && !guessed.has(letter) ? " missed" : ""}`;
    slot.textContent = shown ? letter.toUpperCase() : "";
    wordEl.appendChild(slot);
  });
}

function renderParts() {
  PARTS.forEach((id, index) => {
    document.getElementById(id).classList.toggle("shown", index < misses);
  });
}

function renderWrong() {
  const wrong = [...guessed].filter((letter) => !letters.includes(letter));
  wrongLettersEl.textContent = wrong.length ? `Misses: ${wrong.join(" ").toUpperCase()}` : "";
}

function buildKeyboard() {
  keyboardEl.innerHTML = "";
  LETTERS.forEach((letter) => {
    const key = document.createElement("button");
    key.type = "button";
    key.className = "key";
    key.textContent = letter;
    key.dataset.letter = letter.toLowerCase();
    key.addEventListener("click", () => guessLetter(letter.toLowerCase()));
    keyboardEl.appendChild(key);
  });
}

function syncKeyboard() {
  keyboardEl.querySelectorAll(".key").forEach((key) => {
    const letter = key.dataset.letter;
    const used = guessed.has(letter);
    key.disabled = used || locked;
    key.classList.toggle("hit", used && letters.includes(letter));
    key.classList.toggle("miss", used && !letters.includes(letter));
  });
}

function newWord() {
  target = WORDS[Math.floor(Math.random() * WORDS.length)];
  letters = speciesName(target.name).split("");
  guessed = new Set();
  misses = 0;
  locked = false;
  hintDisplay.textContent = capitalize(target.types[0]);
  feedback.textContent = "";
  feedback.className = "feedback";
  updateGauges();
  renderWord();
  renderParts();
  renderWrong();
  syncKeyboard();
}

function startPenalty(label) {
  locked = true;
  syncKeyboard();
  penaltyLabel.textContent = label;
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
      if (misses >= MAX_MISSES) {
        newWord();
        return;
      }
      locked = false;
      syncKeyboard();
      feedback.textContent = "";
      feedback.className = "feedback";
    }
  }, 1000);
}

function win() {
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  gameView.classList.add("hidden");
  winView.classList.remove("hidden");
  winNote.textContent = `Three Pok\u00e9mon pulled off the gallows.`;
}

function guessLetter(letter) {
  if (locked || guessed.has(letter)) return;
  guessed.add(letter);
  syncKeyboard();
  renderWrong();

  if (letters.includes(letter)) {
    renderWord();
    const solved = letters.every((item) => guessed.has(item));
    if (!solved) return;

    score += 1;
    updateGauges();
    if (score >= GOAL) {
      win();
      return;
    }
    locked = true;
    syncKeyboard();
    feedback.textContent = `Congrats! It was ${capitalize(speciesName(target.name))}.`;
    feedback.className = "feedback hit";
    setTimeout(newWord, 2000);
    return;
  }

  misses += 1;
  updateGauges();
  renderParts();

  if (misses >= MAX_MISSES) {
    renderWord({ reveal: true });
    feedback.textContent = `Out of guesses \u2014 it was ${capitalize(speciesName(target.name))}.`;
    feedback.className = "feedback miss";
    startPenalty("Hanged \u2014 new Pok\u00e9mon in");
    return;
  }

  feedback.textContent = `No "${letter.toUpperCase()}". That's ${misses} of ${MAX_MISSES}.`;
  feedback.className = "feedback miss";
  startPenalty("Wrong letter \u2014 wait");
}

function startGame() {
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  penaltyEl.classList.add("hidden");
  score = 0;
  gameView.classList.remove("hidden");
  winView.classList.add("hidden");
  buildKeyboard();
  newWord();
}

playAgainBtn.addEventListener("click", startGame);

document.addEventListener("keydown", (event) => {
  const letter = event.key.toLowerCase();
  if (letter.length === 1 && letter >= "a" && letter <= "z") guessLetter(letter);
});

startGame();
