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

const MAX_RANK_GAP = 40; // keeps matchups close instead of blowouts

let currentPair = null; // { a: {name, rank}, b: {name, rank} }
let selectedSide = null; // "a" | "b"
let revealed = false;

function pickClosePair() {
  const total = RANKED_POKEMON.length;
  const indexA = Math.floor(Math.random() * total);

  const minIndex = Math.max(0, indexA - MAX_RANK_GAP);
  const maxIndex = Math.min(total - 1, indexA + MAX_RANK_GAP);

  let indexB = indexA;
  while (indexB === indexA) {
    indexB = minIndex + Math.floor(Math.random() * (maxIndex - minIndex + 1));
  }

  return [
    { name: RANKED_POKEMON[indexA], rank: indexA + 1 },
    { name: RANKED_POKEMON[indexB], rank: indexB + 1 },
  ];
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

  const [entryA, entryB] = pickClosePair();

  const [spriteA, spriteB, fallbackA, fallbackB] = await Promise.all([
    fetchBulbapediaImage(entryA.name),
    fetchBulbapediaImage(entryB.name),
    fetchFallbackSprite(entryA.name),
    fetchFallbackSprite(entryB.name),
  ]);

  currentPair = { a: entryA, b: entryB };

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
}

function revealResult() {
  if (!currentPair || !selectedSide || revealed) return;
  revealed = true;
  revealBtn.disabled = true;

  const { a, b } = currentPair;
  pokeAStat.textContent = `Rank #${a.rank} of ${RANKED_POKEMON.length}`;
  pokeBStat.textContent = `Rank #${b.rank} of ${RANKED_POKEMON.length}`;

  const winnerSide = a.rank <= b.rank ? "a" : "b";
  const isCorrect = selectedSide === winnerSide;

  cardA.classList.add(winnerSide === "a" ? "winner" : "loser");
  cardB.classList.add(winnerSide === "b" ? "winner" : "loser");

  if (isCorrect) {
    resultMessage.textContent = `Congrats! ${currentPair[winnerSide].name} was visited more in 2025.`;
    resultMessage.classList.add("correct");
    resultMessage.classList.remove("incorrect");
  } else {
    resultMessage.textContent = `Wrong! ${currentPair[winnerSide].name} was actually visited more in 2025.`;
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
