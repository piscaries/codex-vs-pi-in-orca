import {
  applyMove,
  chooseComputerMove,
  gameStatus,
  hint as engineHint,
  legalMoves,
  reviewMove,
} from "../engine/index.js";
import { readBoardPiece, renderState } from "./render.js";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const LEVELS = ["easy", "normal", "hard"];

const USER_COLOR = "w";

function turnFromFen(fen) {
  return fen.trim().split(/\s+/)[1];
}

function repetitionKey(fen) {
  return fen.trim().split(/\s+/).slice(0, 4).join(" ");
}

function isWhitePiece(piece) {
  return piece && piece === piece.toUpperCase();
}

function normalizeLevel(level) {
  return LEVELS.includes(level) ? level : "normal";
}

function moveParts(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) };
}

function userLegalMovesFrom(state, square) {
  const piece = readBoardPiece(state.fen, square);
  if (turnFromFen(state.fen) !== USER_COLOR || !isWhitePiece(piece) || state.gameOver || state.pending) {
    return [];
  }
  return legalMoves(state.fen).filter((move) => move.startsWith(square));
}

function uciForTarget(moves, toSquare) {
  const exact = moves.find((move) => move.slice(2, 4) === toSquare && move.length === 4);
  if (exact) return exact;
  const promotions = moves.filter((move) => move.slice(2, 4) === toSquare);
  return promotions.find((move) => move.endsWith("q")) ?? promotions[0] ?? null;
}

export function isThreefold(history) {
  const counts = new Map();
  for (const fen of history) {
    const key = repetitionKey(fen);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (counts.get(key) >= 3) return true;
  }
  return false;
}

export function createGameState({ level = "normal", fen = START_FEN } = {}) {
  const status = gameStatus(fen);
  return {
    fen,
    history: [fen],
    level: normalizeLevel(level),
    selectedSquare: null,
    legalTargets: [],
    lastMove: null,
    status,
    threefold: false,
    gameOver: status !== "ongoing",
    pending: false,
    message: "White to move.",
    hint: null,
    reviews: [],
    moves: [],
  };
}

export function startNewGame(level = "normal") {
  return createGameState({ level });
}

function withPositionStatus(state, nextFen) {
  const history = [...state.history, nextFen];
  const status = gameStatus(nextFen);
  const threefold = isThreefold(history);
  return {
    ...state,
    fen: nextFen,
    history,
    status,
    threefold,
    gameOver: status !== "ongoing" || threefold,
  };
}

export function requestHint(state, options = { timeMs: 250 }) {
  if (state.gameOver) {
    return { ...state, hint: { move: null, reason: "The game is already over." }, message: "The game is already over." };
  }
  if (turnFromFen(state.fen) !== USER_COLOR || state.pending) {
    return { ...state, message: "Wait for the computer reply before asking for a hint." };
  }
  const hint = engineHint(state.fen, options);
  return { ...state, hint, message: hint.move ? `Hint: ${hint.move}.` : hint.reason };
}

export function makeUserMove(state, uci) {
  if (state.gameOver) return { ...state, message: "The game is already over." };
  if (turnFromFen(state.fen) !== USER_COLOR || state.pending) {
    return { ...state, message: "It is not your turn yet." };
  }

  try {
    const before = state.fen;
    const review = reviewMove(before, uci);
    const nextFen = applyMove(before, uci);
    const next = withPositionStatus(state, nextFen);
    const parts = moveParts(uci);
    const annotatedReview = {
      ...review,
      uci,
      ply: state.moves.length + 1,
      fenBefore: before,
    };
    const message = next.gameOver ? "Game over." : "Computer is thinking.";
    return {
      ...next,
      selectedSquare: null,
      legalTargets: [],
      lastMove: { ...parts, uci },
      pending: !next.gameOver,
      hint: null,
      message,
      reviews: [...state.reviews, annotatedReview],
      moves: [...state.moves, { side: "White", uci }],
    };
  } catch (error) {
    return {
      ...state,
      selectedSquare: null,
      legalTargets: [],
      message: error instanceof Error ? error.message : "Illegal move.",
    };
  }
}

