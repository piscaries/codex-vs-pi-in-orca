import assert from "node:assert/strict";
import test from "node:test";

import { applyMove, gameStatus, legalMoves, perft } from "../engine/index.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const KIWIPETE = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";

test("standard perft fixtures match known counts", () => {
  assert.equal(perft(START, 0), 1);
  assert.equal(perft(START, 1), 20);
  assert.equal(perft(START, 2), 400);
  assert.equal(perft(START, 3), 8902);
  assert.equal(perft(KIWIPETE, 1), 48);
  assert.equal(perft(KIWIPETE, 2), 2039);
});

test("castling is generated and updates rook placement and rights", () => {
  const fen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
  const moves = legalMoves(fen);
  assert.ok(moves.includes("e1g1"));
  assert.ok(moves.includes("e1c1"));
  assert.equal(applyMove(fen, "e1g1"), "r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1");
});

test("castling through check is illegal", () => {
  const fen = "r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1";
  assert.ok(!legalMoves(fen).includes("e1g1"));
  assert.throws(() => applyMove(fen, "e1g1"), /Illegal move: e1g1/);
});

test("en passant removes the captured pawn and respects legality", () => {
  const fen = "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2";
  assert.ok(legalMoves(fen).includes("e5d6"));
  assert.equal(applyMove(fen, "e5d6"), "4k3/8/3P4/8/8/8/8/4K3 b - - 0 2");
});

test("promotion requires a valid suffix and places promoted piece", () => {
  const fen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
  const moves = legalMoves(fen);
  assert.deepEqual(
    moves.filter((move) => move.startsWith("a7a8")).sort(),
    ["a7a8b", "a7a8n", "a7a8q", "a7a8r"],
  );
  assert.equal(applyMove(fen, "a7a8q"), "Q3k3/8/8/8/8/8/8/4K3 b - - 0 1");
  assert.throws(() => applyMove(fen, "a7a8"), /Illegal move: a7a8/);
});

test("checkmate and stalemate are reported distinctly", () => {
  assert.equal(gameStatus("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1"), "checkmate");
  assert.equal(gameStatus("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"), "stalemate");
});

test("draws cover the halfmove clock and insufficient material", () => {
  assert.equal(gameStatus("4k3/8/8/8/8/8/8/4K3 w - - 100 75"), "draw");
  assert.equal(gameStatus("4k3/8/8/8/8/8/8/3BK3 b - - 0 1"), "draw");
});

test("illegal moves throw and do not fabricate a new position", () => {
  assert.throws(() => applyMove(START, "e2e5"), /Illegal move: e2e5/);
  assert.throws(() => legalMoves("not a fen"), /Invalid FEN/);
});
