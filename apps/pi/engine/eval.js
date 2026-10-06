// Evaluation (phase P2): material plus piece-square tables in centipawns from
// White's point of view — positive means White stands better. The tables are
// the classic "simplified evaluation function" (Tomasz Michniewski): cheap to
// compute, explainable, and strong enough to punish beginner mistakes.
//
// The search needs scores from the side to move's perspective, which
// evaluateStm provides by flipping the sign for Black.

import { OFFBOARD, WHITE, colorOf, fileOf, rankOf } from './board.js';

// Centipawn values by piece kind (lowercase). The king is 0 here: it is never
// captured, and its placement value comes from the king tables below.
export const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Piece-square tables, White's point of view, written as a diagram: the first
// row is rank 8, the last row is rank 1, files a..h left to right. A bonus is
// added for a White piece on that square and subtracted for the mirrored
// Black piece.
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_TABLE = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_TABLE_MIDDLE = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const KING_TABLE_END = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

const TABLES = { p: PAWN_TABLE, n: KNIGHT_TABLE, b: BISHOP_TABLE, r: ROOK_TABLE, q: QUEEN_TABLE };

// Placement bonus for one piece on one mailbox square, White POV.
function pstBonus(piece, sq) {
  const table = TABLES[piece.toLowerCase()];
  if (table === undefined) return 0; // kings are scored with the phase tables
  const file = fileOf(sq);
  const rank = rankOf(sq);
  return colorOf(piece) === WHITE ? table[(8 - rank) * 8 + file] : table[(rank - 1) * 8 + file];
}

// The endgame king tables apply when neither side has real attacking force
// left: no queen, or a queen plus at most one rook's worth of other pieces
// (the classic simplified-eval rule, ~500 cp).
function isEndgame(board) {
  for (let sq = 21; sq <= 98; sq++) {
    const piece = board[sq];
    if (piece === null || piece === OFFBOARD) continue;
    if (piece.toUpperCase() === 'K') continue;
    if (piece.toUpperCase() === 'Q') {
      // A side keeps attacking chances if, besides its queen, it holds more
      // than one rook's worth of pieces.
      let support = 0;
      for (let s = 21; s <= 98; s++) {
        const other = board[s];
        if (other === null || other === OFFBOARD) continue;
        if (colorOf(other) === colorOf(piece) && 'nbr'.includes(other.toLowerCase())) {
          support += PIECE_VALUES[other.toLowerCase()];
        }
      }
      if (support > PIECE_VALUES.r) return false;
    }
  }
  return true;
}

// Static evaluation in centipawns, White POV.
export function evaluate(pos) {
  const board = pos.board;
  const endgame = isEndgame(board);
  let score = 0;
  for (let sq = 21; sq <= 98; sq++) {
    const piece = board[sq];
    if (piece === null || piece === OFFBOARD) continue;
    const kind = piece.toLowerCase();
    const value = PIECE_VALUES[kind] + pstBonus(piece, sq);
    if (kind === 'k') {
      const file = fileOf(sq);
      const rank = rankOf(sq);
      const table = endgame ? KING_TABLE_END : KING_TABLE_MIDDLE;
      const bonus =
        colorOf(piece) === WHITE ? table[(8 - rank) * 8 + file] : table[(rank - 1) * 8 + file];
      score += colorOf(piece) === WHITE ? bonus : -bonus;
    } else {
      score += colorOf(piece) === WHITE ? value : -value;
    }
  }
  return score;
}

// Same evaluation from the side to move's perspective (positive = the player
// to move stands better). This is what the search optimizes.
export function evaluateStm(pos) {
  return pos.turn === WHITE ? evaluate(pos) : -evaluate(pos);
}
