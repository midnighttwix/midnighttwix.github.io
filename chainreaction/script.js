const CHAIN_LENGTH = 10;
const MAX_ATTEMPTS = 4000;
const LOCKOUT_SECONDS = 10;

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const endView = document.getElementById("end-view");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const giveUpBtn = document.getElementById("give-up-btn");
const solvedCountEl = document.getElementById("solved-count");
const chainBoard = document.getElementById("chain-board");
const lockoutMessage = document.getElementById("lockout-message");
const guessBtn = document.getElementById("guess-btn");
const endMessage = document.getElementById("end-message");

let plainNames = [];
let byFirstLetter = {};
let chain = [];
let solvedCount = 0;
let activeIndex = 0;
let revealedCount = 1; // how many letters of the active row are shown (starts with just the given first letter)
let lockoutSecondsLeft = 0;
let lockoutTimerId = null;

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function normalize(text) {
  return text.toLowerCase().trim().replace(/[^a-z]/g, "");
}

function buildIndexes() {
  plainNames = POKEDEX.filter((entry) => /^[a-z]+$/.test(entry.name)).map((entry) => entry.name);
  byFirstLetter = {};
  plainNames.forEach((name) => {
    const letter = name[0];
    if (!byFirstLetter[letter]) byFirstLetter[letter] = [];
    byFirstLetter[letter].push(name);
  });
}

function attemptChain(length) {
  const used = new Set();
  const start = plainNames[Math.floor(Math.random() * plainNames.length)];
  used.add(start);
  const result = [start];

  for (let i = 1; i < length; i += 1) {
    const lastLetter = result[result.length - 1].slice(-1);
    const candidates = (byFirstLetter[lastLetter] || []).filter((name) => !used.has(name));
    if (candidates.length === 0) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    used.add(pick);
    result.push(pick);
  }

  return result;
}

function generateChain(length) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const result = attemptChain(length);
    if (result) return result;
  }
  return null;
}

function renderBoard() {
  chainBoard.innerHTML = "";

  chain.forEach((name, index) => {
    const solved = index < solvedCount;
    const isActive = index === activeIndex;
    const displayName = capitalize(name);

    const row = document.createElement("div");
    row.className = `chain-row${solved ? " solved" : ""}${isActive && !solved ? " active" : ""}`;
    row.dataset.rowIndex = index;

    const rowNumber = document.createElement("span");
    rowNumber.className = "chain-row-number";
    rowNumber.textContent = index + 1;
    row.appendChild(rowNumber);

    const tiles = document.createElement("div");
    tiles.className = "chain-row-tiles";

    const boxes = [];
    for (let i = 0; i < displayName.length; i += 1) {
      const tile = document.createElement("div");
      tile.className = "chain-tile";

      if (solved) {
        tile.textContent = displayName[i];
        tile.classList.add("revealed");
      } else if (isActive && i < revealedCount) {
        // the first letter is always known; more letters get revealed as hints after wrong guesses
        tile.textContent = displayName[i];
        tile.classList.add("revealed");
      } else if (isActive) {
        const box = document.createElement("input");
        box.type = "text";
        box.maxLength = 1;
        box.className = "letter-box";
        box.autocomplete = "off";
        box.disabled = lockoutSecondsLeft > 0;
        tile.appendChild(box);
        boxes.push(box);
      }

      tiles.appendChild(tile);
    }

    row.appendChild(tiles);
    chainBoard.appendChild(row);

    if (isActive && !solved) {
      boxes.forEach((box, boxIndex) => {
        box.addEventListener("input", () => {
          box.value = box.value.replace(/[^a-zA-Z]/g, "").slice(0, 1);
          if (box.value && boxIndex < boxes.length - 1) {
            boxes[boxIndex + 1].focus();
          }
        });

        box.addEventListener("keydown", (event) => {
          if (event.key === "Backspace" && !box.value && boxIndex > 0) {
            boxes[boxIndex - 1].focus();
          } else if (event.key === "Enter") {
            submitGuess();
          }
        });
      });

      if (lockoutSecondsLeft === 0 && boxes.length > 0) boxes[0].focus();
    }
  });
}

function readActiveGuess() {
  const boxes = [...chainBoard.querySelectorAll(`[data-row-index="${activeIndex}"] .letter-box`)];
  const displayName = capitalize(chain[activeIndex]);
  return displayName.slice(0, revealedCount) + boxes.map((box) => box.value).join("");
}

function startLockout() {
  lockoutSecondsLeft = LOCKOUT_SECONDS;
  guessBtn.disabled = true;
  lockoutMessage.classList.remove("hidden");
  updateLockoutMessage();

  clearInterval(lockoutTimerId);
  lockoutTimerId = setInterval(() => {
    lockoutSecondsLeft -= 1;
    if (lockoutSecondsLeft <= 0) {
      clearInterval(lockoutTimerId);
      lockoutSecondsLeft = 0;
      lockoutMessage.classList.add("hidden");
      guessBtn.disabled = false;
      renderBoard();
      return;
    }
    updateLockoutMessage();
  }, 1000);

  renderBoard();
}

function updateLockoutMessage() {
  lockoutMessage.textContent = `Wrong! Wait ${lockoutSecondsLeft}s before guessing again...`;
}

function submitGuess() {
  if (lockoutSecondsLeft > 0 || activeIndex >= chain.length) return;

  const typed = readActiveGuess();
  const correctName = chain[activeIndex];
  const isCorrect = normalize(typed) === normalize(correctName);

  if (isCorrect) {
    solveActiveRow();
    return;
  }

  // reveal one more letter as a hint, but never the very last letter — that would give away the answer
  const maxRevealable = correctName.length - 1;
  revealedCount = Math.min(revealedCount + 1, maxRevealable);
  startLockout();
}

function solveActiveRow() {
  solvedCount += 1;
  activeIndex += 1;
  revealedCount = 1;
  solvedCountEl.textContent = `${solvedCount} / ${CHAIN_LENGTH} solved`;

  if (solvedCount === CHAIN_LENGTH) {
    endGame();
    return;
  }

  renderBoard();
}

function startGame() {
  if (plainNames.length === 0) buildIndexes();

  const newChain = generateChain(CHAIN_LENGTH);
  if (!newChain) {
    alert("Couldn't build a chain this time — try again!");
    return;
  }

  clearInterval(lockoutTimerId);
  chain = newChain;
  solvedCount = 0;
  activeIndex = 0;
  revealedCount = 1;
  lockoutSecondsLeft = 0;

  startView.classList.add("hidden");
  endView.classList.add("hidden");
  gameView.classList.remove("hidden");

  solvedCountEl.textContent = `0 / ${CHAIN_LENGTH} solved`;
  lockoutMessage.classList.add("hidden");
  guessBtn.disabled = false;

  renderBoard();
}

function endGame() {
  clearInterval(lockoutTimerId);
  gameView.classList.add("hidden");
  endView.classList.remove("hidden");
  endMessage.textContent = "Congrats! You completed the chain!";
  endMessage.className = "end-message success";
}

guessBtn.addEventListener("click", submitGuess);
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
giveUpBtn.addEventListener("click", startGame);
