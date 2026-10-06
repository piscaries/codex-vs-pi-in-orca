import assert from "node:assert/strict";
import test from "node:test";

import { createGameState, makeComputerReply, makeUserMove } from "../app/app.js";
import { checkInfo, formatStatus, worstReviews } from "../app/render.js";
import { gameStatus, legalMoves } from "../engine/index.js";

test("a complete local game records coach comments and a matching end review", () => {
  let state = createGameState({ level: "easy" });

  state = makeUserMove(state, "f2f3");
  const firstReview = state.reviews.at(-1);

  assert.equal(state.pending, true);
  assert.equal(state.lastMove.uci, "f2f3");
  assert.equal(firstReview.uci, "f2f3");
  assert.equal(firstReview.ply, 1);
  assert.ok(firstReview.reasons.every((reason) => reason.length > 0));

  state = makeComputerReply(state, "e7e5");
  assert.equal(state.pending, false);
  assert.equal(state.gameOver, false);
  assert.equal(state.moves.map((move) => move.uci).join(" "), "f2f3 e7e5");

  state = makeUserMove(state, "g2g4");
  const losingReview = state.reviews.at(-1);

  assert.equal(state.pending, true);
  assert.equal(losingReview.uci, "g2g4");
  assert.equal(losingReview.verdict, "blunder");
  assert.ok(losingReview.reasons.some((reason) => /checkmate with d8h4/i.test(reason)));
  assert.ok(losingReview.betterMove === null || legalMoves(losingReview.fenBefore).includes(losingReview.betterMove));

  state = makeComputerReply(state, "d8h4");

  assert.equal(state.status, "checkmate");
  assert.equal(gameStatus(state.fen), "checkmate");
  assert.equal(formatStatus(state.status, state.threefold), "Checkmate");
  assert.equal(state.gameOver, true);
  assert.equal(state.pending, false);
  assert.deepEqual(checkInfo(state.fen), { inCheck: true, square: "e1" });
  assert.equal(state.moves.map((move) => move.uci).join(" "), "f2f3 e7e5 g2g4 d8h4");

  const endReview = worstReviews(state.reviews);
  assert.equal(endReview.length, 1);
  assert.equal(endReview[0], losingReview);
  assert.deepEqual(endReview[0].reasons, losingReview.reasons);
  assert.equal(endReview[0].betterMove, losingReview.betterMove);
});

test("computer reply helper refuses illegal scripted replies without changing position", () => {
  const afterUser = makeUserMove(createGameState({ level: "easy" }), "e2e4");
  const rejected = makeComputerReply(afterUser, "e7e6e");

  assert.equal(rejected.fen, afterUser.fen);
  assert.equal(rejected.pending, false);
  assert.match(rejected.message, /Illegal move: e7e6e/);
});
