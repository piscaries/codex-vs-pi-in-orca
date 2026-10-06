// Tests for phase P1 (rules): exactly-legal move generation (castling,
// en passant, promotions, pins), the facade (legalMoves/applyMove/perft/
// gameStatus), and status detection.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseFen, positionToFen } from '../engine/board.js';
import { generateLegalMoves } from '../engine/moves.js';
import { legalMoves, applyMove, perft, gameStatus } from '../engine/index.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';

const sorted = (arr) => [...arr].sort();

describe('perft: standard suite (known node counts)', () => {
  // The six classic perft positions (Chess Programming Wiki). Matching these
  // counts at mixed depths is the evidence that move generation — including
  // castling, en passant, promotions and pins — is exact.
  const cases = [
    { name: 'start position', fen: START, nodes: { 1: 20, 2: 400, 3: 8902, 4: 197281 } },
    { name: 'kiwipete', fen: KIWIPETE, nodes: { 1: 48, 2: 2039, 3: 97862 } },
    {
      name: 'position 3 (ep pins)',
      fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
      nodes: { 1: 14, 2: 191, 3: 2812, 4: 43238, 5: 674624 },
    },
    {
      name: 'position 4 (promotions, castling)',
      fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
      nodes: { 1: 6, 2: 264, 3: 9467, 4: 422333 },
    },
    {
      name: 'position 5 (promotion tactics)',
      fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
      nodes: { 1: 44, 2: 1486, 3: 62379 },
    },
    {
      name: 'position 6',
      fen: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
      nodes: { 1: 46, 2: 2079, 3: 89890 },
    },
  ];

  for (const { name, fen, nodes } of cases) {
    test(`perft ${name}`, () => {
      for (const [depth, expected] of Object.entries(nodes)) {
        assert.equal(perft(fen, Number(depth)), expected, `perft depth ${depth}`);
      }
    });
  }

  test('perft depth 0 is one node', () => {
    assert.equal(perft(START, 0), 1);
    assert.equal(perft(KIWIPETE, 0), 1);
  });

  test('perft rejects bad depth', () => {
    for (const bad of [-1, 1.5, '3', null, NaN]) {
      assert.throws(() => perft(START, bad));
    }
  });

  test('perft depth 1 equals legalMoves length', () => {
    for (const { fen } of cases) {
      assert.equal(perft(fen, 1), legalMoves(fen).length, `perft(1) vs legalMoves for ${fen}`);
    }
  });
});

