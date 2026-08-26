/* Road Trip - guess the distance between two US cities. */

const TOLERANCE_MI = 25; // how close a guess has to be to count
const PENALTY_SECONDS = 20; // detour timer after a miss
const CHECKPOINTS_TO_WIN = 3;

/* Pairs are kept in this band so a round is challenging but still winnable at
   +/-25 miles - coast-to-coast pairs would need ~1% accuracy. */
const MIN_PAIR_MI = 150;
const MAX_PAIR_MI = 1200;

const RAD = Math.PI / 180;
const EARTH_MI = 3958.7613;

const statesEl = document.getElementById("states");
const routeEl = document.getElementById("route");
const pinsEl = document.getElementById("pins");
const cityAEl = document.getElementById("city-a");
const cityBEl = document.getElementById("city-b");
const scoreEl = document.getElementById("score-display");
const attemptsEl = document.getElementById("attempts-display");
const statusEl = document.getElementById("status-display");
const resultEl = document.getElementById("result");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const winEl = document.getElementById("win-screen");
const winNoteEl = document.getElementById("win-note");
const formEl = document.getElementById("guess-form");
const inputEl = document.getElementById("guess-input");
const guessBtn = document.getElementById("guess-btn");

let correct = 0;
let attempts = 0;
let pair = null;
let locked = false;
let penaltyTimer = null;
let bestMiss = null;

/* Same Albers projection the map paths were generated with (y negated for SVG). */
function project(lat, lon) {
  const theta = MAP_PROJ.n * (lon * RAD - MAP_PROJ.lam0);
  const rho = Math.sqrt(MAP_PROJ.c - 2 * MAP_PROJ.n * Math.sin(lat * RAD)) / MAP_PROJ.n;
  return {
    x: rho * Math.sin(theta) * MAP_PROJ.scale + MAP_PROJ.offX,
    y: (rho * Math.cos(theta) - MAP_PROJ.rho0) * MAP_PROJ.scale + MAP_PROJ.offY,
  };
}

function milesBetween(a, b) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.sqrt(h));
}

const svgEl = (tag, attrs) => {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
};

/* Northeastern states too small to carry a readable label on a phone. */
const TINY_STATES = new Set(["DE", "RI", "CT", "NJ", "MA", "NH", "VT", "MD"]);

function drawStates() {
  US_STATES.forEach((s) => {
    const path = svgEl("path", { d: s.d, class: "state" });
    path.appendChild(svgEl("title", {})).textContent = s.name;
    statesEl.appendChild(path);
  });
  US_STATES.forEach((s) => {
    if (!s.abbr || s.abbr === "DC") return;
    const label = svgEl("text", {
      x: s.cx,
      y: s.cy + 4,
      class: `state-label${TINY_STATES.has(s.abbr) ? " tiny" : ""}`,
    });
    label.textContent = s.abbr;
    statesEl.appendChild(label);
  });
}

function randomPair() {
  for (let tries = 0; tries < 400; tries++) {
    const a = ROAD_CITIES[Math.floor(Math.random() * ROAD_CITIES.length)];
    const b = ROAD_CITIES[Math.floor(Math.random() * ROAD_CITIES.length)];
    if (a === b) continue;
    const miles = milesBetween(a, b);
    if (miles >= MIN_PAIR_MI && miles <= MAX_PAIR_MI) return { a, b, miles };
  }
  const a = ROAD_CITIES[0];
  const b = ROAD_CITIES[1];
  return { a, b, miles: milesBetween(a, b) };
}

/* Standard teardrop map marker whose point sits exactly on the coordinate. */
function pinPath(x, y, r, h) {
  return (
    `M${x},${y}` +
    `C${x - r * 0.55},${y - h * 0.42} ${x - r},${y - h * 0.72} ${x - r},${y - h}` +
    `a${r},${r} 0 1,1 ${r * 2},0` +
    `c0,${h * 0.28} ${-r * 0.45},${h * 0.58} ${-r},${h}Z`
  );
}

function drawPin(city, letter, isB, labelBelow) {
  const { x, y } = project(city.lat, city.lon);
  const r = 11;
  const h = 26;
  pinsEl.appendChild(
    svgEl("path", { d: pinPath(x, y, r, h), class: `pin pin-${isB ? "b" : "a"}` })
  );
  const l = svgEl("text", { x, y: y - h + 5, class: "pin-letter" });
  l.textContent = letter;
  pinsEl.appendChild(l);

  // Offset lives in CSS so it can grow with the larger phone font size.
  const name = svgEl("text", { x, y, class: `pin-name ${labelBelow ? "below" : "above"}` });
  name.textContent = `${city.name}, ${city.state}`;
  pinsEl.appendChild(name);
}

