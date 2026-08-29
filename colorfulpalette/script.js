const MAX_DEX_NUMBER = 1025;

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

const newPaletteBtn = document.getElementById("new-palette-btn");
const statusMessage = document.getElementById("status-message");
const paletteView = document.getElementById("palette-view");
const paletteSwatches = document.getElementById("palette-swatches");
const revealCard = document.getElementById("reveal-card");
const revealImg = document.getElementById("reveal-img");
const revealName = document.getElementById("reveal-name");
const guessInput = document.getElementById("guess-input");
const submitGuessBtn = document.getElementById("submit-guess-btn");
const suggestionsEl = document.getElementById("suggestions");
const resultMessage = document.getElementById("result-message");
const guessHistoryEl = document.getElementById("guess-history");

let allPokemonList = []; // [{ name, id }]
const detailsCache = new Map(); // name -> { id, name, displayName, sprite, types, evoChainId }

let targetPokemon = null;
let solved = false;
let guessedNames = new Set();
let suggestionRequestToken = 0;
let paletteCooldownTimer = null;

function startPaletteCooldown() {
  const until = Date.now() + 10000;
  const baseText = resultMessage.textContent;
  guessInput.disabled = true;
  submitGuessBtn.disabled = true;
  newPaletteBtn.disabled = true;

  const tick = () => {
    const remainingSeconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    if (remainingSeconds <= 0) {
      guessInput.disabled = false;
      submitGuessBtn.disabled = false;
      newPaletteBtn.disabled = false;
      resultMessage.textContent = baseText;
      resultMessage.className = "result-message incorrect";
      guessInput.focus();
      return;
    }
    resultMessage.textContent = `${baseText} Wait ${remainingSeconds}s before your next guess.`;
    resultMessage.className = "result-message incorrect";

    paletteCooldownTimer = window.setTimeout(tick, 1000);
  };

  if (paletteCooldownTimer) {
    window.clearTimeout(paletteCooldownTimer);
  }
  tick();
}

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
    evoChainId: null,
  };
  detailsCache.set(key, details);
  detailsCache.set(String(data.id), details);
  return details;
}

