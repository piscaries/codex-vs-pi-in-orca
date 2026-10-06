import { isInCheck, pieceType } from "./board.js";
import { generateLegalMoveObjects } from "./movegen.js";

function isLightSquare(index) {
  const file = index % 8;
  const rank = Math.floor(index / 8);
  return (file + rank) % 2 === 0;
}

export function hasInsufficientMaterial(position) {
  const pieces = position.board
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => piece && pieceType(piece) !== "k");

  if (pieces.length === 0) return true;
  if (pieces.some(({ piece }) => ["p", "r", "q"].includes(pieceType(piece)))) {
    return false;
  }
  if (pieces.length === 1) {
    return ["b", "n"].includes(pieceType(pieces[0].piece));
  }
  if (pieces.every(({ piece }) => pieceType(piece) === "b")) {
    const colors = new Set(pieces.map(({ index }) => (isLightSquare(index) ? "light" : "dark")));
    return colors.size === 1;
  }

  return false;
}

export function gameStatusForPosition(position) {
  if (position.halfmove >= 100 || hasInsufficientMaterial(position)) {
    return "draw";
  }

  const legalMoves = generateLegalMoveObjects(position);
  if (legalMoves.length > 0) {
    return "ongoing";
  }
  return isInCheck(position, position.turn) ? "checkmate" : "stalemate";
}
