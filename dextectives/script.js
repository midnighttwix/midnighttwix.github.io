/* Dextectives - one word in a real Pokedex entry has been swapped. Find it, fix it. */

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";

/*
 * Words are only ever swapped for another word in the same group, so the
 * tampered sentence stays grammatical and the original is deducible from
 * context rather than from it simply reading as gibberish. Every group is a
 * set of real nouns / verbs / adjectives sharing one grammatical slot.
 */
const GROUPS = {
  color: ["red", "blue", "green", "yellow", "black", "white", "purple", "orange", "pink", "brown", "gray", "grey", "golden", "silver", "crimson"],
  bodySingular: ["tail", "horn", "shell", "beak", "tongue", "nose", "mouth", "head", "chest", "belly", "snout", "mane", "crest", "skin", "hair", "fur", "neck", "throat", "stomach", "heart", "brain", "trunk", "jaw", "spine", "hood", "coat"],
  bodyPlural: ["claws", "wings", "fangs", "teeth", "eyes", "ears", "legs", "arms", "horns", "tails", "feathers", "scales", "whiskers", "paws", "tentacles", "antennae", "spikes", "fins", "hooves", "petals", "talons", "hands", "feet", "shoulders", "muscles"],
  element: ["fire", "water", "ice", "electricity", "lightning", "wind", "flames", "poison", "sand", "mud", "rock", "steel", "grass", "smoke", "steam", "lava", "snow", "heat", "acid", "venom", "dust", "slime"],
  weather: ["rain", "storms", "thunder", "fog", "mist", "clouds", "hail", "sunshine", "moonlight", "breezes"],
  sizeAdj: ["large", "small", "huge", "tiny", "enormous", "massive", "gigantic", "little", "wide", "narrow", "thick", "thin"],
  qualityAdj: ["powerful", "weak", "strong", "fast", "slow", "heavy", "hard", "soft", "sharp", "gentle", "fierce", "quiet", "loud", "bright", "dark", "warm", "cold", "hot", "cool", "rough", "smooth", "sturdy", "fragile"],
  natureAdj: ["ancient", "young", "old", "rare", "common", "wild", "calm", "angry", "happy", "clever", "foolish", "brave", "timid", "lazy", "greedy", "curious", "friendly", "dangerous", "deadly", "beautiful", "strange", "mysterious", "playful", "stubborn", "loyal"],
  number: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "twenty", "thirty", "fifty", "hundred", "thousand"],
  placePlural: ["mountains", "forests", "caves", "oceans", "rivers", "lakes", "deserts", "swamps", "fields", "seas", "skies", "jungles", "marshes", "valleys", "meadows", "ruins", "caverns", "grasslands", "wetlands", "cliffs"],
  placeSingular: ["mountain", "forest", "cave", "ocean", "river", "lake", "desert", "swamp", "field", "sea", "sky", "jungle", "marsh", "valley", "meadow", "nest", "den", "cavern", "pond", "beach", "burrow", "canyon", "shore"],
  time: ["day", "night", "morning", "evening", "dawn", "dusk", "summer", "winter", "spring", "autumn", "noon", "midnight"],
  verb3rd: ["attacks", "protects", "sleeps", "flies", "swims", "runs", "digs", "hides", "hunts", "eats", "jumps", "climbs", "crawls", "floats", "grows", "lives", "moves", "rests", "sings", "dances", "spins", "chews", "licks", "swallows", "chases", "guards", "gathers", "carries", "drags", "spits", "burns", "freezes", "wanders", "drifts", "glows", "senses", "tracks", "sprays", "stores", "battles", "roams", "leaps", "strikes", "hovers"],
  verbBase: ["attack", "protect", "sleep", "fly", "swim", "run", "dig", "hide", "hunt", "eat", "jump", "climb", "crawl", "float", "grow", "live", "move", "rest", "sing", "dance", "spin", "chew", "lick", "swallow", "chase", "guard", "gather", "carry", "drag", "spit", "burn", "freeze", "wander", "drift", "glow", "sense", "track", "spray", "store", "battle", "roam", "leap", "strike", "hover"],
  verbIng: ["sleeping", "flying", "swimming", "running", "hunting", "digging", "hiding", "eating", "resting", "climbing", "floating", "growing", "moving", "singing", "attacking", "chasing", "guarding", "burning", "freezing", "glowing", "wandering", "drifting", "leaping", "spinning"],
  emotion: ["anger", "fear", "joy", "love", "sadness", "rage", "happiness", "sorrow", "courage", "hunger", "loneliness", "pride"],
  power: ["power", "energy", "strength", "speed", "force", "spirit", "memory", "instinct", "wisdom", "stamina"],
  material: ["stone", "metal", "wood", "glass", "crystal", "iron", "gold", "diamond", "clay", "silk", "amber", "coal"],
  food: ["berries", "fruit", "honey", "nuts", "seeds", "leaves", "plants", "insects", "prey", "roots", "flowers", "mushrooms", "sap", "pollen"],
  objectSingular: ["tree", "flower", "egg", "cloud", "star", "moon", "sun", "shadow", "flame", "spark", "wave", "bubble", "bone", "web", "thorn"],
  objectPlural: ["trees", "eggs", "stars", "shadows", "sparks", "waves", "bubbles", "bones", "webs", "thorns", "boulders", "vines"],
};

