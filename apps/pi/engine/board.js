// Board core for Chess Coach (phase P0).
//
// A position uses a 120-square "mailbox" board: an array of 120 cells where
// the 64 playable squares live at indices 21..98 and the surrounding cells
// hold an OFFBOARD sentinel that stops piece walks from wrapping around the
// edge of the board.
//
//   index = 21 + file + 10 * (rank - 1)   →  a1 = 21, h1 = 28, a8 = 91, h8 = 98
//
// Pieces are single characters: uppercase = White ('PNBRQK'), lowercase =
// Black ('pnbrqk'), null = empty square.
//
// This module has no move generation and no legality knowledge. makeMove
// applies a well-formed move (built with createMove) and unmakeMove restores
// the position exactly. Legal move generation lives in moves.js (phase P1).

export const OFFBOARD = Symbol('offboard');
export const WHITE = 'w';
export const BLACK = 'b';

// Castling-right bits.
export const CASTLE_WK = 1;
export const CASTLE_WQ = 2;
export const CASTLE_BK = 4;
export const CASTLE_BQ = 8;
const ANY_CASTLE = CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ;

// Rights kept after a move touches each square (index by mailbox square).
// Everything starts as "keep all"; squares whose roles matter clear bits.
const castleKeep = new Array(120).fill(ANY_CASTLE);
castleKeep[21] = ANY_CASTLE & ~CASTLE_WQ; // a1: white queenside rook
castleKeep[25] = ANY_CASTLE & ~(CASTLE_WK | CASTLE_WQ); // e1: white king
castleKeep[28] = ANY_CASTLE & ~CASTLE_WK; // h1: white kingside rook
castleKeep[91] = ANY_CASTLE & ~CASTLE_BQ; // a8: black queenside rook
castleKeep[95] = ANY_CASTLE & ~(CASTLE_BK | CASTLE_BQ); // e8: black king
castleKeep[98] = ANY_CASTLE & ~CASTLE_BK; // h8: black kingside rook
export const CASTLE_KEEP = castleKeep;

// Move flags.
export const FLAG_NORMAL = 0;
export const FLAG_EP = 1; // en passant capture (captured pawn is not on `to`)
export const FLAG_CASTLE_K = 2; // kingside castle (king moves two squares)
export const FLAG_CASTLE_Q = 4; // queenside castle
export const FLAG_DOUBLE = 8; // pawn double push (sets the ep target)

// Ray/step offsets on the 120-square mailbox.
export const KNIGHT_OFFSETS = [-21, -19, -12, -8, 8, 12, 19, 21];
export const KING_OFFSETS = [-11, -10, -9, -1, 1, 9, 10, 11];
export const BISHOP_OFFSETS = [-11, -9, 9, 11];
export const ROOK_OFFSETS = [-10, -1, 1, 10];

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FILES = 'abcdefgh';
const PIECE_CHARS = new Set('pnbrqkPNBRQK');
const PROMOTION_CHARS = new Set(['q', 'r', 'b', 'n']);

export function sqIndex(name) {
  if (typeof name !== 'string' || !/^[a-h][1-8]$/.test(name)) {
    throw new Error(`invalid square name: ${JSON.stringify(name)}`);
  }
  return 21 + FILES.indexOf(name[0]) + 10 * (Number(name[1]) - 1);
}

export function sqName(index) {
  const file = (index - 21) % 10;
  const rank = Math.floor((index - 21) / 10) + 1;
  if (file < 0 || file > 7 || rank < 1 || rank > 8) {
    throw new Error(`not a playable square index: ${index}`);
  }
  return FILES[file] + rank;
}

export function fileOf(index) {
  return (index - 21) % 10;
}

export function rankOf(index) {
  return Math.floor((index - 21) / 10) + 1;
}

export function colorOf(piece) {
  return piece === piece.toUpperCase() ? WHITE : BLACK;
}

export function opposite(color) {
  return color === WHITE ? BLACK : WHITE;
}

export class Position {
  constructor() {
    this.board = new Array(120).fill(OFFBOARD);
    for (let rank = 1; rank <= 8; rank++) {
      const base = 21 + 10 * (rank - 1);
      for (let file = 0; file < 8; file++) this.board[base + file] = null;
    }
    this.turn = WHITE;
    this.castling = 0; // bit set of CASTLE_* rights
    this.ep = null; // mailbox index of en passant target, or null
    this.halfmove = 0; // halfmove clock (fifty-move rule)
    this.fullmove = 1;
  }

  clone() {
    const copy = new Position();
    copy.board = this.board.slice();
    copy.turn = this.turn;
    copy.castling = this.castling;
    copy.ep = this.ep;
    copy.halfmove = this.halfmove;
    copy.fullmove = this.fullmove;
    return copy;
  }
}