export function makeComputerReply(state, move = chooseComputerMove(state.fen, state.level)) {
  if (state.gameOver) return { ...state, pending: false, message: "The game is already over." };
  if (turnFromFen(state.fen) === USER_COLOR) {
    return { ...state, pending: false, message: "White to move." };
  }
  if (!move) {
    const status = gameStatus(state.fen);
    return { ...state, status, gameOver: true, pending: false, message: "The game has ended." };
  }

  try {
    const nextFen = applyMove(state.fen, move);
    const next = withPositionStatus(state, nextFen);
    const parts = moveParts(move);
    return {
      ...next,
      selectedSquare: null,
      legalTargets: [],
      lastMove: { ...parts, uci: move },
      pending: false,
      message: next.gameOver ? "Game over." : "White to move.",
      moves: [...state.moves, { side: "Black", uci: move }],
    };
  } catch (error) {
    return {
      ...state,
      pending: false,
      message: error instanceof Error ? error.message : "Computer move failed.",
    };
  }
}

export function selectSquare(state, square) {
  if (state.gameOver) return { ...state, message: "The game is already over." };
  if (state.pending) return { ...state, message: "Computer is thinking." };

  if (state.selectedSquare) {
    const moves = userLegalMovesFrom(state, state.selectedSquare);
    const uci = uciForTarget(moves, square);
    if (uci) return makeUserMove(state, uci);
  }

  const moves = userLegalMovesFrom(state, square);
  if (moves.length === 0) {
    return { ...state, selectedSquare: null, legalTargets: [], message: "Choose one of your legal pieces." };
  }

  return {
    ...state,
    selectedSquare: square,
    legalTargets: [...new Set(moves.map((move) => move.slice(2, 4)))],
    message: `Selected ${square}.`,
  };
}

function createComputerWorker() {
  if (typeof Worker === "undefined") return null;
  try {
    return new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function requestWorkerMove(worker, state) {
  if (!worker) return Promise.resolve({ move: chooseComputerMove(state.fen, state.level) });
  const id = requestId();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      worker.removeEventListener("message", onMessage);
      resolve({ move: chooseComputerMove(state.fen, state.level) });
    }, 2100);
    const onMessage = (event) => {
      if (event.data?.id !== id) return;
      clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      resolve(event.data);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, fen: state.fen, level: state.level });
  });
}

function bindBrowserApp() {
  const elements = {
    board: document.querySelector("#board"),
    summary: document.querySelector("#game-summary"),
    level: document.querySelector("#level-select"),
    turn: document.querySelector("#turn-value"),
    status: document.querySelector("#status-value"),
    lastMove: document.querySelector("#last-move-value"),
    check: document.querySelector("#check-value"),
    verdict: document.querySelector("#coach-verdict"),
    reasons: document.querySelector("#coach-reasons"),
    better: document.querySelector("#coach-better"),
    hint: document.querySelector("#hint-value"),
    hintButton: document.querySelector("#hint-button"),
    moves: document.querySelector("#move-list"),
    review: document.querySelector("#review-list"),
  };

  let state = startNewGame(elements.level.value);
  const worker = createComputerWorker();

  const render = () => renderState(elements, state, onSquareClick);
  const maybeComputerReply = async () => {
    if (!state.pending || state.gameOver) return;
    render();
    const result = await requestWorkerMove(worker, state);
    state = result.error ? { ...state, pending: false, message: result.error } : makeComputerReply(state, result.move);
    render();
  };

  function onSquareClick(square) {
    state = selectSquare(state, square);
    render();
    void maybeComputerReply();
  }

  document.querySelector("#new-game").addEventListener("click", () => {
    state = startNewGame(elements.level.value);
    render();
  });

  elements.level.addEventListener("change", () => {
    state = startNewGame(elements.level.value);
    render();
  });

  elements.hintButton.addEventListener("click", () => {
    state = requestHint(state, { timeMs: 250 });
    render();
  });

  render();
}

if (typeof document !== "undefined") {
  bindBrowserApp();
}
