/* Pokemon Fantasy Football - league generation, game simulation and season logic. */

/* ---------------------------------------------------------------- utilities */

function rnd(n) {
  return Math.floor(Math.random() * n);
}

function pick(arr) {
  return arr[rnd(arr.length)];
}

function chance(p) {
  return Math.random() < p;
}

function gauss(mean, sd) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function titleCase(s) {
  return s
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("-");
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/* --------------------------------------------------------- player creation */

const SPRITE_DEX_MAX = 649; // generation-V sprite sheet coverage
const POS_PLAN = [
  ["QB", 2],
  ["RB", 3],
  ["WR", 4],
  ["TE", 2],
  ["K", 1],
];

function skillFor(pos, depth) {
  // depth 0 = starter. Starters are better, backups scale down.
  const base = { QB: 62, RB: 58, WR: 58, TE: 54, K: 55, DEF: 55 }[pos];
  const drop = { QB: 16, RB: 9, WR: 8, TE: 9, K: 0, DEF: 0 }[pos];
  return clamp(Math.round(gauss(base - depth * drop, 13)), 12, 99);
}

function makeName(dexName) {
  const first = pick(FIRST_NAMES);
  const last = titleCase(dexName) + pick(SUFFIXES);
  const nickname = chance(0.14) ? pick(NICKNAMES) : null;
  return { first, last, nickname, full: `${first} ${last}` };
}

function projectPPG(player) {
  const s = player.skill / 100;
  switch (player.pos) {
    case "QB":
      return 6 + s * 16;
    case "RB":
      return 3 + s * 14;
    case "WR":
      return 3 + s * 14;
    case "TE":
      return 2 + s * 10;
    case "K":
      return 5.5 + s * 4.5;
    case "DEF":
      return 4 + s * 6;
    default:
      return 0;
  }
}

function createPlayerPool(L) {
  const dexPool = shuffle(POKEDEX.filter((p) => p.id <= SPRITE_DEX_MAX));
  let cursor = 0;
  const nextDex = () => dexPool[cursor++ % dexPool.length];
  let id = 1;

  NFL_TEAMS.forEach((team, teamIdx) => {
    POS_PLAN.forEach(([pos, count]) => {
      for (let depth = 0; depth < count; depth++) {
        const dex = nextDex();
        const name = makeName(dex.name);
        L.players[id] = {
          id,
          dexId: dex.id,
          species: titleCase(dex.name),
          types: dex.types,
          first: name.first,
          last: name.last,
          nickname: name.nickname,
          name: name.full,
          pos,
          team: teamIdx,
          skill: skillFor(pos, depth),
          age: 21 + rnd(11),
          rookie: false,
          status: { type: "healthy", weeks: 0, note: "" },
          form: null,
          weeks: {},
          seasonStats: {},
          seasonPts: 0,
          gamesPlayed: 0,
          careerSeasons: 0,
          lastSeasonPts: null,
        };
        id++;
      }
    });

    const dex = nextDex();
    L.players[id] = {
      id,
      dexId: null,
      unit: true,
      species: `${team.city} ${team.nick}`,
      types: [],
      first: "",
      last: "",
      nickname: `${pick(DEF_NICK_PREFIX)} ${pick(DEF_NICK_SUFFIX)}`,
      name: `${team.city} ${team.nick} Defense`,
      pos: "DEF",
      team: teamIdx,
      skill: clamp(Math.round(gauss(55, 14)), 20, 96),
      age: 0,
      rookie: false,
      status: { type: "healthy", weeks: 0, note: "" },
      form: null,
      weeks: {},
      seasonStats: {},
      seasonPts: 0,
      gamesPlayed: 0,
      careerSeasons: 0,
      lastSeasonPts: null,
    };
    id++;
  });

  L.nextPlayerId = id;
  L.playerIds = Object.keys(L.players).map(Number);
}

function assignAdp(L) {
  const ranked = L.playerIds
    .map((pid) => L.players[pid])
    .map((p) => ({ p, v: draftValue(L, p) * (0.88 + Math.random() * 0.24) }))
    .sort((a, b) => b.v - a.v);
  ranked.forEach((entry, i) => {
    entry.p.adp = i + 1;
  });
}

function teamRoster(L, teamIdx, pos) {
  return L.playerIds
    .map((pid) => L.players[pid])
    .filter((p) => p.team === teamIdx && (!pos || p.pos === pos));
}

/* -------------------------------------------------------------- schedules */

function makeNflSchedule(L) {
  const byes = {};
  const teams = shuffle(NFL_TEAMS.map((_, i) => i));
  const perWeek = teams.length / BYE_WEEKS.length;
  BYE_WEEKS.forEach((week, i) => {
    byes[week] = teams.slice(i * perWeek, (i + 1) * perWeek);
  });
  L.byeWeeks = {};
  Object.entries(byes).forEach(([week, list]) => {
    list.forEach((t) => {
      L.byeWeeks[t] = Number(week);
    });
  });

  L.nflSchedule = {};
  for (let week = 1; week <= NFL_WEEKS; week++) {
    const onBye = byes[week] || [];
    const playing = shuffle(NFL_TEAMS.map((_, i) => i).filter((i) => !onBye.includes(i)));
    const games = [];
    for (let i = 0; i < playing.length; i += 2) {
      games.push({ home: playing[i], away: playing[i + 1] });
    }
    L.nflSchedule[week] = games;
  }
}

function makeFantasySchedule(L) {
  const ids = L.managers.map((m) => m.id);
  const wheel = ids.slice();
  if (wheel.length % 2 === 1) wheel.push(-1); // -1 = phantom "Ditto" opponent
  const n = wheel.length;
  L.schedule = {};
  for (let week = 1; week <= REG_SEASON_WEEKS; week++) {
    const games = [];
    for (let i = 0; i < n / 2; i++) {
      const a = wheel[i];
      const b = wheel[n - 1 - i];
      games.push({ a, b });
    }
    L.schedule[week] = games;
    // rotate all but the first entry
    wheel.splice(1, 0, wheel.pop());
  }
}

/* -------------------------------------------------------------- scoring */

function fgPoints(dist) {
  if (dist >= 50) return SCORING.fg50;
  if (dist >= 40) return SCORING.fg40;
  if (dist >= 30) return SCORING.fg30;
  if (dist >= 20) return SCORING.fg20;
  return SCORING.fg0;
}

function pointsAllowedPoints(pa) {
  return PA_TIERS.find((t) => pa <= t.max).pts;
}

function scoreStatLine(line, pprValue) {
  if (!line) return 0;
  let pts = 0;
  if (line.pass) {
    pts += line.pass.yds * SCORING.passYd;
    pts += line.pass.td * SCORING.passTd;
    pts += line.pass.int * SCORING.interception;
  }
  if (line.rush) {
    pts += line.rush.yds * SCORING.rushYd;
    pts += line.rush.td * SCORING.rushTd;
  }
  if (line.rec) {
    pts += line.rec.yds * SCORING.recYd;
    pts += line.rec.td * SCORING.recTd;
    pts += line.rec.rec * pprValue;
  }
  if (line.fumLost) pts += line.fumLost * SCORING.fumbleLost;
  if (line.twoPt) pts += line.twoPt * SCORING.twoPt;
  if (line.kick) {
    pts += line.kick.xpm * SCORING.xp;
    line.kick.fgs.forEach((f) => {
      if (f.made) pts += fgPoints(f.dist);
    });
  }
  if (line.def) {
    pts += line.def.sack * SCORING.defSack;
    pts += line.def.int * SCORING.defInt;
    pts += line.def.fumRec * SCORING.defFumble;
    pts += line.def.td * SCORING.defTd;
    pts += line.def.safety * SCORING.defSafety;
    pts += pointsAllowedPoints(line.def.pa);
  }
  return Math.round(pts * 100) / 100;
}

/* ------------------------------------------------------------ game engine */

function blankLine(pos) {
  const line = { pos };
  if (pos === "QB") line.pass = { att: 0, cmp: 0, yds: 0, td: 0, int: 0, sacks: 0 };
  if (pos === "QB" || pos === "RB" || pos === "WR" || pos === "TE") {
    line.rush = { att: 0, yds: 0, td: 0 };
  }
  if (pos !== "QB" && pos !== "K" && pos !== "DEF") {
    line.rec = { tgt: 0, rec: 0, yds: 0, td: 0 };
  }
  if (pos === "QB") line.rec = { tgt: 0, rec: 0, yds: 0, td: 0 };
  if (pos === "K") line.kick = { xpm: 0, xpa: 0, fgm: 0, fga: 0, fgs: [] };
  if (pos === "DEF") line.def = { sack: 0, int: 0, fumRec: 0, td: 0, safety: 0, pa: 0 };
  line.fumLost = 0;
  line.twoPt = 0;
  return line;
}

function effSkill(p) {
  const mult = p.form ? p.form.mult : 1;
  return clamp(p.skill * mult, 5, 130);
}

function isAvailable(L, p, week) {
  if (p.status.type === "retired") return false;
  if (p.status.type !== "healthy" && p.status.weeks > 0) return false;
  if (L.byeWeeks[p.team] === week) return false;
  return true;
}

function buildOffense(L, teamIdx, week) {
  const byPos = {};
  ["QB", "RB", "WR", "TE", "K", "DEF"].forEach((pos) => {
    byPos[pos] = teamRoster(L, teamIdx, pos)
      .filter((p) => isAvailable(L, p, week))
      .sort((a, b) => effSkill(b) - effSkill(a));
  });
  return byPos;
}

const TARGET_SHARE = {
  WR: [0.24, 0.19, 0.11, 0.05],
  TE: [0.15, 0.04],
  RB: [0.13, 0.07, 0.02],
};
const CARRY_SHARE = { RB: [0.56, 0.27, 0.1], QB: [0.07] };

function weightedPick(entries) {
  const total = entries.reduce((s, e) => s + e.w, 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.p;
  }
  return entries[entries.length - 1].p;
}

function targetPool(off) {
  const entries = [];
  ["WR", "TE", "RB"].forEach((pos) => {
    off[pos].forEach((p, i) => {
      const w = (TARGET_SHARE[pos][i] || 0.01) * (0.7 + effSkill(p) / 140);
      entries.push({ p, w });
    });
  });
  return entries;
}

function carryPool(off) {
  const entries = [];
  off.RB.forEach((p, i) => entries.push({ p, w: (CARRY_SHARE.RB[i] || 0.02) * (0.7 + effSkill(p) / 160) }));
  if (off.QB[0]) entries.push({ p: off.QB[0], w: 0.06 });
  off.WR.slice(0, 2).forEach((p) => entries.push({ p, w: 0.015 }));
  return entries;
}

function offenseRating(off) {
  const qb = off.QB[0] ? effSkill(off.QB[0]) : 30;
  const catchers = [...off.WR.slice(0, 3), ...off.TE.slice(0, 1)];
  const catchAvg = catchers.length
    ? catchers.reduce((s, p) => s + effSkill(p), 0) / catchers.length
    : 30;
  const rb = off.RB[0] ? effSkill(off.RB[0]) : 30;
  return qb * 0.45 + catchAvg * 0.33 + rb * 0.22;
}

function lineFor(box, player) {
  if (!box[player.id]) box[player.id] = blankLine(player.pos);
  return box[player.id];
}

function playDesc(kind, data) {
  const { passer, target, rusher, yards, td, teamAbbr } = data;
  const yd = (n) => `${n} yard${Math.abs(n) === 1 ? "" : "s"}`;
  if (kind === "incomplete") return `${passer} ${pick(HIGHLIGHT_VERBS.pass)} incomplete for ${target}.`;
  if (kind === "sack") return `${passer} gets buried by the ${teamAbbr} pass rush for a ${-yards}-yard sack.`;
  if (kind === "pass") {
    return `${passer} ${pick(HIGHLIGHT_VERBS.pass)} it to ${target}, who ${pick(HIGHLIGHT_VERBS.catch)} for ${yd(yards)}${
      td ? ". TOUCHDOWN!" : "."
    }`;
  }
  if (kind === "rush") {
    return `${rusher} ${pick(HIGHLIGHT_VERBS.rush)} for ${yd(yards)}${td ? ". TOUCHDOWN!" : "."}`;
  }
  if (kind === "int") return `${passer} throws it right to the ${teamAbbr} defense. INTERCEPTED!`;
  if (kind === "fumble") return `${rusher} coughs it up! ${teamAbbr} recovers the fumble.`;
  return "";
}

function simDrive(L, ctx, offTeam, defTeam, week) {
  const { box, plays, score } = ctx;
  const ppr = ctx.ppr;
  const off = ctx.offense[offTeam];
  const defUnit = ctx.offense[defTeam].DEF[0];
  const defRating = defUnit ? effSkill(defUnit) : 50;
  const oRate = offenseRating(off);
  const edge = (oRate - defRating) / 220;

  const pTd = clamp(0.265 + edge * 0.55, 0.07, 0.5);
  const pFg = clamp(0.18 + edge * 0.1, 0.06, 0.32);
  const pTo = clamp(0.12 - edge * 0.25, 0.03, 0.26);
  const roll = Math.random();
  let outcome = "punt";
  if (roll < pTd) outcome = "td";
  else if (roll < pTd + pFg) outcome = "fg";
  else if (roll < pTd + pFg + pTo) outcome = "turnover";

  const abbrOff = NFL_TEAMS[offTeam].abbr;
  const abbrDef = NFL_TEAMS[defTeam].abbr;
  const qb = off.QB[0];
  const targets = targetPool(off);
  const carriers = carryPool(off);

  let driveYards;
  if (outcome === "td") driveYards = 55 + rnd(26);
  else if (outcome === "fg") driveYards = 32 + rnd(30);
  else if (outcome === "turnover") driveYards = rnd(45);
  else driveYards = rnd(38);

  let gained = 0;
  let guard = 0;
  const passRate = 0.58 + (off.RB[0] ? 0 : 0.1);

  while (gained < driveYards && guard < 16) {
    guard++;
    const remaining = driveYards - gained;
    const isLast = remaining <= 12 && (outcome === "td" || outcome === "fg" || guard > 3);
    const isPass = Math.random() < passRate;

    if (isPass && qb) {
      const qbLine = lineFor(box, qb);
      // sack chance
      if (chance(0.06)) {
        const loss = 5 + rnd(6);
        qbLine.pass.sacks++;
        qbLine.pass.yds -= loss;
        gained -= loss;
        if (defUnit) lineFor(box, defUnit).def.sack++;
        plays.push({
          team: offTeam,
          type: "sack",
          big: true,
          desc: playDesc("sack", { passer: displayName(qb), yards: -loss, teamAbbr: abbrDef }),
          playerId: defUnit ? defUnit.id : null,
          fp: Object.assign({ [qb.id]: -loss * SCORING.passYd }, defUnit ? { [defUnit.id]: SCORING.defSack } : {}),
          score: { ...score },
        });
        continue;
      }
      const receiver = weightedPick(targets);
      if (!receiver) break;
      const recLine = lineFor(box, receiver);
      qbLine.pass.att++;
      recLine.rec.tgt++;
      const compProb = clamp(0.4 + effSkill(qb) / 380 + effSkill(receiver) / 700, 0.36, 0.72);
      if (!chance(compProb)) {
        plays.push({
          team: offTeam,
          type: "incomplete",
          big: false,
          desc: playDesc("incomplete", { passer: displayName(qb), target: displayName(receiver) }),
          playerId: receiver.id,
          fp: {},
          score: { ...score },
        });
        continue;
      }
      let yards = Math.max(1, Math.round(gauss(11, 9)));
      if (isLast) yards = remaining;
      yards = Math.min(yards, Math.max(1, remaining));
      qbLine.pass.cmp++;
      qbLine.pass.yds += yards;
      recLine.rec.rec++;
      recLine.rec.yds += yards;
      gained += yards;
      const scored = gained >= driveYards && outcome === "td";
      if (scored) {
        qbLine.pass.td++;
        recLine.rec.td++;
      }
      plays.push({
        team: offTeam,
        type: scored ? "td" : "pass",
        big: scored || yards >= 20,
        desc: playDesc("pass", { passer: displayName(qb), target: displayName(receiver), yards, td: scored }),
        playerId: receiver.id,
        fp: {
          [qb.id]: yards * SCORING.passYd + (scored ? SCORING.passTd : 0),
          [receiver.id]: yards * SCORING.recYd + ppr + (scored ? SCORING.recTd : 0),
        },
        score: { ...score },
      });
      if (scored) return finishTd(L, ctx, offTeam, defTeam);
    } else {
      const rusher = weightedPick(carriers);
      if (!rusher) break;
      const line = lineFor(box, rusher);
      line.rush.att++;
      let yards = Math.round(gauss(4.4, 5.5));
      if (isLast) yards = Math.max(1, remaining);
      yards = Math.min(yards, Math.max(-4, remaining));
      line.rush.yds += yards;
      gained += yards;
      const scored = gained >= driveYards && outcome === "td";
      if (scored) line.rush.td++;
      plays.push({
        team: offTeam,
        type: scored ? "td" : "rush",
        big: scored || yards >= 18,
        desc: playDesc("rush", { rusher: displayName(rusher), yards, td: scored }),
        playerId: rusher.id,
        fp: { [rusher.id]: yards * SCORING.rushYd + (scored ? SCORING.rushTd : 0) },
        score: { ...score },
      });
      if (scored) return finishTd(L, ctx, offTeam, defTeam);
    }
  }

  if (outcome === "turnover") {
    const isInt = chance(0.6) && qb;
    if (isInt) {
      lineFor(box, qb).pass.int++;
      lineFor(box, qb).pass.att++;
      if (defUnit) lineFor(box, defUnit).def.int++;
      plays.push({
        team: offTeam,
        type: "turnover",
        big: true,
        desc: playDesc("int", { passer: displayName(qb), teamAbbr: abbrDef }),
        playerId: defUnit ? defUnit.id : null,
        fp: Object.assign(
          { [qb.id]: SCORING.interception },
          defUnit ? { [defUnit.id]: SCORING.defInt } : {}
        ),
        score: { ...score },
      });
    } else {
      const carrier = weightedPick(carriers) || qb;
      if (carrier) lineFor(box, carrier).fumLost++;
      if (defUnit) lineFor(box, defUnit).def.fumRec++;
      plays.push({
        team: offTeam,
        type: "turnover",
        big: true,
        desc: playDesc("fumble", { rusher: carrier ? displayName(carrier) : "Someone", teamAbbr: abbrDef }),
        playerId: defUnit ? defUnit.id : null,
        fp: Object.assign(
          carrier ? { [carrier.id]: SCORING.fumbleLost } : {},
          defUnit ? { [defUnit.id]: SCORING.defFumble } : {}
        ),
        score: { ...score },
      });
    }
    if (defUnit && chance(0.14)) {
      lineFor(box, defUnit).def.td++;
      score[defTeam] += 6;
      const scoreFp = { [defUnit.id]: SCORING.defTd };
      const dk = ctx.offense[defTeam].K[0];
      if (dk) {
        const kl = lineFor(box, dk);
        kl.kick.xpa++;
        if (chance(0.96)) {
          kl.kick.xpm++;
          score[defTeam] += 1;
          scoreFp[dk.id] = SCORING.xp;
        }
      }
      plays.push({
        team: defTeam,
        type: "td",
        big: true,
        desc: `PICK/SCOOP SIX! The ${NFL_TEAMS[defTeam].nick} defense takes it to the house!`,
        playerId: defUnit.id,
        fp: scoreFp,
        score: { ...score },
      });
    }
    return;
  }

  if (outcome === "fg") {
    const kicker = off.K[0];
    const dist = clamp(100 - (25 + gained) + 17, 20, 60);
    if (kicker) {
      const kl = lineFor(box, kicker);
      kl.kick.fga++;
      const makeProb = clamp(1.06 - dist / 62 + effSkill(kicker) / 420, 0.35, 0.98);
      const made = chance(makeProb);
      kl.kick.fgs.push({ dist, made });
      if (made) {
        kl.kick.fgm++;
        score[offTeam] += 3;
      }
      plays.push({
        team: offTeam,
        type: made ? "fg" : "fgmiss",
        big: true,
        desc: made
          ? `${displayName(kicker)} drills a ${dist}-yard field goal.`
          : `${displayName(kicker)} yanks a ${dist}-yard field goal wide. Somewhere a fantasy manager screams.`,
        playerId: kicker.id,
        fp: { [kicker.id]: made ? fgPoints(dist) : SCORING.fgMiss },
        score: { ...score },
      });
    }
    return;
  }

  if (chance(0.012)) {
    const defUnit2 = ctx.offense[defTeam].DEF[0];
    if (defUnit2) {
      lineFor(box, defUnit2).def.safety++;
      score[defTeam] += 2;
      plays.push({
        team: defTeam,
        type: "safety",
        big: true,
        desc: `SAFETY! The ${NFL_TEAMS[defTeam].nick} swallow the ball carrier in the end zone.`,
        playerId: defUnit2.id,
        fp: { [defUnit2.id]: SCORING.defSafety },
        score: { ...score },
      });
    }
  }
}

function finishTd(L, ctx, offTeam, defTeam) {
  const { box, plays, score } = ctx;
  score[offTeam] += 6;
  const kicker = ctx.offense[offTeam].K[0];
  if (chance(0.08)) {
    // two point try
    const off = ctx.offense[offTeam];
    const guy = weightedPick(targetPool(off));
    if (guy && chance(0.5)) {
      lineFor(box, guy).twoPt++;
      score[offTeam] += 2;
      plays.push({
        team: offTeam,
        type: "twopt",
        big: true,
        desc: `They go for two and ${displayName(guy)} gets in! Chaos.`,
        playerId: guy.id,
        fp: { [guy.id]: SCORING.twoPt },
        score: { ...score },
      });
      return;
    }
    plays.push({
      team: offTeam,
      type: "twopt",
      big: false,
      desc: "They go for two and it fails spectacularly.",
      playerId: null,
      fp: {},
      score: { ...score },
    });
    return;
  }
  if (kicker) {
    const kl = lineFor(box, kicker);
    kl.kick.xpa++;
    if (chance(clamp(0.9 + effSkill(kicker) / 700, 0.85, 0.99))) {
      kl.kick.xpm++;
      score[offTeam] += 1;
      const last = plays[plays.length - 1];
      if (last) last.fp[kicker.id] = (last.fp[kicker.id] || 0) + SCORING.xp;
    } else {
      plays.push({
        team: offTeam,
        type: "xpmiss",
        big: false,
        desc: `${displayName(kicker)} MISSES the extra point. Unbelievable.`,
        playerId: kicker.id,
        fp: {},
        score: { ...score },
      });
    }
  }
}

function simNflGame(L, week, game) {
  const ctx = {
    box: {},
    plays: [],
    ppr: L.settings.ppr,
    score: { [game.home]: 0, [game.away]: 0 },
    offense: {
      [game.home]: buildOffense(L, game.home, week),
      [game.away]: buildOffense(L, game.away, week),
    },
  };

  const drives = 10 + rnd(3);
  for (let d = 0; d < drives; d++) {
    simDrive(L, ctx, game.away, game.home, week);
    simDrive(L, ctx, game.home, game.away, week);
  }

  const paBonus = {};
  [game.home, game.away].forEach((t) => {
    const defUnit = ctx.offense[t].DEF[0];
    if (defUnit) {
      const l = lineFor(ctx.box, defUnit);
      l.def.pa = ctx.score[t === game.home ? game.away : game.home];
      paBonus[defUnit.id] = pointsAllowedPoints(l.def.pa);
    }
  });

  return {
    paBonus,
    home: game.home,
    away: game.away,
    homeScore: ctx.score[game.home],
    awayScore: ctx.score[game.away],
    box: ctx.box,
    plays: ctx.plays,
  };
}

/* --------------------------------------------------------- weekly events */

function generateWeeklyEvents(L, week) {
  const wire = [];
  L.playerIds.forEach((pid) => {
    const p = L.players[pid];
    p.form = null;
    if (p.status.type === "retired") return;
    if (p.status.weeks > 0) {
      p.status.weeks--;
      if (p.status.weeks <= 0) {
        if (p.status.type !== "healthy") {
          wire.push({ week, kind: "return", playerId: pid, text: `${displayName(p)} (${p.pos}, ${NFL_TEAMS[p.team].abbr}) is back and cleared to play.` });
        }
        p.status = { type: "healthy", weeks: 0, note: "" };
      }
      return;
    }
    if (L.byeWeeks[p.team] === week) return;
    if (p.pos === "DEF") {
      if (chance(0.05)) {
        const boost = chance(0.5);
        p.form = { mult: boost ? 1.25 : 0.78, note: boost ? "playing inspired" : "in disarray" };
        wire.push({
          week,
          kind: boost ? "boost" : "slump",
          playerId: pid,
          text: `${displayName(p)} ${boost ? "is fired up after a players-only meeting." : "spent the week arguing about who ate whose lunch."}`,
        });
      }
      return;
    }

    const roll = Math.random();
    if (roll < 0.004) {
      p.status = { type: "retired", weeks: 99, note: pick(RETIRE_EVENTS) };
      wire.push({ week, kind: "retire", playerId: pid, text: `${displayName(p)} (${p.pos}, ${NFL_TEAMS[p.team].abbr}) ${p.status.note}` });
    } else if (roll < 0.045) {
      const inj = pick(INJURY_EVENTS);
      p.status = { type: "injured", weeks: inj.weeks, note: inj.note };
      wire.push({ week, kind: "injury", playerId: pid, text: `${displayName(p)} (${p.pos}, ${NFL_TEAMS[p.team].abbr}) - ${inj.note}. Out ${inj.weeks} week${inj.weeks > 1 ? "s" : ""}.` });
    } else if (roll < 0.062) {
      const abs = pick(ABSENCE_EVENTS);
      p.status = { type: "out", weeks: abs.weeks, note: abs.note };
      wire.push({ week, kind: "absence", playerId: pid, text: `${displayName(p)} (${p.pos}, ${NFL_TEAMS[p.team].abbr}) ${abs.note}. Out ${abs.weeks} week${abs.weeks > 1 ? "s" : ""}.` });
    } else if (roll < 0.13) {
      const boost = chance(0.55);
      const note = boost ? pick(BOOST_EVENTS) : pick(SLUMP_EVENTS);
      p.form = { mult: boost ? 1.15 + Math.random() * 0.4 : 0.5 + Math.random() * 0.35, note };
      wire.push({ week, kind: boost ? "boost" : "slump", playerId: pid, text: `${displayName(p)} ${note}.` });
    }
  });
  return wire;
}

/* ------------------------------------------------------------- lineups */

function eligibleForSlot(slot, pos) {
  if (slot === "FLEX") return FLEX_OK.includes(pos);
  return slot === pos;
}

function autoLineup(L, manager, week) {
  const available = manager.roster
    .map((pid) => L.players[pid])
    .filter(Boolean)
    .sort((a, b) => weeklyProjection(L, b, week) - weeklyProjection(L, a, week));
  const used = new Set();
  const lineup = {};
  ROSTER_SLOTS.forEach((slot, i) => {
    const key = `${slot}${i}`;
    const found = available.find(
      (p) => !used.has(p.id) && eligibleForSlot(slot, p.pos) && isAvailable(L, p, week)
    );
    if (found) {
      used.add(found.id);
      lineup[key] = found.id;
    } else {
      const fallback = available.find((p) => !used.has(p.id) && eligibleForSlot(slot, p.pos));
      if (fallback) {
        used.add(fallback.id);
        lineup[key] = fallback.id;
      } else {
        lineup[key] = null;
      }
    }
  });
  return lineup;
}

function weeklyProjection(L, p, week) {
  if (!p) return -1;
  if (p.status.type === "retired") return -1;
  if (p.status.weeks > 0) return -1;
  if (L.byeWeeks[p.team] === week) return -1;
  return projectPPG(p);
}

/* ------------------------------------------------------------ week sim */

function playersOnByeOrOut(L, week) {
  return L.playerIds.filter((pid) => !isAvailable(L, L.players[pid], week));
}

function prepareWeek(L) {
  const week = L.week;
  const wire = generateWeeklyEvents(L, week);
  return { week, wire };
}

function runWeekGames(L, week) {
  const games = L.nflSchedule[week].map((g) => simNflGame(L, week, g));
  L.managers.forEach((m) => {
    if (!m.lineups[week]) m.lineups[week] = autoLineup(L, m, week);
  });
  return games;
}

/* Fantasy points rebuilt from per-play deltas so a live broadcast can score as it goes. */
function basePlayerPoints(games) {
  const pts = {};
  games.forEach((g) => {
    Object.keys(g.box || {}).forEach((pid) => {
      if (pts[pid] == null) pts[pid] = 0;
    });
    (g.plays || []).forEach((pl) => {
      Object.entries(pl.fp || {}).forEach(([pid, v]) => {
        pts[pid] = (pts[pid] || 0) + v;
      });
    });
    Object.entries(g.paBonus || {}).forEach(([pid, v]) => {
      pts[pid] = (pts[pid] || 0) + v;
    });
  });
  Object.keys(pts).forEach((pid) => {
    pts[pid] = round1(pts[pid]);
  });
  return pts;
}

function finalizeWeek(L, games, wire, playerPts) {
  const week = L.week;
  L.nflRecords = L.nflRecords || {};
  games.forEach((game) => {
    [game.home, game.away].forEach((team) => {
      if (!L.nflRecords[team]) L.nflRecords[team] = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
    });
    const home = L.nflRecords[game.home];
    const away = L.nflRecords[game.away];
    home.pointsFor += game.homeScore;
    home.pointsAgainst += game.awayScore;
    away.pointsFor += game.awayScore;
    away.pointsAgainst += game.homeScore;
    if (game.homeScore > game.awayScore) { home.wins++; away.losses++; }
    else if (game.awayScore > game.homeScore) { away.wins++; home.losses++; }
    else { home.ties++; away.ties++; }
  });
  const boxAll = {};
  games.forEach((g, gi) => {
    Object.keys(g.box || {}).forEach((pid) => {
      boxAll[pid] = gi;
    });
  });

  L.playerIds.forEach((pid) => {
    const p = L.players[pid];
    if (boxAll[pid] != null) {
      const pts = playerPts[pid] != null ? playerPts[pid] : 0;
      p.weeks[week] = { pts, gameIndex: boxAll[pid] };
      const line = games[boxAll[pid]].box[pid];
      p.seasonStats = p.seasonStats || {};
      ["pass", "rush", "rec", "kick", "def"].forEach((group) => {
        if (!line[group]) return;
        Object.entries(line[group]).forEach(([key, value]) => {
          if (key === "fgs") return;
          const statKey = group === "pass" ? `pass${key[0].toUpperCase()}${key.slice(1)}` : group === "rush" ? `rush${key[0].toUpperCase()}${key.slice(1)}` : group === "rec" ? `rec${key[0].toUpperCase()}${key.slice(1)}` : key;
          p.seasonStats[statKey] = (p.seasonStats[statKey] || 0) + (Number(value) || 0);
          if ((group === "pass" || group === "rush" || group === "rec") && key === "td") p.seasonStats.tds = (p.seasonStats.tds || 0) + (Number(value) || 0);
        });
      });
      p.seasonPts = round1(p.seasonPts + pts);
      p.gamesPlayed++;
    } else {
      p.weeks[week] = { pts: null, gameIndex: null };
    }
  });

  L.managers.forEach((m) => {
    if (!m.lineups[week]) m.lineups[week] = autoLineup(L, m, week);
  });

  const matchups =
    (L.phase === "playoffs"
      ? L.bracket.rounds[L.bracket.current].filter((mu) => mu.winner == null && mu.a != null && mu.b != null)
      : L.schedule[week]) || [];
  const managerScores = {};
  L.managers.forEach((m) => {
    const lineup = m.lineups[week];
    let total = 0;
    const detail = [];
    ROSTER_SLOTS.forEach((slot, i) => {
      const key = `${slot}${i}`;
      const pid = lineup[key];
      const pts = pid && boxAll[pid] != null ? playerPts[pid] || 0 : 0;
      total += pts;
      detail.push({ slot, key, pid, pts: round1(pts) });
    });
    managerScores[m.id] = { total: round1(total), detail };
  });

  const avgScore =
    L.managers.reduce((s, m) => s + managerScores[m.id].total, 0) / Math.max(1, L.managers.length);

  const results = [];
  matchups.forEach((mu) => {
    const a = mu.a;
    const b = mu.b;
    const aScore = a === -1 ? round1(avgScore) : managerScores[a].total;
    const bScore = b === -1 ? round1(avgScore) : managerScores[b].total;
    results.push({ a, b, aScore, bScore });
    if (L.phase === "regular") {
      applyRecord(L, a, aScore, bScore);
      applyRecord(L, b, bScore, aScore);
    } else {
      mu.winner = aScore >= bScore ? a : b;
      mu.aScore = aScore;
      mu.bScore = bScore;
    }
  });

  L.results[week] = {
    week,
    games,
    matchups: results,
    managerScores,
    wire,
    phase: L.phase,
  };
  L.wire = wire.concat(L.wire).slice(0, 400);
  return L.results[week];
}

function simulateWeek(L) {
  const { week, wire } = prepareWeek(L);
  const games = runWeekGames(L, week);
  return finalizeWeek(L, games, wire, basePlayerPoints(games));
}

function applyRecord(L, mid, forPts, againstPts) {
  if (mid === -1) return;
  const m = L.managers.find((x) => x.id === mid);
  if (!m) return;
  m.pointsFor = round1(m.pointsFor + forPts);
  m.pointsAgainst = round1(m.pointsAgainst + againstPts);
  if (forPts > againstPts) m.wins++;
  else if (forPts < againstPts) m.losses++;
  else m.ties++;
}

/* ------------------------------------------------------------- playoffs */

function playoffCount(n) {
  if (n <= 2) return 2;
  return Math.ceil(n / 2);
}

function standings(L) {
  return L.managers
    .slice()
    .sort((a, b) => {
      const wp = (m) => (m.wins + m.ties * 0.5) / Math.max(1, m.wins + m.losses + m.ties);
      if (wp(b) !== wp(a)) return wp(b) - wp(a);
      return b.pointsFor - a.pointsFor;
    });
}

function bracketOrder(size) {
  let order = [1];
  while (order.length < size) {
    const next = [];
    const n = order.length * 2 + 1;
    order.forEach((seed) => {
      next.push(seed, n - seed);
    });
    order = next;
  }
  return order;
}

function startPlayoffs(L) {
  const seeds = standings(L).slice(0, playoffCount(L.managers.length));
  const rounds = Math.ceil(Math.log2(seeds.length));
  const size = 2 ** rounds;
  const order = bracketOrder(size);
  const first = [];
  for (let i = 0; i < size; i += 2) {
    const sa = order[i];
    const sb = order[i + 1];
    const a = seeds[sa - 1] ? seeds[sa - 1].id : null;
    const b = seeds[sb - 1] ? seeds[sb - 1].id : null;
    first.push({ a, b });
  }
  L.bracket = {
    seeds: seeds.map((m) => m.id),
    totalRounds: rounds,
    current: 0,
    rounds: [first],
  };
  L.phase = "playoffs";
  L.week = NFL_WEEKS - rounds + 1;
  resolveByes(L);
}

function resolveByes(L) {
  const round = L.bracket.rounds[L.bracket.current];
  round.forEach((mu) => {
    if (mu.a == null && mu.b != null) mu.winner = mu.b;
    if (mu.b == null && mu.a != null) mu.winner = mu.a;
  });
  const live = round.filter((mu) => mu.winner == null);
  if (live.length === 0 && L.bracket.current < L.bracket.totalRounds - 1) {
    advanceBracket(L);
  }
}

function advanceBracket(L) {
  const round = L.bracket.rounds[L.bracket.current];
  const winners = round.map((mu) => mu.winner);
  const next = [];
  for (let i = 0; i < winners.length; i += 2) {
    next.push({ a: winners[i], b: winners[i + 1] == null ? null : winners[i + 1] });
  }
  L.bracket.rounds.push(next);
  L.bracket.current++;
  resolveByes(L);
}

function roundName(L) {
  const left = L.bracket.totalRounds - L.bracket.current;
  if (left === 1) return "CHAMPIONSHIP";
  if (left === 2) return "SEMIFINALS";
  if (left === 3) return "QUARTERFINALS";
  return `ROUND ${L.bracket.current + 1}`;
}

/* ------------------------------------------------- free agency & trades */

function freeAgents(L) {
  const owned = new Set();
  L.managers.forEach((m) => m.roster.forEach((pid) => owned.add(pid)));
  return L.playerIds
    .map((pid) => L.players[pid])
    .filter((p) => !owned.has(p.id) && p.status.type !== "retired");
}

function tradeValue(L, p) {
  if (!p) return 0;
  const posMult = { QB: 0.85, RB: 1.1, WR: 1.05, TE: 0.95, K: 0.35, DEF: 0.4 }[p.pos];
  const health = p.status.type === "retired" ? 0 : p.status.weeks > 0 ? 0.6 : 1;
  const recent = p.gamesPlayed > 0 ? p.seasonPts / p.gamesPlayed : projectPPG(p);
  return round1((projectPPG(p) * 0.6 + recent * 0.4) * posMult * health * 10);
}

function evaluateTrade(L, aiManager, give, get) {
  // give = players the AI gives away, get = players AI receives
  const giveVal = give.reduce((s, pid) => s + tradeValue(L, L.players[pid]), 0);
  const getVal = get.reduce((s, pid) => s + tradeValue(L, L.players[pid]), 0);
  const greed = 1.08 + Math.random() * 0.14;
  return { accept: getVal >= giveVal * greed, giveVal: round1(giveVal), getVal: round1(getVal) };
}

function aiRosterMoves(L) {
  const notes = [];
  const fas = freeAgents(L);
  L.managers.forEach((m) => {
    if (m.human) return;
    if (!chance(0.5)) return;
    const roster = m.roster.map((pid) => L.players[pid]);
    const worst = roster
      .filter((p) => p.pos !== "DEF" && p.pos !== "K")
      .sort((a, b) => tradeValue(L, a) - tradeValue(L, b))[0];
    if (!worst) return;
    const better = fas
      .filter((p) => p.pos === worst.pos && p.status.weeks === 0)
      .sort((a, b) => tradeValue(L, b) - tradeValue(L, a))[0];
    if (better && tradeValue(L, better) > tradeValue(L, worst) * 1.1) {
      m.roster = m.roster.filter((pid) => pid !== worst.id);
      m.roster.push(better.id);
      notes.push(`${m.name} added ${displayName(better)} (${better.pos}) and dropped ${displayName(worst)}.`);
    }
  });
  return notes;
}

/* -------------------------------------------------------------- drafting */

function draftValue(L, p) {
  const posMult = { QB: 0.9, RB: 1.12, WR: 1.08, TE: 0.98, K: 0.3, DEF: 0.36 }[p.pos];
  return projectPPG(p) * posMult;
}

function rosterNeeds(L, manager) {
  const counts = {};
  manager.roster.forEach((pid) => {
    const p = L.players[pid];
    counts[p.pos] = (counts[p.pos] || 0) + 1;
  });
  return counts;
}

function aiDraftPick(L, manager, pool) {
  const counts = rosterNeeds(L, manager);
  const picksLeft = ROSTER_SIZE - manager.roster.length;
  const scored = pool.map((p) => {
    let v = draftValue(L, p);
    const have = counts[p.pos] || 0;
    const cap = { QB: 2, RB: 5, WR: 5, TE: 2, K: 1, DEF: 1 }[p.pos];
    if (have >= cap) v *= 0.15;
    if ((p.pos === "K" || p.pos === "DEF") && picksLeft > 2) v *= 0.25;
    if ((p.pos === "K" || p.pos === "DEF") && have === 0 && picksLeft <= 2) v *= 6;
    // must-fill check
    const need = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 }[p.pos];
    if (have < need && picksLeft <= 6) v *= 1.5;
    return { p, v: v * (0.9 + Math.random() * 0.2) };
  });
  scored.sort((a, b) => b.v - a.v);
  return scored[0].p;
}

