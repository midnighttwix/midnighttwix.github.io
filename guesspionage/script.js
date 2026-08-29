/* Guesspionage - slide to a percentage, land within 5. */

const GOAL = 3;
const TOLERANCE = 5;
const PENALTY_SECONDS = 10;

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const winView = document.getElementById("win-view");
const startBtn = document.getElementById("start-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const lockBtn = document.getElementById("lock-btn");
const slider = document.getElementById("slider");
const promptText = document.getElementById("prompt-text");
const guessValue = document.getElementById("guess-value");
const meterFill = document.getElementById("meter-fill");
const meterAnswer = document.getElementById("meter-answer");
const meterBand = document.getElementById("meter-band");
const scoreDisplay = document.getElementById("score-display");
const statusDisplay = document.getElementById("status-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const feedback = document.getElementById("feedback");
const winNote = document.getElementById("win-note");

let deck = [];
let current = null;
let score = 0;
let locked = false;
let penaltyTimer = null;

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function updateScore() {
  scoreDisplay.textContent = `${score} / ${GOAL}`;
}

function syncSlider() {
  const value = Number(slider.value);
  guessValue.textContent = `${value}%`;
  meterFill.style.width = `${value}%`;
}

function nextPrompt() {
  if (deck.length === 0) deck = shuffle(PROMPTS);
  current = deck.pop();
  locked = false;

  promptText.textContent = current.text;
  slider.value = 50;
  slider.disabled = false;
  lockBtn.disabled = false;
  syncSlider();
  meterAnswer.classList.add("hidden");
  meterBand.classList.add("hidden");
  statusDisplay.textContent = "Lock in a guess";
}

function showAnswer() {
  const low = Math.max(0, current.answer - TOLERANCE);
  const high = Math.min(100, current.answer + TOLERANCE);
  meterBand.style.left = `${low}%`;
  meterBand.style.width = `${high - low}%`;
  meterBand.classList.remove("hidden");
  meterAnswer.style.left = `${current.answer}%`;
  meterAnswer.textContent = `${current.answer}%`;
  meterAnswer.classList.remove("hidden");
}

function startPenalty() {
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
      nextPrompt();
    }
  }, 1000);
}

function win() {
  gameView.classList.add("hidden");
  winView.classList.remove("hidden");
  winNote.textContent = `${GOAL} reads inside ${TOLERANCE} points. Spooky.`;
}

function lockIn() {
  if (locked) return;
  locked = true;
  slider.disabled = true;
  lockBtn.disabled = true;

  const guess = Number(slider.value);
  const off = Math.abs(guess - current.answer);
  showAnswer();

  if (off <= TOLERANCE) {
    score += 1;
    updateScore();
    if (score >= GOAL) {
      win();
      return;
    }
    feedback.textContent = `Nailed it \u2014 the answer was ${current.answer}%, you were ${off} off.`;
    feedback.className = "feedback hit";
    statusDisplay.textContent = "Good read";
    setTimeout(nextPrompt, 2600);
    return;
  }

  feedback.textContent = `Off by ${off}. The answer was ${current.answer}%.`;
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
  deck = shuffle(PROMPTS);
  updateScore();
  startView.classList.add("hidden");
  winView.classList.add("hidden");
  gameView.classList.remove("hidden");
  nextPrompt();
}

startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
lockBtn.addEventListener("click", lockIn);
slider.addEventListener("input", syncSlider);
