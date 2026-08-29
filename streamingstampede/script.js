/* Streaming Stampede - watch the herd run past, then count one species. */

const GOAL = 3;
const PENALTY_SECONDS = 10;
const LANES = 5;
const MAX_ANSWER = 8;
const MAX_SPRITE_ID = 649; // generation-V sprite set stops here

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const winView = document.getElementById("win-view");
const startBtn = document.getElementById("start-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const field = document.getElementById("field");
const countdownEl = document.getElementById("countdown");
const questionBox = document.getElementById("question-box");
const questionName = document.getElementById("question-name");
const questionSprite = document.getElementById("question-sprite");
const numberPad = document.getElementById("number-pad");
const scoreDisplay = document.getElementById("score-display");
const stateDisplay = document.getElementById("state-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const feedback = document.getElementById("feedback");
const winNote = document.getElementById("win-note");

const RUNNERS = POKEDEX.filter((entry) => entry.id <= MAX_SPRITE_ID);

let score = 0;
let round = 0;
let answerKey = null; // { species, count }
let penaltyTimer = null;
let runTimers = [];

function capitalize(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/${id}.png`;
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clearTimers() {
  runTimers.forEach((id) => clearTimeout(id));
  runTimers = [];
}

function updateScore() {
  scoreDisplay.textContent = `CLEARED ${score}/${GOAL}`;
}

function buildHerd() {
  const speciesCount = randomInt(3, 4);
  const chosen = shuffle(RUNNERS).slice(0, speciesCount);
  // Later rounds run thicker herds, so the counts get harder to track.
  const maxPer = Math.min(MAX_ANSWER, 4 + round);

  const herd = [];
  const tally = chosen.map((species) => {
    const count = randomInt(1, maxPer);
    for (let i = 0; i < count; i += 1) herd.push(species);
    return { species, count };
  });

  answerKey = tally[Math.floor(Math.random() * tally.length)];
  return shuffle(herd);
}

function runStampede() {
  const herd = buildHerd();
  field.innerHTML = "";
  field.style.setProperty("--dash", `${field.clientWidth + 180}px`);
  stateDisplay.textContent = "STAMPEDE!";

  let lastFinish = 0;
  herd.forEach((species, index) => {
    const img = document.createElement("img");
    img.className = "runner";
    img.src = spriteUrl(species.id);
    img.alt = "";
    img.style.top = `${(index % LANES) * (100 / LANES) + 1}%`;

    const duration = 2.6 + Math.random() * 1.6;
    const delay = Math.random() * 3.4;
    img.style.animationDuration = `${duration}s`;
    img.style.animationDelay = `${delay}s`;
    lastFinish = Math.max(lastFinish, duration + delay);

    field.appendChild(img);
  });

  runTimers.push(
    setTimeout(() => {
      field.innerHTML = "";
      askQuestion();
    }, (lastFinish + 0.4) * 1000)
  );
}

function askQuestion() {
  stateDisplay.textContent = "COUNT UP";
  questionName.textContent = capitalize(answerKey.species.name);
  questionSprite.src = spriteUrl(answerKey.species.id);
  questionSprite.alt = capitalize(answerKey.species.name);

  numberPad.innerHTML = "";
  for (let n = 1; n <= MAX_ANSWER; n += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "num-btn";
    button.textContent = String(n);
    button.addEventListener("click", () => answer(n));
    numberPad.appendChild(button);
  }

  questionBox.classList.remove("hidden");
}

function startPenalty() {
  questionBox.classList.add("hidden");
  penaltyEl.classList.remove("hidden");
  stateDisplay.textContent = "LOCKED OUT";

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
      nextRound();
    }
  }, 1000);
}

function answer(value) {
  if (penaltyTimer) return;
  questionBox.classList.add("hidden");

  if (value === answerKey.count) {
    score += 1;
    updateScore();
    if (score >= GOAL) {
      win();
      return;
    }
    feedback.textContent = `CORRECT! ${answerKey.count} ${capitalize(answerKey.species.name)}.`;
    feedback.className = "feedback hit";
    nextRound();
    return;
  }

  feedback.textContent = `WRONG! ${answerKey.count} ${capitalize(answerKey.species.name)} ran by.`;
  feedback.className = "feedback miss";
  startPenalty();
}

function nextRound() {
  round += 1;
  clearTimers();
  field.innerHTML = "";
  countdownEl.classList.remove("hidden");
  stateDisplay.textContent = "GET READY";

  let count = 3;
  countdownEl.textContent = String(count);
  const tick = () => {
    count -= 1;
    if (count <= 0) {
      countdownEl.classList.add("hidden");
      runStampede();
      return;
    }
    countdownEl.textContent = String(count);
    runTimers.push(setTimeout(tick, 1000));
  };
  runTimers.push(setTimeout(tick, 1000));
}

function win() {
  clearTimers();
  gameView.classList.add("hidden");
  winView.classList.remove("hidden");
  winNote.textContent = `You counted ${GOAL} stampedes without blinking.`;
}

function startGame() {
  clearTimers();
  clearInterval(penaltyTimer);
  penaltyTimer = null;
  penaltyEl.classList.add("hidden");
  questionBox.classList.add("hidden");
  feedback.textContent = "";
  feedback.className = "feedback";
  score = 0;
  round = 0;
  updateScore();
  startView.classList.add("hidden");
  winView.classList.add("hidden");
  gameView.classList.remove("hidden");
  nextRound();
}

startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
