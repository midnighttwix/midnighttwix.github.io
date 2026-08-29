const MAX_DEX_NUMBER = 1025;
const CARD_COUNT = 6;
const REQUIRED_NAMES = 4;

const cardGrid = document.getElementById("card-grid");
const randomizeBtn = document.getElementById("randomize-btn");
const instructionsEl = document.getElementById("instructions");
const setupControls = document.getElementById("setup-controls");
const guessControls = document.getElementById("guess-controls");
const resultControls = document.getElementById("result-controls");
const lockAnswersBtn = document.getElementById("lock-answers");
const submitGuessesBtn = document.getElementById("submit-guesses");
const playAgainBtn = document.getElementById("play-again");
const resultMessageEl = document.getElementById("result-message");

// phase: "empty" | "setup" | "guess" | "result"
let phase = "empty";
let cards = [];
let personalityCooldownTimer = null;

function randomDexNumber() {
  return Math.floor(Math.random() * MAX_DEX_NUMBER) + 1;
}

function pickUniqueDexNumbers(count) {
  const chosen = new Set();
  while (chosen.size < count) {
    chosen.add(randomDexNumber());
  }
  return [...chosen];
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function fetchPokemon(id) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!response.ok) throw new Error(`Failed to load pokemon ${id}`);
  const data = await response.json();
  const sprite =
    data.sprites?.other?.["official-artwork"]?.front_default ||
    data.sprites?.front_default ||
    "";
  return {
    id,
    displayName: capitalize(data.name.replace(/-/g, " ")),
    sprite,
  };
}

async function randomizePokemon() {
  randomizeBtn.disabled = true;
  cardGrid.innerHTML = "<p class='loading'>Loading Pokémon...</p>";
  setPhase("empty");

  try {
    const ids = pickUniqueDexNumbers(CARD_COUNT);
    const pokemonList = await Promise.all(ids.map(fetchPokemon));
    cards = pokemonList.map((pokemon) => ({
      pokemon,
      answer: "",
      guess: "",
    }));
    setPhase("setup");
    renderCards();
  } catch (error) {
    cardGrid.innerHTML =
      "<p class='loading'>Couldn't load Pokémon. Check your connection and try again.</p>";
  } finally {
    randomizeBtn.disabled = false;
  }
}

function setPhase(nextPhase) {
  phase = nextPhase;
  setupControls.classList.toggle("hidden", phase !== "setup");
  guessControls.classList.toggle("hidden", phase !== "guess");
  resultControls.classList.toggle("hidden", phase !== "result");

  if (phase === "setup") {
    instructionsEl.textContent = "";
  } else if (phase === "guess") {
    instructionsEl.textContent =
      "Player two: pick which name (or blank) belongs to each Pokémon, then submit your guesses.";
  } else if (phase === "result") {
    instructionsEl.textContent = "Here's how player two did!";
  } else {
    instructionsEl.textContent = "Hit Randomize to pick 6 Pokémon and start a new round.";
  }
}

function renderCards() {
  cardGrid.innerHTML = "";

  const nameBank = phase === "guess" ? getNameBank() : [];

  cards.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = "poke-card";

    const img = document.createElement("img");
    img.src = card.pokemon.sprite;
    img.alt = card.pokemon.displayName;
    cardEl.appendChild(img);

    const label = document.createElement("p");
    label.className = "poke-name";
    label.textContent = card.pokemon.displayName;
    cardEl.appendChild(label);

    if (phase === "setup") {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Player name (or leave blank)";
      input.className = "name-input";
      input.value = card.answer;
      input.addEventListener("input", (event) => {
        card.answer = event.target.value;
      });
      cardEl.appendChild(input);
    } else if (phase === "guess") {
      const select = document.createElement("select");
      select.className = "name-input";

      const blankOption = document.createElement("option");
      blankOption.value = "";
      blankOption.textContent = "-- blank --";
      select.appendChild(blankOption);

      nameBank.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });

      select.value = card.guess;
      select.addEventListener("change", (event) => {
        card.guess = event.target.value;
      });
      cardEl.appendChild(select);
    } else if (phase === "result") {
      const resultLabel = document.createElement("p");
      resultLabel.className = "result-label";
      const guessText = card.guess || "(blank)";
      const answerText = card.answer || "(blank)";
      const isCorrect = card.guess.trim().toLowerCase() === card.answer.trim().toLowerCase();
      resultLabel.textContent = `Guessed: ${guessText} | Answer: ${answerText}`;
      cardEl.classList.add(isCorrect ? "correct" : "incorrect");
      cardEl.appendChild(resultLabel);
    }

    cardGrid.appendChild(cardEl);
  });
}

function getNameBank() {
  return cards
    .filter((card) => card.answer.trim() !== "")
    .map((card) => card.answer.trim());
}

function lockInAnswers() {
  const filledCount = cards.filter((card) => card.answer.trim() !== "").length;
  if (filledCount !== REQUIRED_NAMES) {
    instructionsEl.textContent = `Fill in exactly ${REQUIRED_NAMES} names and leave 2 blank before locking in.`;
    return;
  }

  cards.forEach((card) => {
    card.guess = "";
  });
  setPhase("guess");
  renderCards();
}

function startPersonalityCooldown() {
  const playAgainBtn = document.getElementById("play-again");
  const randomizeBtn = document.getElementById("randomize-btn");
  if (!playAgainBtn) return;

  const until = Date.now() + 10000;
  playAgainBtn.disabled = true;
  if (randomizeBtn) randomizeBtn.disabled = true;

  const tick = () => {
    const remainingSeconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    instructionsEl.textContent = `Wrong answer. Wait ${remainingSeconds}s before a fresh list.`;
    if (remainingSeconds <= 0) {
      playAgainBtn.disabled = false;
      if (randomizeBtn) randomizeBtn.disabled = false;
      instructionsEl.textContent = "Hit Randomize to start a new round.";
      return;
    }

    personalityCooldownTimer = window.setTimeout(tick, 1000);
  };

  if (personalityCooldownTimer) {
    window.clearTimeout(personalityCooldownTimer);
  }
  tick();
}

function submitGuesses() {
  const namedCards = cards.filter((card) => card.answer.trim() !== "");
  const correctCount = namedCards.filter(
    (card) => card.guess.trim().toLowerCase() === card.answer.trim().toLowerCase()
  ).length;

  setPhase("result");
  renderCards();
  resultMessageEl.textContent = `Player two guessed ${correctCount} out of ${REQUIRED_NAMES} correctly!`;

  if (correctCount < REQUIRED_NAMES) {
    startPersonalityCooldown();
  }
}

function resetGame() {
  cards = [];
  setPhase("empty");
  cardGrid.innerHTML = "";
  resultMessageEl.textContent = "";
}

randomizeBtn.addEventListener("click", randomizePokemon);
lockAnswersBtn.addEventListener("click", lockInAnswers);
submitGuessesBtn.addEventListener("click", submitGuesses);
playAgainBtn.addEventListener("click", resetGame);

randomizePokemon();
