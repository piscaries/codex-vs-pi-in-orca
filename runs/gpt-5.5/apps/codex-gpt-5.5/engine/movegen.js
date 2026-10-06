import {
  BLACK,
  WHITE,
  clonePosition,
  fileOf,
  indexToSquare,
  isInCheck,
  isSquareAttacked,
  moveToUci,
  onBoard,
  otherColor,
  pieceColor,
  pieceType,
  rankOf,
  squareToIndex,
} from "./board.js";

const PROMOTIONS = ["q", "r", "b", "n"];

function addMove(moves, from, to, extra = {}) {
  moves.push({ from, to, ...extra });
}

function addPromotionMoves(moves, from, to, extra = {}) {
  for (const promotion of PROMOTIONS) {
    addMove(moves, from, to, { ...extra, promotion });
  }
}

function addPawnMoves(position, moves, from, piece) {
  const color = pieceColor(piece);
  const direction = color === WHITE ? 1 : -1;
  const startRank = color === WHITE ? 1 : 6;
  const promotionRank = color === WHITE ? 7 : 0;
  const file = fileOf(from);
  const rank = rankOf(from);

  const oneRank = rank + direction;
  if (onBoard(file, oneRank)) {
    const one = file + oneRank * 8;
    if (!position.board[one]) {
      if (oneRank === promotionRank) {
        addPromotionMoves(moves, from, one);
      } else {
        addMove(moves, from, one);
        if (rank === startRank) {
          const two = file + (rank + direction * 2) * 8;
          if (!position.board[two]) {
            addMove(moves, from, two, { doublePawn: true });
          }
        }
      }
    }
  }

  for (const df of [-1, 1]) {
    const targetFile = file + df;
    const targetRank = rank + direction;
    if (!onBoard(targetFile, targetRank)) continue;
    const to = targetFile + targetRank * 8;
    const target = position.board[to];
    if (target && pieceColor(target) === otherColor(color)) {
      if (targetRank === promotionRank) {
        addPromotionMoves(moves, from, to, { capture: true });
      } else {
        addMove(moves, from, to, { capture: true });
      }
    } else if (position.ep === to) {
      const capturedPawnSquare = targetFile + rank * 8;
      const capturedPawn = position.board[capturedPawnSquare];
      if (capturedPawn === (color === WHITE ? "p" : "P")) {
        addMove(moves, from, to, { ep: true, capture: true });
      }
    }
  }
}

function addLeaperMoves(position, moves, from, offsets) {
  const piece = position.board[from];
  const color = pieceColor(piece);
  const file = fileOf(from);
  const rank = rankOf(from);
  for (const [df, dr] of offsets) {
    const toFile = file + df;
    const toRank = rank + dr;
    if (!onBoard(toFile, toRank)) continue;
    const to = toFile + toRank * 8;
    const target = position.board[to];
    if (!target || pieceColor(target) !== color) {
      addMove(moves, from, to, { capture: Boolean(target) });
    }
  }
}

function addSliderMoves(position, moves, from, directions) {
  const piece = position.board[from];
  const color = pieceColor(piece);
  const startFile = fileOf(from);
  const startRank = rankOf(from);
  for (const [df, dr] of directions) {
    let file = startFile + df;
    let rank = startRank + dr;
    while (onBoard(file, rank)) {
      const to = file + rank * 8;
      const target = position.board[to];
      if (!target) {
        addMove(moves, from, to);
      } else {
        if (pieceColor(target) !== color) {
          addMove(moves, from, to, { capture: true });
        }
        break;
      }
      file += df;
      rank += dr;
    }
  }
}

function addCastlingMoves(position, moves, from, piece) {
  const color = pieceColor(piece);
  if (isInCheck(position, color)) return;
  const enemy = otherColor(color);
  if (color === WHITE && from === squareToIndex("e1")) {
    if (
      position.castling.K &&
      position.board[squareToIndex("h1")] === "R" &&
      !position.board[squareToIndex("f1")] &&
      !position.board[squareToIndex("g1")] &&
      !isSquareAttacked(position, squareToIndex("f1"), enemy) &&
      !isSquareAttacked(position, squareToIndex("g1"), enemy)
    ) {
      addMove(moves, from, squareToIndex("g1"), { castle: "K" });
    }
    if (
      position.castling.Q &&
      position.board[squareToIndex("a1")] === "R" &&
      !position.board[squareToIndex("d1")] &&
      !position.board[squareToIndex("c1")] &&
      !position.board[squareToIndex("b1")] &&
      !isSquareAttacked(position, squareToIndex("d1"), enemy) &&
      !isSquareAttacked(position, squareToIndex("c1"), enemy)
    ) {
      addMove(moves, from, squareToIndex("c1"), { castle: "Q" });
    }
  }
  if (color === BLACK && from === squareToIndex("e8")) {
    if (
      position.castling.k &&
      position.board[squareToIndex("h8")] === "r" &&
      !position.board[squareToIndex("f8")] &&
      !position.board[squareToIndex("g8")] &&
      !isSquareAttacked(position, squareToIndex("f8"), enemy) &&
      !isSquareAttacked(position, squareToIndex("g8"), enemy)
    ) {
      addMove(moves, from, squareToIndex("g8"), { castle: "k" });
    }
    if (
      position.castling.q &&
      position.board[squareToIndex("a8")] === "r" &&
      !position.board[squareToIndex("d8")] &&
      !position.board[squareToIndex("c8")] &&
      !position.board[squareToIndex("b8")] &&
      !isSquareAttacked(position, squareToIndex("d8"), enemy) &&
      !isSquareAttacked(position, squareToIndex("c8"), enemy)
    ) {
      addMove(moves, from, squareToIndex("c8"), { castle: "q" });
    }
  }
}

