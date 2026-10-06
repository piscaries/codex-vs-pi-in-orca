const FILES = "abcdefgh";
const PIECES = new Set("prnbqkPRNBQK");
const PROMOTIONS = ["q", "r", "b", "n"];

export const MOVE_FLAGS = Object.freeze({
  CAPTURE: 1,
  DOUBLE_PAWN: 2,
  EN_PASSANT: 4,
  CASTLE_KING: 8,
  CASTLE_QUEEN: 16,
  PROMOTION: 32,
});

function typeError(message) {
  throw new TypeError(message);
}

export function squareToIndex(square) {
  if (typeof square !== "string" || !/^[a-h][1-8]$/.test(square)) {
    typeError(`Invalid square: ${String(square)}`);
  }
  return (8 - Number(square[1])) * 8 + FILES.indexOf(square[0]);
}

export function indexToSquare(index) {
  if (!Number.isInteger(index) || index < 0 || index >= 64) {
    typeError(`Invalid board index: ${String(index)}`);
  }
  return `${FILES[index % 8]}${8 - Math.floor(index / 8)}`;
}

function pieceColor(piece) {
  if (typeof piece !== "string" || !PIECES.has(piece)) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

function pieceType(piece) {
  return piece?.toLowerCase() ?? null;
}

function clonePosition(position) {
  return {
    board: [...position.board],
    turn: position.turn,
    castling: new Set(position.castling),
    epSquare: position.epSquare,
    halfmove: position.halfmove,
    fullmove: position.fullmove,
  };
}

/** Parse all six FEN fields into a fresh position value. */
export function parseFen(fen) {
  if (typeof fen !== "string") typeError("FEN must be a string");
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) typeError("FEN must contain exactly six fields");

  const [placement, turn, castlingField, epField, halfmoveField, fullmoveField] = fields;
  const ranks = placement.split("/");
  if (ranks.length !== 8) typeError("FEN placement must contain eight ranks");

  const board = [];
  for (const rank of ranks) {
    if (/\d\d/.test(rank)) typeError("Adjacent FEN empty-square digits are invalid");
    let count = 0;
    for (const token of rank) {
      if (/^[1-8]$/.test(token)) {
        const empty = Number(token);
        count += empty;
        for (let index = 0; index < empty; index += 1) board.push(null);
      } else if (PIECES.has(token)) {
        count += 1;
        board.push(token);
      } else {
        typeError(`Invalid FEN placement token: ${token}`);
      }
    }
    if (count !== 8) typeError("Every FEN rank must describe eight squares");
  }

  if (turn !== "w" && turn !== "b") typeError("FEN turn must be 'w' or 'b'");

  const castling = new Set();
  if (castlingField !== "-") {
    if (!/^[KQkq]+$/.test(castlingField)) typeError("Invalid FEN castling field");
    for (const right of castlingField) {
      if (castling.has(right)) typeError("Duplicate FEN castling right");
      castling.add(right);
    }
  }

  let epSquare = null;
  if (epField !== "-") {
    epSquare = squareToIndex(epField);
    const expectedRank = turn === "w" ? "6" : "3";
    if (epField[1] !== expectedRank) typeError("Invalid FEN en-passant rank");
  }

  if (!/^\d+$/.test(halfmoveField)) typeError("Invalid FEN halfmove clock");
  if (!/^[1-9]\d*$/.test(fullmoveField)) typeError("Invalid FEN fullmove number");
  const halfmove = Number(halfmoveField);
  const fullmove = Number(fullmoveField);
  if (!Number.isSafeInteger(halfmove) || !Number.isSafeInteger(fullmove)) {
    typeError("FEN move counters are too large");
  }

  if (board.filter((piece) => piece === "K").length !== 1
      || board.filter((piece) => piece === "k").length !== 1) {
    typeError("FEN must contain exactly one king of each color");
  }
  for (const color of ["w", "b"]) {
    const pieces = board.filter((piece) => pieceColor(piece) === color);
    if (pieces.length > 16 || pieces.filter((piece) => pieceType(piece) === "p").length > 8) {
      typeError("FEN contains too many pieces for one color");
    }
  }
  for (let file = 0; file < 8; file += 1) {
    if (pieceType(board[file]) === "p" || pieceType(board[56 + file]) === "p") {
      typeError("Pawns cannot occupy the first or eighth rank");
    }
  }

  if (epSquare !== null) {
    const pawnSquare = epSquare + (turn === "w" ? 8 : -8);
    const pawn = turn === "w" ? "p" : "P";
    if (board[epSquare] !== null || board[pawnSquare] !== pawn) {
      typeError("FEN en-passant target has no double-moved pawn");
    }
  }

  const position = { board, turn, castling, epSquare, halfmove, fullmove };
  const previousMover = turn === "w" ? "b" : "w";
  const previousKing = board.indexOf(previousMover === "w" ? "K" : "k");
  if (isSquareAttacked(position, previousKing, turn)) {
    typeError("FEN leaves the side that just moved in check");
  }
  return position;
}

