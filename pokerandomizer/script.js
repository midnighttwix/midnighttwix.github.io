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

const TYPE_THEMES = {
  normal: { accent: "#a8a878", accentDark: "#7c7c53", bg1: "#f5f5ee", bg2: "#e9e9d6", bg3: "#dedec2" },
  fire: { accent: "#f08030", accentDark: "#b85c1c", bg1: "#fff1e2", bg2: "#ffd6ad", bg3: "#ffbd7f" },
  water: { accent: "#6890f0", accentDark: "#3f63c2", bg1: "#e7efff", bg2: "#c7d9ff", bg3: "#a9c3ff" },
  electric: { accent: "#f8d030", accentDark: "#c2a413", bg1: "#fffae0", bg2: "#fff0a8", bg3: "#ffe670" },
  grass: { accent: "#78c850", accentDark: "#4d9a2c", bg1: "#eefbe4", bg2: "#cef2b3", bg3: "#aee582" },
  ice: { accent: "#98d8d8", accentDark: "#5aacac", bg1: "#e9fbfb", bg2: "#c4f0f0", bg3: "#9fe4e4" },
  fighting: { accent: "#c03028", accentDark: "#8c1f19", bg1: "#fbe6e4", bg2: "#f2bcb7", bg3: "#e79089" },
  poison: { accent: "#a040a0", accentDark: "#722872", bg1: "#f7e6f7", bg2: "#eabdea", bg3: "#dd93dd" },
  ground: { accent: "#e0c068", accentDark: "#ad9138", bg1: "#faf3dd", bg2: "#f2e0a8", bg3: "#e9cd73" },
  flying: { accent: "#a890f0", accentDark: "#7860c2", bg1: "#f3eeff", bg2: "#ddceff", bg3: "#c7adff" },
  psychic: { accent: "#f85888", accentDark: "#c22e5c", bg1: "#ffe9f0", bg2: "#ffbfd6", bg3: "#ff94bb" },
  bug: { accent: "#a8b820", accentDark: "#78850e", bg1: "#f6f9dc", bg2: "#e6ee9f", bg3: "#d5e260" },
  rock: { accent: "#b8a038", accentDark: "#89751f", bg1: "#f6f1dd", bg2: "#e6d69f", bg3: "#d5bb63" },
  ghost: { accent: "#705898", accentDark: "#493a66", bg1: "#ece6f3", bg2: "#cbbcdf", bg3: "#aa92cb" },
  dragon: { accent: "#7038f8", accentDark: "#4a1fb8", bg1: "#ece2ff", bg2: "#cbb3ff", bg3: "#aa85ff" },
  dark: { accent: "#705848", accentDark: "#453529", bg1: "#eae4df", bg2: "#cfbfb2", bg3: "#b39c88" },
  steel: { accent: "#b8b8d0", accentDark: "#82829c", bg1: "#f2f2f8", bg2: "#dcdcec", bg3: "#c6c6e0" },
  fairy: { accent: "#ee99ac", accentDark: "#c25f77", bg1: "#fef0f4", bg2: "#fbd0dc", bg3: "#f8b0c4" },
};

const GEN_LABELS = {
  1: "Gen I",
  2: "Gen II",
  3: "Gen III",
  4: "Gen IV",
  5: "Gen V",
  6: "Gen VI",
  7: "Gen VII",
  8: "Gen VIII",
  9: "Gen IX",
};

const genFiltersEl = document.getElementById("gen-filters");
const typeFiltersEl = document.getElementById("type-filters");
const stageFiltersEl = document.getElementById("stage-filters");
const themeSelect = document.getElementById("theme-select");
const countInput = document.getElementById("count-input");
const controlsForm = document.getElementById("controls-form");
const statusMessage = document.getElementById("status-message");
const resultsGrid = document.getElementById("results-grid");

const toggleImage = document.getElementById("toggle-image");
const toggleName = document.getElementById("toggle-name");
const toggleTypes = document.getElementById("toggle-types");
const toggleDex = document.getElementById("toggle-dex");
const toggleStats = document.getElementById("toggle-stats");

function capitalize(text) {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function buildGenFilters() {
  Object.entries(GEN_LABELS).forEach(([gen, label]) => {
    const chip = document.createElement("label");
    chip.className = "chip";
    chip.innerHTML = `<input type="checkbox" value="${gen}" /> ${label}`;
    genFiltersEl.appendChild(chip);
  });
}

function buildTypeFilters() {
  Object.keys(TYPE_COLORS).forEach((type) => {
    const chip = document.createElement("label");
    chip.className = "chip";
    chip.innerHTML = `<input type="checkbox" value="${type}" /> ${capitalize(type)}`;
    typeFiltersEl.appendChild(chip);
  });
}

function buildThemeSelect() {
  const defaultOption = document.createElement("option");
  defaultOption.value = "default";
  defaultOption.textContent = "Default (Pastel)";
  themeSelect.appendChild(defaultOption);

  Object.keys(TYPE_THEMES).forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = `${capitalize(type)} Type`;
    themeSelect.appendChild(option);
  });
}

