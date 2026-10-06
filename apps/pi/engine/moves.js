// Legal move generation (phase P1) for Chess Coach.
//
// generatePseudoMoves produces every move that obeys piece movement plus the
// structural castling rules (rights present, path empty, own king not in
// check, the king's pass-through square not attacked). generateLegalMoves
// then filters with make/unmake + isCheck, which is what makes pins, en
// passant discoveries and the castle destination square exact: a move is kept
// only if the mover's king is not attacked after the move is played.

import {
  OFFBOARD,
  WHITE,
  BLACK,
  CASTLE_WK,
  CASTLE_WQ,
  CASTLE_BK,
  CASTLE_BQ,
  FLAG_NORMAL,
  FLAG_EP,
  FLAG_CASTLE_K,
  FLAG_CASTLE_Q,
  FLAG_DOUBLE,
  KNIGHT_OFFSETS,
  KING_OFFSETS,
  BISHOP_OFFSETS,
  ROOK_OFFSETS,
  colorOf,
  opposite,
  rankOf,
  sqIndex,
  sqName,
  createMove,
  makeMove,
  unmakeMove,
  isSquareAttacked,
  isCheck,
} from './board.js';

// UCI move grammar: two squares plus an optional promotion piece.
const UCI_MOVE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

export const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];

function addPawnMove(moves, pos, from, to, flags) {
  // A pawn landing on the first or last rank must promote; all four choices
  // are distinct moves.
  if (rankOf(to) === 8 || rankOf(to) === 1) {
    for (const promotion of PROMOTION_PIECES) {
      moves.push(createMove(pos, from, to, { flags, promotion }));
    }
  } else {
    moves.push(createMove(pos, from, to, { flags }));
  }
}

// Castling moves from the king's home square. `g1`/`c1` (the destination)
// being attacked is not checked here — the legality filter catches it once
// the king actually lands there. `b1` being attacked is nobody's concern: the
// rook, not the king, passes through it.
function addCastlingMoves(moves, pos, kingSq, white) {
  const them = white ? BLACK : WHITE;
  const e = white ? 25 : 95; // e1 / e8
  if (kingSq !== e) return;
  if (isSquareAttacked(pos, e, them)) return; // no castling out of check

  const rook = white ? 'R' : 'r';
  const rights = white ? { k: CASTLE_WK, q: CASTLE_WQ } : { k: CASTLE_BK, q: CASTLE_BQ };

  if (pos.castling & rights.k) {
    const f = e + 1;
    const g = e + 2;
    const h = e + 3;
    if (
      pos.board[f] === null &&
      pos.board[g] === null &&
      pos.board[h] === rook &&
      !isSquareAttacked(pos, f, them)
    ) {
      moves.push(createMove(pos, e, g, { flags: FLAG_CASTLE_K }));
    }
  }
  if (pos.castling & rights.q) {
    const d = e - 1;
    const c = e - 2;
    const b = e - 3;
    const a = e - 4;
    if (
      pos.board[d] === null &&
      pos.board[c] === null &&
      pos.board[b] === null &&
      pos.board[a] === rook &&
      !isSquareAttacked(pos, d, them)
    ) {
      moves.push(createMove(pos, e, c, { flags: FLAG_CASTLE_Q }));
    }
  }
}

// All moves obeying piece movement (not yet filtered for self-check).
export function generatePseudoMoves(pos) {
  const moves = [];
  const board = pos.board;
  const us = pos.turn;
  const them = opposite(us);
  const white = us === WHITE;

  for (let from = 21; from <= 98; from++) {
    const piece = board[from];
    if (piece === null || piece === OFFBOARD || colorOf(piece) !== us) continue;
    const kind = piece.toUpperCase();

    if (kind === 'P') {
      const dir = white ? 10 : -10; // +10 = one rank up the mailbox
      const startRank = white ? 2 : 7;
      const one = from + dir;
      if (board[one] === null) {
        addPawnMove(moves, pos, from, one, FLAG_NORMAL);
        const two = from + 2 * dir;
        if (rankOf(from) === startRank && board[two] === null) {
          moves.push(createMove(pos, from, two, { flags: FLAG_DOUBLE }));
        }
      }
      for (const side of [dir - 1, dir + 1]) {
        const to = from + side;
        const target = board[to];
        if (target === OFFBOARD) continue;
        if (target !== null && colorOf(target) === them) {
          addPawnMove(moves, pos, from, to, FLAG_NORMAL);
        } else if (target === null && pos.ep !== null && to === pos.ep) {
          moves.push(createMove(pos, from, to, { flags: FLAG_EP }));
        }
      }
    } else if (kind === 'N' || kind === 'K') {
      const offsets = kind === 'N' ? KNIGHT_OFFSETS : KING_OFFSETS;
      for (const off of offsets) {
        const to = from + off;
        const target = board[to];
        if (target === OFFBOARD || (target !== null && colorOf(target) === us)) continue;
        moves.push(createMove(pos, from, to));
      }
      if (kind === 'K') addCastlingMoves(moves, pos, from, white);
    } else {
      const offsets =
        kind === 'B' ? BISHOP_OFFSETS : kind === 'R' ? ROOK_OFFSETS : [...BISHOP_OFFSETS, ...ROOK_OFFSETS];
      for (const off of offsets) {
        let to = from + off;
        while (board[to] !== OFFBOARD) {
          const target = board[to];
          if (target === null) {
            moves.push(createMove(pos, from, to));
          } else {
            if (colorOf(target) === them) moves.push(createMove(pos, from, to));
            break;
          }
          to += off;
        }
      }
    }
  }
  return moves;
}

// Exactly the legal moves: pseudo-legal moves that do not leave the mover's
// king attacked. The position is restored after each probe.
export function generateLegalMoves(pos) {
  const us = pos.turn;
  const legal = [];
  for (const move of generatePseudoMoves(pos)) {
    const undo = makeMove(pos, move);
    if (!isCheck(pos, us)) legal.push(move);
    unmakeMove(pos, undo);
  }
  return legal;
}

// Leaf-node count of the legal move tree (`perft`). Depth 0 is one node.
export function perft(pos, depth) {
  if (!Number.isInteger(depth) || depth < 0) {
    throw new Error(`perft depth must be a non-negative integer, got ${depth}`);
  }
  if (depth === 0) return 1;
  const moves = generateLegalMoves(pos);
  if (depth === 1) return moves.length; // legal moves == leaves at depth 1
  let nodes = 0;
  for (const move of moves) {
    const undo = makeMove(pos, move);
    nodes += perft(pos, depth - 1);
    unmakeMove(pos, undo);
  }
  return nodes;
}

export function moveToUci(move) {
  return sqName(move.from) + sqName(move.to) + (move.promotion ?? '');
}

// Parse a UCI move string; null if malformed (including a bad promotion char).
export function parseUci(uci) {
  if (typeof uci !== 'string') return null;
  const match = UCI_MOVE.exec(uci);
  if (match === null) return null;
  return { from: sqIndex(match[1]), to: sqIndex(match[2]), promotion: match[3] ?? null };
}

// The legal move matching `uci`, or null if the string is malformed or the
// move is illegal in `pos`. A promotion move matches only with its promotion
// suffix; a suffix on a non-promotion move never matches.
export function findLegalMove(pos, uci) {
  const wanted = parseUci(uci);
  if (wanted === null) return null;
  for (const move of generateLegalMoves(pos)) {
    if (
      move.from === wanted.from &&
      move.to === wanted.to &&
      (move.promotion ?? null) === wanted.promotion
    ) {
      return move;
    }
  }
  return null;
}
