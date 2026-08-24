const MAX_DEX_NUMBER = 1025;
const WINS_NEEDED = 3;
const WRONG_GUESS_COOLDOWN_SECONDS = 20;

const progressDisplay = document.getElementById("progress-display");
const statusMessage = document.getElementById("status-message");
const startView = document.getElementById("start-view");
const gameView = document.getElementById("game-view");
const endView = document.getElementById("end-view");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const bgCanvas = document.getElementById("bg-stars-canvas");
const bgCtx = bgCanvas.getContext("2d");
const constellationSvg = document.getElementById("constellation-svg");
const revealCard = document.getElementById("reveal-card");
const revealImg = document.getElementById("reveal-img");
const revealName = document.getElementById("reveal-name");
const nextBtn = document.getElementById("next-btn");
const guessRow = document.getElementById("guess-row");
const guessInput = document.getElementById("guess-input");
const submitGuessBtn = document.getElementById("submit-guess-btn");
const suggestionsEl = document.getElementById("suggestions");
const resultMessage = document.getElementById("result-message");
const cooldownMessage = document.getElementById("cooldown-message");
const endMessage = document.getElementById("end-message");

const SVG_NS = "http://www.w3.org/2000/svg";

let allPokemonList = []; // [{ name, id }]
const detailsCache = new Map();

let targetPokemon = null;
let solvedCount = 0;
let usedDexIds = new Set();
let guessLocked = false;
let cooldownInterval = null;
let suggestionToken = 0;

let bgStars = [];
let bgRafId = null;

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
  };
  detailsCache.set(key, details);
  detailsCache.set(String(data.id), details);
  return details;
}

function pickRandomDexNumber(usedSet) {
  let id;
  let tries = 0;
  do {
    id = Math.floor(Math.random() * MAX_DEX_NUMBER) + 1;
    tries += 1;
  } while (usedSet.has(id) && tries < 200);
  return id;
}

function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateConstellation(seed) {
  const rand = mulberry32(seed);
  const width = 640;
  const height = 380;
  const margin = 55;
  const count = 7 + Math.floor(rand() * 5); // 7-11 stars, a vague hint rather than a literal shape

  const points = [];
  let tries = 0;
  while (points.length < count && tries < 500) {
    tries += 1;
    const x = margin + rand() * (width - margin * 2);
    const y = margin + rand() * (height - margin * 2);
    const tooClose = points.some((p) => Math.hypot(p.x - x, p.y - y) < 55);
    if (tooClose) continue;
    const isHero = rand() < 0.35;
    points.push({ x, y, r: isHero ? 5 + rand() * 2.5 : 2.5 + rand() * 1.5 });
  }

  // connect the dots as a wandering nearest-neighbor chain, purely for a "connect the stars" feel
  const edges = [];
  const visited = new Set([0]);
  let current = 0;
  while (visited.size < points.length) {
    let nearest = -1;
    let nearestDist = Infinity;
    for (let i = 0; i < points.length; i += 1) {
      if (visited.has(i)) continue;
      const d = Math.hypot(points[current].x - points[i].x, points[current].y - points[i].y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }
    edges.push([current, nearest]);
    visited.add(nearest);
    current = nearest;
  }

  return { points, edges, width, height };
}

function renderConstellation(constellation) {
  constellationSvg.innerHTML = "";
  constellationSvg.setAttribute("viewBox", `0 0 ${constellation.width} ${constellation.height}`);

  constellation.edges.forEach(([a, b]) => {
    const p1 = constellation.points[a];
    const p2 = constellation.points[b];
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);
    line.setAttribute("class", "constellation-line");
    constellationSvg.appendChild(line);
  });

  constellation.points.forEach((p) => {
    const glow = document.createElementNS(SVG_NS, "circle");
    glow.setAttribute("cx", p.x);
    glow.setAttribute("cy", p.y);
    glow.setAttribute("r", p.r * 2.6);
    glow.setAttribute("class", "constellation-glow");
    constellationSvg.appendChild(glow);

    const star = document.createElementNS(SVG_NS, "circle");
    star.setAttribute("cx", p.x);
    star.setAttribute("cy", p.y);
    star.setAttribute("r", p.r);
    star.setAttribute("class", "constellation-star");
    constellationSvg.appendChild(star);
  });
}