describe('legalMoves basics', () => {
  test('start position has exactly the 20 opening moves', () => {
    const expected = [];
    for (const f of 'abcdefgh') {
      expected.push(`${f}2${f}3`, `${f}2${f}4`); // 16 pawn moves
    }
    expected.push('b1a3', 'b1c3', 'g1f3', 'g1h3');
    assert.deepEqual(sorted(legalMoves(START)), sorted(expected));
  });

  test('lone king has its three steps', () => {
    assert.deepEqual(sorted(legalMoves('7k/8/8/8/8/8/8/K7 w - - 0 1')), ['a1a2', 'a1b1', 'a1b2']);
  });

  test('moves are well-formed UCI strings without duplicates', () => {
    const moves = legalMoves(KIWIPETE);
    assert.equal(moves.length, new Set(moves).size, 'no duplicates');
    for (const uci of moves) assert.match(uci, /^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
  });

  test('generation leaves the position untouched', () => {
    for (const fen of [START, KIWIPETE, '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1']) {
      const pos = parseFen(fen);
      generateLegalMoves(pos);
      assert.equal(positionToFen(pos), fen, 'position restored after generation');
    }
  });
});

describe('targeted suite: castling legality', () => {
  // `r3k2r/...` with everything empty: both sides may castle both ways.
  test('unobstructed castling both sides, both wings', () => {
    const moves = legalMoves('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    assert.ok(moves.includes('e1g1'), 'white kingside castle');
    assert.ok(moves.includes('e1c1'), 'white queenside castle');
    assert.equal(moves.length, 26);
    const black = legalMoves('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');
    assert.ok(black.includes('e8g8'), 'black kingside castle');
    assert.ok(black.includes('e8c8'), 'black queenside castle');
  });

  test('no castling through an attacked square (rook on f2 hits f1)', () => {
    const moves = legalMoves('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1');
    assert.ok(!moves.includes('e1g1'), 'kingside blocked by attack on f1');
    assert.ok(moves.includes('e1c1'), 'queenside unaffected');
  });

  test('no castling out of check (rook on e2)', () => {
    const moves = legalMoves('4k3/8/8/8/8/8/4r3/R3K2R w KQ - 0 1');
    assert.ok(!moves.includes('e1g1'));
    assert.ok(!moves.includes('e1c1'));
  });

  test('b1 attacked does not stop queenside castling (rook passes, not king)', () => {
    const moves = legalMoves('4k3/8/8/8/8/8/1r6/R3K2R w KQ - 0 1');
    assert.ok(moves.includes('e1c1'), 'queenside castle is legal');
    assert.ok(moves.includes('e1g1'));
  });

  test('no castling when c1 or d1 is attacked', () => {
    assert.ok(!legalMoves('4k3/8/8/8/8/8/2r5/R3K2R w KQ - 0 1').includes('e1c1'), 'c1 attacked');
    assert.ok(!legalMoves('4k3/8/8/8/8/8/3r4/R3K2R w KQ - 0 1').includes('e1c1'), 'd1 attacked');
  });

  test('no castling when the path is occupied', () => {
    const moves = legalMoves('4k3/8/8/8/8/8/8/RN2K1NR w KQ - 0 1');
    assert.ok(!moves.includes('e1g1'), 'g1 occupied');
    assert.ok(!moves.includes('e1c1'), 'b1 occupied');
  });

  test('no castling without rights', () => {
    const moves = legalMoves('4k3/8/8/8/8/8/8/R3K2R w - - 0 1');
    assert.ok(!moves.includes('e1g1'));
    assert.ok(!moves.includes('e1c1'));
  });

  test('right present but rook gone does not castle', () => {
    assert.ok(!legalMoves('4k3/8/8/8/8/8/8/R3K3 w K - 0 1').includes('e1g1'));
  });

  test('black kingside blocked by attack on f8', () => {
    const moves = legalMoves('r3k2r/8/8/8/8/8/8/5R1K b kq - 0 1');
    assert.ok(!moves.includes('e8g8'), 'f8 attacked');
    assert.ok(moves.includes('e8c8'));
  });
});

describe('targeted suite: en passant', () => {
  test('horizontal ep pin makes the capture illegal', () => {
    // exd3 would empty both e4 and d4, opening the 4th rank from Qh4 to Ka4.
    const moves = legalMoves('8/8/8/8/k2Pp2Q/8/8/4K3 b - d3 0 1');
    assert.ok(!moves.includes('e4d3'), 'ep capture exposing the king');
    assert.equal(gameStatus('8/8/8/8/k2Pp2Q/8/8/4K3 b - d3 0 1'), 'ongoing');
  });

  test('same position without the queen allows the ep capture', () => {
    assert.ok(legalMoves('8/8/8/8/k2Pp3/8/8/4K3 b - d3 0 1').includes('e4d3'));
  });

  test('diagonal ep pin makes the capture illegal', () => {
    // cxd3 would empty c4 and d4, opening the a2-e6 diagonal onto the king.
    assert.ok(!legalMoves('8/8/4k3/8/2pP4/8/B7/7K b - d3 0 1').includes('c4d3'));
  });

  test('ep capture applies and clears the captured pawn', () => {
    const after = applyMove('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', 'e5f6');
    assert.equal(after, 'rnbqkbnr/ppp1p1pp/5P2/3p4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3');
  });

  test('ep target expires after another move', () => {
    const after = applyMove('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', 'a2a3');
    assert.ok(after.includes(' - '), 'no ep target after an unrelated move');
    assert.throws(() => applyMove(after, 'e5f6'), /illegal move/);
  });

  test('ep capture without an ep target throws', () => {
    assert.throws(
      () => applyMove('rnbqkbnr/ppp1pppp/8/8/3Pp3/8/PPP1PPPP/RNBQKBNR b KQkq - 0 2', 'e4d3'),
      /illegal move/
    );
  });
});

describe('targeted suite: promotions', () => {
  const PROMO = '2k2r2/4P3/8/8/8/8/8/4K3 w - - 0 1';

  test('all four promotions listed for the push and the capture', () => {
    const moves = legalMoves(PROMO); // d8 is empty: a pawn cannot capture there
    for (const p of ['q', 'r', 'b', 'n']) {
      assert.ok(moves.includes(`e7e8${p}`), `missing e7e8${p}`);
      assert.ok(moves.includes(`e7f8${p}`), `missing e7f8${p}`);
      assert.ok(!moves.includes(`e7d8${p}`), `d8 is empty, no e7d8${p}`);
    }
    // 8 promotions + 3 king moves: rf8 covers the f-file, so f1/f2 are illegal.
    assert.equal(moves.length, 11);
  });

  test('applyMove promotes to exactly the asked piece', () => {
    assert.equal(applyMove(PROMO, 'e7e8q'), '2k1Qr2/8/8/8/8/8/8/4K3 b - - 0 1');
    assert.equal(applyMove(PROMO, 'e7e8n'), '2k1Nr2/8/8/8/8/8/8/4K3 b - - 0 1');
    assert.equal(applyMove(PROMO, 'e7f8q'), '2k2Q2/8/8/8/8/8/8/4K3 b - - 0 1');
  });

  test('black underpromotion to knight', () => {
    const fen = '4k3/8/8/8/8/8/4p3/K7 b - - 0 1';
    assert.deepEqual(
      sorted(legalMoves(fen).filter((m) => m.startsWith('e2'))),
      ['e2e1b', 'e2e1n', 'e2e1q', 'e2e1r']
    );
    assert.equal(applyMove(fen, 'e2e1n'), '4k3/8/8/8/8/8/8/K3n3 w - - 0 2');
  });

  test('promotion without a piece suffix is illegal', () => {
    assert.throws(() => applyMove(PROMO, 'e7e8'), /illegal move/);
    assert.throws(() => applyMove(PROMO, 'e7e8k'), /illegal move/);
  });

  test('promotion suffix on a non-promotion move is illegal', () => {
    assert.throws(() => applyMove(START, 'e2e4q'), /illegal move/);
  });
});

describe('targeted suite: pins and blocking', () => {
  test('pinned pawn cannot advance but may capture the pinner', () => {
    // Bb4 pins Pc3 to Ke1 along a2..e1.
    const moves = legalMoves('4k3/8/8/8/1b6/2P5/8/4K3 w - - 0 1');
    assert.ok(!moves.includes('c3c4'), 'push leaves the pin line');
    assert.ok(moves.includes('c3b4'), 'capturing the pinner stays on it');
  });

  test('double push cannot jump over an occupied square', () => {
    const moves = legalMoves('4k3/8/8/8/8/3p4/3P4/4K3 w - - 0 1'); // pd3 blocks
    assert.ok(!moves.includes('d2d3'));
    assert.ok(!moves.includes('d2d4'));
  });

  test('king cannot step into check', () => {
    const fen = '4k3/8/8/8/8/8/8/1r4K1 w - - 0 1'; // rb1 pins the first rank
    assert.throws(() => applyMove(fen, 'g1f1'), /illegal move/);
    assert.ok(legalMoves(fen).includes('g1f2'));
  });

  test('moving the opponent\u2019s piece is illegal', () => {
    assert.throws(() => applyMove(START, 'e7e5'), /illegal move/);
    assert.throws(() => applyMove(START, 'd7d5'), /illegal move/);
  });
});

describe('applyMove', () => {
  test('opening moves produce correct FENs', () => {
    assert.equal(
      applyMove(START, 'e2e4'),
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    );
    assert.equal(
      applyMove(START, 'g1f3'),
      'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1'
    );
  });

  test('white kingside castling moves the rook too', () => {
    assert.equal(
      applyMove('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1'),
      'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1'
    );
  });

  test('black queenside castling', () => {
    assert.equal(
      applyMove('r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1', 'e8c8'),
      '2kr3r/8/8/8/8/8/8/4K3 w - - 1 2'
    );
  });

  test('rook capture on a8 removes both queenside rights', () => {
    assert.equal(
      applyMove('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'a1a8'),
      'R3k2r/8/8/8/8/8/8/4K2R b Kk - 0 1'
    );
  });

  test('castling without rights throws', () => {
    assert.throws(
      () => applyMove('4k3/8/8/8/8/8/8/R3K2R w - - 0 1', 'e1g1'),
      /illegal move/
    );
  });

  test('blocked and nonsensical moves throw', () => {
    for (const uci of [
      'e2e5', // pawn cannot jump
      'e2f3', // pawn cannot capture an empty square
      'b1b3', // knight cannot
      'a1a2', // own pawn blocks the rook
      'g1e2', // onto own piece
      'e1g1', // castling path blocked from the start position
      'e2e9', 'i2i4', 'e2', 'e2e44', 'e2 e4', '', 'CHECKMATE',
    ]) {
      assert.throws(() => applyMove(START, uci), { message: `illegal move: ${uci}` }, uci);
    }
    for (const bad of [null, undefined, 42, {}, ['e2e4']]) {
      assert.throws(() => applyMove(START, bad), /illegal move/, JSON.stringify(bad));
    }
  });

  test('illegal-move errors name the move', () => {
    assert.throws(() => applyMove(START, 'e7e6'), /^Error: illegal move: e7e6$/);
  });
});

describe('targeted suite: gameStatus', () => {
  // Beyond the design's minimum of 15 FENs: mates, stalemates, fifty-move,
  // insufficient material (draw and non-draw), and ordinary ongoing play.
  const cases = [
    // checkmate
    ['rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', 'checkmate'], // fool's mate
    ['rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 120 63', 'checkmate'], // beats fifty-move
    ['R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', 'checkmate'], // back rank
    ['r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', 'checkmate'], // scholar's
    // stalemate
    ['7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', 'stalemate'],
    ['7k/5Q2/6K1/8/8/8/8/8 b - - 100 80', 'stalemate'], // no legal moves outranks fifty-move
    ['k7/8/1Q6/8/8/8/8/K7 b - - 0 1', 'stalemate'],
    ['5k2/5P2/5K2/8/8/8/8/8 b - - 0 1', 'stalemate'],
    // fifty-move rule
    ['4k3/8/8/8/8/8/4P3/4K3 w - - 100 80', 'draw'],
    ['4k3/8/8/8/8/8/4P3/4K3 b - - 100 99', 'draw'],
    ['4k3/8/8/8/8/8/4P3/4K3 w - - 99 80', 'ongoing'],
    // insufficient material
    ['8/8/4k3/8/8/4K3/8/8 w - - 0 1', 'draw'], // K vs K
    ['8/8/4k3/8/2B5/4K3/8/8 w - - 0 1', 'draw'], // KB vs K
    ['8/8/4k3/2N5/8/4K3/8/8 b - - 3 1', 'draw'], // KN vs K
    ['8/8/4k3/8/2B5/4K3/8/3b4 w - - 0 1', 'draw'], // same-colored bishops
    ['8/8/4k3/8/2B5/4K3/8/4b3 w - - 0 1', 'ongoing'], // opposite-colored bishops
    ['8/8/4k3/8/2B5/2N5/8/4K3 w - - 0 1', 'ongoing'], // bishop + knight can mate
    ['8/8/4k3/8/3n1n2/8/8/4K3 w - - 0 1', 'ongoing'], // two knights are not auto-draw
    // ongoing
    [START, 'ongoing'],
    ['rnbqkbnr/ppp1pppp/8/8/3Pp3/8/PPP1PPPP/RNBQKBNR b KQkq - 0 2', 'ongoing'],
    ['4r3/8/8/8/8/8/8/4K3 w - - 0 1', 'ongoing'], // in check but with escapes
  ];

  for (const [fen, expected] of cases) {
    test(`gameStatus ${fen} → ${expected}`, () => {
      assert.equal(gameStatus(fen), expected);
    });
  }

  test('status table covers the required 15+ FENs', () => {
    assert.ok(cases.length >= 15);
  });
});
