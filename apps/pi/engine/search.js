// Search (phase P2): iterative-deepening alpha-beta with a quiescence search,
// deadline-driven and steppable.
//
// Two entry points:
//   - createSearch(pos, budgetMs): a steppable iterative-deepening search.
//     Each step() call advances one root move at the current depth and
//     reports the best line so far; bestMove() in engine/index.js drains it
//     synchronously, while the app (phase P4) will drain it across event-loop
//     turns so the page never freezes.
//   - scoreRootMoves(pos, {maxDepth, budgetMs}): exact, full-window scores for
//     every root move, best first. The levels use this to build their
//     candidate pools at a fixed, depth-capped strength.
//
// Scores are centipawns from the side to move's perspective. Mate scores are
// MATE_SCORE - ply (positive if the side to move delivers mate), which keeps
// faster mates larger. `pos` is never mutated by this module: each root-move
// subtree runs on a throwaway clone, so an aborted search cannot corrupt the
// caller's position.

import { makeMove, unmakeMove, isCheck } from './board.js';
import { generateLegalMoves, generatePseudoMoves, moveToUci } from './moves.js';
import { PIECE_VALUES, evaluateStm } from './eval.js';

export const MATE_SCORE = 100000; // anything >= MATE_SCORE - 1000 is a mate score
export const MAX_PLY = 64; // hard recursion cap for search and quiescence
const MAX_SEARCH_DEPTH = 32; // no game here is deep enough to need more
const INF = 1e9;
const TIMEOUT = Symbol('search-deadline');

// Deadline and node counter threaded through the recursion.
function makeContext(deadline) {
  return { deadline, nodes: 0 };
}

function checkDeadline(ctx) {
  // Checking Date.now() on every node would dominate the cost; every 256th
  // node keeps the abort granularity small (a fraction of a millisecond per
  // chunk) so even under heavy machine load the answer lands inside the
  // caller's time budget plus its slack.
  if ((++ctx.nodes & 255) === 0 && Date.now() >= ctx.deadline) throw TIMEOUT;
}

// Captures and promotions first, most valuable victim / least valuable
// attacker (MVV-LVA), so alpha-beta cutoffs happen early.
function orderMoves(moves) {
  const rank = (move) => {
    let score = 0;
    if (move.captured !== null) {
      score += 10000 + PIECE_VALUES[move.captured.toLowerCase()] * 16 -
        PIECE_VALUES[move.piece.toLowerCase()];
    }
    if (move.promotion !== null) score += 8000 + PIECE_VALUES[move.promotion];
    return score;
  };
  return moves.sort((a, b) => rank(b) - rank(a));
}

