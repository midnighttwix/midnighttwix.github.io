const newRoundBtn = document.getElementById("new-round-btn");
const statusMessage = document.getElementById("status-message");
const matchupEl = document.getElementById("matchup");
const promptMessage = document.getElementById("prompt-message");
const revealBtn = document.getElementById("reveal-btn");
const resultMessage = document.getElementById("result-message");

const cardA = document.getElementById("card-a");
const cardB = document.getElementById("card-b");
const pokeAImg = document.getElementById("poke-a-img");
const pokeBImg = document.getElementById("poke-b-img");
const pokeAName = document.getElementById("poke-a-name");
const pokeBName = document.getElementById("poke-b-name");
const pokeAStat = document.getElementById("poke-a-stat");
const pokeBStat = document.getElementById("poke-b-stat");

let currentPair = null; // { a: {name, views}, b: {name, views} }
let selectedSide = null; // "a" | "b"
let revealed = false;

function pickDistinctSample(list, count) {
  const pool = [...list];
  const sample = [];
  while (sample.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    sample.push(pool.splice(index, 1)[0]);
  }
  return sample;
}

function findClosestPair(entries) {
  let best = null;
  let bestRatio = Infinity;

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const viewsA = Math.max(entries[i].views, 1);
      const viewsB = Math.max(entries[j].views, 1);
      const ratio = Math.max(viewsA, viewsB) / Math.min(viewsA, viewsB);
      if (ratio < bestRatio) {
        bestRatio = ratio;
        best = [entries[i], entries[j]];
      }
    }
  }

  return best;
}

function getSafeMonthRange() {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const pad = (n) => String(n).padStart(2, "0");
  const start = `${year}${pad(month + 1)}0100`;
  const end = `${year}${pad(month + 1)}${pad(lastDay)}00`;
  return { start, end };
}

async function fetchPageviews(articleTitle) {
  const { start, end } = getSafeMonthRange();
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/${encodeURIComponent(
    articleTitle
  )}/monthly/${start}/${end}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No pageview data for ${articleTitle}`);
  const data = await response.json();
  const item = data.items && data.items[0];
  if (!item) throw new Error(`No pageview data for ${articleTitle}`);
  return item.views;
}

async function fetchBulbapediaImage(name) {
  try {
    const title = encodeURIComponent(`${name} (Pokémon)`);
    const response = await fetch(
      `https://bulbapedia.bulbagarden.net/w/api.php?action=query&titles=${title}&prop=pageimages&format=json&pithumbsize=300&origin=*`
    );
    if (!response.ok) return "";
    const data = await response.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source || "";
  } catch (error) {
    return "";
  }
}

async function fetchFallbackSprite(name) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
    if (!response.ok) return "";
    const data = await response.json();
    return data.sprites?.other?.["official-artwork"]?.front_default || data.sprites?.front_default || "";
  } catch (error) {
    return "";
  }
}

function setImageWithFallback(imgEl, primaryUrl, fallbackUrl, altText) {
  imgEl.alt = altText;
  imgEl.dataset.fallback = fallbackUrl || "";
  imgEl.onerror = () => {
    if (imgEl.dataset.fallback && imgEl.src !== imgEl.dataset.fallback) {
      imgEl.src = imgEl.dataset.fallback;
    }
  };
  imgEl.src = primaryUrl || fallbackUrl || "";
}

function setSelected(side) {
  selectedSide = side;
  cardA.classList.toggle("selected", side === "a");
  cardB.classList.toggle("selected", side === "b");
  revealBtn.disabled = false;
}

async function loadRound() {
  newRoundBtn.disabled = true;
  revealBtn.disabled = true;
  revealBtn.classList.add("hidden");
  promptMessage.classList.add("hidden");
  matchupEl.classList.add("hidden");
  resultMessage.textContent = "";
  resultMessage.classList.remove("correct", "incorrect");
  cardA.classList.remove("selected", "winner", "loser");
  cardB.classList.remove("selected", "winner", "loser");
  selectedSide = null;
  revealed = false;
  statusMessage.classList.remove("hidden");
  statusMessage.textContent = "Loading a matchup...";

  const SAMPLE_SIZE = 10;
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const sampleNames = pickDistinctSample(TREND_POKEMON, SAMPLE_SIZE);

    const settled = await Promise.allSettled(
      sampleNames.map(async (name) => ({ name, views: await fetchPageviews(name) }))
    );
    const entries = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);

    if (entries.length < 2) continue;

    const pair = findClosestPair(entries);
    if (!pair) continue;

    const [entryA, entryB] = pair;

    try {
      const [spriteA, spriteB, fallbackA, fallbackB] = await Promise.all([
        fetchBulbapediaImage(entryA.name),
        fetchBulbapediaImage(entryB.name),
        fetchFallbackSprite(entryA.name),
        fetchFallbackSprite(entryB.name),
      ]);

      currentPair = {
        a: { name: entryA.name, views: entryA.views },
        b: { name: entryB.name, views: entryB.views },
      };

      setImageWithFallback(pokeAImg, spriteA, fallbackA, entryA.name);
      pokeAName.textContent = entryA.name;
      pokeAStat.textContent = "";

      setImageWithFallback(pokeBImg, spriteB, fallbackB, entryB.name);
      pokeBName.textContent = entryB.name;
      pokeBStat.textContent = "";

      statusMessage.classList.add("hidden");
      matchupEl.classList.remove("hidden");
      promptMessage.classList.remove("hidden");
      revealBtn.classList.remove("hidden");
      newRoundBtn.disabled = false;
      return;
    } catch (error) {
      // try a different sample
    }
  }

  statusMessage.textContent = "Couldn't find page view data. Try New Round again.";
  newRoundBtn.disabled = false;
}

function revealResult() {
  if (!currentPair || !selectedSide || revealed) return;
  revealed = true;
  revealBtn.disabled = true;

  const { a, b } = currentPair;
  pokeAStat.textContent = `${a.views.toLocaleString()} views`;
  pokeBStat.textContent = `${b.views.toLocaleString()} views`;

  const winnerSide = a.views >= b.views ? "a" : "b";
  const isCorrect = selectedSide === winnerSide;

  cardA.classList.add(winnerSide === "a" ? "winner" : "loser");
  cardB.classList.add(winnerSide === "b" ? "winner" : "loser");

  if (isCorrect) {
    resultMessage.textContent = `Congrats! ${currentPair[winnerSide].name} had more page views.`;
    resultMessage.classList.add("correct");
    resultMessage.classList.remove("incorrect");
  } else {
    resultMessage.textContent = `Wrong! ${currentPair[winnerSide].name} actually had more page views.`;
    resultMessage.classList.add("incorrect");
    resultMessage.classList.remove("correct");
  }
}

cardA.addEventListener("click", () => {
  if (!revealed) setSelected("a");
});
cardB.addEventListener("click", () => {
  if (!revealed) setSelected("b");
});
revealBtn.addEventListener("click", revealResult);
newRoundBtn.addEventListener("click", loadRound);

loadRound();
