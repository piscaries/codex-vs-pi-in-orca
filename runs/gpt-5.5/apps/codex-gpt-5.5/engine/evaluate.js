import {
  BLACK,
  WHITE,
  fileOf,
  isInCheck,
  isSquareAttacked,
  otherColor,
  pieceColor,
  pieceType,
  rankOf,
} from "./board.js";
import { hasInsufficientMaterial } from "./status.js";

export const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const CENTER_SQUARES = new Set([27, 28, 35, 36]);

function signFor(piece, color) {
  return pieceColor(piece) === color ? 1 : -1;
}

function pawnProgress(piece, index) {
  const rank = rankOf(index);
  return pieceColor(piece) === WHITE ? rank : 7 - rank;
}

function pieceSquareBonus(piece, index) {
  const type = pieceType(piece);
  const file = fileOf(index);
  const rank = rankOf(index);
  const edgeDistance = Math.min(file, 7 - file, rank, 7 - rank);

  if (type === "p") return pawnProgress(piece, index) * 5;
  if (type === "n" || type === "b") return edgeDistance * 8 + (CENTER_SQUARES.has(index) ? 12 : 0);
  if (type === "r") return rank === (pieceColor(piece) === WHITE ? 6 : 1) ? 12 : 0;
  if (type === "q") return edgeDistance * 2;
  return 0;
}

export function materialBalance(position, color) {
  let score = 0;
  for (const piece of position.board) {
    if (!piece) continue;
    score += signFor(piece, color) * PIECE_VALUES[pieceType(piece)];
  }
  return score;
}

export function findHangingPieces(position, color) {
  const enemy = otherColor(color);
  const hanging = [];
  for (let index = 0; index < position.board.length; index += 1) {
    const piece = position.board[index];
    if (!piece || pieceColor(piece) !== color || pieceType(piece) === "k") continue;
    const attacked = isSquareAttacked(position, index, enemy);
    const defended = isSquareAttacked(position, index, color);
    if (attacked && !defended) {
      hanging.push({ index, piece, value: PIECE_VALUES[pieceType(piece)] });
    }
  }
  return hanging;
}

export function evaluatePosition(position, color = position.turn) {
  if (position.halfmove >= 100 || hasInsufficientMaterial(position)) {
    return 0;
  }

  let score = materialBalance(position, color);
  for (let index = 0; index < position.board.length; index += 1) {
    const piece = position.board[index];
    if (!piece) continue;
    score += signFor(piece, color) * pieceSquareBonus(piece, index);
  }

  for (const side of [WHITE, BLACK]) {
    const hangingPenalty = findHangingPieces(position, side).reduce((total, item) => total + item.value / 4, 0);
    score += side === color ? -hangingPenalty : hangingPenalty;
  }

  if (isInCheck(position, color)) score -= 35;
  if (isInCheck(position, otherColor(color))) score += 35;

  return Math.round(score);
}