function applyTheme(themeKey) {
  const root = document.documentElement.style;
  if (themeKey === "default" || !TYPE_THEMES[themeKey]) {
    root.setProperty("--bg-1", "#fff4c7");
    root.setProperty("--bg-2", "#ffd5ec");
    root.setProperty("--bg-3", "#d9f5ff");
    root.setProperty("--accent", "#ff6eb6");
    root.setProperty("--accent-dark", "#d1487f");
    return;
  }
  const theme = TYPE_THEMES[themeKey];
  root.setProperty("--bg-1", theme.bg1);
  root.setProperty("--bg-2", theme.bg2);
  root.setProperty("--bg-3", theme.bg3);
  root.setProperty("--accent", theme.accent);
  root.setProperty("--accent-dark", theme.accentDark);
}

function getCheckedValues(container) {
  return [...container.querySelectorAll("input:checked")].map((input) => input.value);
}

function pickRandomSample(array, count) {
  const pool = [...array];
  const sample = [];
  const take = Math.min(count, pool.length);
  for (let i = 0; i < take; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    sample.push(pool.splice(index, 1)[0]);
  }
  return sample;
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

function formatHeightWeight(heightM, weightKg) {
  const heightFt = heightM * 3.28084;
  let feet = Math.floor(heightFt);
  let inches = Math.round((heightFt - feet) * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  const weightLb = (weightKg * 2.20462).toFixed(1);
  return `${feet}'${inches}" · ${weightLb} lb`;
}

function renderCard(pokemon) {
  const card = document.createElement("div");
  card.className = "poke-card";

  const inner = document.createElement("div");
  inner.className = "poke-card-inner";

  const front = document.createElement("div");
  front.className = "poke-card-front";

  const dex = document.createElement("span");
  dex.className = "card-dex field-dex";
  dex.textContent = `#${String(pokemon.id).padStart(4, "0")}`;

  const img = document.createElement("img");
  img.className = "card-img field-image";
  img.src = spriteUrl(pokemon.id);
  img.alt = capitalize(pokemon.name);
  img.loading = "lazy";

  const name = document.createElement("p");
  name.className = "card-name field-name";
  name.textContent = capitalize(pokemon.name);

  const typesRow = document.createElement("div");
  typesRow.className = "card-types field-types";
  renderTypeBadges(typesRow, pokemon.types);

  const stats = document.createElement("p");
  stats.className = "card-stats field-stats";
  stats.textContent = formatHeightWeight(pokemon.heightM, pokemon.weightKg);

  front.appendChild(dex);
  front.appendChild(img);
  front.appendChild(name);
  front.appendChild(typesRow);
  front.appendChild(stats);

  const back = document.createElement("div");
  back.className = "poke-card-back";
  back.innerHTML = `<div class="pokeball-outline"><span class="pokeball-outline-bar"></span><span class="pokeball-outline-center"></span></div>`;

  inner.appendChild(front);
  inner.appendChild(back);
  card.appendChild(inner);

  card.addEventListener("click", () => {
    card.classList.toggle("is-flipped");
  });

  applyFieldVisibility(front);

  return card;
}

function applyFieldVisibility(scope) {
  scope.querySelectorAll(".field-dex").forEach((el) => el.classList.toggle("field-hidden", !toggleDex.checked));
  scope.querySelectorAll(".field-image").forEach((el) => el.classList.toggle("field-hidden", !toggleImage.checked));
  scope.querySelectorAll(".field-name").forEach((el) => el.classList.toggle("field-hidden", !toggleName.checked));
  scope.querySelectorAll(".field-types").forEach((el) => el.classList.toggle("field-hidden", !toggleTypes.checked));
  scope.querySelectorAll(".field-stats").forEach((el) => el.classList.toggle("field-hidden", !toggleStats.checked));
}

function refreshFieldVisibility() {
  applyFieldVisibility(resultsGrid);
}

function generate() {
  const count = Math.max(1, Math.min(1025, Number(countInput.value) || 6));
  const selectedGens = getCheckedValues(genFiltersEl).map(Number);
  const selectedTypes = getCheckedValues(typeFiltersEl);
  const selectedStages = getCheckedValues(stageFiltersEl);

  const candidates = POKEDEX.filter((poke) => {
    if (selectedGens.length > 0 && !selectedGens.includes(poke.gen)) return false;
    if (selectedTypes.length > 0 && !poke.types.some((type) => selectedTypes.includes(type))) return false;
    if (selectedStages.length > 0) {
      const isFullyEvolved = poke.stage === "final" || poke.stage === "single";
      const wantsEvolved = selectedStages.includes("evolved");
      const wantsUnevolved = selectedStages.includes("unevolved");
      if (wantsEvolved && !wantsUnevolved && !isFullyEvolved) return false;
      if (wantsUnevolved && !wantsEvolved && isFullyEvolved) return false;
    }
    return true;
  });

  if (candidates.length === 0) {
    statusMessage.textContent = "No Pokémon match those filters — try loosening them up!";
    resultsGrid.innerHTML = "";
    return;
  }

  const sample = pickRandomSample(candidates, count);
  const actualCount = sample.length;
  statusMessage.textContent =
    actualCount < count
      ? `Only ${actualCount} Pokémon matched your filters — showing all of them.`
      : `Generated ${actualCount} Pokémon.`;

  resultsGrid.innerHTML = "";
  sample.forEach((pokemon) => resultsGrid.appendChild(renderCard(pokemon)));
}

buildGenFilters();
buildTypeFilters();
buildThemeSelect();

themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
[toggleImage, toggleName, toggleTypes, toggleDex, toggleStats].forEach((toggle) => {
  toggle.addEventListener("change", refreshFieldVisibility);
});

controlsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  generate();
});

applyTheme("default");
generate();
