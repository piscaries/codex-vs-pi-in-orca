import {
  MOVE_FLAGS,
  gameStatusForPosition,
  generateLegalMoves,
  isInCheck,
  makeMove,
  moveToUci,
} from "./rules.js";

const MATE_SCORE = 100_000;
const INFINITY = 1_000_000;
const DEFAULT_TIME_MS = 250;
const DEFAULT_MAX_DEPTH = 4;
const QUIESCENCE_DEPTH = 6;

const PIECE_VALUES = Object.freeze({
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
});

class DeadlineReached extends Error {}

function pieceColor(piece) {
  if (piece === null) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

function pieceValue(piece) {
  return PIECE_VALUES[piece.toLowerCase()];
}

function checkDeadline(context) {
  context.nodes += 1;
  if (performance.now() >= context.deadline) throw new DeadlineReached();
}

function validateOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Search options must be an object");
  }
  const timeMs = options.timeMs ?? DEFAULT_TIME_MS;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const noise = options.noise ?? 0;
  if (typeof timeMs !== "number" || !Number.isFinite(timeMs) || timeMs < 0) {
    throw new TypeError("timeMs must be a non-negative finite number");
  }
  if (!Number.isInteger(maxDepth) || maxDepth < 1) {
    throw new TypeError("maxDepth must be a positive integer");
  }
  if (typeof noise !== "number" || !Number.isFinite(noise) || noise < 0) {
    throw new TypeError("noise must be a non-negative finite number");
  }
  return { timeMs, maxDepth, noise };
}

/** A side-to-move score in centipawns, positive when that side is better. */
export function evaluatePosition(position) {
  let whiteScore = 0;
  for (let square = 0; square < 64; square += 1) {
    const piece = position.board[square];
    if (piece === null) continue;
    const color = pieceColor(piece);
    const type = piece.toLowerCase();
    const rank = Math.floor(square / 8);
    const file = square % 8;
    let value = pieceValue(piece);

    // Small, symmetric activity bonuses make quiet choices less arbitrary.
    const centerDistance = Math.abs(file - 3.5) + Math.abs(rank - 3.5);
    if (type === "n" || type === "b") value += Math.round((7 - centerDistance) * 3);
    if (type === "p") {
      const advance = color === "w" ? 6 - rank : rank - 1;
      value += advance * 6;
    }
    whiteScore += color === "w" ? value : -value;
  }
  return position.turn === "w" ? whiteScore : -whiteScore;
}

function captureSquare(position, move) {
  if (move.flags & MOVE_FLAGS.EN_PASSANT) {
    return move.to + (position.turn === "w" ? 8 : -8);
  }
  return move.to;
}

function moveOrderScore(position, move) {
  let score = 0;
  if (move.flags & MOVE_FLAGS.CAPTURE) {
    const victim = position.board[captureSquare(position, move)];
    const attacker = position.board[move.from];
    score += 10_000 + (victim ? pieceValue(victim) : 100) * 10 - pieceValue(attacker);
  }
  if (move.flags & MOVE_FLAGS.PROMOTION) score += 8_000 + PIECE_VALUES[move.promotion];
  if (move.flags & (MOVE_FLAGS.CASTLE_KING | MOVE_FLAGS.CASTLE_QUEEN)) score += 200;
  return score;
}

function orderedMoves(position, moves, preferredUci = null) {
  return [...moves].sort((left, right) => {
    const leftUci = moveToUci(left);
    const rightUci = moveToUci(right);
    if (leftUci === preferredUci) return -1;
    if (rightUci === preferredUci) return 1;
    return moveOrderScore(position, right) - moveOrderScore(position, left)
      || leftUci.localeCompare(rightUci);
  });
}

function terminalScore(position, ply) {
  const status = gameStatusForPosition(position);
  if (status === "checkmate") return -MATE_SCORE + ply;
  if (status !== "ongoing") return 0;
  return null;
}

