const GAME_DURATION_SECONDS = 90;
const PUZZLE_COUNT = 10;

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const endView = document.getElementById("end-view");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const timerDisplay = document.getElementById("timer-display");
const solvedCountEl = document.getElementById("solved-count");
const puzzleGrid = document.getElementById("puzzle-grid");
const endMessage = document.getElementById("end-message");
const endReveal = document.getElementById("end-reveal");
const mastheadDate = document.getElementById("masthead-date");

let puzzles = [];
let solvedCount = 0;
let secondsLeft = GAME_DURATION_SECONDS;
let timerId = null;

function capitalize(text) {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeLetters(text) {
  return text.toLowerCase().replace(/[^a-z]/g, "");
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
  const pool = [...POKEDEX];
  const chosen = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }

  return chosen.map((entry) => {
    const displayName = capitalize(entry.name);
    const words = displayName.split(" ");
    const scrambledWords = words.map(shuffleWord);
    return {
      id: entry.id,
      displayName,
      words,
      scrambledWords,
      solved: false,
    };
  });
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderScrambleRow(container, scrambledWords) {
  scrambledWords.forEach((word, wordIndex) => {
    if (wordIndex > 0) {
      const gap = document.createElement("span");
      gap.className = "answer-word-gap";
      container.appendChild(gap);
    }
    word.split("").forEach((letter) => {
      const tile = document.createElement("span");
      tile.className = "scramble-tile";
      tile.textContent = letter;
      container.appendChild(tile);
    });
  });
}

function renderAnswerRow(container, words) {
  const boxes = [];
  words.forEach((word, wordIndex) => {
    if (wordIndex > 0) {
      const gap = document.createElement("span");
      gap.className = "answer-word-gap";
      container.appendChild(gap);
    }
    for (let i = 0; i < word.length; i += 1) {
      const box = document.createElement("input");
      box.type = "text";
      box.maxLength = 1;
      box.className = "answer-box";
      box.autocomplete = "off";
      container.appendChild(box);
      boxes.push(box);
    }
  });
  return boxes;
}

function checkPuzzleSolved(puzzle, boxes) {
  const typed = boxes.map((box) => box.value).join("");
  const answer = puzzle.words.join("");
  return normalizeLetters(typed) === normalizeLetters(answer) && typed.length === answer.length;
}

function markSolved(puzzle, card, boxes) {
  puzzle.solved = true;
  solvedCount += 1;
  card.classList.add("solved");
  boxes.forEach((box) => {
    box.disabled = true;
  });
  solvedCountEl.textContent = `${solvedCount} / ${PUZZLE_COUNT} solved`;

  if (solvedCount === PUZZLE_COUNT) {
    endGame(true);
  }
}

function renderPuzzleGrid() {
  puzzleGrid.innerHTML = "";

  puzzles.forEach((puzzle, index) => {
    const card = document.createElement("div");
    card.className = "puzzle-card";

    const number = document.createElement("p");
    number.className = "puzzle-number";
    number.textContent = `#${index + 1}`;
    card.appendChild(number);

    const scrambleRow = document.createElement("div");
    scrambleRow.className = "scramble-row";
    renderScrambleRow(scrambleRow, puzzle.scrambledWords);
    card.appendChild(scrambleRow);

    const answerRow = document.createElement("div");
    answerRow.className = "answer-row";
    const boxes = renderAnswerRow(answerRow, puzzle.words);
    card.appendChild(answerRow);

    boxes.forEach((box, boxIndex) => {
      box.addEventListener("input", () => {
        box.value = box.value.replace(/[^a-zA-Z]/g, "").slice(0, 1);
        if (box.value && boxIndex < boxes.length - 1) {
          boxes[boxIndex + 1].focus();
        }
        if (checkPuzzleSolved(puzzle, boxes) && !puzzle.solved) {
          markSolved(puzzle, card, boxes);
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

    puzzleGrid.appendChild(card);
  });
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

  startView.classList.add("hidden");
  endView.classList.add("hidden");
  gameView.classList.remove("hidden");

  timerDisplay.textContent = formatTime(secondsLeft);
  timerDisplay.classList.remove("low-time");
  solvedCountEl.textContent = `0 / ${PUZZLE_COUNT} solved`;

  renderPuzzleGrid();

  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

function endGame(success) {
  clearInterval(timerId);
  gameView.classList.add("hidden");
  endView.classList.remove("hidden");

  if (success) {
    endMessage.textContent = "Congrats! You unscrambled all 10!";
    endMessage.className = "end-message success";
  } else {
    endMessage.textContent = "Time's up! Better luck next time.";
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

setMastheadDate();