/*
 * Grammar glue and franchise boilerplate. These are never swapped (they aren't
 * in any group) and are also not selectable, so a guess is never wasted on a
 * word that could not possibly be the answer.
 */
const STOPWORDS = new Set(
  ("a an the and or but if so than then that this these those there here it its it's he him his she her hers they them their theirs we us our you your i me my mine " +
   "of to in on at by for with from as into onto over under above below near across through around about between among against during before after until while " +
   "is are was were be been being am has have had do does did will would shall should can could may might must " +
   "not no nor very too also just only even more most much many some any every each other another such own same " +
   "when where who whom which what why how whose " +
   "pokemon pokemon's poke dex").split(" ")
);

const WORD_GROUP = new Map();
Object.entries(GROUPS).forEach(([key, words]) => {
  words.forEach((w) => {
    if (!WORD_GROUP.has(w)) WORD_GROUP.set(w, key);
  });
});

const PENALTY_SECONDS = 10;
const SUCCESS_DELAY_MS = 1400;

const entryEl = document.getElementById("entry");
const spriteEl = document.getElementById("sprite");
const nameEl = document.getElementById("poke-name");
const verdictEl = document.getElementById("verdict");
const statusEl = document.getElementById("status-display");
const solvedEl = document.getElementById("solved-display");
const streakEl = document.getElementById("streak-display");
const penaltyEl = document.getElementById("penalty");
const penaltyCountEl = document.getElementById("penalty-count");
const newCaseBtn = document.getElementById("new-case");