export function parseFen(fen) {
  if (typeof fen !== 'string') throw new Error('invalid FEN: not a string');
  const fields = fen.trim().split(/\s+/);
  if (fields.length < 4 || fields.length > 6) {
    throw new Error(`invalid FEN: expected 4-6 fields, got ${fields.length}`);
  }
  const [placement, turn, castling, ep, halfmove = '0', fullmove = '1'] = fields;

  const pos = new Position();
  const ranks = placement.split('/');
  if (ranks.length !== 8) {
    throw new Error(`invalid FEN: board must have 8 ranks, got ${ranks.length}`);
  }
  for (let r = 0; r < 8; r++) {
    const base = 21 + 10 * (8 - r - 1);
    let file = 0;
    for (const ch of ranks[r]) {
      if (ch >= '1' && ch <= '8') {
        file += Number(ch);
      } else if (PIECE_CHARS.has(ch)) {
        pos.board[base + file] = ch;
        file += 1;
      } else {
        throw new Error(`invalid FEN: bad character '${ch}' in rank ${8 - r}`);
      }
    }
    if (file !== 8) {
      throw new Error(`invalid FEN: rank ${8 - r} describes ${file} squares, expected 8`);
    }
  }

  if (turn !== WHITE && turn !== BLACK) {
    throw new Error(`invalid FEN: side to move must be 'w' or 'b', got '${turn}'`);
  }
  pos.turn = turn;

  if (castling !== '-') {
    if (castling.length === 0) throw new Error("invalid FEN: empty castling field");
    const seen = new Set();
    for (const ch of castling) {
      if (!'KQkq'.includes(ch) || seen.has(ch)) {
        throw new Error(`invalid FEN: bad castling rights '${castling}'`);
      }
      seen.add(ch);
    }
    pos.castling =
      (castling.includes('K') ? CASTLE_WK : 0) |
      (castling.includes('Q') ? CASTLE_WQ : 0) |
      (castling.includes('k') ? CASTLE_BK : 0) |
      (castling.includes('q') ? CASTLE_BQ : 0);
  }

  if (ep !== '-') {
    if (!/^[a-h][1-8]$/.test(ep)) throw new Error(`invalid FEN: bad en passant square '${ep}'`);
    pos.ep = sqIndex(ep);
  }

  if (!/^\d+$/.test(halfmove)) throw new Error(`invalid FEN: bad halfmove clock '${halfmove}'`);
  pos.halfmove = Number(halfmove);

  if (!/^\d+$/.test(fullmove)) throw new Error(`invalid FEN: bad fullmove number '${fullmove}'`);
  pos.fullmove = Number(fullmove);

  return pos;
}

export function positionToFen(pos) {
  const rows = [];
  for (let rank = 8; rank >= 1; rank--) {
    const base = 21 + 10 * (rank - 1);
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = pos.board[base + file];
      if (piece === null) {
        empty += 1;
      } else {
        if (empty > 0) {
          row += String(empty);
          empty = 0;
        }
        row += piece;
      }
    }
    if (empty > 0) row += String(empty);
    rows.push(row);
  }

  let castling = '';
  if (pos.castling & CASTLE_WK) castling += 'K';
  if (pos.castling & CASTLE_WQ) castling += 'Q';
  if (pos.castling & CASTLE_BK) castling += 'k';
  if (pos.castling & CASTLE_BQ) castling += 'q';
  if (castling === '') castling = '-';

  const ep = pos.ep === null ? '-' : sqName(pos.ep);
  return `${rows.join('/')} ${pos.turn} ${castling} ${ep} ${pos.halfmove} ${pos.fullmove}`;
}

export function findKing(pos, color) {
  const king = color === WHITE ? 'K' : 'k';
  for (let index = 21; index <= 98; index++) {
    if (pos.board[index] === king) return index;
  }
  return null;
}

// Is the square `sq` attacked by any piece of color `byColor`?
export function isSquareAttacked(pos, sq, byColor) {
  const board = pos.board;
  const knight = byColor === WHITE ? 'N' : 'n';
  const bishop = byColor === WHITE ? 'B' : 'b';
  const rook = byColor === WHITE ? 'R' : 'r';
  const queen = byColor === WHITE ? 'Q' : 'q';
  const king = byColor === WHITE ? 'K' : 'k';

  // Pawns: a white pawn attacks the squares diagonally above it, so `sq` is
  // attacked by a white pawn sitting on sq-9 or sq-11; mirrored for black.
  if (byColor === WHITE) {
    if (board[sq - 9] === 'P' || board[sq - 11] === 'P') return true;
  } else {
    if (board[sq + 9] === 'p' || board[sq + 11] === 'p') return true;
  }

  for (const off of KNIGHT_OFFSETS) if (board[sq + off] === knight) return true;
  for (const off of KING_OFFSETS) if (board[sq + off] === king) return true;

  for (const off of BISHOP_OFFSETS) {
    let t = sq + off;
    while (board[t] !== OFFBOARD) {
      const piece = board[t];
      if (piece !== null) {
        if (piece === bishop || piece === queen) return true;
        break;
      }
      t += off;
    }
  }
  for (const off of ROOK_OFFSETS) {
    let t = sq + off;
    while (board[t] !== OFFBOARD) {
      const piece = board[t];
      if (piece !== null) {
        if (piece === rook || piece === queen) return true;
        break;
      }
      t += off;
    }
  }
  return false;
}