/* ------------------------------------------------------- league creation */

function createLeague(settings) {
  const L = {
    version: 2,
    settings,
    mode: settings.mode || "season",
    irSpots: Number(settings.irSpots) || 0,
    season: 1,
    week: 1,
    phase: "draft",
    players: {},
    playerIds: [],
    managers: [],
    results: {},
    wire: [],
    bracket: null,
    champions: [],
    seasonHistory: [],
    nflRecords: {},
  };

  createPlayerPool(L);
  makeNflSchedule(L);

  const aiNames = shuffle(AI_MANAGER_NAMES);
  const humanNames = settings.humanNames || [settings.teamName];
  let aiCursor = 0;
  for (let i = 0; i < settings.managerCount; i++) {
    const human = i < humanNames.length;
    L.managers.push({
      id: i,
      name: human ? humanNames[i] : aiNames[aiCursor++] || `CPU ${i + 1}`,
      human,
      isUser: i === 0,
      roster: [],
      ir: [],
      lineups: {},
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      titles: 0,
      history: [],
    });
  }
  L.activeManagerId = 0;

  makeFantasySchedule(L);
  startDraft(L);
  return L;
}

function startDraft(L) {
  const order = shuffle(L.managers.map((m) => m.id));
  assignAdp(L);
  L.draft = {
    order,
    round: 1,
    pickIndex: 0,
    totalPicks: L.managers.length * ROSTER_SIZE,
    picksMade: [],
    complete: false,
  };
  L.phase = "draft";
}

