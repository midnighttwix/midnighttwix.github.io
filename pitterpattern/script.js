const MAX_DEX_NUMBER = 1025;
const SEQUENCE_LENGTH = 20;

const startBtn = document.getElementById("start-btn");
const statusMessage = document.getElementById("status-message");

const memorizeView = document.getElementById("memorize-view");
const memorizeGrid = document.getElementById("memorize-grid");
const startGuessingBtn = document.getElementById("start-guessing-btn");

const guessView = document.getElementById("guess-view");
const guessProgress = document.getElementById("guess-progress");
const guessHistory = document.getElementById("guess-history");
const guessInput = document.getElementById("guess-input");
const submitGuessBtn = document.getElementById("submit-guess-btn");

const endView = document.getElementById("end-view");
const endMessage = document.getElementById("end-message");
const restartBtn = document.getElementById("restart-btn");

let sequence = [];
let guessIndex = 0;

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

function isCloseEnough(guess, answer) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g) return false;
  if (g === a) return true;

  const distance = levenshteinDistance(g, a);
  const threshold = Math.max(1, Math.round(a.length * 0.25));
  return distance <= threshold;
}

function pickUniqueDexNumbers(count) {
  const chosen = new Set();
  while (chosen.size < count) {
    chosen.add(Math.floor(Math.random() * MAX_DEX_NUMBER) + 1);
  }
  return [...chosen];
}

function capitalize(text) {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchPokemon(id) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!response.ok) throw new Error(`Failed to load pokemon ${id}`);
  const data = await response.json();
  const sprite =
    data.sprites?.other?.["official-artwork"]?.front_default || data.sprites?.front_default || "";
  return { id, name: data.name, displayName: capitalize(data.name), sprite };
}

function showView(view) {
  memorizeView.classList.toggle("hidden", view !== "memorize");
  guessView.classList.toggle("hidden", view !== "guess");
  endView.classList.toggle("hidden", view !== "end");
  statusMessage.classList.toggle("hidden", view !== "status");
  startBtn.classList.toggle("hidden", view !== "status");
}

async function startNewGame() {
  startBtn.disabled = true;
  statusMessage.textContent = "Generating a sequence of 20 Pokémon...";
  showView("status");

  try {
    const ids = pickUniqueDexNumbers(SEQUENCE_LENGTH);
    sequence = await Promise.all(ids.map(fetchPokemon));
    renderMemorizeGrid();
    showView("memorize");
  } catch (error) {
    statusMessage.textContent = "Something went wrong loading Pokémon. Try again.";
    showView("status");
  } finally {
    startBtn.disabled = false;
  }
}

function renderMemorizeGrid() {
  memorizeGrid.innerHTML = "";
  sequence.forEach((pokemon, index) => {
    const card = document.createElement("div");
    card.className = "memorize-card";

    const badge = document.createElement("span");
    badge.className = "memorize-index";
    badge.textContent = index + 1;

    const img = document.createElement("img");
    img.src = pokemon.sprite;
    img.alt = pokemon.displayName;
    img.className = "memorize-img";

    const name = document.createElement("p");
    name.className = "memorize-name";
    name.textContent = pokemon.displayName;

    card.appendChild(badge);
    card.appendChild(img);
    card.appendChild(name);
    memorizeGrid.appendChild(card);
  });
}

function startGuessing() {
  guessIndex = 0;
  guessHistory.innerHTML = "";
  guessInput.value = "";
  guessInput.disabled = false;
  submitGuessBtn.disabled = false;
  showView("guess");
  updateGuessProgress();
  guessInput.focus();
}

function updateGuessProgress() {
  guessProgress.textContent = `Pokémon ${guessIndex + 1} of ${SEQUENCE_LENGTH}`;
}

function addHistoryRow(position, guessedText, correctName, isCorrect) {
  const row = document.createElement("div");
  row.className = `history-row ${isCorrect ? "correct" : "incorrect"}`;

  const iconSpan = document.createElement("span");
  iconSpan.className = "history-icon";
  iconSpan.textContent = isCorrect ? "✅" : "❌";

  const posSpan = document.createElement("span");
  posSpan.className = "history-pos";
  posSpan.textContent = `#${position}`;

  const textSpan = document.createElement("span");
  textSpan.className = "history-text";
  textSpan.textContent = isCorrect
    ? correctName
    : `You typed "${guessedText}" — it was ${correctName}`;

  row.appendChild(iconSpan);
  row.appendChild(posSpan);
  row.appendChild(textSpan);
  guessHistory.prepend(row);
}

function submitGuess() {
  if (guessIndex >= SEQUENCE_LENGTH) return;

  const guessText = guessInput.value.trim();
  if (!guessText) return;

  const currentPokemon = sequence[guessIndex];
  const correct = isCloseEnough(guessText, currentPokemon.name);

  addHistoryRow(guessIndex + 1, guessText, currentPokemon.displayName, correct);
  guessInput.value = "";

  if (!correct) {
    endGame(false, guessIndex);
    return;
  }

  guessIndex += 1;

  if (guessIndex >= SEQUENCE_LENGTH) {
    endGame(true, guessIndex);
    return;
  }

  updateGuessProgress();
  guessInput.focus();
}

function endGame(success, failedAtIndex) {
  guessInput.disabled = true;
  submitGuessBtn.disabled = true;

  if (success) {
    endMessage.textContent = "Incredible! You recalled all 20 Pokémon in order!";
    endMessage.classList.add("success");
    endMessage.classList.remove("failure");
  } else {
    endMessage.textContent = `Not quite! You got ${failedAtIndex} of ${SEQUENCE_LENGTH} right before a miss.`;
    endMessage.classList.add("failure");
    endMessage.classList.remove("success");
  }

  showView("end");
}

startBtn.addEventListener("click", startNewGame);
startGuessingBtn.addEventListener("click", startGuessing);
submitGuessBtn.addEventListener("click", submitGuess);
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitGuess();
});
restartBtn.addEventListener("click", startNewGame);

const startOverMemorizeBtn = document.getElementById("start-over-btn-memorize");
const startOverGuessBtn = document.getElementById("start-over-btn-guess");
startOverMemorizeBtn.addEventListener("click", startNewGame);
startOverGuessBtn.addEventListener("click", startNewGame);
