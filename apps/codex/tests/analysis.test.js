import assert from "node:assert/strict";
import test from "node:test";

import {
  applyUciMove,
  gameStatusForPosition,
  legalMovesFromFen,
  parseFen,
  positionToFen,
  squareToIndex,
} from "../engine/rules.js";
import { hintForPosition, reviewFenMove } from "../engine/coach.js";
import { searchPosition } from "../engine/search.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const SEARCH_FIXTURES = [
  START,
  "7k/8/8/3p4/8/4Q3/8/K7 w - - 0 1",
  "4k3/P7/8/8/8/8/8/4K3 w - - 0 1",
  "4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1",
  "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
];

const COACHING_FIXTURES = [
  {
    fen: "7k/8/8/3p4/8/4Q3/8/K7 w - - 0 1",
    played: "e3e4",
    response: "d5e4",
    reason: "Your opponent can capture your queen on e4 with their pawn from d5.",
  },
  {
    fen: "7k/8/8/3p4/8/4R3/8/K7 w - - 0 1",
    played: "e3e4",
    response: "d5e4",
    reason: "Your opponent can capture your rook on e4 with their pawn from d5.",
  },
  {
    fen: "7k/8/8/3p4/8/5B2/8/K7 w - - 0 1",
    played: "f3e4",
    response: "d5e4",
    reason: "Your opponent can capture your bishop on e4 with their pawn from d5.",
  },
  {
    fen: "7k/8/8/3p4/8/8/5N2/K7 w - - 0 1",
    played: "f2e4",
    response: "d5e4",
    reason: "Your opponent can capture your knight on e4 with their pawn from d5.",
  },
  {
    fen: "k7/8/4q3/8/3P4/8/8/7K b - - 0 1",
    played: "e6e5",
    response: "d4e5",
    reason: "Your opponent can capture your queen on e5 with their pawn from d4.",
  },
  {
    fen: "k7/8/4r3/8/3P4/8/8/7K b - - 0 1",
    played: "e6e5",
    response: "d4e5",
    reason: "Your opponent can capture your rook on e5 with their pawn from d4.",
  },
  {
    fen: "k7/8/5b2/8/3P4/8/8/7K b - - 0 1",
    played: "f6e5",
    response: "d4e5",
    reason: "Your opponent can capture your bishop on e5 with their pawn from d4.",
  },
  {
    fen: "k7/5n2/8/8/3P4/8/8/7K b - - 0 1",
    played: "f7e5",
    response: "d4e5",
    reason: "Your opponent can capture your knight on e5 with their pawn from d4.",
  },
  {
    fen: "3r3k/8/8/8/4Q3/8/8/K7 w - - 0 1",
    played: "e4d4",
    response: "d8d4",
    reason: "Your opponent can capture your queen on d4 with their rook from d8.",
  },
  {
    fen: "7k/6b1/8/8/4Q3/8/8/K7 w - - 0 1",
    played: "e4d4",
    response: "g7d4",
    reason: "Your opponent can capture your queen on d4 with their bishop from g7.",
  },
];

test("search returns legal moves within a bounded deadline across fixtures", () => {
  for (const fen of SEARCH_FIXTURES) {
    const position = parseFen(fen);
    const startedAt = performance.now();
    const result = searchPosition(position, { timeMs: 40, maxDepth: 6 });
    const wallTime = performance.now() - startedAt;
    assert.ok(legalMovesFromFen(fen).includes(result.uci), `${fen}: ${result.uci}`);
    assert.equal(result.uci, `${result.uci}`);
    assert.ok(result.depth >= 0 && result.depth <= 6);
    assert.ok(wallTime < 200, `${fen}: ${wallTime.toFixed(1)}ms`);
  }
});

test("an expired deadline still returns a legal fallback", () => {
  const result = searchPosition(parseFen(START), { timeMs: 0, maxDepth: 8 });
  assert.ok(legalMovesFromFen(START).includes(result.uci));
  assert.equal(result.depth, 0);
  assert.ok(result.elapsedMs < 100);
});

