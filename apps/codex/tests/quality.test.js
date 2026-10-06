import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildRecap,
  completeCoachAndReply,
  createGameState,
  playUserMove,
} from "../app/game.js";
import { reviewFenMove } from "../engine/coach.js";
import {
  applyUciMove,
  legalMovesFromFen,
  parseFen,
  positionToFen,
  squareToIndex,
} from "../engine/rules.js";

const fixture = JSON.parse(await readFile(
  new URL("./fixtures/coaching.json", import.meta.url),
  "utf8",
));
const demo = await readFile(new URL("../DEMO.md", import.meta.url), "utf8");

const PIECE_NAMES = Object.freeze({ q: "queen", r: "rook", b: "bishop", n: "knight" });
let workerMessageHandler = null;
let workerResponse = null;

globalThis.self = {
  addEventListener(type, handler) {
    if (type === "message") workerMessageHandler = handler;
  },
  postMessage(message) {
    workerResponse = message;
  },
};
await import("../app/worker.js");

function moveWords(uci) {
  const promotion = uci[4] ? ` and promote to a ${PIECE_NAMES[uci[4]]}` : "";
  return `move from ${uci.slice(0, 2)} to ${uci.slice(2, 4)}${promotion}`;
}

function displayedComment(review) {
  const reason = review.reasons[0] ?? "";
  return review.betterMove ? `${reason} Try ${moveWords(review.betterMove)}.` : reason;
}

function sentenceCount(copy) {
  return copy.match(/[.!?](?=\s|$)/g)?.length ?? 0;
}

function sendWorkerRequest(data) {
  workerResponse = null;
  workerMessageHandler({ data });
  assert.ok(workerResponse, `worker did not answer request ${data.id}`);
  return workerResponse;
}

test("twenty curated comments stay concise, plain, and calibrated", () => {
  assert.equal(fixture.cases.length, 20);
  assert.equal(fixture.cases.filter(({ kind }) => kind === "severe").length, 10);

  for (const item of fixture.cases) {
    const review = reviewFenMove(item.fen, item.played, fixture.reviewOptions);
    assert.equal(review.verdict, item.expectedVerdict, item.id);
    assert.deepEqual(review.reasons, [item.expectedReason], item.id);
    assert.equal(review.betterMove, item.expectedBetterMove, item.id);
    assert.equal(displayedComment(review), item.expectedDisplay, item.id);
    assert.ok(sentenceCount(item.expectedDisplay) <= 2, item.id);
    assert.doesNotMatch(item.expectedDisplay, /\b(?:centipawn|evaluation|eval|score)\b|[+-]\d+(?:\.\d+)?/i, item.id);

    if (item.kind === "severe") {
      assert.ok(["mistake", "blunder"].includes(review.verdict), item.id);
      assert.match(item.expectedDisplay, /opponent can capture your (?:queen|rook|bishop|knight) on [a-h][1-8]/i, item.id);
      assert.match(item.expectedDisplay, /Try move from [a-h][1-8] to [a-h][1-8]/, item.id);
    }
  }
});

test("the human audit sheet contains every frozen display comment", () => {
  for (const item of fixture.cases) {
    assert.ok(
      demo.includes(`| ${item.id} |`) && demo.includes(`| ${item.expectedDisplay} |`),
      item.id,
    );
  }
});

test("all ten severe explanations and improvements are proved by legal replay", () => {
  for (const item of fixture.cases.filter(({ kind }) => kind === "severe")) {
    const before = parseFen(item.fen);
    const afterPlayed = applyUciMove(before, item.played);
    const responseTarget = squareToIndex(item.response.slice(2, 4));
    const responseOrigin = squareToIndex(item.response.slice(0, 2));
    const victim = afterPlayed.board[responseTarget];
    const attacker = afterPlayed.board[responseOrigin];

    assert.ok(victim, `${item.id}: played piece is present on the named square`);
    assert.ok(attacker, `${item.id}: responding piece is present on the named square`);
    assert.ok(legalMovesFromFen(positionToFen(afterPlayed)).includes(item.response), item.id);

    const afterResponse = applyUciMove(afterPlayed, item.response);
    assert.equal(afterResponse.board[responseOrigin], null, item.id);
    assert.equal(afterResponse.board[responseTarget], attacker, item.id);
    assert.notEqual(afterResponse.board[responseTarget], victim, item.id);

    const afterBetter = applyUciMove(before, item.expectedBetterMove);
    assert.equal(afterBetter.board[responseTarget], null, `${item.id}: fix removes the target`);
  }
});

test("the three worker profiles make distinct legal choices on the calibration position", () => {
  const fen = "7k/8/8/3p4/8/4Q3/8/K7 w - - 0 1";
  const profiles = ["beginner", "club", "challenging"];
  const hints = [];

  for (const [offset, profile] of profiles.entries()) {
    const startedAt = performance.now();
    const response = sendWorkerRequest({ id: offset + 1, type: "hint", fen, profile });
    const elapsedMs = performance.now() - startedAt;
    assert.equal(response.ok, true, profile);
    assert.ok(legalMovesFromFen(fen).includes(response.hint.uci), profile);
    assert.ok(elapsedMs < 2_000, `${profile} hint took ${elapsedMs.toFixed(1)}ms`);
    hints.push(response.hint.uci);
  }

  assert.equal(new Set(hints).size, profiles.length, JSON.stringify(hints));
});

test("a complete legal game ends with a recap identical to stored feedback", () => {
  let state = createGameState("challenging");

  let pending = playUserMove(state, "f2f3");
  const firstReview = reviewFenMove(state.fen, "f2f3", { timeMs: 500, maxDepth: 3 });
  state = completeCoachAndReply(pending, { review: firstReview, uci: "e7e5" });

  pending = playUserMove(state, "g2g4");
  const finalReview = reviewFenMove(state.fen, "g2g4", { timeMs: 500, maxDepth: 3 });
  state = completeCoachAndReply(pending, { review: finalReview, uci: "d8h4" });

  assert.equal(state.status, "checkmate");
  assert.equal(state.moves.length, 4);
  for (let index = 0; index < state.moves.length; index += 1) {
    const move = state.moves[index];
    assert.equal(move.ply, index + 1);
    assert.equal(positionToFen(applyUciMove(parseFen(move.fenBefore), move.uci)), move.fenAfter);
    if (index > 0) assert.equal(move.fenBefore, state.moves[index - 1].fenAfter);
  }

  assert.equal(finalReview.verdict, "blunder");
  assert.deepEqual(finalReview.reasons, [
    "Your opponent can checkmate by moving their queen from d8 to h4.",
  ]);
  const recap = buildRecap(state);
  assert.equal(recap.entries.length, 1);
  assert.equal(recap.entries[0], state.moves[2]);
  assert.equal(recap.entries[0].review, finalReview);
  assert.equal(recap.entries[0].review.reasons[0], state.feedback.reasons[0]);
  assert.equal(recap.message, null);
});
