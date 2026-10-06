// Hidden acceptance tests for the Chess Coach engine (owner-only; not visible to builders).
// usage: CHESS_ENGINE=/abs/path/chess-coach/engine/index.js node --test acceptance.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const E = await import(pathToFileURL(process.env.CHESS_ENGINE).href);
const board = (fen) => fen.split(' ').slice(0, 2).join(' ');
const castling = (fen) => fen.split(' ')[2];

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
const POS3 = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
const POS4 = 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1';
const POS5 = 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8';
const POS6 = 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10';
const BACK_RANK = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';        // Rd8#
const BACK_RANK_B = '3r2k1/8/8/8/8/8/5PPP/6K1 b - - 0 1';         // ...Rd1#
const SCHOLAR = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'; // Qxf7#
const HANG_W = '4k3/8/8/2p5/8/8/8/3QK3 w - - 0 1';               // Qd4?? cxd4
const HANG_B = '3qk3/8/8/8/2P5/8/8/4K3 b - - 0 1';               // ...Qd5?? cxd5

// --- Rules: perft (standard reference counts) ---
const PERFT = [
  ['start', START, [20, 400, 8902, 197281]],
  ['kiwipete', KIWIPETE, [48, 2039, 97862]],
  ['pos3', POS3, [14, 191, 2812, 43238]],
  ['pos4', POS4, [6, 264, 9467]],
  ['pos5', POS5, [44, 1486, 62379]],
  ['pos6', POS6, [46, 2079, 89890]],
];
for (const [name, fen, counts] of PERFT)
  counts.forEach((n, i) =>
    test(`perft ${name} depth ${i + 1} = ${n}`, { timeout: 60_000 }, () =>
      assert.equal(E.perft(fen, i + 1), n)));

test('perft deep: start depth 5 and kiwipete depth 4', { timeout: 300_000 }, () => {
  assert.equal(E.perft(START, 5), 4865609);
  assert.equal(E.perft(KIWIPETE, 4), 4085603);
});

// --- Rules: moves and status ---
test('legalMoves: start position has 20 moves including g1f3', () => {
  const m = E.legalMoves(START);
  assert.equal(m.length, 20);
  assert.ok(m.includes('g1f3'));
});
test('legalMoves: promotion lists all four pieces', () => {
  const m = E.legalMoves('8/P7/8/8/8/8/8/k6K w - - 0 1');
  for (const p of 'qrbn') assert.ok(m.includes('a7a8' + p), p);
  assert.ok(!m.includes('a7a8'));
});
test('applyMove: en passant removes the captured pawn', () =>
  assert.equal(board(E.applyMove('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', 'e5f6')),
    'rnbqkbnr/ppp1p1pp/5P2/3p4/8/8/PPPP1PPP/RNBQKBNR b'));
test('applyMove: castling moves the rook and drops rights', () => {
  const f = E.applyMove('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1');
  assert.equal(board(f), 'r3k2r/8/8/8/8/8/8/R4RK1 b');
  assert.equal(castling(f), 'kq');
});
test('applyMove: promotion', () =>
  assert.equal(board(E.applyMove('8/P7/8/8/8/8/8/k6K w - - 0 1', 'a7a8q')), 'Q7/8/8/8/8/8/8/k6K b'));
test('applyMove: illegal move throws', () => assert.throws(() => E.applyMove(START, 'e2e5')));
test('gameStatus: checkmate', () => assert.equal(E.gameStatus(E.applyMove(SCHOLAR, 'h5f7')), 'checkmate'));
test('gameStatus: back-rank checkmate', () => assert.equal(E.gameStatus(E.applyMove(BACK_RANK, 'd1d8')), 'checkmate'));
test('gameStatus: stalemate', () => assert.equal(E.gameStatus('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'), 'stalemate'));
test('gameStatus: insufficient material is a draw', () => assert.equal(E.gameStatus('8/8/4k3/8/8/4K3/8/8 w - - 0 1'), 'draw'));
test('gameStatus: fifty-move rule is a draw', () => assert.equal(E.gameStatus('4k3/8/8/8/8/8/R7/4K3 w - - 100 80'), 'draw'));
test('gameStatus: start is ongoing', () => assert.equal(E.gameStatus(START), 'ongoing'));

// --- Engine: finds mates, avoids hanging the queen, respects time ---
for (const [name, fen, mate] of [['white back rank', BACK_RANK, 'd1d8'], ['black back rank', BACK_RANK_B, 'd8d1'], ['scholar', SCHOLAR, 'h5f7']])
  test(`bestMove finds mate in one: ${name}`, { timeout: 10_000 }, () => assert.equal(E.bestMove(fen, { timeMs: 1000 }), mate));
test('bestMove does not hang the queen', { timeout: 10_000 }, () => assert.notEqual(E.bestMove(HANG_W, { timeMs: 500 }), 'd1d4'));
test('bestMove returns a legal move from the start within 2x time', { timeout: 10_000 }, () => {
  const t = Date.now();
  const m = E.bestMove(START, { timeMs: 500 });
  assert.ok(Date.now() - t < 1300, `took ${Date.now() - t} ms`);
  assert.ok(E.legalMoves(START).includes(m));
});

// --- Coach: verdicts that are clearly right or clearly wrong ---
const BAD = ['mistake', 'blunder'];
for (const [name, fen, move] of [['white queen hangs', HANG_W, 'd1d4'], ['black queen hangs', HANG_B, 'd8d5']])
  test(`reviewMove flags a hung queen: ${name}`, { timeout: 15_000 }, () => {
    const r = E.reviewMove(fen, move);
    assert.ok(BAD.includes(r.verdict), r.verdict);
    assert.ok(r.reasons.length > 0);
    assert.ok(r.betterMove && r.betterMove !== move && E.legalMoves(fen).includes(r.betterMove));
  });
for (const [name, fen, move] of [['mate is best', SCHOLAR, 'h5f7'], ['back-rank mate is best', BACK_RANK, 'd1d8']])
  test(`reviewMove: ${name}`, { timeout: 15_000 }, () => assert.equal(E.reviewMove(fen, move).verdict, 'best'));
test('reviewMove does not flag 1.e4', { timeout: 15_000 }, () =>
  assert.ok(!BAD.includes(E.reviewMove(START, 'e2e4').verdict)));