// Quiescence: no more quiet moves — resolve captures (and check evasions) so
// the static evaluation is only taken on quiet positions. When in check the
// side to move has no stand-pat option: every evasion is searched, and having
// none means it is mated. Out of check only noisy moves (captures and
// promotions) are generated and legality-checked, which keeps these trees —
// the deepest part of the search — narrow; delta pruning skips captures that
// could not raise alpha even if they win the piece for free.
function quiescence(pos, alpha, beta, ply, ctx) {
  checkDeadline(ctx);
  if (ply >= MAX_PLY) return evaluateStm(pos);

  if (isCheck(pos)) {
    const evasions = generateLegalMoves(pos);
    if (evasions.length === 0) return -(MATE_SCORE - ply);
    let best = -INF;
    for (const move of orderMoves(evasions)) {
      const undo = makeMove(pos, move);
      const score = -quiescence(pos, -beta, -alpha, ply + 1, ctx);
      unmakeMove(pos, undo);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  const stand = evaluateStm(pos);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  let best = stand;
  const us = pos.turn;
  const noisy = orderMoves(
    generatePseudoMoves(pos)
      .filter((m) => m.captured !== null || m.promotion !== null)
      .filter((m) => {
        const undo = makeMove(pos, m);
        const legal = !isCheck(pos, us);
        unmakeMove(pos, undo);
        return legal;
      }),
  );
  for (const move of noisy) {
    const gain = move.captured !== null
      ? PIECE_VALUES[move.captured.toLowerCase()]
      : PIECE_VALUES[move.promotion] - PIECE_VALUES.p;
    if (stand + gain + 200 <= alpha) continue; // even winning it for free is not enough
    const undo = makeMove(pos, move);
    const score = -quiescence(pos, -beta, -alpha, ply + 1, ctx);
    unmakeMove(pos, undo);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Fail-soft negamax alpha-beta. Being in check extends the depth by one ply
// so forced mates are found sooner.
function alphabeta(pos, depth, alpha, beta, ply, ctx) {
  checkDeadline(ctx);
  if (ply >= MAX_PLY) return evaluateStm(pos);
  if (isCheck(pos)) depth += 1;
  if (depth <= 0) return quiescence(pos, alpha, beta, ply, ctx);

  const moves = generateLegalMoves(pos);
  if (moves.length === 0) return isCheck(pos) ? -(MATE_SCORE - ply) : 0;

  let best = -INF;
  for (const move of orderMoves(moves)) {
    const undo = makeMove(pos, move);
    const score = -alphabeta(pos, depth - 1, -beta, -alpha, ply + 1, ctx);
    unmakeMove(pos, undo);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Steppable search. step() advances one root move (or one depth transition)
// and returns {done, move, scoreCp, depth}; move is a UCI string (null when
// there is no legal move). Iterations that the deadline interrupts are
// discarded unless nothing better exists: a partial depth-1 pass still beats
// no answer at all.
export function createSearch(pos, budgetMs) {
  const ctx = makeContext(Date.now() + Math.max(1, budgetMs));
  const rootMoves = orderMoves(generateLegalMoves(pos));

  let depth = 1;
  let index = 0; // root move being searched at `depth`
  let iterBest = null; // best of the current, possibly partial, iteration
  let iterScores = new Array(rootMoves.length);
  let completed = null; // {move, scoreCp, depth} of the last completed depth
  let depthStartedAt = Date.now();
  let done = rootMoves.length === 0;

  function report(doneNow) {
    const best = doneNow ? completed ?? fallback() : iterBest ?? completed;
    return {
      done: doneNow,
      move: best && best.move ? moveToUci(best.move) : null,
      scoreCp: best ? best.scoreCp : 0,
      depth: best ? best.depth : 0,
    };
  }

  function fallback() {
    return { move: rootMoves[0] ?? null, scoreCp: 0, depth: 0 };
  }

  function step() {
    if (done) return report(true);
    if (completed !== null && Date.now() >= ctx.deadline) {
      done = true;
      return report(true);
    }

    const move = rootMoves[index];
    let score;
    try {
      const child = pos.clone();
      makeMove(child, move);
      // Root window: previous best as alpha, so clearly worse moves fail low.
      const beta = iterBest === null ? INF : -iterBest.scoreCp;
      score = -alphabeta(child, depth - 1, -INF, beta, 1, ctx);
    } catch (error) {
      if (error !== TIMEOUT) throw error;
      done = true;
      if (completed === null && iterBest !== null) {
        completed = { move: iterBest.move, scoreCp: iterBest.scoreCp, depth: 1 };
      }
      return report(true);
    }

    iterScores[index] = score;
    if (iterBest === null || score > iterBest.scoreCp) {
      iterBest = { move, scoreCp: score, depth };
    }
    index += 1;
    if (index < rootMoves.length) return report(false);

    // Depth finished: keep the answer and order the next iteration best-first.
    completed = { move: iterBest.move, scoreCp: iterBest.scoreCp, depth };
    const paired = rootMoves
      .map((m, i) => ({ move: m, score: iterScores[i] }))
      .sort((a, b) => b.score - a.score);
    paired.forEach((entry, i) => {
      rootMoves[i] = entry.move;
    });

    const spent = Date.now() - depthStartedAt;
    const nextDepthFits = Date.now() + 2 * spent < ctx.deadline;
    if (rootMoves.length === 1 || !nextDepthFits || depth >= MAX_SEARCH_DEPTH) {
      done = true;
      return report(true);
    }
    depth += 1;
    index = 0;
    iterBest = null;
    iterScores = new Array(rootMoves.length);
    depthStartedAt = Date.now();
    return report(false);
  }

  return { step };
}

// Exact scores for every root move at a depth-capped search, best first
// (ties keep the previous order). Unlike createSearch's root, every move is
// searched with a full window, so the scores are directly comparable — what
// the levels need to pick a move from the top of the list. With a generous
// budget the result depends only on maxDepth, which makes level play
// reproducible; the budget is only a safety valve.
export function scoreRootMoves(pos, opts = {}) {
  const maxDepth = Math.max(1, Math.min(MAX_SEARCH_DEPTH, opts.maxDepth ?? 1));
  const ctx = makeContext(Date.now() + Math.max(1, opts.budgetMs ?? 60000));
  let ordered = orderMoves(generateLegalMoves(pos));
  let result = { moves: ordered.map((move) => ({ move, scoreCp: 0 })), depth: 0 };

  for (let depth = 1; depth <= maxDepth; depth++) {
    const scored = [];
    try {
      for (const move of ordered) {
        const child = pos.clone();
        makeMove(child, move);
        const score = -alphabeta(child, depth - 1, -INF, INF, 1, ctx);
        scored.push({ move, scoreCp: score });
      }
    } catch (error) {
      if (error !== TIMEOUT) throw error;
      break; // keep the last fully scored depth
    }
    scored.sort((a, b) => b.scoreCp - a.scoreCp); // stable: ties keep order
    result = { moves: scored, depth };
    ordered = scored.map((entry) => entry.move);
  }
  return result;
}
