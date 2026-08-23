const MAX_DEX_NUMBER = 1025;
const LETTER_POOL = "ABCDEFGHIJKLMNOPRSTUVWY".split(""); // no Q, X, or Z
const WORD_COUNT = 5;

const TYPE_COLORS = {
  normal: "#a8a878",
  fire: "#f08030",
  water: "#6890f0",
  electric: "#f8d030",
  grass: "#78c850",
  ice: "#98d8d8",
  fighting: "#c03028",
  poison: "#a040a0",
  ground: "#e0c068",
  flying: "#a890f0",
  psychic: "#f85888",
  bug: "#a8b820",
  rock: "#b8a038",
  ghost: "#705898",
  dragon: "#7038f8",
  dark: "#705848",
  steel: "#b8b8d0",
  fairy: "#ee99ac",
};

const statusMessage = document.getElementById("status-message");
const gameView = document.getElementById("game-view");
const revealPhase = document.getElementById("reveal-phase");
const describePhase = document.getElementById("describe-phase");
const creatureImg = document.getElementById("creature-img");
const creatureName = document.getElementById("creature-name");
const rerollBtn = document.getElementById("reroll-btn");
const readyBtn = document.getElementById("ready-btn");
const letterTilesEl = document.getElementById("letter-tiles");
const guessInput = document.getElementById("guess-input");
const submitGuessBtn = document.getElementById("submit-guess-btn");
const suggestionsEl = document.getElementById("suggestions");
const revealCard = document.getElementById("reveal-card");
const revealImg = document.getElementById("reveal-img");
const revealName = document.getElementById("reveal-name");
const resultMessage = document.getElementById("result-message");

let allPokemonList = []; // [{ name, id }]
const detailsCache = new Map(); // name -> { id, name, displayName, sprite, types }

let targetPokemon = null;
let suggestionRequestToken = 0;