let puzzle = null;
let solved = 0;
let streak = 0;
let locked = false;
let penaltyTimer = null;
let transitionTimer = null;

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (list) => list[rnd(list.length)];
const normalize = (s) => s.toLowerCase().replace(/’/g, "'").replace(/[^a-z']/g, "");

function matchCase(source, replacement) {
  if (source[0] === source[0].toUpperCase() && source[0] !== source[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/* Split into word / non-word tokens so punctuation and spacing survive. */
function tokenize(text) {
  return text.match(/[A-Za-z'’]+|[^A-Za-z'’]+/g) || [];
}

/*
 * Swaps exactly one word. Returns null when an entry has no usable candidate -
 * the caller just tries another entry.
 */
function buildPuzzle(record) {
  const [id, name, text] = record;
  const tokens = tokenize(text);
  // Paradox names like "Iron Valiant" / "Flutter Mane" share words with the
  // groups, and name words aren't selectable - so keep them out of the puzzle.
  const nameParts = new Set(name.toLowerCase().replace(/’/g, "'").split(/[^a-z']+/).filter(Boolean));
  const usable = (w) => !STOPWORDS.has(w) && !nameParts.has(w);

  const wordIdx = tokens
    .map((t, i) => i)
    .filter(
      (i) =>
        /^[A-Za-z'’]+$/.test(tokens[i]) &&
        WORD_GROUP.has(tokens[i].toLowerCase().replace(/’/g, "'")) &&
        usable(tokens[i].toLowerCase().replace(/’/g, "'"))
    );
  if (!wordIdx.length) return null;

  const present = new Set(tokens.filter((t) => /^[A-Za-z'’]+$/.test(t)).map((t) => t.toLowerCase().replace(/’/g, "'")));

  for (const i of wordIdx.sort(() => Math.random() - 0.5)) {
    const original = tokens[i];
    const lower = original.toLowerCase().replace(/’/g, "'");
    // Only swap a word that appears once, or the player can't tell which is which.
    if (tokens.filter((t) => t.toLowerCase().replace(/’/g, "'") === lower).length > 1) continue;
    const options = GROUPS[WORD_GROUP.get(lower)].filter(
      (w) => w !== lower && !present.has(w) && usable(w)
    );
    if (!options.length) continue;

    const replacement = matchCase(original, pick(options));
    const shown = tokens.slice();
    shown[i] = replacement;
    return { id, name, tokens: shown, changedIndex: i, original, replacement };
  }
  return null;
}

function markWord(i, cls) {
  const el = entryEl.querySelector(`.word[data-i="${i}"]`);
  if (el) {
    el.classList.remove("selected", "bad", "warn", "good");
    el.classList.add(cls);
  }
}

function setVerdict(cls, head, detail) {
  verdictEl.className = `verdict ${cls}`;
  verdictEl.innerHTML = `<span class="verdict-head">${head}</span>${detail}`;
}

function startPenalty() {
  if (penaltyTimer) clearInterval(penaltyTimer);
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
      newCase();
    }
  }, 1000);
}

function handleWordClick(i) {
  if (locked || penaltyTimer || !puzzle) return;

  const clickedWord = puzzle.tokens[i];
  if (!clickedWord) return;

  locked = true;
  entryEl.classList.add("locked");

  if (i === puzzle.changedIndex) {
    // Correct word selected!
    solved += 1;
    streak += 1;
    solvedEl.textContent = String(solved);
    streakEl.textContent = String(streak);

    markWord(i, "good");
    const el = entryEl.querySelector(`.word[data-i="${i}"]`);
    if (el) el.textContent = puzzle.original;

    setVerdict(
      "good",
      "Correct!",
      `&ldquo;${puzzle.replacement}&rdquo; was the tampered word &mdash; replaced &ldquo;${puzzle.original}&rdquo;!`
    );
    statusEl.textContent = "Correct!";

    transitionTimer = setTimeout(() => {
      transitionTimer = null;
      newCase();
    }, SUCCESS_DELAY_MS);
  } else {
    // Wrong word selected!
    streak = 0;
    streakEl.textContent = String(streak);

    markWord(i, "bad");
    markWord(puzzle.changedIndex, "warn");

    setVerdict(
      "bad",
      "Wrong word! (10s penalty)",
      `&ldquo;${clickedWord}&rdquo; was original. The tampered word was &ldquo;${puzzle.replacement}&rdquo; (originally &ldquo;${puzzle.original}&rdquo;).`
    );
    statusEl.textContent = "10s Penalty";

    startPenalty();
  }
}

function newCase() {
  if (penaltyTimer) {
    clearInterval(penaltyTimer);
    penaltyTimer = null;
  }
  if (transitionTimer) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }
  penaltyEl.classList.add("hidden");

  let next = null;
  for (let tries = 0; tries < 60 && !next; tries++) {
    next = buildPuzzle(DEX_ENTRIES[rnd(DEX_ENTRIES.length)]);
  }
  if (!next) return;
  puzzle = next;
  locked = false;

  spriteEl.style.visibility = "visible";
  spriteEl.src = `${SPRITE_BASE}${puzzle.id}.png`;
  spriteEl.alt = puzzle.name;
  nameEl.textContent = puzzle.name;

  entryEl.classList.remove("locked");
  const nameParts = new Set(puzzle.name.toLowerCase().replace(/’/g, "'").split(/[^a-z']+/).filter(Boolean));
  const selectable = (t) => {
    const w = t.toLowerCase().replace(/’/g, "'");
    return !STOPWORDS.has(w) && !nameParts.has(w);
  };
  entryEl.innerHTML = puzzle.tokens
    .map((t, i) => {
      if (!/^[A-Za-z'’]+$/.test(t)) return `<span>${t.replace(/</g, "&lt;")}</span>`;
      return selectable(t)
        ? `<button class="word" type="button" data-i="${i}">${t}</button>`
        : `<span class="plain">${t}</span>`;
    })
    .join("");

  verdictEl.className = "verdict";
  verdictEl.innerHTML = "";
  statusEl.textContent = "Tap the tampered word";
}

entryEl.addEventListener("click", (e) => {
  const w = e.target.closest(".word");
  if (w && w.dataset.i !== undefined) {
    handleWordClick(Number(w.dataset.i));
  }
});

newCaseBtn.addEventListener("click", newCase);
spriteEl.addEventListener("error", () => {
  spriteEl.style.visibility = "hidden";
});

newCase();