async function fetchEvoChainId(pokemonDetails) {
  if (pokemonDetails.evoChainId !== null) return pokemonDetails.evoChainId;
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonDetails.id}`);
  if (!response.ok) return null;
  const data = await response.json();
  const chainId = data.evolution_chain?.url ? idFromUrl(data.evolution_chain.url) : null;
  pokemonDetails.evoChainId = chainId;
  return chainId;
}

function pickRandomDexNumber(excludeId) {
  let id = excludeId;
  while (id === excludeId) {
    id = Math.floor(Math.random() * MAX_DEX_NUMBER) + 1;
  }
  return id;
}

async function extractPalette(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 96;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 120) continue;
          if (r > 240 && g > 240 && b > 240) continue;

          const key = `${Math.round(r / 24) * 24}-${Math.round(g / 24) * 24}-${Math.round(b / 24) * 24}`;
          const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
          bucket.r += r;
          bucket.g += g;
          bucket.b += b;
          bucket.count += 1;
          buckets.set(key, bucket);
        }

        const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
        const top = sorted.slice(0, 3).map((bucket) => {
          const r = Math.round(bucket.r / bucket.count);
          const g = Math.round(bucket.g / bucket.count);
          const b = Math.round(bucket.b / bucket.count);
          return `rgb(${r}, ${g}, ${b})`;
        });
        while (top.length < 3) top.push("rgb(200, 200, 200)");
        resolve(top);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}

function renderSwatches(colors) {
  paletteSwatches.innerHTML = "";
  colors.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.backgroundColor = color;
    paletteSwatches.appendChild(swatch);
  });
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

async function startNewRound() {
  solved = false;
  guessedNames = new Set();
  guessHistoryEl.innerHTML = "";
  resultMessage.textContent = "";
  resultMessage.className = "result-message";
  revealCard.classList.add("hidden");
  guessInput.value = "";
  guessInput.disabled = false;
  submitGuessBtn.disabled = false;
  hideSuggestions();

  paletteView.classList.add("hidden");
  statusMessage.classList.remove("hidden");
  statusMessage.textContent = "Mixing up a new palette...";
  newPaletteBtn.disabled = true;

  try {
    const id = pickRandomDexNumber(targetPokemon?.id);
    const details = await fetchPokemonDetails(id);
    const colors = await extractPalette(details.sprite);
    targetPokemon = details;
    renderSwatches(colors);
    statusMessage.classList.add("hidden");
    paletteView.classList.remove("hidden");
    guessInput.focus();
  } catch (error) {
    statusMessage.textContent = "Something went wrong loading a palette. Try again.";
  } finally {
    newPaletteBtn.disabled = false;
  }
}

function hideSuggestions() {
  suggestionsEl.classList.add("hidden");
  suggestionsEl.innerHTML = "";
}

function findMatches(query) {
  const q = query.toLowerCase();
  const startsWith = [];
  const includes = [];
  for (const entry of allPokemonList) {
    if (entry.name === q) continue;
    if (entry.name.startsWith(q)) startsWith.push(entry);
    else if (entry.name.includes(q)) includes.push(entry);
    if (startsWith.length >= 6) break;
  }
  return [...startsWith, ...includes].slice(0, 6);
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

function addHistoryRow({ displayName, sprite, correct, hints }) {
  const row = document.createElement("div");
  row.className = `history-row ${correct ? "correct" : "incorrect"}`;

  const icon = document.createElement("span");
  icon.className = "history-icon";
  icon.textContent = correct ? "✅" : "❌";

  const img = document.createElement("img");
  img.className = "history-img";
  img.src = sprite;
  img.alt = displayName;

  const body = document.createElement("div");
  body.className = "history-body";

  const name = document.createElement("span");
  name.className = "history-name";
  name.textContent = displayName;
  body.appendChild(name);

  if (hints.length > 0) {
    hints.forEach((hint) => {
      const hintRow = document.createElement("div");
      hintRow.className = "history-hints";

      const label = document.createElement("span");
      label.textContent = hint.label;
      hintRow.appendChild(label);

      if (hint.types && hint.types.length > 0) {
        const badgesEl = document.createElement("div");
        badgesEl.className = "suggestion-types";
        renderTypeBadges(badgesEl, hint.types);
        hintRow.appendChild(badgesEl);
      }

      body.appendChild(hintRow);
    });
  }

  row.appendChild(icon);
  row.appendChild(img);
  row.appendChild(body);
  guessHistoryEl.prepend(row);
}

async function submitGuess(rawName) {
  if (solved) return;
  const typed = (rawName ?? guessInput.value).trim();
  if (!typed) return;

  const typedSlug = typed.toLowerCase().replace(/\s+/g, "-");
  const match =
    allPokemonList.find((entry) => entry.name === typedSlug) ||
    allPokemonList.find((entry) => normalize(entry.name) === normalize(typed));
  const lookupName = match ? match.name : typedSlug;

  if (guessedNames.has(lookupName)) {
    resultMessage.textContent = "You already tried that one — pick another Pokémon!";
    resultMessage.className = "result-message incorrect";
    return;
  }

  let guessDetails;
  try {
    guessDetails = await fetchPokemonDetails(lookupName);
  } catch (error) {
    resultMessage.textContent = `"${typed}" doesn't look like a real Pokémon name.`;
    resultMessage.className = "result-message incorrect";
    return;
  }

  guessedNames.add(lookupName);
  guessInput.value = "";
  hideSuggestions();

  if (guessDetails.id === targetPokemon.id) {
    solved = true;
    guessInput.disabled = true;
    submitGuessBtn.disabled = true;
    resultMessage.textContent = `Congrats! It was ${targetPokemon.displayName}!`;
    resultMessage.className = "result-message correct";
    revealImg.src = targetPokemon.sprite;
    revealImg.alt = targetPokemon.displayName;
    revealName.textContent = targetPokemon.displayName;
    revealCard.classList.remove("hidden");
    addHistoryRow({ displayName: guessDetails.displayName, sprite: guessDetails.sprite, correct: true, hints: [] });
    return;
  }

  const hints = [];
  const sharedTypes = guessDetails.types.filter((type) => targetPokemon.types.includes(type));
  if (sharedTypes.length === 2) {
    hints.push({ label: "Both typings match! 🎯", types: sharedTypes });
  } else if (sharedTypes.length === 1) {
    hints.push({ label: "One typing matches!", types: sharedTypes });
  }

  try {
    const [guessEvoId, targetEvoId] = await Promise.all([
      fetchEvoChainId(guessDetails),
      fetchEvoChainId(targetPokemon),
    ]);
    if (guessEvoId !== null && guessEvoId === targetEvoId) {
      hints.push({ label: "Same evolutionary line! 🧬" });
    }
  } catch (error) {
    // evolution hint is best-effort; skip silently if it fails
  }

  resultMessage.textContent = "Nope, that's not it!";
  resultMessage.className = "result-message incorrect";
  addHistoryRow({ displayName: guessDetails.displayName, sprite: guessDetails.sprite, correct: false, hints });
  startPaletteCooldown();
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
  if (event.key === "Enter") {
    submitGuess();
  }
});

guessInput.addEventListener("blur", () => {
  setTimeout(hideSuggestions, 150); // allow click on a suggestion before it disappears
});

submitGuessBtn.addEventListener("click", () => submitGuess());
newPaletteBtn.addEventListener("click", startNewRound);

async function init() {
  statusMessage.textContent = "Loading the Pokédex...";
  try {
    await loadPokemonList();
    await startNewRound();
  } catch (error) {
    statusMessage.textContent = "Something went wrong loading the Pokédex. Refresh to try again.";
  }
}

init();
