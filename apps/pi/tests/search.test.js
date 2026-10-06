// Tests for phase P2 (search & levels): evaluation, seeded randomness, the
// steppable search, the bestMove facade, and level move selection — including
// the design's done-when checks: legality and time bound over 50 FENs, mate
// in one in all 10 mate FENs, and honest level weakening.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseFen } from '../engine/board.js';
import { moveToUci } from '../engine/moves.js';
import { legalMoves, applyMove, gameStatus, bestMove } from '../engine/index.js';
import { evaluate, evaluateStm } from '../engine/eval.js';
import { rng, intBelow } from '../engine/rng.js';
import { createSearch, scoreRootMoves } from '../engine/search.js';
import { LEVELS, levelConfig, pickMove } from '../engine/levels.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';

describe('eval: material and piece-square tables', () => {
  test('start position is exactly balanced', () => {
    assert.equal(evaluate(parseFen(START)), 0);
  });

  test('a queen up is worth about a queen', () => {
    // Queen on a1: 900 material + (-20) table + symmetric king tables = 880.
    const score = evaluate(parseFen('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1'));
    assert.ok(score >= 800 && score <= 1000, `queen advantage ${score} cp out of range`);
  });

  test('knight on e4 is material plus table bonus', () => {
    assert.equal(evaluate(parseFen('4k3/8/8/8/4N3/8/8/4K3 w - - 0 1')), 340);
  });

  test('bare kings use the endgame king table (asymmetric position)', () => {
    // Ka1 vs Ke8: endgame table gives White -50 / Black -30 → -20; the
    // middlegame table would give +20, so this pins the phase switch.
    assert.equal(evaluate(parseFen('4k3/8/8/8/8/8/8/K7 w - - 0 1')), -20);
  });

  test('evaluateStm flips the sign for the side to move', () => {
    const pos = parseFen('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');
    assert.equal(evaluateStm(pos), evaluate(pos));
    const flipped = parseFen('4k3/8/8/8/8/8/8/Q3K3 b - - 0 1');
    assert.equal(evaluateStm(flipped), -evaluate(pos));
  });
});

describe('rng: seeded determinism', () => {
  test('same seed, same sequence; different seeds differ', () => {
    const a = rng(123);
    const b = rng(123);
    const c = rng(124);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    const seqC = Array.from({ length: 100 }, () => c());
    assert.deepEqual(seqA, seqB);
    assert.notDeepEqual(seqA, seqC);
  });

  test('values are floats in [0, 1) and vary', () => {
    const random = rng(7);
    const values = Array.from({ length: 1000 }, () => random());
    assert.ok(values.every((v) => v >= 0 && v < 1));
    assert.ok(new Set(values).size > 900);
  });

  test('intBelow stays in range', () => {
    const random = rng(99);
    for (let i = 0; i < 1000; i++) {
      const n = intBelow(random, 5);
      assert.ok(Number.isInteger(n) && n >= 0 && n < 5);
    }
  });
});

