import assert from "node:assert/strict";
import test from "node:test";

import * as engine from "../engine/index.js";
import {
  START_FEN,
  acceptHint,
  buildRecap,
  completeCoachAndReply,
  createGameState,
  hintForGame,
  needsResetConfirmation,
  playUserMove,
  resetGame,
} from "../app/game.js";

const ACKNOWLEDGED = Object.freeze({
  verdict: "best",
  reasons: ["That was the strongest move."],
  betterMove: null,
});

function turn(state, white, black, review = ACKNOWLEDGED) {
  return completeCoachAndReply(playUserMove(state, white), { review, uci: black });
}

test("the public module exports exactly the six fixed functions", () => {
  assert.deepEqual(Object.keys(engine).sort(), [
    "applyMove", "bestMove", "gameStatus", "legalMoves", "perft", "reviewMove",
  ]);
  for (const value of Object.values(engine)) assert.equal(typeof value, "function");
});

test("the public rules API matches its values, shapes, and typed errors", () => {
  assert.equal(engine.legalMoves(START_FEN).length, 20);
  assert.equal(
    engine.applyMove(START_FEN, "e2e4"),
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  );
  assert.equal(engine.perft(START_FEN, 3), 8_902);
  assert.equal(engine.gameStatus("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1"), "checkmate");
  assert.throws(() => engine.legalMoves("not fen"), TypeError);
  assert.throws(() => engine.applyMove(START_FEN, "e2e5"), Error);
  assert.throws(() => engine.perft(START_FEN, -1), TypeError);
  assert.throws(() => engine.bestMove(START_FEN, null), TypeError);
  assert.throws(
    () => engine.bestMove("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1", { timeMs: 1 }),
    RangeError,
  );
  assert.throws(() => engine.reviewMove(START_FEN, "e2e5"), Error);
});

test("bestMove and reviewMove return only contract-safe results", () => {
  const legal = engine.legalMoves(START_FEN);
  const move = engine.bestMove(START_FEN, { timeMs: 20 });
  assert.ok(legal.includes(move));

  const fen = "7k/8/8/3p4/8/4Q3/8/K7 w - - 0 1";
  const review = engine.reviewMove(fen, "e3e4");
  assert.ok(["best", "good", "inaccuracy", "mistake", "blunder"].includes(review.verdict));
  assert.ok(Array.isArray(review.reasons));
  assert.ok(review.betterMove === null || engine.legalMoves(fen).includes(review.betterMove));
});

test("illegal and invalid session moves are atomic", () => {
  const state = createGameState("club");
  assert.throws(() => playUserMove(state, "e2e5"), /Illegal move/);
  assert.equal(state.fen, START_FEN);
  assert.equal(state.moves.length, 0);
  assert.equal(state.positionCounts.size, 1);

  const pending = playUserMove(state, "e2e4");
  assert.throws(
    () => completeCoachAndReply(pending, {
      review: { verdict: "mistake", reasons: ["Try again."], betterMove: "e2e4" },
      uci: "e7e5",
    }),
    /must differ/,
  );
  assert.throws(
    () => completeCoachAndReply(pending, { review: ACKNOWLEDGED, uci: "e7e4" }),
    /Illegal move/,
  );
  assert.equal(pending.moves.at(-1).review, null);
  assert.equal(pending.fen, engine.applyMove(START_FEN, "e2e4"));
  assert.equal(pending.busy, true);
});

test("a completed turn stores the original review and both move records", () => {
  const initial = createGameState("beginner");
  assert.deepEqual(Object.keys(initial).sort(), [
    "busy", "feedback", "fen", "hint", "level", "moves", "positionCounts", "status",
  ]);
  const pending = playUserMove(initial, "e2e4");
  const complete = completeCoachAndReply(pending, { review: ACKNOWLEDGED, uci: "e7e5" });
  assert.equal(initial.fen, START_FEN);
  assert.equal(pending.moves.length, 1);
  assert.equal(complete.moves.length, 2);
  assert.equal(complete.moves[0].review, ACKNOWLEDGED);
  assert.equal(complete.feedback, ACKNOWLEDGED);
  assert.deepEqual(complete.moves.map(({ ply, side, uci }) => ({ ply, side, uci })), [
    { ply: 1, side: "w", uci: "e2e4" },
    { ply: 2, side: "b", uci: "e7e5" },
  ]);
  assert.equal(complete.busy, false);
  assert.equal(complete.status, "ongoing");
});

