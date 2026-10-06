// Playing levels (phase P2): the strength dial of the app (FR-003).
//
// A level weakens play honestly: shallower search plus a chance of picking a
// random move from the top of the (shallow) move list. Weakened, never
// lawless — every move the level returns is legal, and the strongest level
// searches at full strength within its time budget. The design's fields
// {time/depth cap, blunderChance, candidatePool} are spelled out here as
// {maxDepth, budgetMs, blunderChance, candidatePool}; levels 1–2 are capped
// by depth only (their budget is a large safety valve), so their moves are
// reproducible for a given random stream. Level 3 is depth-capped too, but
// phase P4 gave it a real 900 ms valve: full-window depth-4 search can cost
// seconds on sharp middlegames (measured p90 2.1 s), which would break the
// app's two-second reply budget (FR-004). Like level 4 it is therefore
// time-valved on the sharpest positions; levels 1–2 measured ≤ 190 ms, so
// their valves never bite and their play stays seed-reproducible.
//
// The labels are for the app's level selector (phase P4).

import { rng, intBelow } from './rng.js';
import { createSearch, scoreRootMoves } from './search.js';
import { moveToUci } from './moves.js';

export const LEVELS = [
  { level: 1, label: 'Beginner', maxDepth: 1, budgetMs: 60000, blunderChance: 0.6, candidatePool: 5 },
  { level: 2, label: 'Casual', maxDepth: 2, budgetMs: 60000, blunderChance: 0.35, candidatePool: 3 },
  { level: 3, label: 'Club', maxDepth: 4, budgetMs: 900, blunderChance: 0.15, candidatePool: 2 },
  { level: 4, label: 'Strong', maxDepth: 32, budgetMs: 1200, blunderChance: 0, candidatePool: 1 },
];

export function levelCount() {
  return LEVELS.length;
}

export function levelConfig(level) {
  const config = LEVELS[level - 1];
  if (config === undefined) throw new RangeError(`unknown level: ${level}`);
  return config;
}

// The move a given level plays in `pos`, or null if there is no legal move.
// `random` is the seeded stream (rng.js) that decides the occasional weaker
// pick; pass the same stream across moves of one game to keep a game
// reproducible.
export function pickMove(pos, level, random = rng(1)) {
  const config = levelConfig(level);

  // Full strength: plain time-limited search, no deliberate weakening.
  if (config.candidatePool === 1 && config.blunderChance === 0) {
    const search = createSearch(pos, config.budgetMs);
    let result;
    do {
      result = search.step();
    } while (!result.done);
    return result.move;
  }

  const { moves } = scoreRootMoves(pos, { maxDepth: config.maxDepth, budgetMs: config.budgetMs });
  if (moves.length === 0) return null;

  if (random() >= config.blunderChance) return moveToUci(moves[0].move);
  const pool = Math.min(config.candidatePool, moves.length);
  const pick = moves[intBelow(random, pool)];
  return moveToUci(pick.move);
}
