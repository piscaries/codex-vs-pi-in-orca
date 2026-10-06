import { hintForPosition } from "../engine/coach.js";
import {
  applyUciMove,
  gameStatusForPosition,
  legalMovesFromFen,
  parseFen,
  positionToFen,
  repetitionKey,
} from "../engine/rules.js";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const LEVELS = Object.freeze(["beginner", "club", "challenging"]);

const VERDICTS = new Set(["best", "good", "inaccuracy", "mistake", "blunder"]);
const RECAP_SEVERITY = Object.freeze({ mistake: 1, blunder: 2 });

function typeError(message) {
  throw new TypeError(message);
}

function requireLevel(level) {
  if (!LEVELS.includes(level)) typeError(`Unknown level: ${String(level)}`);
}

function requireState(state) {
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    typeError("Game state must be an object");
  }
  if (!(state.positionCounts instanceof Map) || !Array.isArray(state.moves)) {
    typeError("Invalid game state");
  }
}

function statusWithRepetition(position, positionCounts) {
  const rulesStatus = gameStatusForPosition(position);
  if (rulesStatus !== "ongoing") return rulesStatus;
  return (positionCounts.get(repetitionKey(position)) ?? 0) >= 3 ? "draw" : "ongoing";
}

function recordPosition(positionCounts, position) {
  const nextCounts = new Map(positionCounts);
  const key = repetitionKey(position);
  nextCounts.set(key, (nextCounts.get(key) ?? 0) + 1);
  return nextCounts;
}

function assertUserTurn(state) {
  if (state.status !== "ongoing") throw new RangeError("The game is over");
  if (state.busy) throw new Error("A move is already being processed");
  if (parseFen(state.fen).turn !== "w") throw new Error("It is not the user's turn");
}

function validateReview(review, fenBefore, playedUci) {
  if (review === null || typeof review !== "object" || Array.isArray(review)) {
    typeError("Review must be an object");
  }
  if (!VERDICTS.has(review.verdict)) typeError("Invalid review verdict");
  if (!Array.isArray(review.reasons)
      || review.reasons.length > 1
      || review.reasons.some((reason) => typeof reason !== "string" || reason.length === 0)) {
    typeError("Review reasons must contain at most one non-empty string");
  }
  const legal = legalMovesFromFen(fenBefore);
  const severe = review.verdict === "mistake" || review.verdict === "blunder";
  if (severe && review.reasons.length !== 1) {
    typeError("Mistakes and blunders require one reason");
  }
  if (review.betterMove !== null
      && (typeof review.betterMove !== "string" || !legal.includes(review.betterMove))) {
    typeError("Review betterMove must be legal or null");
  }
  if (review.betterMove === playedUci) {
    typeError("Review betterMove must differ from the played move");
  }
  if (severe && review.betterMove === null) {
    typeError("Mistakes and blunders require a better move");
  }
  if ((review.verdict === "best" || review.verdict === "good")
      && review.betterMove !== null) {
    typeError("Best and good reviews cannot suggest a better move");
  }
}

/** Create a fresh game. Custom FEN is accepted for deterministic tests and demos. */
export function createGameState(level = "beginner", fen = START_FEN) {
  requireLevel(level);
  const position = parseFen(fen);
  const canonicalFen = positionToFen(position);
  const positionCounts = recordPosition(new Map(), position);
  return {
    fen: canonicalFen,
    level,
    status: statusWithRepetition(position, positionCounts),
    busy: false,
    positionCounts,
    moves: [],
    feedback: null,
    hint: null,
  };
}

/** Apply a legal White move and leave it pending for asynchronous coaching. */
export function playUserMove(state, uci) {
  requireState(state);
  assertUserTurn(state);
  const before = parseFen(state.fen);
  const after = applyUciMove(before, uci);
  const fenAfter = positionToFen(after);
  const positionCounts = recordPosition(state.positionCounts, after);
  const record = {
    ply: state.moves.length + 1,
    side: "w",
    fenBefore: state.fen,
    uci,
    fenAfter,
    review: null,
  };
  return {
    ...state,
    fen: fenAfter,
    status: statusWithRepetition(after, positionCounts),
    busy: true,
    positionCounts,
    moves: [...state.moves, record],
    feedback: null,
    hint: null,
  };
}