export function positionToFen(position) {
  const ranks = [];
  for (let rank = 0; rank < 8; rank += 1) {
    let encoded = "";
    let empty = 0;
    for (let file = 0; file < 8; file += 1) {
      const piece = position.board[rank * 8 + file];
      if (piece === null) {
        empty += 1;
      } else {
        if (empty > 0) encoded += String(empty);
        empty = 0;
        encoded += piece;
      }
    }
    if (empty > 0) encoded += String(empty);
    ranks.push(encoded);
  }
  const castling = "KQkq".split("").filter((right) => position.castling.has(right)).join("") || "-";
  const ep = position.epSquare === null ? "-" : indexToSquare(position.epSquare);
  return `${ranks.join("/")} ${position.turn} ${castling} ${ep} ${position.halfmove} ${position.fullmove}`;
}

export function parseUci(uci) {
  if (typeof uci !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
    typeError(`Invalid UCI move: ${String(uci)}`);
  }
  return {
    from: squareToIndex(uci.slice(0, 2)),
    to: squareToIndex(uci.slice(2, 4)),
    promotion: uci[4] ?? null,
  };
}

export function moveToUci(move) {
  return `${indexToSquare(move.from)}${indexToSquare(move.to)}${move.promotion ?? ""}`;
}

function addMove(moves, from, to, flags = 0, promotion = null) {
  moves.push({ from, to, promotion, flags });
}

function addPawnMove(moves, from, to, flags, promotionRank) {
  if (Math.floor(to / 8) === promotionRank) {
    for (const promotion of PROMOTIONS) {
      addMove(moves, from, to, flags | MOVE_FLAGS.PROMOTION, promotion);
    }
  } else {
    addMove(moves, from, to, flags);
  }
}

function generatePawnMoves(position, from, color, moves) {
  const board = position.board;
  const rank = Math.floor(from / 8);
  const file = from % 8;
  const step = color === "w" ? -8 : 8;
  const startRank = color === "w" ? 6 : 1;
  const promotionRank = color === "w" ? 0 : 7;
  const one = from + step;

  if (one >= 0 && one < 64 && board[one] === null) {
    addPawnMove(moves, from, one, 0, promotionRank);
    const two = from + 2 * step;
    if (rank === startRank && board[two] === null) {
      addMove(moves, from, two, MOVE_FLAGS.DOUBLE_PAWN);
    }
  }

  for (const fileOffset of [-1, 1]) {
    const targetFile = file + fileOffset;
    if (targetFile < 0 || targetFile > 7) continue;
    const to = one + fileOffset;
    if (to < 0 || to >= 64) continue;
    const target = board[to];
    if (target !== null && pieceColor(target) !== color && pieceType(target) !== "k") {
      addPawnMove(moves, from, to, MOVE_FLAGS.CAPTURE, promotionRank);
    } else if (to === position.epSquare) {
      const capturedSquare = to - step;
      const expectedPawn = color === "w" ? "p" : "P";
      if (board[capturedSquare] === expectedPawn) {
        addMove(moves, from, to, MOVE_FLAGS.CAPTURE | MOVE_FLAGS.EN_PASSANT);
      }
    }
  }
}