function newRound() {
  pair = randomPair();
  routeEl.innerHTML = "";
  pinsEl.innerHTML = "";

  // Nearby cities would stack their labels on top of each other, so split them
  // above/below; otherwise keep labels clear of the top edge of the map.
  const pa = project(pair.a.lat, pair.a.lon);
  const pb = project(pair.b.lat, pair.b.lon);
  const crowded = Math.abs(pa.x - pb.x) < 230 && Math.abs(pa.y - pb.y) < 60;
  const aBelow = crowded ? false : pa.y < 70;
  const bBelow = crowded ? true : pb.y < 70;

  drawPin(pair.a, "A", false, aBelow);
  drawPin(pair.b, "B", true, bBelow);
  cityAEl.textContent = `${pair.a.name}, ${pair.a.state}`;
  cityBEl.textContent = `${pair.b.name}, ${pair.b.state}`;
  inputEl.value = "";
  locked = false;
  guessBtn.disabled = false;
  inputEl.disabled = false;
  statusEl.textContent = "Make your call";
  statusEl.className = "gauge-value status-ok";
  inputEl.focus();
}

/* Only drawn once a guess is locked in - the answer stays hidden until then. */
function revealRoute() {
  const a = project(pair.a.lat, pair.a.lon);
  const b = project(pair.b.lat, pair.b.lon);
  routeEl.appendChild(
    svgEl("path", { d: `M${a.x},${a.y} L${b.x},${b.y}`, class: "route-line" })
  );
}

function updateGauges() {
  scoreEl.textContent = `${correct} / ${CHECKPOINTS_TO_WIN}`;
  attemptsEl.textContent = String(attempts);
}

function startPenalty() {
  let left = PENALTY_SECONDS;
  penaltyCountEl.textContent = String(left);
  penaltyEl.classList.remove("hidden");
  penaltyTimer = setInterval(() => {
    left -= 1;
    penaltyCountEl.textContent = String(Math.max(0, left));
    if (left <= 0) {
      clearInterval(penaltyTimer);
      penaltyTimer = null;
      penaltyEl.classList.add("hidden");
      resultEl.innerHTML = "";
      newRound();
    }
  }, 1000);
}

function win() {
  locked = true;
  guessBtn.disabled = true;
  inputEl.disabled = true;
  statusEl.textContent = "Arrived!";
  statusEl.className = "gauge-value status-ok";
  const missNote =
    bestMiss == null ? "" : ` Your sharpest guess was ${bestMiss.toFixed(0)} mile${bestMiss === 1 ? "" : "s"} off.`;
  winNoteEl.textContent = `${CHECKPOINTS_TO_WIN} checkpoints in ${attempts} attempt${attempts === 1 ? "" : "s"}.${missNote}`;
  winEl.classList.remove("hidden");
}

function submitGuess(event) {
  event.preventDefault();
  if (locked || penaltyTimer) return;
  const raw = inputEl.value.trim();
  if (raw === "") return;
  const guess = Number(raw);
  if (!isFinite(guess) || guess < 0) return;

  locked = true;
  guessBtn.disabled = true;
  inputEl.disabled = true;
  attempts += 1;

  const actual = pair.miles;
  const off = Math.abs(guess - actual);
  if (bestMiss == null || off < bestMiss) bestMiss = off;
  revealRoute();

  if (off <= TOLERANCE_MI) {
    correct += 1;
    updateGauges();
    resultEl.innerHTML = `<span class="hit">Nailed it &mdash; ${actual.toFixed(
      0
    )} mi, you were ${off.toFixed(0)} off.</span>`;
    statusEl.textContent = "Checkpoint!";
    statusEl.className = "gauge-value status-ok";
    if (correct >= CHECKPOINTS_TO_WIN) {
      win();
      return;
    }
    setTimeout(() => {
      resultEl.innerHTML = "";
      newRound();
    }, 1800);
    return;
  }

  updateGauges();
  const dir = guess > actual ? "too far" : "too short";
  resultEl.innerHTML = `<span class="miss">${actual.toFixed(0)} mi &mdash; you were ${off.toFixed(
    0
  )} ${dir}.</span>`;
  statusEl.textContent = "Wrong turn";
  statusEl.className = "gauge-value status-bad";
  startPenalty();
}

function resetGame() {
  correct = 0;
  attempts = 0;
  bestMiss = null;
  if (penaltyTimer) {
    clearInterval(penaltyTimer);
    penaltyTimer = null;
  }
  penaltyEl.classList.add("hidden");
  winEl.classList.add("hidden");
  resultEl.innerHTML = "";
  updateGauges();
  newRound();
}

drawStates();
updateGauges();
newRound();
formEl.addEventListener("submit", submitGuess);
document.getElementById("play-again").addEventListener("click", resetGame);