function draftOnTheClock(L) {
  const d = L.draft;
  const n = L.managers.length;
  const overall = d.picksMade.length;
  const round = Math.floor(overall / n);
  const slot = overall % n;
  const idx = round % 2 === 0 ? slot : n - 1 - slot;
  return d.order[idx];
}

function makeDraftPick(L, managerId, playerId) {
  const m = L.managers.find((x) => x.id === managerId);
  m.roster.push(playerId);
  L.draft.picksMade.push({ managerId, playerId, overall: L.draft.picksMade.length + 1 });
  if (L.draft.picksMade.length >= L.draft.totalPicks) {
    L.draft.complete = true;
    L.phase = "regular";
    L.week = 1;
  }
}

function availablePlayers(L) {
  const taken = new Set(L.draft.picksMade.map((p) => p.playerId));
  return L.playerIds.map((pid) => L.players[pid]).filter((p) => !taken.has(p.id));
}

/* --------------------------------------------------------- next season */

function nextSeason(L) {
  const champ = L.champions[L.champions.length - 1];
  const nflWinner = Object.entries(L.nflRecords || {}).sort((a, b) => {
    const ar = a[1], br = b[1];
    return (br.wins - ar.wins) || ((br.pointsFor - br.pointsAgainst) - (ar.pointsFor - ar.pointsAgainst));
  })[0];
  const managerMvp = {};
  L.managers.forEach((manager) => {
    const mvp = manager.roster.map((pid) => L.players[pid]).filter(Boolean).sort((a, b) => b.seasonPts - a.seasonPts)[0];
    if (mvp) managerMvp[manager.id] = mvp.id;
  });
  const seasonResults = Object.values(L.results).filter((result) => result.phase === "regular");
  const matchupGames = seasonResults.flatMap((result) => result.matchups || []).filter((matchup) => matchup.b !== -1);
  const closest = matchupGames.slice().sort((a, b) => Math.abs(a.aScore - a.bScore) - Math.abs(b.aScore - b.bScore))[0];
  const widest = matchupGames.slice().sort((a, b) => Math.abs(b.aScore - b.bScore) - Math.abs(a.aScore - a.bScore))[0];
  L.seasonHistory = L.seasonHistory || [];
  L.seasonHistory.push({ season: L.season, champion: champ, closest, widest, managerMvp, nflWinner: nflWinner ? Number(nflWinner[0]) : null });
  L.managers.forEach((m) => {
    m.history.push({
      season: L.season,
      wins: m.wins,
      losses: m.losses,
      ties: m.ties,
      pointsFor: m.pointsFor,
      champion: champ === m.id,
    });
    if (champ === m.id) m.titles++;
    m.wins = 0;
    m.losses = 0;
    m.ties = 0;
    m.pointsFor = 0;
    m.pointsAgainst = 0;
    m.roster = [];
    m.ir = [];
    m.lineups = {};
  });

  const retiring = [];
  const usedDex = new Set();
  L.playerIds.forEach((pid) => {
    const p = L.players[pid];
    usedDex.add(p.dexId);
    p.lastSeasonPts = p.seasonPts;
    p.careerSeasons++;
    p.seasonPts = 0;
    p.gamesPlayed = 0;
    p.weeks = {};
    p.seasonStats = {};
    p.form = null;
    p.rookie = false;
    if (p.pos === "DEF") {
      p.status = { type: "healthy", weeks: 0, note: "" };
      p.skill = clamp(Math.round(p.skill + gauss(0, 8)), 20, 96);
      return;
    }
    p.age++;
    const retireOdds = p.status.type === "retired" ? 1 : p.age >= 34 ? 0.55 : p.age >= 31 ? 0.22 : 0.04;
    if (chance(retireOdds)) {
      retiring.push(p);
      return;
    }
    p.status = { type: "healthy", weeks: 0, note: "" };
    const growth = p.age <= 25 ? gauss(4, 7) : p.age <= 29 ? gauss(0, 7) : gauss(-6, 7);
    p.skill = clamp(Math.round(p.skill + growth), 12, 99);
    if (chance(0.12)) {
      // offseason trade / free agency shuffle
      p.team = rnd(NFL_TEAMS.length);
    }
  });

  const retiredIds = new Set(retiring.map((p) => p.id));
  L.playerIds = L.playerIds.filter((pid) => !retiredIds.has(pid));
  retiring.forEach((p) => delete L.players[p.id]);

  // Backfill rosters with rookies
  const dexPool = shuffle(POKEDEX.filter((p) => p.id <= SPRITE_DEX_MAX && !usedDex.has(p.id)));
  let cursor = 0;
  const nextDex = () => dexPool[cursor++] || pick(POKEDEX.filter((p) => p.id <= SPRITE_DEX_MAX));
  const rookies = [];

  NFL_TEAMS.forEach((team, teamIdx) => {
    POS_PLAN.forEach(([pos, count]) => {
      let have = teamRoster(L, teamIdx, pos).length;
      while (have < count) {
        const dex = nextDex();
        const name = makeName(dex.name);
        const id = L.nextPlayerId++;
        L.players[id] = {
          id,
          dexId: dex.id,
          species: titleCase(dex.name),
          types: dex.types,
          first: name.first,
          last: name.last,
          nickname: name.nickname,
          name: name.full,
          pos,
          team: teamIdx,
          skill: skillFor(pos, Math.max(0, have - 1)),
          age: 21 + rnd(3),
          rookie: true,
          status: { type: "healthy", weeks: 0, note: "" },
          form: null,
          weeks: {},
          seasonStats: {},
          seasonPts: 0,
          gamesPlayed: 0,
          careerSeasons: 0,
          lastSeasonPts: null,
        };
        L.playerIds.push(id);
        rookies.push(L.players[id]);
        have++;
      }
    });
  });

  L.season++;
  L.week = 1;
  L.results = {};
  L.wire = [];
  L.nflRecords = {};
  L.bracket = null;
  makeNflSchedule(L);
  makeFantasySchedule(L);
  startDraft(L);
  return { retired: retiring, rookies };
}