// Is `color` (default: the side to move) in check?
export function isCheck(pos, color = pos.turn) {
  const king = findKing(pos, color);
  return king !== null && isSquareAttacked(pos, king, opposite(color));
}

// Build a move object from the current position. `opts.flags` supplies move
// flags (FLAG_EP / FLAG_CASTLE_K / FLAG_CASTLE_Q / FLAG_DOUBLE); `opts.promotion`
// is one of 'q', 'r', 'b', 'n' for promotions.
export function createMove(pos, from, to, opts = {}) {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    throw new Error('move endpoints must be mailbox square indices');
  }
  const piece = pos.board[from];
  if (piece === null || piece === OFFBOARD) {
    throw new Error(`no piece on square ${from}`);
  }
  const flags = opts.flags ?? FLAG_NORMAL;
  let captured = pos.board[to];
  if (flags & FLAG_EP) captured = piece === 'P' ? 'p' : 'P';
  const promotion = opts.promotion ?? null;
  if (promotion !== null && !PROMOTION_CHARS.has(promotion)) {
    throw new Error(`invalid promotion piece '${promotion}'`);
  }
  return { from, to, piece, captured, promotion, flags };
}

// Apply `move` to `pos` in place and return an undo record for unmakeMove.
// Moves are not validated for legality here; the caller (moves.js) supplies
// only legal moves. The one invariant enforced is side to move.
export function makeMove(pos, move) {
  if (colorOf(move.piece) !== pos.turn) {
    throw new Error(`it is ${pos.turn === WHITE ? "White's" : "Black's"} turn`);
  }
  const us = colorOf(move.piece);
  const undo = {
    move,
    castling: pos.castling,
    ep: pos.ep,
    halfmove: pos.halfmove,
    fullmove: pos.fullmove,
  };

  pos.board[move.from] = null;
  let placed = move.piece;
  if (move.promotion !== null) {
    placed = us === WHITE ? move.promotion.toUpperCase() : move.promotion;
  }
  pos.board[move.to] = placed;

  if (move.flags & FLAG_EP) {
    const capSq = us === WHITE ? move.to - 10 : move.to + 10;
    pos.board[capSq] = null;
  } else if (move.flags & FLAG_CASTLE_K) {
    if (us === WHITE) {
      pos.board[28] = null; // h1
      pos.board[26] = 'R'; // f1
    } else {
      pos.board[98] = null; // h8
      pos.board[96] = 'r'; // f8
    }
  } else if (move.flags & FLAG_CASTLE_Q) {
    if (us === WHITE) {
      pos.board[21] = null; // a1
      pos.board[24] = 'R'; // d1
    } else {
      pos.board[91] = null; // a8
      pos.board[94] = 'r'; // d8
    }
  }

  pos.castling &= castleKeep[move.from] & castleKeep[move.to];
  pos.ep = move.flags & FLAG_DOUBLE ? (us === WHITE ? move.to - 10 : move.to + 10) : null;
  const isPawnMove = move.piece === 'P' || move.piece === 'p';
  pos.halfmove = isPawnMove || move.captured !== null ? 0 : pos.halfmove + 1;
  if (us === BLACK) pos.fullmove += 1;
  pos.turn = opposite(us);

  return undo;
}

// Restore the position to the exact state before makeMove returned `undo`.
export function unmakeMove(pos, undo) {
  const { move } = undo;
  const us = colorOf(move.piece);

  pos.board[move.from] = move.piece;
  pos.board[move.to] = null;

  if (move.flags & FLAG_EP) {
    const capSq = us === WHITE ? move.to - 10 : move.to + 10;
    pos.board[capSq] = move.captured;
  } else {
    if (move.captured !== null) pos.board[move.to] = move.captured;
    if (move.flags & FLAG_CASTLE_K) {
      if (us === WHITE) {
        pos.board[26] = null; // f1
        pos.board[28] = 'R'; // h1
      } else {
        pos.board[96] = null; // f8
        pos.board[98] = 'r'; // h8
      }
    } else if (move.flags & FLAG_CASTLE_Q) {
      if (us === WHITE) {
        pos.board[24] = null; // d1
        pos.board[21] = 'R'; // a1
      } else {
        pos.board[94] = null; // d8
        pos.board[91] = 'r'; // a8
      }
    }
  }

  pos.castling = undo.castling;
  pos.ep = undo.ep;
  pos.halfmove = undo.halfmove;
  pos.fullmove = undo.fullmove;
  pos.turn = us;
}
