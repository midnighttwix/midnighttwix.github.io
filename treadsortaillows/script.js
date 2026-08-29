/* Treads or Taillows - coin flip, 10 correct calls to win. */

const GOAL = 10;
const PENALTY_SECONDS = 10;
const FLIP_MS = 1500;

const coin = document.getElementById("coin");
const headsBtn = document.getElementById("heads-btn");
const tailsBtn = document.getElementById("tails-btn");
const callRow = document.getElementById("call-row");
const scoreDisplay = document.getElementById("score-display");
const streakDisplay = document.getElementById("streak-display");
const flipsDisplay = document.getElementById("flips-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const feedback = document.getElementById("feedback");
const historyEl = document.getElementById("history");
const winView = document.getElementById("win-view");
const winNote = document.getElementById("win-note");
const playAgainBtn = document.getElementById("play-again-btn");

let score = 0;
let streak = 0;
let flips = 0;
let busy = false;
let penaltyTimer = null;
let spins = 0;

function updateGauges() {
  scoreDisplay.textContent = `${score} / ${GOAL}`;
  streakDisplay.textContent = String(streak);
  flipsDisplay.textContent = String(flips);
}

function addHistory(result, correct) {
  const chip = document.createElement("span");
  chip.className = `chip ${correct ? "hit" : "miss"}`;
  chip.textContent = result === "heads" ? "T" : "L";
  chip.title = `${result === "heads" ? "Iron Treads" : "Taillow"} \u2014 ${correct ? "called it" : "missed"}`;
  historyEl.prepend(chip);
}

function setCallsEnabled(enabled) {
  headsBtn.disabled = !enabled;
  tailsBtn.disabled = !enabled;
}

function startPenalty() {
  penaltyEl.classList.remove("hidden");
  callRow.classList.add("hidden");

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
      callRow.classList.remove("hidden");
      feedback.textContent = "Call it.";
      feedback.className = "feedback";
      setCallsEnabled(true);
      busy = false;
    }
  }, 1000);
}

function win() {
  winView.classList.remove("hidden");
  callRow.classList.add("hidden");
  winNote.textContent = `${GOAL} correct calls in ${flips} flips.`;
}

function flip(call) {
  if (busy) return;
  busy = true;
  setCallsEnabled(false);
  feedback.textContent = "Flipping...";
  feedback.className = "feedback";

  const result = Math.random() < 0.5 ? "heads" : "tails";
  // Always add whole extra spins so the coin lands showing the right face.
  spins += 5;
  const half = result === "tails" ? 0.5 : 0;
  coin.style.transform = `rotateY(${(spins + half) * 360}deg)`;

  setTimeout(() => {
    flips += 1;
    const correct = call === result;
    const label = result === "heads" ? "Iron Treads" : "Taillow";

    if (correct) {
      score += 1;
      streak += 1;
      feedback.textContent = `${label}! Good call.`;
      feedback.className = "feedback hit";
    } else {
      streak = 0;
      feedback.textContent = `${label}. Bad call.`;
      feedback.className = "feedback miss";
    }

    updateGauges();
    addHistory(result, correct);

    if (correct && score >= GOAL) {
      win();
      return;
    }

    if (correct) {
      setCallsEnabled(true);
      busy = false;
      return;
    }

    startPenalty();
  }, FLIP_MS);
}

function reset() {
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  penaltyEl.classList.add("hidden");
  winView.classList.add("hidden");
  callRow.classList.remove("hidden");
  historyEl.innerHTML = "";
  score = 0;
  streak = 0;
  flips = 0;
  busy = false;
  updateGauges();
  feedback.textContent = "Call it.";
  feedback.className = "feedback";
  setCallsEnabled(true);
}

headsBtn.addEventListener("click", () => flip("heads"));
tailsBtn.addEventListener("click", () => flip("tails"));
playAgainBtn.addEventListener("click", reset);

updateGauges();
