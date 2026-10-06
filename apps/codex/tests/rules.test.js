import assert from "node:assert/strict";
import test from "node:test";

import {
  MOVE_FLAGS,
  applyUciMove,
  gameStatusForPosition,
  generateLegalMoves,
  indexToSquare,
  isInCheck,
  legalMovesFromFen,
  moveToUci,
  parseFen,
  parseUci,
  perftPosition,
  positionToFen,
  repetitionKey,
  squareToIndex,
} from "../engine/rules.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
// Published Kiwipete position: https://grandchesstree.com/kiwipete
const KIWIPETE = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";

function apply(fen, uci) {
  return positionToFen(applyUciMove(parseFen(fen), uci));
}

test("square and UCI conversions round-trip", () => {
  for (const square of ["a1", "h1", "a8", "h8", "e4"]) {
    assert.equal(indexToSquare(squareToIndex(square)), square);
  }
  assert.deepEqual(parseUci("a7a8n"), {
    from: squareToIndex("a7"), to: squareToIndex("a8"), promotion: "n",
  });
});

test("parseFen returns fresh values and serializes canonically", () => {
  const first = parseFen(START);
  const second = parseFen(START);
  first.board[squareToIndex("a8")] = null;
  first.castling.delete("K");
  assert.equal(second.board[squareToIndex("a8")], "r");
  assert.equal(second.castling.has("K"), true);
  assert.equal(positionToFen(second), START);
});

test("rejects malformed FEN, squares, UCI, and depths with TypeError", () => {
  const invalidFens = [
    "not a fen",
    "8/8/8/8/8/8/8/K6k w - - 0",
    "8/8/8/8/8/8/8/K6k x - - 0 1",
    "8/8/8/8/8/8/8/K6k w KK - 0 1",
    "8/8/8/8/8/8/8/K6k w - e4 0 1",
    "8/8/8/8/8/8/8/K6k w - - -1 1",
    "8/8/8/8/8/8/8/K6k w - - 0 0",
    "8/8/8/8/8/8/8/8 w - - 0 1",
    "P7/8/8/8/8/8/8/K6k w - - 0 1",
    "11111111/8/8/8/8/8/8/K6k w - - 0 1",
    "8/8/8/8/8/8/4k3/4K3 w - - 0 1",
    "4k3/8/8/8/8/8/8/4K3 b - e3 0 1",
  ];
  for (const fen of invalidFens) assert.throws(() => parseFen(fen), TypeError);
  for (const uci of ["e2-e4", "e7e8k", "e9e4", "E2E4", 12]) {
    assert.throws(() => parseUci(uci), TypeError);
  }
  assert.throws(() => squareToIndex("z1"), TypeError);
  for (const depth of [-1, 1.5, "2"]) {
    assert.throws(() => perftPosition(parseFen(START), depth), TypeError);
  }
});

test("start position perft through depth 3", () => {
  const position = parseFen(START);
  assert.equal(perftPosition(position, 1), 20);
  assert.equal(perftPosition(position, 2), 400);
  assert.equal(perftPosition(position, 3), 8_902);
});

test("kiwipete perft through depth 3", () => {
  const position = parseFen(KIWIPETE);
  assert.equal(perftPosition(position, 1), 48);
  assert.equal(perftPosition(position, 2), 2_039);
  assert.equal(perftPosition(position, 3), 97_862);
});

test("legal moves reject self-check and king moves into attack", () => {
  const pinned = "4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1";
  const moves = legalMovesFromFen(pinned);
  assert.equal(moves.includes("e2d2"), false);
  assert.equal(moves.includes("e2e8"), true);

  const king = "7k/8/8/8/8/8/4r3/4K3 w - - 0 1";
  assert.equal(legalMovesFromFen(king).includes("e1e2"), true);
  assert.equal(legalMovesFromFen(king).includes("e1d1"), true);
});

test("castling moves the rook and updates rights and clocks", () => {
  const fen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 7 14";
  assert.deepEqual(
    legalMovesFromFen(fen).filter((move) => move === "e1g1" || move === "e1c1").sort(),
    ["e1c1", "e1g1"],
  );
  assert.equal(apply(fen, "e1g1"), "r3k2r/8/8/8/8/8/8/R4RK1 b kq - 8 14");
  assert.equal(apply(fen, "e1c1"), "r3k2r/8/8/8/8/8/8/2KR3R b kq - 8 14");
});

test("castling is forbidden through check and without the recorded rook", () => {
  const attacked = "r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1";
  assert.equal(legalMovesFromFen(attacked).includes("e1g1"), false);
  assert.equal(legalMovesFromFen(attacked).includes("e1c1"), true);
  const absent = "4k3/8/8/8/8/8/8/4K3 w KQ - 0 1";
  assert.equal(legalMovesFromFen(absent).some((move) => move.startsWith("e1") && ["c1", "g1"].includes(move.slice(2))), false);
});

