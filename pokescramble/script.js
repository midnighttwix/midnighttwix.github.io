const GAME_DURATION_SECONDS = 90;
const PUZZLE_COUNT = 10;

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const endView = document.getElementById("end-view");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const giveUpBtn = document.getElementById("give-up-btn");
const timerDisplay = document.getElementById("timer-display");
const solvedCountEl = document.getElementById("solved-count");
const answerBoard = document.getElementById("answer-board");
const clueList = document.getElementById("clue-list");
const endMessage = document.getElementById("end-message");
const endReveal = document.getElementById("end-reveal");
const mastheadDate = document.getElementById("masthead-date");

let puzzles = [];
let solvedCount = 0;
let secondsLeft = GAME_DURATION_SECONDS;
let timerId = null;
let activeIndex = 0;

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shuffleWord(word) {
  const letters = word.split("");
  if (letters.length < 2) return word;

  let shuffled = word;
  let attempts = 0;
  while (shuffled === word && attempts < 20) {
    for (let i = letters.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    shuffled = letters.join("");
    attempts += 1;
  }
  return shuffled;
}

function pickRandomPuzzles(count) {
  // plain single-word names only — no spaces, hyphens, or punctuation
  const plainPool = POKEDEX.filter((entry) => /^[a-z]+$/.test(entry.name));
  const pool = [...plainPool];
  const chosen = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }

  return chosen.map((entry) => {
    const displayName = capitalize(entry.name);
    return {
      id: entry.id,
      displayName,
      scrambled: shuffleWord(displayName.toLowerCase()).toUpperCase(),
      solved: false,
    };
  });
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function setActiveVisual(index) {
  activeIndex = index;
  document.querySelectorAll(".board-row").forEach((row) => {
    row.classList.toggle("active", Number(row.dataset.puzzleIndex) === index && !puzzles[index].solved);
  });
  document.querySelectorAll(".clue-item").forEach((item) => {
    item.classList.toggle("active", Number(item.dataset.puzzleIndex) === index && !puzzles[index].solved);
  });
}

function focusFirstBoxOf(index) {
  const firstBox = answerBoard.querySelector(`[data-puzzle-index="${index}"] .answer-box`);
  if (firstBox) firstBox.focus();
}

function advanceToNextUnsolved() {
  const next = puzzles.findIndex((puzzle, i) => i !== activeIndex && !puzzle.solved);
  if (next !== -1) focusFirstBoxOf(next);
}

function checkGuess(puzzle, boxes) {
  const typed = boxes.map((box) => box.value).join("");
  return typed.toLowerCase() === puzzle.displayName.toLowerCase() && typed.length === puzzle.displayName.length;
}

function solveRow(index) {
  const puzzle = puzzles[index];
  puzzle.solved = true;
  solvedCount += 1;
  solvedCountEl.textContent = `${solvedCount} / ${PUZZLE_COUNT} solved`;

  const row = answerBoard.querySelector(`[data-puzzle-index="${index}"]`);
  row.classList.add("solved");
  row.classList.remove("active");
  row.querySelector(".board-row-cells").innerHTML = "";
  puzzle.displayName.split("").forEach((letter) => {
    const cell = document.createElement("div");
    cell.className = "board-cell";
    cell.textContent = letter.toUpperCase();
    row.querySelector(".board-row-cells").appendChild(cell);
  });

  const clueItem = clueList.querySelector(`[data-puzzle-index="${index}"]`);
  clueItem.classList.add("solved");
  clueItem.classList.remove("active");
  clueItem.replaceWith(clueItem.cloneNode(true)); // drop the click listener now that it's solved

  if (solvedCount === PUZZLE_COUNT) {
    endGame(true);
    return;
  }

  advanceToNextUnsolved();
}

function renderBoard() {
  answerBoard.innerHTML = "";
  clueList.innerHTML = "";

  puzzles.forEach((puzzle, index) => {
    const row = document.createElement("div");
    row.className = "board-row";
    row.dataset.puzzleIndex = index;

    const rowNumber = document.createElement("span");
    rowNumber.className = "board-row-number";
    rowNumber.textContent = index + 1;
    row.appendChild(rowNumber);

    const cells = document.createElement("div");
    cells.className = "board-row-cells";

    const boxes = [];
    for (let i = 0; i < puzzle.displayName.length; i += 1) {
      const cell = document.createElement("div");
      cell.className = "board-cell";

      const box = document.createElement("input");
      box.type = "text";
      box.maxLength = 1;
      box.className = "answer-box";
      box.autocomplete = "off";
      cell.appendChild(box);
      boxes.push(box);

      cells.appendChild(cell);
    }

    row.appendChild(cells);
    answerBoard.appendChild(row);

    boxes.forEach((box, boxIndex) => {
      box.addEventListener("focus", () => setActiveVisual(index));

      box.addEventListener("input", () => {
        box.value = box.value.replace(/[^a-zA-Z]/g, "").slice(0, 1);
        if (box.value && boxIndex < boxes.length - 1) {
          boxes[boxIndex + 1].focus();
        }
        if (checkGuess(puzzle, boxes)) {
          solveRow(index);
        }
      });

      box.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !box.value && boxIndex > 0) {
          boxes[boxIndex - 1].focus();
        } else if (event.key === "ArrowLeft" && boxIndex > 0) {
          boxes[boxIndex - 1].focus();
        } else if (event.key === "ArrowRight" && boxIndex < boxes.length - 1) {
          boxes[boxIndex + 1].focus();
        }
      });
    });

    // sidebar clue item
    const item = document.createElement("button");
    item.type = "button";
    item.className = "clue-item";
    item.dataset.puzzleIndex = index;

    const number = document.createElement("span");
    number.className = "clue-number";
    number.textContent = index + 1;

    const scramble = document.createElement("span");
    scramble.className = "clue-scramble";
    scramble.textContent = puzzle.scrambled;

    item.appendChild(number);
    item.appendChild(scramble);
    item.addEventListener("click", () => focusFirstBoxOf(index));

    clueList.appendChild(item);
  });

  setActiveVisual(0);
}

