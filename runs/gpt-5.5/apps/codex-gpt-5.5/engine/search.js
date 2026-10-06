import { isInCheck, moveToUci, otherColor, pieceType } from "./board.js";
import { parseFen } from "./fen.js";
import { evaluatePosition, PIECE_VALUES } from "./evaluate.js";
import { applyMoveObject, generateLegalMoveObjects } from "./movegen.js";
import { hasInsufficientMaterial } from "./status.js";

const MATE_SCORE = 100000;
const DEFAULT_TIME_MS = 500;
const MAX_TIME_MS = 1900;
const MAX_DEPTH = 5;

export const STRENGTH_LEVELS = {
  easy: { depth: 1, timeMs: 120, pick: 2 },
  normal: { depth: 3, timeMs: 500, pick: 0 },
  hard: { depth: 5, timeMs: 1500, pick: 0 },
};

function now() {
  return Date.now();
}

function budgetMs(options) {
  const requested = Number(options?.timeMs ?? DEFAULT_TIME_MS);
  if (!Number.isFinite(requested)) return DEFAULT_TIME_MS;
  return Math.max(1, Math.min(MAX_TIME_MS, Math.floor(requested)));
}

function capturedPiece(position, move) {
  if (move.ep) {
    const moving = position.board[move.from];
    return position.board[move.to + (moving === moving.toUpperCase() ? -8 : 8)];
  }
  return position.board[move.to];
}

function moveOrderingScore(position, move) {
  const mover = position.board[move.from];
  const captured = capturedPiece(position, move);
  let score = move.promotion ? PIECE_VALUES[move.promotion] + 800 : 0;
  if (captured) {
    score += PIECE_VALUES[pieceType(captured)] * 10 - PIECE_VALUES[pieceType(mover)];
  }
  return score;
}

function orderedMoves(position) {
  return generateLegalMoveObjects(position)
    .map((move) => ({ move, uci: moveToUci(move), score: moveOrderingScore(position, move) }))
    .sort((a, b) => b.score - a.score || a.uci.localeCompare(b.uci))
    .map(({ move }) => move);
}

function terminalScore(position, ply) {
  if (position.halfmove >= 100 || hasInsufficientMaterial(position)) return 0;
  const legalMoves = generateLegalMoveObjects(position);
  if (legalMoves.length > 0) return null;
  return isInCheck(position, position.turn) ? -MATE_SCORE + ply : 0;
}

function negamax(position, depth, alpha, beta, deadline, ply) {
  if (now() >= deadline) {
    return { score: evaluatePosition(position, position.turn), completed: false };
  }

  const terminal = terminalScore(position, ply);
  if (terminal !== null) {
    return { score: terminal, completed: true };
  }
  if (depth === 0) {
    return { score: evaluatePosition(position, position.turn), completed: true };
  }

  let best = -Infinity;
  for (const move of orderedMoves(position)) {
    const child = applyMoveObject(position, move);
    const result = negamax(child, depth - 1, -beta, -alpha, deadline, ply + 1);
    if (!result.completed) return { score: best === -Infinity ? result.score : best, completed: false };

    const score = -result.score;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }

  return { score: best, completed: true };
}

function staticBestMove(position, moves) {
  const color = position.turn;
  return moves
    .map((move) => {
      const next = applyMoveObject(position, move);
      return {
        move,
        uci: moveToUci(move),
        score: -evaluatePosition(next, otherColor(color)),
      };
    })
    .sort((a, b) => b.score - a.score || a.uci.localeCompare(b.uci))[0].move;
}

function searchRoot(position, depth, deadline) {
  const moves = orderedMoves(position);
  let bestMove = staticBestMove(position, moves);
  let bestScore = -Infinity;

  for (const move of moves) {
    if (now() >= deadline) {
      return { move: bestMove, score: bestScore, completed: false };
    }
    const result = negamax(applyMoveObject(position, move), depth - 1, -Infinity, Infinity, deadline, 1);
    if (!result.completed) {
      return { move: bestMove, score: bestScore, completed: false };
    }
    const score = -result.score;
    const uci = moveToUci(move);
    const bestUci = moveToUci(bestMove);
    if (score > bestScore || (score === bestScore && uci.localeCompare(bestUci) < 0)) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { move: bestMove, score: bestScore, completed: true };
}

export function analyzeMoves(fenOrPosition, options = {}) {
  const position = typeof fenOrPosition === "string" ? parseFen(fenOrPosition) : fenOrPosition;
  const moves = orderedMoves(position);
  if (moves.length === 0) return [];

  const depth = Math.max(1, Math.min(MAX_DEPTH, Math.floor(options.depth ?? 2)));
  const deadline = now() + budgetMs(options);
  const analysis = [];

  for (const move of moves) {
    if (now() >= deadline) break;
    const result = negamax(applyMoveObject(position, move), depth - 1, -Infinity, Infinity, deadline, 1);
    analysis.push({
      move,
      uci: moveToUci(move),
      score: -result.score,
      completed: result.completed,
    });
    if (!result.completed) break;
  }

  if (analysis.length === 0) {
    const fallback = staticBestMove(position, moves);
    analysis.push({ move: fallback, uci: moveToUci(fallback), score: 0, completed: false });
  }

  return analysis.sort((a, b) => b.score - a.score || a.uci.localeCompare(b.uci));
}

export function bestMove(fen, options = {}) {
  const position = parseFen(fen);
  const moves = orderedMoves(position);
  if (moves.length === 0 || position.halfmove >= 100 || hasInsufficientMaterial(position)) {
    return null;
  }

  const deadline = now() + budgetMs(options);
  let best = staticBestMove(position, moves);
  const requestedDepth = Math.max(1, Math.min(MAX_DEPTH, Math.floor(options.depth ?? MAX_DEPTH)));

  for (let depth = 1; depth <= requestedDepth; depth += 1) {
    if (now() >= deadline) break;
    const result = searchRoot(position, depth, deadline);
    if (!result.completed && depth > 1) break;
    best = result.move;
    if (Math.abs(result.score) > MATE_SCORE - 1000) break;
  }

  return moveToUci(best);
}

export function bestMoveForLevel(fen, level = "normal") {
  const settings = STRENGTH_LEVELS[level] ?? STRENGTH_LEVELS.normal;
  const analysis = analyzeMoves(fen, settings);
  if (analysis.length === 0) return null;
  const pick = Math.min(settings.pick, analysis.length - 1);
  return analysis[pick].uci;
}

export function chooseComputerMove(fen, level = "normal") {
  return bestMoveForLevel(fen, level);
}