test("a game-ending user move still receives its review without a reply", () => {
  const mateInOne = "7k/8/5KQ1/8/8/8/8/8 w - - 0 1";
  const pending = playUserMove(createGameState("club", mateInOne), "g6g7");
  assert.equal(pending.status, "checkmate");
  assert.equal(pending.busy, true);

  const complete = completeCoachAndReply(pending, { review: ACKNOWLEDGED, uci: null });
  assert.equal(complete.status, "checkmate");
  assert.equal(complete.busy, false);
  assert.equal(complete.moves.length, 1);
  assert.equal(complete.moves[0].review, ACKNOWLEDGED);
});

test("hints are legal, stored by identity, and never change the position", () => {
  const state = createGameState();
  const before = state.fen;
  const hint = hintForGame(state, { timeMs: 10, maxDepth: 2 });
  const withHint = acceptHint(state, hint);
  assert.ok(engine.legalMoves(before).includes(hint.uci));
  assert.equal(withHint.hint, hint);
  assert.equal(withHint.fen, before);
  assert.equal(state.hint, null);

  const pending = playUserMove(state, "e2e4");
  assert.throws(() => acceptHint(pending, hint), /already being processed/);
  assert.throws(() => acceptHint(state, { uci: "e2e5", reason: "Try this." }), TypeError);
});

test("three occurrences end the session as a repetition draw", () => {
  let state = createGameState();
  state = turn(state, "g1f3", "g8f6");
  state = turn(state, "f3g1", "f6g8");
  assert.equal(state.status, "ongoing");
  state = turn(state, "g1f3", "g8f6");
  state = turn(state, "f3g1", "f6g8");
  assert.equal(state.fen.split(" ").slice(0, 4).join(" "), START_FEN.split(" ").slice(0, 4).join(" "));
  assert.equal(state.status, "draw");
  assert.equal(state.positionCounts.get(START_FEN.split(" ").slice(0, 4).join(" ")), 3);
  assert.throws(() => playUserMove(state, "e2e4"), RangeError);
});

test("reset requires confirmation only for an active played game", () => {
  const active = turn(createGameState("club"), "e2e4", "e7e5");
  assert.equal(needsResetConfirmation(active), true);
  assert.equal(resetGame(active, "challenging", false), active);

  const reset = resetGame(active, "challenging", true);
  assert.equal(reset.level, "challenging");
  assert.equal(reset.fen, START_FEN);
  assert.equal(reset.moves.length, 0);
  assert.equal(reset.feedback, null);
  assert.equal(reset.hint, null);
  assert.equal(needsResetConfirmation(reset), false);
});

test("recap chooses the three worst stored reviews and returns them in game order", () => {
  const reviews = [
    { verdict: "mistake", reasons: ["First."], betterMove: "b1c3" },
    { verdict: "blunder", reasons: ["Second."], betterMove: "b1c3" },
    { verdict: "mistake", reasons: ["Third."], betterMove: "b1c3" },
    { verdict: "blunder", reasons: ["Fourth."], betterMove: "b1c3" },
  ];
  let state = createGameState();
  state = turn(state, "g1f3", "g8f6", reviews[0]);
  state = turn(state, "f3g1", "f6g8", reviews[1]);
  state = turn(state, "g1f3", "g8f6", reviews[2]);
  const pending = playUserMove(state, "f3g1");
  state = completeCoachAndReply(pending, { review: reviews[3], uci: "f6g8" });
  assert.equal(state.status, "draw");

  const recap = buildRecap(state);
  assert.deepEqual(recap.entries.map((entry) => entry.ply), [1, 3, 7]);
  assert.equal(recap.entries[0], state.moves[0]);
  assert.equal(recap.entries[0].review, reviews[0]);
  assert.equal(recap.entries[2].review, reviews[3]);
  assert.equal(recap.message, null);
});

test("a clean completed game gets an honest empty recap", () => {
  const terminal = createGameState("beginner", "7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
  const recap = buildRecap(terminal);
  assert.deepEqual(recap.entries, []);
  assert.match(recap.message, /avoided any major mistakes/i);
  assert.throws(() => buildRecap(createGameState()), /after the game ends/);
});
