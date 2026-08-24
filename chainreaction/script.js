const GAME_DURATION_SECONDS = 90;
const CHAIN_LENGTH = 10;
const MAX_ATTEMPTS = 4000;

const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const endView = document.getElementById("end-view");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const giveUpBtn = document.getElementById("give-up-btn");
const timerDisplay = document.getElementById("timer-display");
const solvedCountEl = document.getElementById("solved-count");
const chainBoard = document.getElementById("chain-board");
const endMessage = document.getElementById("end-message");
const endReveal = document.getElementById("end-reveal");

let plainNames = [];
let byFirstLetter = {};
let chain = [];
let solvedCount = 0;
let activeIndex = 0;
let secondsLeft = GAME_DURATION_SECONDS;
let timerId = null;

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

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function focusFirstBoxOf(index) {
  const firstBox = chainBoard.querySelector(`[data-row-index="${index}"] .letter-box`);
  if (firstBox) firstBox.focus();
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
      } else if (isActive && i === 0) {
        // the first letter of the active row is always known — it matches the previous row's last letter
        tile.textContent = displayName[0];
        tile.classList.add("revealed");
      } else if (isActive) {
        const box = document.createElement("input");
        box.type = "text";
        box.maxLength = 1;
        box.className = "letter-box";
        box.autocomplete = "off";
        tile.appendChild(box);
        boxes.push(box);
      }

      tiles.appendChild(tile);
    }

    row.appendChild(tiles);
    chainBoard.appendChild(row);

    if (isActive && !solved) {
      const checkRow = () => {
        const typed = displayName[0] + boxes.map((box) => box.value).join("");
        if (normalize(typed) !== normalize(name) || typed.length !== name.length) return;
        solveActiveRow();
      };

      boxes.forEach((box, boxIndex) => {
        box.addEventListener("input", () => {
          box.value = box.value.replace(/[^a-zA-Z]/g, "").slice(0, 1);
          if (box.value && boxIndex < boxes.length - 1) {
            boxes[boxIndex + 1].focus();
          }
          checkRow();
        });

        box.addEventListener("keydown", (event) => {
          if (event.key === "Backspace" && !box.value && boxIndex > 0) {
            boxes[boxIndex - 1].focus();
          }
        });
      });

      if (boxes.length > 0) boxes[0].focus();
    }
  });
}

function solveActiveRow() {
  solvedCount += 1;
  activeIndex += 1;
  solvedCountEl.textContent = `${solvedCount} / ${CHAIN_LENGTH} solved`;

  if (solvedCount === CHAIN_LENGTH) {
    endGame(true);
    return;
  }

  renderBoard();
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
  if (plainNames.length === 0) buildIndexes();

  const newChain = generateChain(CHAIN_LENGTH);
  if (!newChain) {
    alert("Couldn't build a chain this time — try again!");
    return;
  }

  chain = newChain;
  solvedCount = 0;
  activeIndex = 0;
  secondsLeft = GAME_DURATION_SECONDS;

  startView.classList.add("hidden");
  endView.classList.add("hidden");
  gameView.classList.remove("hidden");

  timerDisplay.textContent = formatTime(secondsLeft);
  timerDisplay.classList.remove("low-time");
  solvedCountEl.textContent = `0 / ${CHAIN_LENGTH} solved`;

  renderBoard();

  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

function endGame(success) {
  clearInterval(timerId);
  gameView.classList.add("hidden");
  endView.classList.remove("hidden");

  if (success) {
    endMessage.textContent = "Congrats! You completed the chain!";
    endMessage.className = "end-message success";
  } else {
    endMessage.textContent = "Time's up! Better luck next time.";
    endMessage.className = "end-message failure";
  }

  endReveal.innerHTML = "";
  chain.forEach((name, index) => {
    const item = document.createElement("span");
    item.className = index < solvedCount ? "end-reveal-item" : "end-reveal-item missed";
    item.textContent = capitalize(name);
    endReveal.appendChild(item);
  });
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
giveUpBtn.addEventListener("click", startGame);
