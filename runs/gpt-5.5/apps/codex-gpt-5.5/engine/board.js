export const FILES = "abcdefgh";
export const RANKS = "12345678";
export const WHITE = "w";
export const BLACK = "b";

export function otherColor(color) {
  return color === WHITE ? BLACK : WHITE;
}

export function pieceColor(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? WHITE : BLACK;
}

export function pieceType(piece) {
  return piece.toLowerCase();
}

export function squareToIndex(square) {
  if (!/^[a-h][1-8]$/.test(square)) {
    throw new Error(`Invalid square: ${square}`);
  }
  return FILES.indexOf(square[0]) + (Number(square[1]) - 1) * 8;
}

export function indexToSquare(index) {
  if (!Number.isInteger(index) || index < 0 || index >= 64) {
    throw new Error(`Invalid square index: ${index}`);
  }
  return FILES[index % 8] + RANKS[Math.floor(index / 8)];
}

export function fileOf(index) {
  return index % 8;
}

export function rankOf(index) {
  return Math.floor(index / 8);
}

export function onBoard(file, rank) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

export function clonePosition(position) {
  return {
    board: position.board.slice(),
    turn: position.turn,
    castling: { ...position.castling },
    ep: position.ep,
    halfmove: position.halfmove,
    fullmove: position.fullmove,
  };
}

export function moveToUci(move) {
  return indexToSquare(move.from) + indexToSquare(move.to) + (move.promotion ?? "");
}

export function findKing(position, color) {
  const king = color === WHITE ? "K" : "k";
  return position.board.findIndex((piece) => piece === king);
}

function rayAttacks(position, square, byColor, directions, attackers) {
  const startFile = fileOf(square);
  const startRank = rankOf(square);
  for (const [df, dr] of directions) {
    let file = startFile + df;
    let rank = startRank + dr;
    while (onBoard(file, rank)) {
      const piece = position.board[file + rank * 8];
      if (piece) {
        if (pieceColor(piece) === byColor && attackers.includes(pieceType(piece))) {
          return true;
        }
        break;
      }
      file += df;
      rank += dr;
    }
  }
  return false;
}

export function isSquareAttacked(position, square, byColor) {
  const targetFile = fileOf(square);
  const targetRank = rankOf(square);

  const pawnRank = targetRank + (byColor === WHITE ? -1 : 1);
  for (const df of [-1, 1]) {
    const file = targetFile + df;
    if (onBoard(file, pawnRank)) {
      const piece = position.board[file + pawnRank * 8];
      if (piece === (byColor === WHITE ? "P" : "p")) {
        return true;
      }
    }
  }

  for (const [df, dr] of [
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ]) {
    const file = targetFile + df;
    const rank = targetRank + dr;
    if (onBoard(file, rank)) {
      const piece = position.board[file + rank * 8];
      if (piece === (byColor === WHITE ? "N" : "n")) {
        return true;
      }
    }
  }

  if (
    rayAttacks(
      position,
      square,
      byColor,
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ],
      ["r", "q"],
    )
  ) {
    return true;
  }

  if (
    rayAttacks(
      position,
      square,
      byColor,
      [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ],
      ["b", "q"],
    )
  ) {
    return true;
  }

  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (df === 0 && dr === 0) continue;
      const file = targetFile + df;
      const rank = targetRank + dr;
      if (onBoard(file, rank)) {
        const piece = position.board[file + rank * 8];
        if (piece === (byColor === WHITE ? "K" : "k")) {
          return true;
        }
      }
    }
  }

  return false;
}

export function isInCheck(position, color = position.turn) {
  const king = findKing(position, color);
  if (king === -1) {
    throw new Error(`Invalid FEN: missing ${color === WHITE ? "white" : "black"} king`);
  }
  return isSquareAttacked(position, king, otherColor(color));
}