function quiescence(position, alpha, beta, context, ply, remaining) {
  checkDeadline(context);
  const terminal = terminalScore(position, ply);
  if (terminal !== null) return { score: terminal, pv: [] };

  const inCheck = isInCheck(position);
  const standPat = evaluatePosition(position);
  if (!inCheck) {
    if (standPat >= beta) return { score: beta, pv: [] };
    if (standPat > alpha) alpha = standPat;
    if (remaining === 0) return { score: alpha, pv: [] };
  } else if (remaining === 0) {
    return { score: standPat, pv: [] };
  }

  const tacticalMoves = generateLegalMoves(position).filter((move) => (
    inCheck || move.flags & (MOVE_FLAGS.CAPTURE | MOVE_FLAGS.PROMOTION)
  ));
  let bestPv = [];
  for (const move of orderedMoves(position, tacticalMoves)) {
    const child = makeMove(position, move);
    const result = quiescence(child, -beta, -alpha, context, ply + 1, remaining - 1);
    const score = -result.score;
    if (score >= beta) return { score: beta, pv: [move, ...result.pv] };
    if (score > alpha) {
      alpha = score;
      bestPv = [move, ...result.pv];
    }
  }
  return { score: alpha, pv: bestPv };
}

function negamax(position, depth, alpha, beta, context, ply) {
  checkDeadline(context);
  const terminal = terminalScore(position, ply);
  if (terminal !== null) return { score: terminal, pv: [] };
  if (depth === 0) return quiescence(position, alpha, beta, context, ply, QUIESCENCE_DEPTH);

  let bestScore = -INFINITY;
  let bestPv = [];
  const moves = orderedMoves(position, generateLegalMoves(position));
  for (const move of moves) {
    const child = makeMove(position, move);
    const result = negamax(child, depth - 1, -beta, -alpha, context, ply + 1);
    const score = -result.score;
    if (score > bestScore) {
      bestScore = score;
      bestPv = [move, ...result.pv];
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return { score: bestScore, pv: bestPv };
}

function staticFallback(position, moves) {
  const ranked = moves.map((move) => {
    const next = makeMove(position, move);
    const status = gameStatusForPosition(next);
    const score = status === "checkmate"
      ? MATE_SCORE - 1
      : status === "ongoing" ? -evaluatePosition(next) : 0;
    return { move, uci: moveToUci(move), score, pv: [move] };
  });
  ranked.sort((left, right) => right.score - left.score || left.uci.localeCompare(right.uci));
  return ranked;
}

function deterministicNoise(uci) {
  let hash = 0;
  for (const character of uci) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return (hash / 0xffff_ffff) * 2 - 1;
}

/**
 * Deadline-bounded iterative-deepening search. The returned move is always
 * legal, even when the deadline expires before depth one completes.
 */
export function searchPosition(position, options = {}) {
  const { timeMs, maxDepth, noise } = validateOptions(options);
  const legalMoves = generateLegalMoves(position);
  if (legalMoves.length === 0 || gameStatusForPosition(position) !== "ongoing") {
    throw new RangeError("Cannot search a terminal position");
  }

  const startedAt = performance.now();
  const context = { deadline: startedAt + timeMs, nodes: 0 };
  let ranked = staticFallback(position, legalMoves);
  let completedDepth = 0;
  let preferredUci = ranked[0].uci;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    try {
      const iteration = [];
      const rootMoves = orderedMoves(position, legalMoves, preferredUci);
      for (const move of rootMoves) {
        checkDeadline(context);
        const result = negamax(
          makeMove(position, move), depth - 1, -INFINITY, INFINITY, context, 1,
        );
        iteration.push({
          move,
          uci: moveToUci(move),
          score: -result.score,
          pv: [move, ...result.pv],
        });
      }
      iteration.sort((left, right) => right.score - left.score || left.uci.localeCompare(right.uci));
      ranked = iteration;
      completedDepth = depth;
      preferredUci = ranked[0].uci;
    } catch (error) {
      if (!(error instanceof DeadlineReached)) throw error;
      break;
    }
  }

  if (noise > 0 && ranked.length > 1) {
    ranked = [...ranked].sort((left, right) => (
      (right.score + deterministicNoise(right.uci) * noise)
      - (left.score + deterministicNoise(left.uci) * noise)
      || left.uci.localeCompare(right.uci)
    ));
  }

  const best = ranked[0];
  return {
    move: best.move,
    uci: best.uci,
    score: best.score,
    depth: completedDepth,
    pv: best.pv,
    rankedMoves: ranked,
    nodes: context.nodes,
    elapsedMs: performance.now() - startedAt,
  };
}

export const SEARCH_MATE_SCORE = MATE_SCORE;
