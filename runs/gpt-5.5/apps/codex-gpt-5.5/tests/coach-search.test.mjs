import assert from "node:assert/strict";
import test from "node:test";

import { bestMove, bestMoveForLevel, hint, legalMoves, reviewMove } from "../engine/index.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

test("bestMove returns a legal move within the requested budget", () => {
  const started = Date.now();
  const move = bestMove(START, { timeMs: 80 });
  const elapsed = Date.now() - started;

  assert.ok(legalMoves(START).includes(move));
  assert.ok(elapsed < 500, `search took ${elapsed}ms`);
});

test("bestMove returns null when no move is available", () => {
  assert.equal(bestMove("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1", { timeMs: 80 }), null);
});

test("strength helper always chooses legal level moves", () => {
  for (const level of ["easy", "normal", "hard", "unknown"]) {
    const move = bestMoveForLevel(START, level);
    assert.ok(legalMoves(START).includes(move), `${level} returned ${move}`);
  }
});

test("hint returns a legal move with a short reason", () => {
  const result = hint(START, { timeMs: 80 });
  assert.ok(legalMoves(START).includes(result.move));
  assert.equal(typeof result.reason, "string");
  assert.ok(result.reason.length > 0);
  assert.ok(!/\d+\.\d+|centipawn|engine/i.test(result.reason));
});

test("reviewMove returns the fixed verdict shape", () => {
  const result = reviewMove(START, "e2e4");
  assert.ok(["best", "good", "inaccuracy", "mistake", "blunder"].includes(result.verdict));
  assert.ok(Array.isArray(result.reasons));
  assert.ok(result.reasons.every((reason) => typeof reason === "string" && reason.length > 0));
  assert.ok(result.betterMove === null || legalMoves(START).includes(result.betterMove));
});

test("sampled queen blunder has a true capture reason and legal better move", () => {
  const fen = "4k3/8/5n2/8/8/8/8/3QK3 w - - 0 1";
  const result = reviewMove(fen, "d1h5");

  assert.equal(result.verdict, "blunder");
  assert.ok(result.reasons.some((reason) => /capture the queen on h5/i.test(reason)));
  assert.ok(result.betterMove === null || legalMoves(fen).includes(result.betterMove));
});

test("reviewMove rejects illegal moves", () => {
  assert.throws(() => reviewMove(START, "e2e5"), /Illegal move: e2e5/);
});