test("search finds and prefers a forced checkmate", () => {
  const fen = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2";
  const result = searchPosition(parseFen(fen), { timeMs: 250, maxDepth: 3 });
  assert.equal(result.uci, "d8h4");
  assert.equal(gameStatusForPosition(applyUciMove(parseFen(fen), result.uci)), "checkmate");
});

test("search validates options and rejects terminal positions", () => {
  const position = parseFen(START);
  for (const options of [null, [], { timeMs: -1 }, { timeMs: Infinity }, { maxDepth: 0 }, { maxDepth: 1.5 }, { noise: -1 }]) {
    assert.throws(() => searchPosition(position, options), TypeError);
  }
  const mate = parseFen("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
  assert.throws(() => searchPosition(mate), RangeError);
});

test("ten severe coaching lines name captures that legal replay proves", () => {
  for (const fixture of COACHING_FIXTURES) {
    const review = reviewFenMove(fixture.fen, fixture.played, { timeMs: 150, maxDepth: 3 });
    assert.ok(["mistake", "blunder"].includes(review.verdict), fixture.played);
    assert.deepEqual(review.reasons, [fixture.reason]);
    assert.ok(legalMovesFromFen(fixture.fen).includes(review.betterMove));
    assert.notEqual(review.betterMove, fixture.played);

    const afterPlayed = applyUciMove(parseFen(fixture.fen), fixture.played);
    const replies = legalMovesFromFen(positionToFen(afterPlayed));
    assert.ok(replies.includes(fixture.response), `${fixture.played}: ${fixture.response}`);
    const afterResponse = applyUciMove(afterPlayed, fixture.response);
    assert.notEqual(positionToFen(afterResponse), positionToFen(afterPlayed));

    const afterBetter = applyUciMove(parseFen(fixture.fen), review.betterMove);
    assert.equal(afterBetter.board[squareToIndex(fixture.response.slice(2, 4))], null);
  }
});

test("a mate explanation and its suggested fix both replay legally", () => {
  const fen = "rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2";
  const review = reviewFenMove(fen, "g2g4", { timeMs: 500, maxDepth: 3 });
  assert.equal(review.verdict, "blunder");
  assert.deepEqual(review.reasons, [
    "Your opponent can checkmate by moving their queen from d8 to h4.",
  ]);
  assert.ok(legalMovesFromFen(fen).includes(review.betterMove));

  const afterPlayed = applyUciMove(parseFen(fen), "g2g4");
  const afterMate = applyUciMove(afterPlayed, "d8h4");
  assert.equal(gameStatusForPosition(afterMate), "checkmate");

  const afterBetter = applyUciMove(parseFen(fen), review.betterMove);
  const sameReply = applyUciMove(afterBetter, "d8h4");
  assert.notEqual(gameStatusForPosition(sameReply), "checkmate");
});

test("positive feedback is brief and hints are legal without changing position", () => {
  const fen = "7k/8/8/8/3r4/4Q3/8/K7 w - - 0 1";
  const review = reviewFenMove(fen, "e3d4", { timeMs: 150, maxDepth: 3 });
  assert.ok(["best", "good"].includes(review.verdict));
  assert.equal(review.betterMove, null);
  assert.equal(review.reasons.length, 1);
  assert.ok(review.reasons[0].split(/(?<=[.!?])\s+/).length <= 2);

  const position = parseFen(START);
  const before = positionToFen(position);
  const hint = hintForPosition(position, { timeMs: 30, maxDepth: 3 });
  assert.ok(legalMovesFromFen(START).includes(hint.uci));
  assert.match(hint.reason, /^Consider moving your \w+ from [a-h][1-8] to [a-h][1-8]\.$/);
  assert.equal(positionToFen(position), before);
});

test("illegal reviews and malformed review options fail explicitly", () => {
  assert.throws(() => reviewFenMove(START, "e2e5"), /Illegal move/);
  assert.throws(() => reviewFenMove(START, "not-a-move"), TypeError);
  assert.throws(() => reviewFenMove(START, "e2e4", { timeMs: -1 }), TypeError);
  assert.throws(() => reviewFenMove(START, "e2e4", { maxDepth: 0 }), TypeError);
});