function generateStepMoves(position, from, color, moves, offsets) {
  const fromRank = Math.floor(from / 8);
  const fromFile = from % 8;
  for (const [rankOffset, fileOffset] of offsets) {
    const rank = fromRank + rankOffset;
    const file = fromFile + fileOffset;
    if (rank < 0 || rank > 7 || file < 0 || file > 7) continue;
    const to = rank * 8 + file;
    const target = position.board[to];
    if (target === null) addMove(moves, from, to);
    else if (pieceColor(target) !== color && pieceType(target) !== "k") {
      addMove(moves, from, to, MOVE_FLAGS.CAPTURE);
    }
  }
}

function generateSlidingMoves(position, from, color, moves, directions) {
  const fromRank = Math.floor(from / 8);
  const fromFile = from % 8;
  for (const [rankStep, fileStep] of directions) {
    let rank = fromRank + rankStep;
    let file = fromFile + fileStep;
    while (rank >= 0 && rank <= 7 && file >= 0 && file <= 7) {
      const to = rank * 8 + file;
      const target = position.board[to];
      if (target === null) {
        addMove(moves, from, to);
      } else {
        if (pieceColor(target) !== color && pieceType(target) !== "k") {
          addMove(moves, from, to, MOVE_FLAGS.CAPTURE);
        }
        break;
      }
      rank += rankStep;
      file += fileStep;
    }
  }
}

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
];
const BISHOP_DIRECTIONS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRECTIONS = [[-1, 0], [0, -1], [0, 1], [1, 0]];

export function isSquareAttacked(position, square, byColor) {
  const board = position.board;
  const rank = Math.floor(square / 8);
  const file = square % 8;

  const pawnSourceRank = rank + (byColor === "w" ? 1 : -1);
  if (pawnSourceRank >= 0 && pawnSourceRank <= 7) {
    const pawn = byColor === "w" ? "P" : "p";
    for (const fileOffset of [-1, 1]) {
      const sourceFile = file + fileOffset;
      if (sourceFile >= 0 && sourceFile <= 7
          && board[pawnSourceRank * 8 + sourceFile] === pawn) return true;
    }
  }

  const knight = byColor === "w" ? "N" : "n";
  for (const [rankOffset, fileOffset] of KNIGHT_OFFSETS) {
    const sourceRank = rank + rankOffset;
    const sourceFile = file + fileOffset;
    if (sourceRank >= 0 && sourceRank <= 7 && sourceFile >= 0 && sourceFile <= 7
        && board[sourceRank * 8 + sourceFile] === knight) return true;
  }

  const king = byColor === "w" ? "K" : "k";
  for (const [rankOffset, fileOffset] of KING_OFFSETS) {
    const sourceRank = rank + rankOffset;
    const sourceFile = file + fileOffset;
    if (sourceRank >= 0 && sourceRank <= 7 && sourceFile >= 0 && sourceFile <= 7
        && board[sourceRank * 8 + sourceFile] === king) return true;
  }

  for (const [directions, types] of [
    [BISHOP_DIRECTIONS, new Set(["b", "q"])],
    [ROOK_DIRECTIONS, new Set(["r", "q"])],
  ]) {
    for (const [rankStep, fileStep] of directions) {
      let sourceRank = rank + rankStep;
      let sourceFile = file + fileStep;
      while (sourceRank >= 0 && sourceRank <= 7 && sourceFile >= 0 && sourceFile <= 7) {
        const piece = board[sourceRank * 8 + sourceFile];
        if (piece !== null) {
          if (pieceColor(piece) === byColor && types.has(pieceType(piece))) return true;
          break;
        }
        sourceRank += rankStep;
        sourceFile += fileStep;
      }
    }
  }
  return false;
}

