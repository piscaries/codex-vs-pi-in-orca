import { indexToSquare, moveToUci, otherColor, pieceType } from "./board.js";
import { parseFen } from "./fen.js";
import { evaluatePosition, PIECE_VALUES } from "./evaluate.js";
import { analyzeMoves, bestMove } from "./search.js";
import { applyMoveObject, assertLegalMove, generateLegalMoveObjects } from "./movegen.js";
import { gameStatusForPosition } from "./status.js";

const VERDICTS = ["best", "good", "inaccuracy", "mistake", "blunder"];

const PIECE_NAMES = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

function sideName(color) {
  return color === "w" ? "White" : "Black";
}

function pieceName(piece) {
  return PIECE_NAMES[pieceType(piece)];
}

function capturedPiece(position, move) {
  if (move.ep) {
    const moving = position.board[move.from];
    return position.board[move.to + (moving === moving.toUpperCase() ? -8 : 8)];
  }
  return position.board[move.to];
}

function classifyLoss(loss) {
  if (loss <= 25) return "best";
  if (loss <= 90) return "good";
  if (loss <= 180) return "inaccuracy";
  if (loss <= 360) return "mistake";
  return "blunder";
}

function legalMateInOne(position) {
  for (const move of generateLegalMoveObjects(position)) {
    const next = applyMoveObject(position, move);
    if (gameStatusForPosition(next) === "checkmate") {
      return move;
    }
  }
  return null;
}

function biggestCapture(position) {
  let best = null;
  for (const move of generateLegalMoveObjects(position)) {
    const captured = capturedPiece(position, move);
    if (!captured) continue;
    const attacker = position.board[move.from];
    const value = PIECE_VALUES[pieceType(captured)] - PIECE_VALUES[pieceType(attacker)] / 10;
    if (!best || value > best.value || (value === best.value && moveToUci(move).localeCompare(moveToUci(best.move)) < 0)) {
      best = { move, captured, value };
    }
  }
  return best;
}

function betterMoveReason(position, bestUci) {
  if (!bestUci) return null;
  const bestMoveObject = assertLegalMove(position, bestUci);
  const captured = capturedPiece(position, bestMoveObject);
  if (captured && PIECE_VALUES[pieceType(captured)] >= PIECE_VALUES.p) {
    return `${bestUci} wins the ${pieceName(captured)} on ${indexToSquare(bestMoveObject.to)}.`;
  }
  return `${bestUci} keeps the position safer.`;
}

function buildReasons(position, move, verdict, betterMove) {
  if (verdict === "best") return ["Best move. It handles the position cleanly."];
  if (verdict === "good") return ["Good move. It keeps the game steady."];

  const after = applyMoveObject(position, move);
  const opponent = sideName(after.turn);
  const mate = legalMateInOne(after);
  if (mate) {
    return [`It lets ${opponent} deliver checkmate with ${moveToUci(mate)}.`];
  }

  const capture = biggestCapture(after);
  if (capture && PIECE_VALUES[pieceType(capture.captured)] >= PIECE_VALUES.n) {
    return [
      `It lets ${opponent} capture the ${pieceName(capture.captured)} on ${indexToSquare(capture.move.to)}.`,
    ];
  }

  const better = betterMoveReason(position, betterMove);
  return better ? [better] : ["This gives the opponent an easier position."];
}

export function hint(fen, options = {}) {
  const move = bestMove(fen, options);
  if (!move) {
    return { move: null, reason: "The game is already over." };
  }
  const position = parseFen(fen);
  const reason = betterMoveReason(position, move) ?? `${move} is a solid move for ${sideName(position.turn)}.`;
  return { move, reason };
}

export function reviewMove(fen, uci) {
  const position = parseFen(fen);
  const move = assertLegalMove(position, uci);
  const analysis = analyzeMoves(position, { depth: 3, timeMs: 450 });
  const best = analysis[0] ?? null;
  const played = analysis.find((entry) => entry.uci === uci);
  const bestScore = best?.score ?? 0;
  const playedScore = played?.score ?? -evaluatePosition(applyMoveObject(position, move), otherColor(position.turn));
  const verdict = classifyLoss(bestScore - playedScore);
  const betterMove = verdict === "best" || !best || best.uci === uci ? null : best.uci;
  const reasons = buildReasons(position, move, verdict, betterMove);

  if (!VERDICTS.includes(verdict)) {
    throw new Error(`Internal coach error: bad verdict ${verdict}`);
  }
  return { verdict, reasons, betterMove };
}