describe('createSearch: steppable iterative deepening', () => {
  test('result shape: {done, move, scoreCp, depth}, move is legal at the end', () => {
    const search = createSearch(parseFen(KIWIPETE), 300);
    let result;
    do {
      result = search.step();
      assert.deepEqual(Object.keys(result).sort(), ['depth', 'done', 'move', 'scoreCp']);
    } while (!result.done);
    assert.ok(legalMoves(KIWIPETE).includes(result.move));
  });

  test('reaches several depths and settles deep within its budget', () => {
    const search = createSearch(parseFen(KIWIPETE), 1200);
    const depths = [];
    let result;
    do {
      result = search.step();
      depths.push(result.depth);
    } while (!result.done);
    assert.ok(result.depth >= 3, `reached only depth ${result.depth}`);
    assert.ok(depths[0] >= 1);
  });

  test('step() after done keeps returning the same answer', () => {
    const search = createSearch(parseFen(START), 100);
    let result;
    do {
      result = search.step();
    } while (!result.done);
    const again = search.step();
    assert.equal(again.done, true);
    assert.equal(again.move, result.move);
  });

  test('scores are from the side to move\'s perspective', () => {
    const losing = createSearch(parseFen('4k3/8/8/8/8/8/8/Q3K3 b - - 0 1'), 100);
    let black = losing.step();
    while (!black.done) black = losing.step();
    assert.ok(black.scoreCp < -800, `Black-to-move score ${black.scoreCp} should be very negative`);

    const winning = createSearch(parseFen('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1'), 100);
    let white = winning.step();
    while (!white.done) white = winning.step();
    assert.ok(white.scoreCp > 800, `White-to-move score ${white.scoreCp} should be very positive`);
  });

  test('a mate in one is reported with a mate score', () => {
    const search = createSearch(parseFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'), 100);
    let result;
    do {
      result = search.step();
    } while (!result.done);
    assert.equal(result.scoreCp, 100000 - 1);
    assert.equal(result.move, 'a1a8');
  });

  test('a position with no legal moves reports done with no move', () => {
    const search = createSearch(parseFen('R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1'), 100);
    const result = search.step();
    assert.deepEqual(result, { done: true, move: null, scoreCp: 0, depth: 0 });
  });

  test('scoreRootMoves is deterministic and best-first', () => {
    const pos = parseFen('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1');
    const a = scoreRootMoves(pos.clone(), { maxDepth: 2, budgetMs: 60000 });
    const b = scoreRootMoves(pos.clone(), { maxDepth: 2, budgetMs: 60000 });
    assert.equal(a.depth, 2);
    assert.deepEqual(a.moves.map((m) => [m.move.from, m.move.to, m.scoreCp]).flat(),
      b.moves.map((m) => [m.move.from, m.move.to, m.scoreCp]).flat());
    const scores = a.moves.map((m) => m.scoreCp);
    assert.deepEqual(scores, [...scores].sort((x, y) => y - x));
  });
});

describe('bestMove facade', () => {
  // 30 positions from a seeded random game plus 20 fixed positions spanning
  // openings, tactical middlegames, endgames, en passant and castling.
  const CURATED = [
    KIWIPETE,
    START,
    '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
    '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
    '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1',
    '8/8/8/2k5/3Pp3/8/8/4K3 b - d3 0 1',
    '8/P7/8/8/8/8/7p/K6k w - - 0 1',
    'rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    '2r3k1/5ppp/8/8/8/8/1Q6/6K1 w - - 0 1',
    '8/8/1k6/2q5/8/8/8/K7 b - - 0 1',
    'r1bq1rk1/pp2ppbp/2np1np1/8/2BNP3/2N1BP2/PPPQ2PP/R3K2R w KQ - 0 9',
    '8/2k5/8/8/8/8/6PP/4K3 w - - 0 1',
    '3rk2r/8/8/8/8/8/8/4K3 b k - 0 1',
    '4q3/8/8/8/8/8/8/2Q1K2R w K - 0 1',
    'k7/8/8/8/8/8/8/K6R w - - 0 1',
    'rnb1kbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', // one move before fool's mate
    '8/8/8/8/8/1k6/p7/B6K w - - 0 1',
  ];

  function randomPositions(count, seed) {
    const random = rng(seed);
    const fens = [];
    let fen = START;
    let plies = 0;
    while (fens.length < count) {
      if (plies > 120 || gameStatus(fen) !== 'ongoing') {
        fen = START;
        plies = 0;
        continue;
      }
      fens.push(fen);
      const moves = legalMoves(fen);
      fen = applyMove(fen, moves[intBelow(random, moves.length)]);
      plies += 1;
    }
    return fens;
  }

  test('legal and within timeMs + 50 ms on 50 positions', () => {
    const fens = [...randomPositions(30, 20261001), ...CURATED];
    assert.equal(fens.length, 50);
    for (const fen of fens) {
      const started = Date.now();
      const uci = bestMove(fen, { timeMs: 150 });
      const elapsed = Date.now() - started;
      assert.ok(legalMoves(fen).includes(uci), `${uci} is not legal in ${fen}`);
      assert.ok(elapsed <= 150 + 50, `took ${elapsed} ms (limit 200) in ${fen}`);
    }
  });

  test('a small budget is honored too', () => {
    const started = Date.now();
    const uci = bestMove(KIWIPETE, { timeMs: 50 });
    const elapsed = Date.now() - started;
    assert.ok(legalMoves(KIWIPETE).includes(uci));
    assert.ok(elapsed <= 50 + 50, `took ${elapsed} ms (limit 100)`);
  });

  test('options may be omitted entirely (default 1000 ms)', () => {
    const started = Date.now();
    const uci = bestMove('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');
    const elapsed = Date.now() - started;
    assert.ok(legalMoves('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1').includes(uci));
    assert.ok(elapsed <= 1050);
  });

  test('throws on terminal positions (checkmate, stalemate, draws)', () => {
    const terminals = [
      ['R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', 'checkmate'],
      ['7k/5Q2/8/8/8/8/8/K7 b - - 0 1', 'stalemate'],
      ['4k3/8/8/8/8/8/8/4K3 w - - 100 80', 'draw'],
      ['8/8/4k3/8/8/4K3/8/8 w - - 0 1', 'draw'],
    ];
    for (const [fen, expected] of terminals) {
      assert.equal(gameStatus(fen), expected);
      assert.throws(() => bestMove(fen), { message: new RegExp(expected) });
    }
  });

  test('grabs a free queen', () => {
    // Rook can take the undefended queen on a5; nothing in return.
    const fen = '6k1/8/8/qR6/8/8/8/4K3 w - - 0 1';
    assert.equal(bestMove(fen, { timeMs: 500 }), 'b5a5');
  });
});

describe('mate in one is found in all 10 mate positions', () => {
  const MATES = [
    '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', // back-rank rook
    'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', // scholar's mate
    '7k/8/6K1/8/8/8/8/3Q4 w - - 0 1', // queen to the eighth
    'k7/8/1K6/8/8/8/8/7R w - - 0 1', // rook on the eighth, king covers flight
    '6rk/6pp/8/6N1/8/8/8/7K w - - 0 1', // smothered mate
    'k7/6R1/8/8/8/8/8/K6R w - - 0 1', // rook ladder (rook out of the king's reach)
    '4k3/8/3K4/8/7Q/8/8/8 w - - 0 1', // queen supported by king
    'r5k1/8/8/8/8/8/5PPP/6K1 b - - 0 1', // Black mates on the first rank
    '7k/5P2/6K1/8/8/8/8/8 w - - 0 1', // promotion mate
    '1k6/8/2K5/8/8/8/8/1Q6 w - - 0 1', // queen and king box
  ];

  for (const [i, fen] of MATES.entries()) {
    test(`mate position ${i + 1}`, () => {
      assert.equal(gameStatus(fen), 'ongoing', 'fixture must not already be over');
      const uci = bestMove(fen, { timeMs: 300 });
      assert.ok(legalMoves(fen).includes(uci), `${uci} is not legal`);
      assert.equal(gameStatus(applyMove(fen, uci)), 'checkmate', `${uci} must mate`);
    });
  }
});

describe('levels', () => {
  const MIDDLEGAME = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1';

  test('four ordered levels exist; unknown levels throw', () => {
    assert.equal(LEVELS.length, 4);
    for (const level of [1, 2, 3, 4]) assert.equal(levelConfig(level).level, level);
    assert.throws(() => levelConfig(0), RangeError);
    assert.throws(() => levelConfig(5), RangeError);
  });

  test('weakness decreases as the level rises (FR-003 ordering)', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      assert.ok(LEVELS[i].blunderChance <= LEVELS[i - 1].blunderChance);
    }
    assert.equal(LEVELS[3].blunderChance, 0);
    assert.equal(LEVELS[3].candidatePool, 1);
  });

  test('every level answers with a legal move', () => {
    const random = rng(2026);
    const fens = [START, MIDDLEGAME, '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1'];
    for (const level of [1, 2, 3]) {
      for (const fen of fens) {
        const uci = pickMove(parseFen(fen), level, random);
        assert.ok(legalMoves(fen).includes(uci), `level ${level}: ${uci} not legal in ${fen}`);
      }
    }
    const started = Date.now();
    const uci = pickMove(parseFen(MIDDLEGAME), 4, random);
    assert.ok(legalMoves(MIDDLEGAME).includes(uci));
    assert.ok(Date.now() - started < 2000, 'level 4 replies within 2 s');
  });

  test('a lucky random stream plays the top move; an unlucky one stays in the pool', () => {
    const pos = parseFen(MIDDLEGAME);
    const config = levelConfig(1); // depth 1, pool 5
    const scored = scoreRootMoves(pos.clone(), {
      maxDepth: config.maxDepth,
      budgetMs: config.budgetMs,
    }).moves;
    const bestUci = moveToUci(scored[0].move);
    const poolUcis = scored.slice(0, config.candidatePool).map((entry) => moveToUci(entry.move));

    // 0.999999 is never below the blunder chance, so the level plays its best.
    const lucky = () => 0.999999;
    assert.equal(pickMove(pos.clone(), 1, lucky), bestUci);

    // First draw below the chance enters the pool; the second picks its last
    // entry, so the answer must come from the candidate pool.
    let calls = 0;
    const unlucky = () => (calls++ === 0 ? 0.0 : 0.999999);
    const picked = pickMove(pos.clone(), 1, unlucky);
    assert.ok(poolUcis.includes(picked), `${picked} must be one of ${poolUcis.join(', ')}`);
    assert.equal(picked, poolUcis[poolUcis.length - 1]);
  });
});