export function isInCheck(position, color = position.turn) {
  const king = color === "w" ? "K" : "k";
  const square = position.board.indexOf(king);
  if (square === -1) typeError(`Position has no ${color} king`);
  return isSquareAttacked(position, square, color === "w" ? "b" : "w");
}

function addCastlingMoves(position, color, moves) {
  const board = position.board;
  const enemy = color === "w" ? "b" : "w";
  const home = color === "w" ? 7 : 0;
  const kingSquare = home * 8 + 4;
  const king = color === "w" ? "K" : "k";
  const rook = color === "w" ? "R" : "r";
  if (board[kingSquare] !== king || isSquareAttacked(position, kingSquare, enemy)) return;

  const kingRight = color === "w" ? "K" : "k";
  if (position.castling.has(kingRight)
      && board[home * 8 + 7] === rook
      && board[home * 8 + 5] === null
      && board[home * 8 + 6] === null
      && !isSquareAttacked(position, home * 8 + 5, enemy)
      && !isSquareAttacked(position, home * 8 + 6, enemy)) {
    addMove(moves, kingSquare, home * 8 + 6, MOVE_FLAGS.CASTLE_KING);
  }

  const queenRight = color === "w" ? "Q" : "q";
  if (position.castling.has(queenRight)
      && board[home * 8] === rook
      && board[home * 8 + 1] === null
      && board[home * 8 + 2] === null
      && board[home * 8 + 3] === null
      && !isSquareAttacked(position, home * 8 + 3, enemy)
      && !isSquareAttacked(position, home * 8 + 2, enemy)) {
    addMove(moves, kingSquare, home * 8 + 2, MOVE_FLAGS.CASTLE_QUEEN);
  }
}

function generatePseudoMoves(position) {
  const moves = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = position.board[from];
    if (pieceColor(piece) !== position.turn) continue;
    const color = position.turn;
    switch (pieceType(piece)) {
      case "p": generatePawnMoves(position, from, color, moves); break;
      case "n": generateStepMoves(position, from, color, moves, KNIGHT_OFFSETS); break;
      case "b": generateSlidingMoves(position, from, color, moves, BISHOP_DIRECTIONS); break;
      case "r": generateSlidingMoves(position, from, color, moves, ROOK_DIRECTIONS); break;
      case "q": generateSlidingMoves(position, from, color, moves, [...BISHOP_DIRECTIONS, ...ROOK_DIRECTIONS]); break;
      case "k": generateStepMoves(position, from, color, moves, KING_OFFSETS); break;
      default: typeError(`Unknown piece at ${indexToSquare(from)}`);
    }
  }
  addCastlingMoves(position, position.turn, moves);
  return moves;
}

function revokeRookRight(castling, square) {
  if (square === squareToIndex("a1")) castling.delete("Q");
  else if (square === squareToIndex("h1")) castling.delete("K");
  else if (square === squareToIndex("a8")) castling.delete("q");
  else if (square === squareToIndex("h8")) castling.delete("k");
}

