import {
  acceptHint,
  buildRecap,
  completeCoachAndReply,
  createGameState,
  needsResetConfirmation,
  playUserMove,
  resetGame,
} from "./game.js";
import { legalMoves } from "../engine/index.js";
import {
  indexToSquare,
  isInCheck,
  parseFen,
  squareToIndex,
} from "../engine/rules.js";

const PIECES = Object.freeze({
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
});

const PIECE_NAMES = Object.freeze({
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
});

const boardElement = document.querySelector("#board");
const levelElement = document.querySelector("#level");
const newGameButton = document.querySelector("#new-game");
const hintButton = document.querySelector("#hint-button");
const turnIndicator = document.querySelector("#turn-indicator");
const positionDetail = document.querySelector("#position-detail");
const resultElement = document.querySelector("#result");
const feedbackElement = document.querySelector("#feedback");
const hintElement = document.querySelector("#hint");
const recapPanel = document.querySelector("#recap-panel");
const recapElement = document.querySelector("#recap");
const errorElement = document.querySelector("#error");
const promotionDialog = document.querySelector("#promotion-dialog");

let game = createGameState("beginner");
let selectedSquare = null;
let requestSequence = 0;
let pendingRequest = null;
let worker = createCoachWorker();

function createCoachWorker() {
  const nextWorker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  nextWorker.addEventListener("message", handleWorkerMessage);
  nextWorker.addEventListener("error", () => {
    showError("The coach stopped unexpectedly. Start a new game to keep playing.");
    pendingRequest = null;
    render();
  });
  return nextWorker;
}

