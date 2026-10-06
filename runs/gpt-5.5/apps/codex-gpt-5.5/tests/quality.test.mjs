import assert from "node:assert/strict";
import test from "node:test";

import { applyMove, gameStatus, legalMoves, reviewMove } from "../engine/index.js";

const REVIEW_FIXTURES = [
  {
    name: "queen walks into a knight capture",
    fen: "4k3/8/5n2/8/8/8/8/3QK3 w - - 0 1",
    move: "d1h5",
    verdicts: ["blunder"],
    expectedText: /capture the queen on h5/i,
    opponentReply: "f6h5",
  },
  {
    name: "queen walks into a rook capture",
    fen: "4k2r/8/8/8/8/8/8/3QK3 w - - 0 1",
    move: "d1h5",
    verdicts: ["blunder"],
    expectedText: /capture the queen on h5/i,
    opponentReply: "h8h5",
  },
  {
    name: "rook walks onto a bishop diagonal",
    fen: "4k3/8/8/8/8/8/1b6/R3K3 w - - 0 1",
    move: "a1a3",
    verdicts: ["mistake"],
    expectedText: /capture the rook on a3/i,
    opponentReply: "b2a3",
  },
  {
    name: "rook walks onto a queen file",
    fen: "4k3/8/8/8/q7/8/8/R3K3 w - - 0 1",
    move: "a1a3",
    verdicts: ["blunder"],
    expectedText: /capture the rook on a3/i,
    opponentReply: "a4a3",
  },
  {
    name: "queen walks onto a bishop diagonal",
    fen: "4k3/8/8/1b6/8/8/8/3QK3 w - - 0 1",
    move: "d1a4",
    verdicts: ["blunder"],
    expectedText: /capture the queen on a4/i,
    opponentReply: "b5a4",
  },
  {
    name: "weak pawn move permits mate",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq e6 0 2",
    move: "g2g4",
    verdicts: ["blunder"],
    expectedText: /deliver checkmate with d8h4/i,
    opponentReply: "d8h4",
    replyStatus: "checkmate",
  },
];

test("sampled mistake comments name true consequences and legal fixes", () => {
  for (const fixture of REVIEW_FIXTURES) {
    const result = reviewMove(fixture.fen, fixture.move);
    const afterMove = applyMove(fixture.fen, fixture.move);

    assert.ok(fixture.verdicts.includes(result.verdict), `${fixture.name}: unexpected ${result.verdict}`);
    assert.ok(result.reasons.some((reason) => fixture.expectedText.test(reason)), `${fixture.name}: ${result.reasons}`);
    assert.ok(legalMoves(afterMove).includes(fixture.opponentReply), `${fixture.name}: reply must be legal`);
    assert.ok(result.betterMove === null || legalMoves(fixture.fen).includes(result.betterMove));

    assert.ok(result.reasons.length >= 1);
    assert.ok(result.reasons.length <= 2, `${fixture.name}: too many reason sentences`);
    for (const reason of result.reasons) {
      assert.doesNotMatch(reason, /\d+\.\d+|centipawn|engine|evaluation|score/i, fixture.name);
      assert.ok(reason.length <= 120, `${fixture.name}: reason is too long`);
      assert.match(reason, /[.!?]$/, `${fixture.name}: reason should read as a sentence`);
    }

    const afterReply = applyMove(afterMove, fixture.opponentReply);
    if (fixture.replyStatus) {
      assert.equal(gameStatus(afterReply), fixture.replyStatus, fixture.name);
    }
  }
});