/** Apply a generated move without rechecking membership in the legal move list. */
export function makeMove(position, move) {
  const next = clonePosition(position);
  const piece = next.board[move.from];
  const color = pieceColor(piece);
  const target = next.board[move.to];
  next.board[move.from] = null;

  if (move.flags & MOVE_FLAGS.EN_PASSANT) {
    const capturedSquare = move.to + (color === "w" ? 8 : -8);
    next.board[capturedSquare] = null;
  }

  let placed = piece;
  if (move.flags & MOVE_FLAGS.PROMOTION) {
    placed = color === "w" ? move.promotion.toUpperCase() : move.promotion;
  }
  next.board[move.to] = placed;

  if (move.flags & MOVE_FLAGS.CASTLE_KING) {
    const rookFrom = color === "w" ? squareToIndex("h1") : squareToIndex("h8");
    const rookTo = move.to - 1;
    next.board[rookTo] = next.board[rookFrom];
    next.board[rookFrom] = null;
  } else if (move.flags & MOVE_FLAGS.CASTLE_QUEEN) {
    const rookFrom = color === "w" ? squareToIndex("a1") : squareToIndex("a8");
    const rookTo = move.to + 1;
    next.board[rookTo] = next.board[rookFrom];
    next.board[rookFrom] = null;
  }

  if (pieceType(piece) === "k") {
    next.castling.delete(color === "w" ? "K" : "k");
    next.castling.delete(color === "w" ? "Q" : "q");
  }
  if (pieceType(piece) === "r") revokeRookRight(next.castling, move.from);
  if (pieceType(target) === "r") revokeRookRight(next.castling, move.to);

  next.epSquare = null;
  if (move.flags & MOVE_FLAGS.DOUBLE_PAWN) next.epSquare = (move.from + move.to) / 2;
  next.halfmove = pieceType(piece) === "p" || (move.flags & MOVE_FLAGS.CAPTURE)
    ? 0
    : position.halfmove + 1;
  next.fullmove = position.fullmove + (color === "b" ? 1 : 0);
  next.turn = color === "w" ? "b" : "w";
  return next;
}

export function generateLegalMoves(position) {
  const color = position.turn;
  return generatePseudoMoves(position).filter((move) => !isInCheck(makeMove(position, move), color));
}

export function legalMovesFromFen(fen) {
  return generateLegalMoves(parseFen(fen)).map(moveToUci);
}

export function applyUciMove(position, uci) {
  const parsed = parseUci(uci);
  const move = generateLegalMoves(position).find((candidate) => (
    candidate.from === parsed.from
    && candidate.to === parsed.to
    && candidate.promotion === parsed.promotion
  ));
  if (!move) throw new Error(`Illegal move: ${uci}`);
  return makeMove(position, move);
}

export function perftPosition(position, depth) {
  if (!Number.isInteger(depth) || depth < 0) typeError("Perft depth must be a non-negative integer");
  if (depth === 0) return 1;
  const moves = generateLegalMoves(position);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) nodes += perftPosition(makeMove(position, move), depth - 1);
  return nodes;
}

export function isInsufficientMaterial(position) {
  const nonKings = [];
  for (let square = 0; square < 64; square += 1) {
    const piece = position.board[square];
    if (piece !== null && pieceType(piece) !== "k") nonKings.push({ piece, square });
  }
  if (nonKings.length === 0) return true;
  if (nonKings.some(({ piece }) => ["p", "r", "q"].includes(pieceType(piece)))) return false;
  if (nonKings.length === 1) return true;
  if (nonKings.every(({ piece }) => pieceType(piece) === "b")) {
    const colors = new Set(nonKings.map(({ square }) => (
      (Math.floor(square / 8) + square % 8) % 2
    )));
    return colors.size === 1;
  }
  return false;
}

export function gameStatusForPosition(position) {
  const moves = generateLegalMoves(position);
  if (moves.length === 0) return isInCheck(position) ? "checkmate" : "stalemate";
  if (position.halfmove >= 100 || isInsufficientMaterial(position)) return "draw";
  return "ongoing";
}

/** Position identity for repetition; clocks and unusable en-passant targets are omitted. */
export function repetitionKey(position) {
  const fields = positionToFen(position).split(" ");
  const usableEp = position.epSquare !== null
    && generateLegalMoves(position).some((move) => move.flags & MOVE_FLAGS.EN_PASSANT);
  return `${fields[0]} ${fields[1]} ${fields[2]} ${usableEp ? fields[3] : "-"}`;
}