/**
 * Accept one worker result. The review and optional Black reply are validated
 * before a new state is returned, so a bad reply cannot partially update play.
 */
export function completeCoachAndReply(state, { review, uci } = {}) {
  requireState(state);
  const pending = state.moves.at(-1);
  if (!state.busy || !pending || pending.side !== "w" || pending.review !== null) {
    throw new Error("There is no pending user move");
  }
  validateReview(review, pending.fenBefore, pending.uci);

  let replyPosition = null;
  let fenAfterReply = null;
  if (state.status === "ongoing") {
    if (typeof uci !== "string") typeError("An ongoing game requires a computer move");
    const position = parseFen(state.fen);
    if (position.turn !== "b") throw new Error("It is not the computer's turn");
    replyPosition = applyUciMove(position, uci);
    fenAfterReply = positionToFen(replyPosition);
  } else if (uci !== null && uci !== undefined) {
    throw new Error("A terminal position cannot accept a computer move");
  }

  const reviewedUserRecord = { ...pending, review };
  const moves = [...state.moves.slice(0, -1), reviewedUserRecord];
  let positionCounts = new Map(state.positionCounts);
  let status = state.status;
  let fen = state.fen;
  if (replyPosition !== null) {
    positionCounts = recordPosition(positionCounts, replyPosition);
    status = statusWithRepetition(replyPosition, positionCounts);
    fen = fenAfterReply;
    moves.push({
      ply: moves.length + 1,
      side: "b",
      fenBefore: state.fen,
      uci,
      fenAfter: fenAfterReply,
    });
  }

  return {
    ...state,
    fen,
    status,
    busy: false,
    positionCounts,
    moves,
    feedback: review,
    hint: null,
  };
}

/** Store a worker-produced legal hint without changing the position. */
export function acceptHint(state, hint) {
  requireState(state);
  assertUserTurn(state);
  if (hint === null || typeof hint !== "object" || Array.isArray(hint)) {
    typeError("Hint must be an object");
  }
  if (typeof hint.uci !== "string" || !legalMovesFromFen(state.fen).includes(hint.uci)) {
    typeError("Hint move must be legal");
  }
  if (typeof hint.reason !== "string" || hint.reason.length === 0) {
    typeError("Hint reason must be a non-empty string");
  }
  return { ...state, hint };
}

/** Synchronous helper for tests and non-worker consumers. */
export function hintForGame(state, options = {}) {
  requireState(state);
  assertUserTurn(state);
  return hintForPosition(parseFen(state.fen), options);
}

export function needsResetConfirmation(state) {
  requireState(state);
  return state.status === "ongoing" && state.moves.length > 0;
}

/** A false confirmation represents cancel and preserves the exact state value. */
export function resetGame(state, level = state?.level, confirmed = false) {
  requireState(state);
  requireLevel(level);
  if (needsResetConfirmation(state) && !confirmed) return state;
  return createGameState(level);
}

/** Select up to three stored severe reviews, then restore chronological order. */
export function buildRecap(state) {
  requireState(state);
  if (state.status === "ongoing") throw new Error("Recap is available after the game ends");
  const entries = state.moves
    .filter((move) => move.side === "w" && RECAP_SEVERITY[move.review?.verdict])
    .sort((left, right) => (
      RECAP_SEVERITY[right.review.verdict] - RECAP_SEVERITY[left.review.verdict]
      || left.ply - right.ply
    ))
    .slice(0, 3)
    .sort((left, right) => left.ply - right.ply);
  return {
    entries,
    message: entries.length === 0
      ? "You avoided any major mistakes in this game."
      : null,
  };
}