export function generatePseudoMoves(position) {
  const moves = [];
  for (let from = 0; from < 64; from += 1) {
    const piece = position.board[from];
    if (!piece || pieceColor(piece) !== position.turn) continue;

    switch (pieceType(piece)) {
      case "p":
        addPawnMoves(position, moves, from, piece);
        break;
      case "n":
        addLeaperMoves(position, moves, from, [
          [1, 2],
          [2, 1],
          [2, -1],
          [1, -2],
          [-1, -2],
          [-2, -1],
          [-2, 1],
          [-1, 2],
        ]);
        break;
      case "b":
        addSliderMoves(position, moves, from, [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]);
        break;
      case "r":
        addSliderMoves(position, moves, from, [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]);
        break;
      case "q":
        addSliderMoves(position, moves, from, [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]);
        break;
      case "k":
        addLeaperMoves(position, moves, from, [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]);
        addCastlingMoves(position, moves, from, piece);
        break;
      default:
        throw new Error(`Invalid piece on board: ${piece}`);
    }
  }
  return moves;
}

function removeCastlingRightForSquare(position, square) {
  switch (square) {
    case 0:
      position.castling.Q = false;
      break;
    case 7:
      position.castling.K = false;
      break;
    case 56:
      position.castling.q = false;
      break;
    case 63:
      position.castling.k = false;
      break;
    default:
      break;
  }
}

export function applyMoveObject(position, move) {
  const next = clonePosition(position);
  const piece = next.board[move.from];
  const color = pieceColor(piece);
  const captured = move.ep ? next.board[move.to + (color === WHITE ? -8 : 8)] : next.board[move.to];

  next.board[move.from] = null;
  if (move.ep) {
    next.board[move.to + (color === WHITE ? -8 : 8)] = null;
  }

  let placed = piece;
  if (move.promotion) {
    placed = color === WHITE ? move.promotion.toUpperCase() : move.promotion;
  }
  next.board[move.to] = placed;

  if (move.castle === "K") {
    next.board[squareToIndex("h1")] = null;
    next.board[squareToIndex("f1")] = "R";
  } else if (move.castle === "Q") {
    next.board[squareToIndex("a1")] = null;
    next.board[squareToIndex("d1")] = "R";
  } else if (move.castle === "k") {
    next.board[squareToIndex("h8")] = null;
    next.board[squareToIndex("f8")] = "r";
  } else if (move.castle === "q") {
    next.board[squareToIndex("a8")] = null;
    next.board[squareToIndex("d8")] = "r";
  }

  if (pieceType(piece) === "k") {
    if (color === WHITE) {
      next.castling.K = false;
      next.castling.Q = false;
    } else {
      next.castling.k = false;
      next.castling.q = false;
    }
  }
  if (pieceType(piece) === "r") {
    removeCastlingRightForSquare(next, move.from);
  }
  if (captured && pieceType(captured) === "r") {
    removeCastlingRightForSquare(next, move.to);
  }

  next.ep = null;
  if (move.doublePawn) {
    next.ep = move.from + (color === WHITE ? 8 : -8);
  }
  next.halfmove = pieceType(piece) === "p" || captured ? 0 : next.halfmove + 1;
  if (color === BLACK) {
    next.fullmove += 1;
  }
  next.turn = otherColor(color);
  return next;
}

export function generateLegalMoveObjects(position) {
  return generatePseudoMoves(position).filter((move) => {
    const next = applyMoveObject(position, move);
    return !isInCheck(next, position.turn);
  });
}

export function findLegalMove(position, uci) {
  if (typeof uci !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
    return null;
  }
  return generateLegalMoveObjects(position).find((move) => moveToUci(move) === uci) ?? null;
}

export function assertLegalMove(position, uci) {
  const move = findLegalMove(position, uci);
  if (!move) {
    throw new Error(`Illegal move: ${uci}`);
  }
  return move;
}

export function legalMoveUcis(position) {
  return generateLegalMoveObjects(position).map(moveToUci);
}

export { indexToSquare };
