#!/usr/bin/env node
// Statistical level check (phase P2, design §5/§6; SC-003): a novice-strength
// proxy plays 10 seeded games against level 1 and 10 against level 4,
// alternating colors. The novice proxy takes the depth-1 best move 85% of the
// time (quiescence-aware, so it never misses free material outright) and a
// uniformly random legal move otherwise — beginner chess: mostly sane moves,
// frequent real blunders. Calibrated so the proxy is stronger than level 1
// but hopelessly weaker than level 4, which is exactly what FR-003 promises.
//
// Thresholds (done-when): proxy wins >= 6/10 at level 1 and <= 1/10 at
// level 4. Levels 1-3 move deterministically for a given seed (depth-capped);
// level 4 is time-capped, so its exact games can vary slightly across
// machines, but the level gap leaves a wide margin. Exits non-zero on failure.

import { parseFen } from '../engine/board.js';
import { moveToUci } from '../engine/moves.js';
import { pickMove } from '../engine/levels.js';
import { scoreRootMoves } from '../engine/search.js';
import { rng } from '../engine/rng.js';
import { applyMove, gameStatus, legalMoves } from '../engine/index.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const GAMES = 10;
const PROXY_BEST_CHANCE = 0.85;
const MAX_PLIES = 300; // beyond this the game is scored a draw (proxy did not win)

function outcome(status, fen, proxyIsWhite) {
  if (status === 'checkmate') {
    // the side to move is the one being mated
    const proxyMated = proxyIsWhite === (fen.split(' ')[1] === 'w');
    return { result: proxyMated ? 'engine' : 'proxy', reason: 'checkmate' };
  }
  return { result: 'draw', reason: status };
}

function proxyMove(fen, random) {
  const moves = legalMoves(fen);
  if (random() < PROXY_BEST_CHANCE) {
    const { moves: scored } = scoreRootMoves(parseFen(fen), { maxDepth: 1, budgetMs: 60000 });
    return moveToUci(scored[0].move);
  }
  return moves[Math.floor(random() * moves.length)];
}

function playGame(level, proxyIsWhite, seed) {
  const engineRandom = rng(seed);
  const proxyRandom = rng(seed ^ 0x9e3779b9);
  let fen = START;
  const seen = new Map(); // position (without clocks) -> occurrences, for repetition
  for (let ply = 0; ply < MAX_PLIES; ply++) {
    const status = gameStatus(fen);
    if (status !== 'ongoing') return { ...outcome(status, fen, proxyIsWhite), plies: ply };
    const key = fen.split(' ').slice(0, 4).join(' ');
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count >= 3) return { result: 'draw', reason: 'threefold repetition', plies: ply };
    const proxyTurn = proxyIsWhite === (fen.split(' ')[1] === 'w');
    const uci = proxyTurn
      ? proxyMove(fen, proxyRandom)
      : pickMove(parseFen(fen), level, engineRandom);
    fen = applyMove(fen, uci);
  }
  return { result: 'draw', reason: 'ply cap', plies: MAX_PLIES };
}

function runLevel(level) {
  let proxyWins = 0;
  let engineWins = 0;
  let draws = 0;
  console.log(`\nlevel ${level}: proxy plays ${GAMES} games, alternating colors`);
  for (let game = 0; game < GAMES; game++) {
    const proxyIsWhite = game % 2 === 0;
    const seed = 1000 * level + 17 * game + 3;
    const r = playGame(level, proxyIsWhite, seed);
    if (r.result === 'proxy') proxyWins += 1;
    else if (r.result === 'engine') engineWins += 1;
    else draws += 1;
    const color = proxyIsWhite ? 'White' : 'Black';
    console.log(
      `  game ${game + 1} (proxy ${color}): ${r.result === 'proxy' ? 'PROXY WIN' : r.result === 'engine' ? 'engine win' : 'draw'} — ${r.reason}, ${r.plies} plies`,
    );
  }
  console.log(`level ${level} summary: proxy ${proxyWins}, engine ${engineWins}, draws ${draws}`);
  return proxyWins;
}

const checks = [
  { level: 1, min: 6, max: 10 }, // a novice wins most games at the lowest level
  { level: 4, min: 0, max: 1 }, // ... and at most one of ten at the highest
];

let failed = false;
for (const { level, min, max } of checks) {
  const wins = runLevel(level);
  if (wins < min || wins > max) {
    console.error(`FAIL: proxy won ${wins}/${GAMES} at level ${level} (allowed ${min}-${max})`);
    failed = true;
  }
}

if (failed) {
  console.error('\nlevels-check: FAIL');
  process.exit(1);
}
console.log('\nlevels-check: PASS');