test("moving or capturing a rook permanently removes its castling right", () => {
  const moved = apply("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", "h1h2");
  assert.match(moved, / b Qkq /);
  const captured = apply("r3k2r/8/8/8/8/8/7q/R3K2R b KQkq - 0 1", "h2h1");
  assert.match(captured, / w Qkq /);
});

test("en passant is generated, applied, and expires", () => {
  let fen = apply(START, "e2e4");
  assert.equal(fen, "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
  fen = apply(fen, "a7a6");
  fen = apply(fen, "e4e5");
  fen = apply(fen, "d7d5");
  const position = parseFen(fen);
  const epMove = generateLegalMoves(position).find((move) => moveToUci(move) === "e5d6");
  assert.ok(epMove.flags & MOVE_FLAGS.EN_PASSANT);
  assert.equal(apply(fen, "e5d6"), "rnbqkbnr/1pp1pppp/p2P4/8/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3");

  const expired = apply(apply(fen, "a2a3"), "a6a5");
  assert.equal(legalMovesFromFen(expired).includes("e5d6"), false);
});

test("en passant cannot expose the moving side's king", () => {
  const fen = "k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1";
  assert.equal(legalMovesFromFen(fen).includes("e5d6"), false);
});

test("promotion requires a suffix and offers all four choices", () => {
  const fen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
  const promotions = legalMovesFromFen(fen).filter((move) => move.startsWith("a7a8")).sort();
  assert.deepEqual(promotions, ["a7a8b", "a7a8n", "a7a8q", "a7a8r"]);
  assert.throws(() => applyUciMove(parseFen(fen), "a7a8"), /Illegal move/);
  assert.equal(apply(fen, "a7a8n"), "N3k3/8/8/8/8/8/8/4K3 b - - 0 1");
});

test("captures and pawn moves reset halfmove while black increments fullmove", () => {
  const quiet = apply("4k3/8/8/8/8/8/8/R3K3 w - - 17 9", "a1a2");
  assert.match(quiet, / b - - 18 9$/);
  const blackQuiet = apply(quiet, "e8e7");
  assert.match(blackQuiet, / w - - 19 10$/);
  const pawn = apply("4k3/8/8/8/8/8/P7/4K3 w - - 17 9", "a2a3");
  assert.match(pawn, / b - - 0 9$/);
  const capture = apply("4k3/8/8/8/8/8/r7/R3K3 w - - 17 9", "a1a2");
  assert.match(capture, / b - - 0 9$/);
});

test("illegal moves throw without mutating the supplied position", () => {
  const position = parseFen(START);
  const before = positionToFen(position);
  assert.throws(() => applyUciMove(position, "e2e5"), /Illegal move/);
  assert.equal(positionToFen(position), before);
});

test("detects checkmate and stalemate", () => {
  const mate = parseFen("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(isInCheck(mate), true);
  assert.equal(gameStatusForPosition(mate), "checkmate");
  const stalemate = parseFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(isInCheck(stalemate), false);
  assert.equal(gameStatusForPosition(stalemate), "stalemate");
});

test("detects standard insufficient-material draws", () => {
  const draws = [
    "7k/8/8/8/8/8/8/K7 w - - 0 1",
    "7k/8/8/8/8/8/8/KN6 w - - 0 1",
    "7k/8/8/8/8/8/8/K1B5 w - - 0 1",
    "5b1k/8/8/8/8/8/8/K1B5 w - - 0 1",
  ];
  for (const fen of draws) assert.equal(gameStatusForPosition(parseFen(fen)), "draw", fen);
  const oppositeBishops = "2b4k/8/8/8/8/8/8/K1B5 w - - 0 1";
  assert.equal(gameStatusForPosition(parseFen(oppositeBishops)), "ongoing");
  const twoKnights = "7k/8/8/8/8/8/8/KNN5 w - - 0 1";
  assert.equal(gameStatusForPosition(parseFen(twoKnights)), "ongoing");
});

test("fifty-move draw starts at a halfmove clock of 100", () => {
  assert.equal(gameStatusForPosition(parseFen("7k/8/8/8/8/8/8/KR6 w - - 99 1")), "ongoing");
  assert.equal(gameStatusForPosition(parseFen("7k/8/8/8/8/8/8/KR6 w - - 100 1")), "draw");
});

test("terminal no-move result takes precedence over the fifty-move clock", () => {
  const mate = parseFen("7k/6Q1/6K1/8/8/8/8/8 b - - 100 51");
  assert.equal(gameStatusForPosition(mate), "checkmate");
});

test("repetition key omits clocks and normalizes unusable en passant", () => {
  const noEp = parseFen("4k3/8/8/8/4P3/8/8/4K3 b - - 0 1");
  const unusableEp = parseFen("4k3/8/8/8/4P3/8/8/4K3 b - e3 12 9");
  assert.equal(repetitionKey(noEp), repetitionKey(unusableEp));
  const usableEp = parseFen("4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1");
  assert.match(repetitionKey(usableEp), / e3$/);
});
