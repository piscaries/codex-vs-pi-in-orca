import {
  BLACK,
  FILES,
  WHITE,
  indexToSquare,
  isInCheck,
  otherColor,
  pieceColor,
  pieceType,
  squareToIndex,
} from "./board.js";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const PIECES = new Set("PNBRQKpnbrqk");

export function parseFen(fen) {
  if (fen === "startpos") {
    fen = START_FEN;
  }
  if (typeof fen !== "string") {
    throw new Error("Invalid FEN: expected string");
  }
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) {
    throw new Error("Invalid FEN: expected 6 fields");
  }

  const [placement, turn, castlingField, epField, halfmoveField, fullmoveField] = fields;
  if (turn !== WHITE && turn !== BLACK) {
    throw new Error("Invalid FEN: active color must be w or b");
  }

  const board = Array(64).fill(null);
  const ranks = placement.split("/");
  if (ranks.length !== 8) {
    throw new Error("Invalid FEN: expected 8 ranks");
  }

  let whiteKings = 0;
  let blackKings = 0;
  ranks.forEach((rankText, fenRank) => {
    let file = 0;
    const rank = 7 - fenRank;
    for (const char of rankText) {
      if (/^[1-8]$/.test(char)) {
        file += Number(char);
      } else if (PIECES.has(char)) {
        if (file >= 8) {
          throw new Error("Invalid FEN: too many files in rank");
        }
        if (pieceType(char) === "p" && (rank === 0 || rank === 7)) {
          throw new Error("Invalid FEN: pawn on promotion rank");
        }
        if (char === "K") whiteKings += 1;
        if (char === "k") blackKings += 1;
        board[file + rank * 8] = char;
        file += 1;
      } else {
        throw new Error(`Invalid FEN: bad piece ${char}`);
      }
    }
    if (file !== 8) {
      throw new Error("Invalid FEN: rank is not 8 files");
    }
  });

  if (whiteKings !== 1 || blackKings !== 1) {
    throw new Error("Invalid FEN: expected one king per side");
  }

  if (castlingField !== "-" && !/^(?!.*(.).*\1)[KQkq]+$/.test(castlingField)) {
    throw new Error("Invalid FEN: bad castling rights");
  }
  const castling = {
    K: castlingField.includes("K"),
    Q: castlingField.includes("Q"),
    k: castlingField.includes("k"),
    q: castlingField.includes("q"),
  };

  let ep = null;
  if (epField !== "-") {
    if (!/^[a-h][36]$/.test(epField)) {
      throw new Error("Invalid FEN: bad en passant square");
    }
    ep = squareToIndex(epField);
  }

  if (!/^\d+$/.test(halfmoveField) || !/^[1-9]\d*$/.test(fullmoveField)) {
    throw new Error("Invalid FEN: bad move counters");
  }
  const position = {
    board,
    turn,
    castling,
    ep,
    halfmove: Number(halfmoveField),
    fullmove: Number(fullmoveField),
  };

  if (isInCheck(position, otherColor(turn))) {
    throw new Error("Invalid FEN: non-active side is in check");
  }

  return position;
}

export function serializeFen(position) {
  const ranks = [];
  for (let rank = 7; rank >= 0; rank -= 1) {
    let text = "";
    let empty = 0;
    for (let file = 0; file < 8; file += 1) {
      const piece = position.board[file + rank * 8];
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) {
        text += String(empty);
        empty = 0;
      }
      text += piece;
    }
    if (empty) text += String(empty);
    ranks.push(text);
  }

  const castling =
    `${position.castling.K ? "K" : ""}${position.castling.Q ? "Q" : ""}` +
    `${position.castling.k ? "k" : ""}${position.castling.q ? "q" : ""}`;
  return [
    ranks.join("/"),
    position.turn,
    castling || "-",
    position.ep === null ? "-" : indexToSquare(position.ep),
    String(position.halfmove),
    String(position.fullmove),
  ].join(" ");
}

export function material(position, color = null) {
  return position.board.filter((piece) => piece && (!color || pieceColor(piece) === color));
}
