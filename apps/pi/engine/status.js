// Game status detection (phase P1): checkmate, stalemate, fifty-move rule,
// insufficient material.
//
// Threefold repetition is deliberately absent: it cannot be detected from a
// bare FEN (the interface passes no history), so `gameStatus` returns
// "ongoing" for repeatable positions and the app tracks its own position
// history to declare repetition draws (design §3).

import { OFFBOARD, fileOf, rankOf, isCheck } from './board.js';
import { generateLegalMoves } from './moves.js';

export function hasLegalMoves(pos) {
  return generateLegalMoves(pos).length > 0;
}

// True when neither side has any pawn, rook or queen, and at most one minor
// piece remains, or only bishops all standing on squares of one color:
// K vs K, K+minor vs K, and same-colored KB vs KB (any number of same-colored
// bishops). Two knights, or bishops on both colors, keep the game going.
export function isInsufficientMaterial(pos) {
  const bishopParities = [];
  let knights = 0;
  for (let sq = 21; sq <= 98; sq++) {
    const piece = pos.board[sq];
    if (piece === null || piece === OFFBOARD) continue;
    const kind = piece.toUpperCase();
    if (kind === 'K') continue;
    if (kind === 'B') bishopParities.push((fileOf(sq) + rankOf(sq)) % 2);
    else if (kind === 'N') knights += 1;
    else return false; // any pawn, rook or queen
  }
  const minors = bishopParities.length + knights;
  if (minors <= 1) return true;
  return knights === 0 && bishopParities.every((p) => p === bishopParities[0]);
}

// Contract order: no legal moves decides first (checkmate vs stalemate),
// then the fifty-move clock, then insufficient material, else ongoing.
export function gameStatus(pos) {
  if (!hasLegalMoves(pos)) {
    return isCheck(pos) ? 'checkmate' : 'stalemate';
  }
  if (pos.halfmove >= 100) return 'draw';
  if (isInsufficientMaterial(pos)) return 'draw';
  return 'ongoing';
}