function tick() {
  secondsLeft -= 1;
  timerDisplay.textContent = formatTime(Math.max(0, secondsLeft));
  timerDisplay.classList.toggle("low-time", secondsLeft <= 15);

  if (secondsLeft <= 0) {
    endGame(false);
  }
}

function startGame() {
  puzzles = pickRandomPuzzles(PUZZLE_COUNT);
  solvedCount = 0;
  secondsLeft = GAME_DURATION_SECONDS;
  activeIndex = 0;

  startView.classList.add("hidden");
  endView.classList.add("hidden");
  gameView.classList.remove("hidden");

  timerDisplay.textContent = formatTime(secondsLeft);
  timerDisplay.classList.remove("low-time");
  solvedCountEl.textContent = `0 / ${PUZZLE_COUNT} solved`;

  renderBoard();
  focusFirstBoxOf(activeIndex);

  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

function endGame(success, message) {
  clearInterval(timerId);
  gameView.classList.add("hidden");
  endView.classList.remove("hidden");

  if (success) {
    endMessage.textContent = "Congrats! You unscrambled all 10!";
    endMessage.className = "end-message success";
  } else {
    endMessage.textContent = message || "Time's up! Better luck next time.";
    endMessage.className = "end-message failure";
  }

  endReveal.innerHTML = "";
  puzzles.forEach((puzzle) => {
    const item = document.createElement("span");
    item.className = puzzle.solved ? "end-reveal-item" : "end-reveal-item missed";
    item.textContent = puzzle.displayName;
    endReveal.appendChild(item);
  });
}

function setMastheadDate() {
  const today = new Date();
  mastheadDate.textContent = today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
giveUpBtn.addEventListener("click", () => endGame(false, "Game ended early. Here's how you did."));

setMastheadDate();
