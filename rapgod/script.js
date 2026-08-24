const studyView = document.getElementById("study-view");
const quizView = document.getElementById("quiz-view");
const studyList = document.getElementById("study-list");
const readyBtn = document.getElementById("ready-btn");
const pokemonImg = document.getElementById("pokemon-img");
const pokemonName = document.getElementById("pokemon-name");
const guessInput = document.getElementById("guess-input");
const submitGuessBtn = document.getElementById("submit-guess-btn");
const suggestionsEl = document.getElementById("suggestions");
const resultMessage = document.getElementById("result-message");
const resultActions = document.getElementById("result-actions");
const studyAgainBtn = document.getElementById("study-again-btn");
const playAgainBtn = document.getElementById("play-again-btn");

let targetIndex = null;
let suggestionRequestToken = 0;

function capitalize(name) {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalize(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

function spriteUrl(dexNumber) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexNumber}.png`;
}

function renderStudyList() {
  studyList.innerHTML = "";
  POKERAP_ORDER.forEach((name, index) => {
    const item = document.createElement("div");
    item.className = "study-item";

    const number = document.createElement("span");
    number.className = "study-number";
    number.textContent = `${index + 1}.`;

    const img = document.createElement("img");
    img.className = "study-img";
    img.src = spriteUrl(index + 1);
    img.alt = capitalize(name);
    img.loading = "lazy";

    const label = document.createElement("span");
    label.className = "study-name";
    label.textContent = capitalize(name);

    item.appendChild(number);
    item.appendChild(img);
    item.appendChild(label);
    studyList.appendChild(item);
  });
}

function hideSuggestions() {
  suggestionsEl.classList.add("hidden");
  suggestionsEl.innerHTML = "";
}

function showStudyView() {
  quizView.classList.add("hidden");
  studyView.classList.remove("hidden");
  guessInput.value = "";
  hideSuggestions();
  resultMessage.textContent = "";
  resultMessage.className = "result-message";
  resultActions.classList.add("hidden");
  studyAgainBtn.classList.add("hidden");
  playAgainBtn.classList.add("hidden");
}

function startQuiz() {
  // never pick the last song entry — it needs a "next" Pokémon to guess
  targetIndex = Math.floor(Math.random() * (POKERAP_ORDER.length - 1));
  const targetName = POKERAP_ORDER[targetIndex];

  pokemonImg.src = spriteUrl(targetIndex + 1);
  pokemonImg.alt = capitalize(targetName);
  pokemonName.textContent = capitalize(targetName);

  studyView.classList.add("hidden");
  quizView.classList.remove("hidden");
  guessInput.value = "";
  guessInput.disabled = false;
  submitGuessBtn.disabled = false;
  hideSuggestions();
  resultMessage.textContent = "";
  resultMessage.className = "result-message";
  resultActions.classList.add("hidden");
  guessInput.focus();
}

function findMatches(query) {
  const q = query.toLowerCase();
  const startsWith = [];
  const includes = [];
  POKERAP_ORDER.forEach((name) => {
    if (name.startsWith(q)) startsWith.push(name);
    else if (name.includes(q)) includes.push(name);
  });
  return [...startsWith, ...includes].slice(0, 6);
}

function renderSuggestions(query) {
  const requestToken = ++suggestionRequestToken;
  const matches = findMatches(query);

  if (matches.length === 0) {
    hideSuggestions();
    return;
  }

  if (requestToken !== suggestionRequestToken) return;

  suggestionsEl.innerHTML = "";
  matches.forEach((name) => {
    const index = POKERAP_ORDER.indexOf(name);
    const item = document.createElement("button");
    item.type = "button";
    item.className = "suggestion-item";

    const img = document.createElement("img");
    img.className = "suggestion-img";
    img.src = spriteUrl(index + 1);
    img.alt = capitalize(name);

    const label = document.createElement("span");
    label.className = "suggestion-name";
    label.textContent = capitalize(name);

    item.appendChild(img);
    item.appendChild(label);

    item.addEventListener("click", () => {
      guessInput.value = capitalize(name);
      hideSuggestions();
      submitGuess(name);
    });

    suggestionsEl.appendChild(item);
  });

  suggestionsEl.classList.remove("hidden");
}

function submitGuess(rawName) {
  const typed = (rawName ?? guessInput.value).trim();
  if (!typed || targetIndex === null) return;

  hideSuggestions();
  guessInput.disabled = true;
  submitGuessBtn.disabled = true;

  const correctName = POKERAP_ORDER[targetIndex + 1];
  const isCorrect = normalize(typed) === normalize(correctName);

  resultActions.classList.remove("hidden");

  if (isCorrect) {
    resultMessage.textContent = `Congrats! ${capitalize(correctName)} comes next!`;
    resultMessage.className = "result-message correct";
    playAgainBtn.classList.remove("hidden");
  } else {
    resultMessage.textContent = "Not quite! Back to studying.";
    resultMessage.className = "result-message incorrect";
    studyAgainBtn.classList.remove("hidden");
  }
}

guessInput.addEventListener("input", () => {
  const query = guessInput.value.trim();
  if (!query) {
    hideSuggestions();
    return;
  }
  renderSuggestions(query);
});

guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitGuess();
});

guessInput.addEventListener("blur", () => {
  setTimeout(hideSuggestions, 150); // allow click on a suggestion before it disappears
});

submitGuessBtn.addEventListener("click", () => submitGuess());
readyBtn.addEventListener("click", startQuiz);
studyAgainBtn.addEventListener("click", showStudyView);
playAgainBtn.addEventListener("click", showStudyView);

renderStudyList();