function capitalize(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function pieceColor(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "White" : "Black";
}

function moveWords(uci) {
  const promotion = uci[4] ? ` and promote to a ${PIECE_NAMES[uci[4]]}` : "";
  return `move from ${uci.slice(0, 2)} to ${uci.slice(2, 4)}${promotion}`;
}

function lastMoveText() {
  const move = game.moves.at(-1);
  return move ? `Last move: ${moveWords(move.uci)}.` : "Choose a piece to see where it can move.";
}

function activeMoves() {
  if (game.status !== "ongoing" || game.busy || pendingRequest || parseFen(game.fen).turn !== "w") {
    return [];
  }
  return legalMoves(game.fen);
}

function destinationMoves() {
  return selectedSquare === null
    ? []
    : activeMoves().filter((uci) => uci.startsWith(selectedSquare));
}

function checkedKingSquare(position) {
  if (!isInCheck(position)) return null;
  const king = position.turn === "w" ? "K" : "k";
  return indexToSquare(position.board.indexOf(king));
}

function renderBoard() {
  const position = parseFen(game.fen);
  const destinations = destinationMoves();
  const destinationSquares = new Set(destinations.map((uci) => uci.slice(2, 4)));
  const captureSquares = new Set(destinations
    .filter((uci) => position.board[squareToIndex(uci.slice(2, 4))] !== null)
    .map((uci) => uci.slice(2, 4)));
  const lastUci = game.moves.at(-1)?.uci ?? "";
  const lastSquares = new Set(lastUci ? [lastUci.slice(0, 2), lastUci.slice(2, 4)] : []);
  const checkSquare = checkedKingSquare(position);
  const interactive = activeMoves().length > 0;

  boardElement.replaceChildren();
  for (let index = 0; index < 64; index += 1) {
    const square = indexToSquare(index);
    const piece = position.board[index];
    const rank = Math.floor(index / 8);
    const file = index % 8;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "square";
    button.dataset.square = square;
    button.setAttribute("role", "gridcell");
    button.setAttribute(
      "aria-label",
      piece ? `${square}, ${pieceColor(piece)} ${PIECE_NAMES[piece.toLowerCase()]}` : `${square}, empty`,
    );
    button.disabled = !interactive;
    if ((rank + file) % 2 === 1) button.classList.add("dark");
    if (square === selectedSquare) button.classList.add("selected");
    if (destinationSquares.has(square)) button.classList.add("destination");
    if (captureSquares.has(square)) button.classList.add("capture");
    if (lastSquares.has(square)) button.classList.add("last-move");
    if (square === checkSquare) button.classList.add("in-check");
    button.textContent = piece ? PIECES[piece] : "";
    if (rank === 7 || file === 0) {
      const coordinate = document.createElement("span");
      coordinate.className = "coordinate";
      coordinate.setAttribute("aria-hidden", "true");
      coordinate.textContent = rank === 7 && file === 0 ? square : rank === 7 ? square[0] : square[1];
      button.append(coordinate);
    }
    boardElement.append(button);
  }
}

function resultText(position) {
  if (game.status === "checkmate") {
    return position.turn === "b" ? "Checkmate — you win." : "Checkmate — the computer wins.";
  }
  if (game.status === "stalemate") return "Stalemate — the game is a draw.";
  if (game.status === "draw") return "Draw — neither side wins this game.";
  return "";
}

function renderStatus() {
  const position = parseFen(game.fen);
  const inCheck = isInCheck(position);
  if (game.status !== "ongoing") turnIndicator.textContent = "Game over";
  else if (game.busy) turnIndicator.textContent = "Coach and computer are thinking…";
  else if (pendingRequest?.type === "hint") turnIndicator.textContent = "Coach is finding a hint…";
  else turnIndicator.textContent = "Your turn";

  const checkText = inCheck
    ? position.turn === "w" ? "Your king is in check. " : "Computer is in check. "
    : "";
  positionDetail.textContent = `${checkText}${lastMoveText()}`;
  resultElement.textContent = resultText(position);
}

function renderFeedback() {
  feedbackElement.replaceChildren();
  const heading = document.createElement("h2");
  const copy = document.createElement("p");
  if (!game.feedback) {
    heading.textContent = game.busy ? "Reviewing your move…" : "Your coach is ready";
    copy.textContent = game.busy
      ? "The board is ready while the coach works in the background."
      : "Move feedback will appear here.";
  } else {
    heading.textContent = capitalize(game.feedback.verdict);
    const reason = game.feedback.reasons[0] ?? "";
    const suggestion = game.feedback.betterMove
      ? ` Try ${moveWords(game.feedback.betterMove)}.`
      : "";
    copy.textContent = `${reason}${suggestion}`;
  }
  feedbackElement.append(heading, copy);
}

function renderHint() {
  hintButton.disabled = game.status !== "ongoing" || game.busy || pendingRequest !== null;
  if (pendingRequest?.type === "hint") hintElement.textContent = "Looking for a clear idea…";
  else if (game.hint) hintElement.textContent = game.hint.reason;
  else hintElement.textContent = "Hints suggest a move without playing it.";
}

function renderRecap() {
  const visible = game.status !== "ongoing" && !game.busy;
  recapPanel.hidden = !visible;
  recapElement.replaceChildren();
  if (!visible) return;
  const recap = buildRecap(game);
  if (recap.message) {
    const message = document.createElement("p");
    message.textContent = recap.message;
    recapElement.append(message);
    return;
  }
  const list = document.createElement("ol");
  list.className = "recap-list";
  for (const entry of recap.entries) {
    const item = document.createElement("li");
    const reason = entry.review.reasons[0] ?? "";
    const suggestion = entry.review.betterMove
      ? ` Try ${moveWords(entry.review.betterMove)}.`
      : "";
    item.textContent = `Move ${Math.ceil(entry.ply / 2)} — ${capitalize(entry.review.verdict)}. ${reason}${suggestion}`;
    list.append(item);
  }
  recapElement.append(list);
}

function render() {
  levelElement.value = game.level;
  renderBoard();
  renderStatus();
  renderFeedback();
  renderHint();
  renderRecap();
}

function showError(message) {
  errorElement.textContent = message;
  errorElement.hidden = false;
}

function clearError() {
  errorElement.textContent = "";
  errorElement.hidden = true;
}

function sendRequest(payload) {
  requestSequence += 1;
  pendingRequest = { id: requestSequence, type: payload.type };
  worker.postMessage({ id: requestSequence, profile: game.level, ...payload });
  render();
}

function requestCoachReply() {
  const userMove = game.moves.at(-1);
  sendRequest({
    type: "coachAndReply",
    fenBefore: userMove.fenBefore,
    userUci: userMove.uci,
    fenAfter: userMove.fenAfter,
  });
}

function handleWorkerMessage({ data }) {
  if (!pendingRequest || data?.id !== pendingRequest.id) return;
  const requestType = pendingRequest.type;
  pendingRequest = null;
  if (!data.ok) {
    showError(`The coach could not finish: ${data.error} Start a new game to continue.`);
    render();
    return;
  }
  try {
    game = requestType === "hint"
      ? acceptHint(game, data.hint)
      : completeCoachAndReply(game, { review: data.review, uci: data.uci });
    clearError();
  } catch (error) {
    showError(`The coach returned an invalid result: ${error.message}`);
  }
  render();
}

function choosePromotion() {
  return new Promise((resolve) => {
    const close = () => {
      promotionDialog.removeEventListener("close", close);
      resolve(promotionDialog.returnValue || null);
    };
    promotionDialog.addEventListener("close", close);
    promotionDialog.returnValue = "";
    promotionDialog.showModal();
  });
}

async function submitMove(from, to) {
  const candidates = activeMoves().filter((uci) => uci.startsWith(`${from}${to}`));
  if (candidates.length === 0) return;
  let uci = candidates[0];
  if (candidates.length > 1) {
    const promotion = await choosePromotion();
    uci = candidates.find((candidate) => candidate[4] === promotion);
    if (!uci) return;
  }
  try {
    game = playUserMove(game, uci);
    selectedSquare = null;
    clearError();
    requestCoachReply();
  } catch (error) {
    showError(error.message);
    render();
  }
}

boardElement.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-square]");
  if (!button || button.disabled) return;
  const square = button.dataset.square;
  const position = parseFen(game.fen);
  const piece = position.board[squareToIndex(square)];
  if (selectedSquare && destinationMoves().some((uci) => uci.slice(2, 4) === square)) {
    await submitMove(selectedSquare, square);
    return;
  }
  if (pieceColor(piece) === "White") selectedSquare = square;
  else selectedSquare = null;
  renderBoard();
});

hintButton.addEventListener("click", () => {
  if (pendingRequest || game.busy || game.status !== "ongoing") return;
  clearError();
  sendRequest({ type: "hint", fen: game.fen });
});

function startNewGame(level) {
  const confirmed = !needsResetConfirmation(game)
    || window.confirm("Start a new game? Your current game will be cleared.");
  const next = resetGame(game, level, confirmed);
  if (next === game) {
    levelElement.value = game.level;
    return;
  }
  requestSequence += 1;
  pendingRequest = null;
  worker.terminate();
  worker = createCoachWorker();
  game = next;
  selectedSquare = null;
  clearError();
  render();
}

newGameButton.addEventListener("click", () => startNewGame(levelElement.value));
levelElement.addEventListener("change", () => startNewGame(levelElement.value));

// The browser smoke test uses an explicit query-only seam to exercise special
// positions. Normal visits always start from the standard position.
const params = new URLSearchParams(window.location.search);
if (params.get("test") === "1" && params.has("fen")) {
  game = createGameState(params.get("level") ?? "beginner", params.get("fen"));
}

render();
window.__chessCoachReady = true;
