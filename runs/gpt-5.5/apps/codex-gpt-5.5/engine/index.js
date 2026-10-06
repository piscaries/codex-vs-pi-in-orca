import { parseFen, serializeFen } from "./fen.js";
import { applyMoveObject, assertLegalMove, generateLegalMoveObjects, legalMoveUcis } from "./movegen.js";
import { gameStatusForPosition } from "./status.js";
import { bestMove as searchBestMove, bestMoveForLevel, chooseComputerMove } from "./search.js";
import { hint, reviewMove as coachReviewMove } from "./coach.js";

export function legalMoves(fen) {
  return legalMoveUcis(parseFen(fen));
}

export function applyMove(fen, uci) {
  const position = parseFen(fen);
  const move = assertLegalMove(position, uci);
  return serializeFen(applyMoveObject(position, move));
}

export function perft(fen, depth) {
  if (!Number.isInteger(depth) || depth < 0) {
    throw new Error("Invalid perft depth");
  }
  const position = parseFen(fen);
  return perftPosition(position, depth);
}

function perftPosition(position, depth) {
  if (depth === 0) return 1;
  const moves = generateLegalMoveObjects(position);
  if (depth === 1) return moves.length;

  let total = 0;
  for (const move of moves) {
    total += perftPosition(applyMoveObject(position, move), depth - 1);
  }
  return total;
}

export function gameStatus(fen) {
  return gameStatusForPosition(parseFen(fen));
}

export function bestMove(fen, options = {}) {
  return searchBestMove(fen, options);
}

export function reviewMove(fen, uci) {
  return coachReviewMove(fen, uci);
}

export { bestMoveForLevel, chooseComputerMove, hint };
