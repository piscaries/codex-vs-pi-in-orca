import assert from "node:assert/strict";
import test from "node:test";

import {
  START_FEN,
  createGameState,
  isThreefold,
  makeComputerReply,
  makeUserMove,
  requestHint,
  selectSquare,
  startNewGame,
} from "../app/app.js";
import { checkInfo, formatStatus, readBoardPiece, worstReviews } from "../app/render.js";
import { legalMoves } from "../engine/index.js";

test("starting a level creates a playable white-to-move state", () => {
  const state = startNewGame("hard");

  assert.equal(state.level, "hard");
  assert.equal(state.fen, START_FEN);
  assert.equal(state.status, "ongoing");
  assert.equal(state.gameOver, false);
  assert.equal(state.message, "White to move.");
});

test("selection exposes legal targets and rejects illegal user moves without changing FEN", () => {
  const state = createGameState();
  const selected = selectSquare(state, "e2");

  assert.equal(selected.selectedSquare, "e2");
  assert.deepEqual(selected.legalTargets.sort(), ["e3", "e4"]);

  const rejected = makeUserMove(state, "e2e5");
  assert.equal(rejected.fen, state.fen);
  assert.match(rejected.message, /Illegal move: e2e5/);
});

test("a legal user move records coach review, last move, and pending computer turn", () => {
  const state = makeUserMove(createGameState({ level: "easy" }), "e2e4");

  assert.notEqual(state.fen, START_FEN);
  assert.equal(state.pending, true);
  assert.equal(state.lastMove.uci, "e2e4");
  assert.equal(state.moves.at(-1).side, "White");
  assert.equal(state.reviews.length, 1);
  assert.ok(["best", "good", "inaccuracy", "mistake", "blunder"].includes(state.reviews[0].verdict));
  assert.ok(state.reviews[0].betterMove === null || legalMoves(START_FEN).includes(state.reviews[0].betterMove));
});

test("computer replies are applied only through legal engine moves", () => {
  const afterUser = makeUserMove(createGameState({ level: "easy" }), "e2e4");
  const legalReplies = legalMoves(afterUser.fen);
  const afterComputer = makeComputerReply(afterUser, "e7e5");

  assert.ok(legalReplies.includes("e7e5"));
  assert.equal(afterComputer.pending, false);
  assert.equal(afterComputer.lastMove.uci, "e7e5");
  assert.equal(afterComputer.moves.at(-1).side, "Black");
  assert.equal(readBoardPiece(afterComputer.fen, "e5"), "p");
});

test("hint suggests a legal move with beginner-readable text", () => {
  const state = requestHint(createGameState(), { timeMs: 80 });

  assert.ok(legalMoves(START_FEN).includes(state.hint.move));
  assert.equal(typeof state.hint.reason, "string");
  assert.ok(state.hint.reason.length > 0);
  assert.doesNotMatch(state.hint.reason, /\d+\.\d+|centipawn|engine/i);
});

test("check and status display helpers expose board cues", () => {
  const fen = "6k1/6pp/8/8/8/8/6PP/5RK1 w - - 0 1";
  const afterCheck = makeUserMove(createGameState({ fen }), "f1f8");

  assert.equal(checkInfo(afterCheck.fen).inCheck, true);
  assert.equal(checkInfo("8/8/8/8/R2kN3/8/8/7K b - - 0 1").inCheck, true);
  assert.equal(formatStatus("ongoing", false), "Ongoing");
  assert.equal(formatStatus("draw", true), "Draw by repetition");
});

test("end review lists the worst actual user reviews first", () => {
  const reviews = [
    { ply: 1, uci: "e2e4", verdict: "good", reasons: ["Good move."], betterMove: null },
    { ply: 3, uci: "d1h5", verdict: "blunder", reasons: ["It loses the queen."], betterMove: "d1e2" },
    { ply: 5, uci: "a2a3", verdict: "mistake", reasons: ["It misses a threat."], betterMove: null },
  ];

  assert.deepEqual(worstReviews(reviews).map((review) => review.uci), ["d1h5", "a2a3"]);
});

test("threefold repetition uses position keys without move counters", () => {
  const repeated = [
    START_FEN,
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 2 2",
    "8/8/8/8/8/8/8/4K2k w - - 0 1",
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 4 3",
  ];

  assert.equal(isThreefold(repeated), true);
});
