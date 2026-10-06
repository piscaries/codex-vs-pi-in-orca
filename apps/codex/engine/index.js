import { reviewFenMove } from "./coach.js";
import {
  applyUciMove,
  gameStatusForPosition,
  legalMovesFromFen,
  parseFen,
  perftPosition,
  positionToFen,
} from "./rules.js";
import { searchPosition } from "./search.js";

export function legalMoves(fen) {
  return legalMovesFromFen(fen);
}

export function applyMove(fen, uci) {
  return positionToFen(applyUciMove(parseFen(fen), uci));
}

export function perft(fen, depth) {
  return perftPosition(parseFen(fen), depth);
}

export function gameStatus(fen) {
  return gameStatusForPosition(parseFen(fen));
}

export function bestMove(fen, options = {}) {
  return searchPosition(parseFen(fen), options).uci;
}

export function reviewMove(fen, uci) {
  return reviewFenMove(fen, uci);
}