function setupBgStars() {
  const rect = bgCanvas.getBoundingClientRect();
  bgCanvas.width = Math.max(1, Math.round(rect.width));
  bgCanvas.height = Math.max(1, Math.round(rect.height));
  const count = Math.round((bgCanvas.width * bgCanvas.height) / 1800);
  bgStars = [];
  for (let i = 0; i < count; i += 1) {
    bgStars.push({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.height,
      r: Math.random() * 1.3 + 0.3,
      baseAlpha: 0.25 + Math.random() * 0.5,
      amp: Math.random() * 0.4,
      speed: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function drawBgStars(timestamp) {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  const t = timestamp / 1000;
  bgStars.forEach((s) => {
    const alpha = Math.max(0, Math.min(1, s.baseAlpha + Math.sin(t * s.speed + s.phase) * s.amp));
    bgCtx.beginPath();
    bgCtx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    bgCtx.fill();
  });
  bgRafId = requestAnimationFrame(drawBgStars);
}

function hideSuggestions() {
  suggestionToken += 1; // invalidate any in-flight suggestion fetch so it can't reappear later
  suggestionsEl.classList.add("hidden");
  suggestionsEl.innerHTML = "";
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

async function renderSuggestions(query) {
  const token = (suggestionToken += 1);
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
  if (token !== suggestionToken) return; // a newer query started, ignore this stale response

  suggestionsEl.innerHTML = "";
  detailsList.forEach((details) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "suggestion-item";

    const img = document.createElement("img");
    img.className = "suggestion-img";
    img.src = details.sprite;
    img.alt = details.displayName;

    const name = document.createElement("span");
    name.textContent = details.displayName;

    item.appendChild(img);
    item.appendChild(name);
    item.addEventListener("click", () => {
      guessInput.value = details.displayName;
      hideSuggestions();
      submitGuess(details.name);
    });

    suggestionsEl.appendChild(item);
  });
  suggestionsEl.classList.remove("hidden");
}

function startWrongGuessCooldown() {
  guessLocked = true;
  guessInput.disabled = true;
  submitGuessBtn.disabled = true;
  cooldownMessage.classList.remove("hidden");

  let remaining = WRONG_GUESS_COOLDOWN_SECONDS;
  cooldownMessage.textContent = `Wait ${remaining}s to guess again...`;

  clearInterval(cooldownInterval);
  cooldownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(cooldownInterval);
      cooldownMessage.classList.add("hidden");
      guessInput.disabled = false;
      submitGuessBtn.disabled = false;
      guessLocked = false;
      guessInput.focus();
    } else {
      cooldownMessage.textContent = `Wait ${remaining}s to guess again...`;
    }
  }, 1000);
}

function handleCorrectGuess() {
  solvedCount += 1;
  progressDisplay.textContent = `${solvedCount} / ${WINS_NEEDED}`;
  resultMessage.textContent = `Correct! It was ${targetPokemon.displayName}!`;
  resultMessage.className = "result-message correct";

  guessInput.disabled = true;
  submitGuessBtn.disabled = true;
  guessRow.classList.add("hidden");
  cooldownMessage.classList.add("hidden");

  revealImg.src = targetPokemon.sprite;
  revealImg.alt = targetPokemon.displayName;
  revealName.textContent = targetPokemon.displayName;
  revealCard.classList.remove("hidden");

  if (solvedCount >= WINS_NEEDED) {
    nextBtn.textContent = "See Results";
    nextBtn.onclick = finishGame;
  } else {
    nextBtn.textContent = "Next Constellation ▶";
    nextBtn.onclick = loadNextRound;
  }
}

function finishGame() {
  gameView.classList.add("hidden");
  endView.classList.remove("hidden");
  endMessage.textContent = "🌟 You found all 3 constellations!";
}

async function submitGuess(rawName) {
  if (guessLocked || !targetPokemon) return;
  const typed = (rawName ?? guessInput.value).trim();
  if (!typed) return;

  const typedSlug = typed.toLowerCase().replace(/\s+/g, "-");
  const match =
    allPokemonList.find((entry) => entry.name === typedSlug) ||
    allPokemonList.find((entry) => normalize(entry.name) === normalize(typed));

  guessInput.value = "";
  hideSuggestions();

  if (!match) {
    resultMessage.textContent = `"${typed}" doesn't look like a real Pokémon name.`;
    resultMessage.className = "result-message incorrect";
    return;
  }

  if (match.id === targetPokemon.id) {
    handleCorrectGuess();
    return;
  }

  resultMessage.textContent = "Nope, that's not it.";
  resultMessage.className = "result-message incorrect";
  startWrongGuessCooldown();
}

async function loadNextRound() {
  guessLocked = false;
  clearInterval(cooldownInterval);
  cooldownMessage.classList.add("hidden");
  resultMessage.textContent = "";
  resultMessage.className = "result-message";
  revealCard.classList.add("hidden");
  guessRow.classList.remove("hidden");
  guessInput.value = "";
  guessInput.disabled = false;
  submitGuessBtn.disabled = false;
  hideSuggestions();

  const id = pickRandomDexNumber(usedDexIds);
  usedDexIds.add(id);
  targetPokemon = await fetchPokemonDetails(id);

  const constellation = generateConstellation(id);
  renderConstellation(constellation);
  guessInput.focus();
}

function startGame() {
  solvedCount = 0;
  usedDexIds = new Set();
  progressDisplay.textContent = `${solvedCount} / ${WINS_NEEDED}`;

  startView.classList.add("hidden");
  endView.classList.add("hidden");
  gameView.classList.remove("hidden");

  loadNextRound();
}

guessInput.addEventListener("input", () => {
  const q = guessInput.value.trim();
  if (q.length < 2) {
    hideSuggestions();
    return;
  }
  renderSuggestions(q);
});

guessInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitGuess();
  }
});

submitGuessBtn.addEventListener("click", () => submitGuess());

document.addEventListener("click", (e) => {
  if (!e.target.closest(".guess-input-wrap")) hideSuggestions();
});

window.addEventListener("resize", setupBgStars);

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

async function init() {
  setupBgStars();
  bgRafId = requestAnimationFrame(drawBgStars);

  try {
    await loadPokemonList();
    statusMessage.classList.add("hidden");
    startView.classList.remove("hidden");
  } catch (error) {
    statusMessage.textContent = "Couldn't load the star charts. Please refresh.";
  }
}

init();