function capitalize(text) {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalize(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

function idFromUrl(url) {
  const parts = url.split("/").filter(Boolean);
  return Number(parts[parts.length - 1]);
}

async function loadPokemonList() {
  // pokemon-species has exactly one entry per dex number — no mega/gmax/regional/cosplay forms
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species?limit=${MAX_DEX_NUMBER}`);
  if (!response.ok) throw new Error("Failed to load Pokémon list");
  const data = await response.json();
  allPokemonList = data.results.map((entry) => ({ name: entry.name, id: idFromUrl(entry.url) }));
}

async function fetchPokemonDetails(nameOrId) {
  const key = String(nameOrId).toLowerCase();
  if (detailsCache.has(key)) return detailsCache.get(key);

  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
  if (!response.ok) throw new Error(`Failed to load pokemon ${nameOrId}`);
  const data = await response.json();
  const sprite =
    data.sprites?.other?.["official-artwork"]?.front_default || data.sprites?.front_default || "";
  const details = {
    id: data.id,
    name: data.name,
    displayName: capitalize(data.name),
    sprite,
    types: data.types.map((t) => t.type.name),
  };
  detailsCache.set(key, details);
  detailsCache.set(String(data.id), details);
  return details;
}

function pickRandomDexNumber(excludeId) {
  let id = excludeId;
  while (id === excludeId) {
    id = Math.floor(Math.random() * MAX_DEX_NUMBER) + 1;
  }
  return id;
}

function pickRandomLetters() {
  const pool = [...LETTER_POOL];
  const letters = [];
  for (let i = 0; i < WORD_COUNT; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    letters.push(pool.splice(index, 1)[0]);
  }
  return letters;
}

function renderLetterTiles(letters) {
  letterTilesEl.innerHTML = "";
  letters.forEach((letter) => {
    const tile = document.createElement("div");
    tile.className = "letter-tile";
    tile.textContent = letter;
    letterTilesEl.appendChild(tile);
  });
}

function hideSuggestions() {
  suggestionsEl.classList.add("hidden");
  suggestionsEl.innerHTML = "";
}

function showRevealPhase() {
  describePhase.classList.add("hidden");
  revealPhase.classList.remove("hidden");
  revealCard.classList.add("hidden");
  resultMessage.textContent = "";
  resultMessage.className = "result-message";
  guessInput.value = "";
  hideSuggestions();
}

async function loadNewPokemon() {
  rerollBtn.disabled = true;
  readyBtn.disabled = true;
  statusMessage.classList.remove("hidden");
  gameView.classList.add("hidden");
  statusMessage.textContent = "Scanning for a new life form...";

  try {
    const id = pickRandomDexNumber(targetPokemon?.id);
    targetPokemon = await fetchPokemonDetails(id);
    creatureImg.src = targetPokemon.sprite;
    creatureImg.alt = targetPokemon.displayName;
    creatureName.textContent = targetPokemon.displayName;
    statusMessage.classList.add("hidden");
    gameView.classList.remove("hidden");
    showRevealPhase();
  } catch (error) {
    statusMessage.textContent = "Something went wrong scanning for a Pokémon. Try again.";
  } finally {
    rerollBtn.disabled = false;
    readyBtn.disabled = false;
  }
}

function startDescribing() {
  const letters = pickRandomLetters();
  renderLetterTiles(letters);
  revealPhase.classList.add("hidden");
  describePhase.classList.remove("hidden");
  resultMessage.textContent = "";
  resultMessage.className = "result-message";
  guessInput.value = "";
  guessInput.disabled = false;
  submitGuessBtn.disabled = false;
  hideSuggestions();
  guessInput.focus();
}

function findMatches(query) {
  const q = query.toLowerCase();
  const startsWith = [];
  const includes = [];
  for (const entry of allPokemonList) {
    if (entry.name.startsWith(q)) startsWith.push(entry);
    else if (entry.name.includes(q)) includes.push(entry);
    if (startsWith.length >= 6) break;
  }
  return [...startsWith, ...includes].slice(0, 6);
}

function renderTypeBadges(container, types) {
  container.innerHTML = "";
  types.forEach((type) => {
    const badge = document.createElement("span");
    badge.className = "type-badge";
    badge.textContent = type;
    badge.style.backgroundColor = TYPE_COLORS[type] || "#888";
    container.appendChild(badge);
  });
}

async function renderSuggestions(query) {
  const requestToken = ++suggestionRequestToken;
  const matches = findMatches(query);

  if (matches.length === 0) {
    hideSuggestions();
    return;
  }

  let detailsList;
  try {
    detailsList = await Promise.all(matches.map((match) => fetchPokemonDetails(match.name)));
  } catch (error) {
    return;
  }

  if (requestToken !== suggestionRequestToken) return; // stale response, a newer query has started

  suggestionsEl.innerHTML = "";
  detailsList.forEach((details) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "suggestion-item";

    const img = document.createElement("img");
    img.className = "suggestion-img";
    img.src = details.sprite;
    img.alt = details.displayName;

    const info = document.createElement("div");
    info.className = "suggestion-info";

    const name = document.createElement("span");
    name.className = "suggestion-name";
    name.textContent = details.displayName;

    const typesRow = document.createElement("div");
    typesRow.className = "suggestion-types";
    renderTypeBadges(typesRow, details.types);

    info.appendChild(name);
    info.appendChild(typesRow);
    item.appendChild(img);
    item.appendChild(info);

    item.addEventListener("click", () => {
      guessInput.value = details.displayName;
      hideSuggestions();
      submitGuess(details.name);
    });

    suggestionsEl.appendChild(item);
  });

  suggestionsEl.classList.remove("hidden");
}

async function submitGuess(rawName) {
  const typed = (rawName ?? guessInput.value).trim();
  if (!typed) return;

  const typedSlug = typed.toLowerCase().replace(/\s+/g, "-");
  const match =
    allPokemonList.find((entry) => entry.name === typedSlug) ||
    allPokemonList.find((entry) => normalize(entry.name) === normalize(typed));
  const lookupName = match ? match.name : typedSlug;

  let guessDetails;
  try {
    guessDetails = await fetchPokemonDetails(lookupName);
  } catch (error) {
    resultMessage.textContent = `"${typed}" doesn't look like a real Pokémon name.`;
    resultMessage.className = "result-message incorrect";
    return;
  }

  hideSuggestions();
  guessInput.disabled = true;
  submitGuessBtn.disabled = true;

  if (guessDetails.id === targetPokemon.id) {
    resultMessage.textContent = `Transmission received! It was ${targetPokemon.displayName}!`;
    resultMessage.className = "result-message correct";
    revealImg.src = targetPokemon.sprite;
    revealImg.alt = targetPokemon.displayName;
    revealName.textContent = targetPokemon.displayName;
    revealCard.classList.remove("hidden");
    return;
  }

  resultMessage.textContent = `Signal lost — that wasn't ${targetPokemon.displayName}. New life form incoming...`;
  resultMessage.className = "result-message incorrect";
  guessInput.value = "";
  await loadNewPokemon();
}

rerollBtn.addEventListener("click", loadNewPokemon);
readyBtn.addEventListener("click", startDescribing);
submitGuessBtn.addEventListener("click", () => submitGuess());

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

async function init() {
  statusMessage.textContent = "Contacting the mothership...";
  try {
    await loadPokemonList();
    await loadNewPokemon();
  } catch (error) {
    statusMessage.textContent = "Something went wrong contacting the mothership. Refresh to try again.";
  }
}

init();
