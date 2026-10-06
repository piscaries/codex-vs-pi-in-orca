import {
  MOVE_FLAGS,
  applyUciMove,
  gameStatusForPosition,
  indexToSquare,
  isInCheck,
  makeMove,
  moveToUci,
  parseFen,
} from "./rules.js";
import { searchPosition } from "./search.js";

export const VERDICT_THRESHOLDS = Object.freeze({
  best: 30,
  good: 90,
  inaccuracy: 180,
  mistake: 350,
});

const PIECE_NAMES = Object.freeze({
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
});

const DEFAULT_REVIEW_TIME_MS = 350;
const DEFAULT_REVIEW_DEPTH = 3;

function pieceName(piece) {
  return PIECE_NAMES[piece.toLowerCase()];
}

function capturedSquare(position, move) {
  if (move.flags & MOVE_FLAGS.EN_PASSANT) {
    return move.to + (position.turn === "w" ? 8 : -8);
  }
  return move.to;
}

function validateReviewOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Review options must be an object");
  }
  const timeMs = options.timeMs ?? DEFAULT_REVIEW_TIME_MS;
  const maxDepth = options.maxDepth ?? DEFAULT_REVIEW_DEPTH;
  if (typeof timeMs !== "number" || !Number.isFinite(timeMs) || timeMs < 0) {
    throw new TypeError("timeMs must be a non-negative finite number");
  }
  if (!Number.isInteger(maxDepth) || maxDepth < 1) {
    throw new TypeError("maxDepth must be a positive integer");
  }
  return { timeMs, maxDepth };
}

function verdictForLoss(loss) {
  if (loss <= VERDICT_THRESHOLDS.best) return "best";
  if (loss <= VERDICT_THRESHOLDS.good) return "good";
  if (loss <= VERDICT_THRESHOLDS.inaccuracy) return "inaccuracy";
  if (loss <= VERDICT_THRESHOLDS.mistake) return "mistake";
  return "blunder";
}

function mateReason(position, move, subject) {
  const next = makeMove(position, move);
  if (gameStatusForPosition(next) !== "checkmate") return null;
  const mover = position.board[move.from];
  return `${subject} can checkmate by moving ${subject === "You" ? "your" : "their"} ${pieceName(mover)} from ${indexToSquare(move.from)} to ${indexToSquare(move.to)}.`;
}

function opponentConsequence(positionAfterPlayed, response) {
  if (!response) return null;

  const mate = mateReason(positionAfterPlayed, response, "Your opponent");
  if (mate) return mate;

  if (response.flags & MOVE_FLAGS.CAPTURE) {
    const victimSquare = capturedSquare(positionAfterPlayed, response);
    const victim = positionAfterPlayed.board[victimSquare];
    const attacker = positionAfterPlayed.board[response.from];
    if (victim && attacker) {
      return `Your opponent can capture your ${pieceName(victim)} on ${indexToSquare(victimSquare)} with their ${pieceName(attacker)} from ${indexToSquare(response.from)}.`;
    }
  }

  const afterResponse = makeMove(positionAfterPlayed, response);
  if (isInCheck(afterResponse)) {
    const attacker = positionAfterPlayed.board[response.from];
    return `Your opponent can move their ${pieceName(attacker)} from ${indexToSquare(response.from)} to ${indexToSquare(response.to)} and check your king.`;
  }
  return null;
}

function missedOpportunity(position, betterMove) {
  const mate = mateReason(position, betterMove, "You");
  if (mate) return mate.replace("You can", "This misses a chance to");

  if (betterMove.flags & MOVE_FLAGS.CAPTURE) {
    const victimSquare = capturedSquare(position, betterMove);
    const victim = position.board[victimSquare];
    const attacker = position.board[betterMove.from];
    if (victim && attacker) {
      return `This misses the chance to capture the ${pieceName(victim)} on ${indexToSquare(victimSquare)} with your ${pieceName(attacker)} from ${indexToSquare(betterMove.from)}.`;
    }
  }
  return null;
}

/**
 * Review a legal move from a parsed position. Mistake and blunder verdicts are
 * only emitted when a legal continuation provides a concrete explanation.
 */
export function reviewPositionMove(position, uci, options = {}) {
  const { timeMs, maxDepth } = validateReviewOptions(options);
  const positionAfterPlayed = applyUciMove(position, uci);
  const analysis = searchPosition(position, { timeMs, maxDepth });
  const played = analysis.rankedMoves.find((candidate) => candidate.uci === uci);
  if (!played) throw new Error(`Illegal move: ${uci}`);

  const best = analysis.rankedMoves[0];
  const loss = Math.max(0, best.score - played.score);
  let verdict = verdictForLoss(loss);
  let reason = null;

  if (verdict === "mistake" || verdict === "blunder") {
    reason = opponentConsequence(positionAfterPlayed, played.pv[1])
      ?? missedOpportunity(position, best.move);
    // A severe score alone is not a beginner-safe explanation. Be conservative
    // when the searched line does not witness a concrete capture, check, or mate.
    if (!reason) verdict = "inaccuracy";
  }

  if (verdict === "best") {
    return { verdict, reasons: ["That was the strongest move."], betterMove: null };
  }
  if (verdict === "good") {
    return { verdict, reasons: ["That was a solid move."], betterMove: null };
  }
  if (verdict === "inaccuracy") {
    return {
      verdict,
      reasons: [reason ?? "A stronger move was available."],
      betterMove: best.uci === uci ? null : best.uci,
    };
  }
  return { verdict, reasons: [reason], betterMove: best.uci };
}

/** Convenience boundary used by the public engine module in P2. */
export function reviewFenMove(fen, uci, options = {}) {
  return reviewPositionMove(parseFen(fen), uci, options);
}

/** A legal, short hint whose claim is limited to the searched recommendation. */
export function hintForPosition(position, options = {}) {
  const analysis = searchPosition(position, options);
  const move = analysis.move;
  const piece = position.board[move.from];
  return {
    uci: moveToUci(move),
    reason: `Consider moving your ${pieceName(piece)} from ${indexToSquare(move.from)} to ${indexToSquare(move.to)}.`,
  };
}
