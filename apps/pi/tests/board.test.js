// Tests for the board core (phase P0): FEN in/out, make/unmake, check detection.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFBOARD,
  parseFen,
  positionToFen,
  sqIndex,
  sqName,
  findKing,
  isCheck,
  isSquareAttacked,
  createMove,
  makeMove,
  unmakeMove,
  FLAG_NORMAL,
  FLAG_EP,
  FLAG_CASTLE_K,
  FLAG_CASTLE_Q,
  FLAG_DOUBLE,
} from '../engine/board.js';

// A full structural snapshot of a position: board cells plus every state field.
// Used to prove that make/unmake restores the position *exactly*.
function snapshot(pos) {
  return {
    board: pos.board.map((p) => (p === OFFBOARD ? '.' : p === null ? '-' : p)).join(''),
    turn: pos.turn,
    castling: pos.castling,
    ep: pos.ep,
    halfmove: pos.halfmove,
    fullmove: pos.fullmove,
  };
}

// Play `from`->`to` on `pos`, assert the resulting FEN, unmake, and assert the
// position is restored exactly. Returns nothing; throws on any mismatch.
function applyAndRestore(fen, fromName, toName, opts, fenAfter) {
  const pos = parseFen(fen);
  const before = snapshot(pos);
  const undo = makeMove(pos, createMove(pos, sqIndex(fromName), sqIndex(toName), opts));
  assert.equal(positionToFen(pos), fenAfter, 'FEN after makeMove');
  unmakeMove(pos, undo);
  assert.deepEqual(snapshot(pos), before, 'snapshot after unmakeMove');
  assert.equal(positionToFen(pos), fen, 'FEN after unmakeMove');
}

describe('square mapping', () => {
  test('all 64 square names round-trip through index and back', () => {
    for (const file of 'abcdefgh') {
      for (const rank of '12345678') {
        const name = file + rank;
        assert.equal(sqName(sqIndex(name)), name);
      }
    }
  });

  test('known indices and corners', () => {
    assert.equal(sqIndex('a1'), 21);
    assert.equal(sqIndex('h1'), 28);
    assert.equal(sqIndex('e4'), 55);
    assert.equal(sqIndex('a8'), 91);
    assert.equal(sqIndex('h8'), 98);
    assert.equal(sqName(21), 'a1');
    assert.equal(sqName(98), 'h8');
  });

  test('invalid square names throw', () => {
    for (const bad of ['e9', 'i3', 'e0', 'e', '', 'ee4', 'E4', null, 55]) {
      assert.throws(() => sqIndex(bad), /invalid square name/);
    }
    assert.throws(() => sqName(20), /not a playable square/);
    assert.throws(() => sqName(99), /not a playable square/);
  });
});

describe('FEN round-trip', () => {
  const fens = [
    // start position and the classic perft suite
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
    // checks and mates
    'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', // fool's mate
    'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', // back-rank check
    // en passant edges
    'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', // capturable
    'rnbqkbnr/ppp1pppp/8/8/3Pp3/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 3',
    '4k3/8/8/8/4pP2/8/8/4K3 b - f3 0 1', // endgame ep
    '4k3/8/8/8/4P3/8/8/4K3 b - e3 0 1', // ep target no pawn can capture
    // castling-rights edges
    'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', // full rights, no ep
    'r3k2r/8/8/8/8/8/8/R3K2R w Kq - 0 1', // partial rights
    'r3k2r/8/8/8/8/8/8/R3K2R b - - 12 34', // none, black to move
    '4k3/8/8/8/8/8/8/4K2R w K - 0 1', // single right
    // material edges
    '2k5/8/8/8/8/8/8/2K5 w - - 0 1', // bare kings
    '8/8/4k3/8/2B5/4K3/8/8 w - - 0 1', // KB vs K
    '8/8/4k3/2N5/8/4K3/8/8 b - - 3 1', // KN vs K, black to move
    // clock edges
    '8/8/4k3/8/8/4K3/8/8 w - - 99 80', // fifty-move brink
    '8/8/4k3/8/8/4K3/8/8 b - - 100 141', // fifty-move drawn count
    '8/8/4k3/8/8/4K3/8/8 w - - 0 1',
    // promotion shapes
    '1Q6/1P6/8/8/8/8/1p6/1k5K w - - 0 1',
    '2k2r2/4P3/8/8/8/8/8/4K3 w - - 0 1', // promotion capture available
    // dense board: every square occupied
    'QQQQQQQQ/QQQQQQQQ/QQQQQQQQ/3QQQ2/3qq3/qqqqqqqq/qqqqqqqq/K6k w - - 0 1',
  ];

  test(`parseFen -> positionToFen round-trips ${fens.length} FENs exactly`, () => {
    for (const fen of fens) {
      assert.equal(positionToFen(parseFen(fen)), fen, `round-trip failed for: ${fen}`);
    }
  });

  test('double round-trip is stable', () => {
    for (const fen of fens) {
      assert.equal(positionToFen(parseFen(positionToFen(parseFen(fen)))), fen);
    }
  });
});

describe('parseFen structure', () => {
  const start = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  test('placement maps to the right squares', () => {
    assert.equal(start.board[sqIndex('e2')], 'P');
    assert.equal(start.board[sqIndex('e7')], 'p');
    assert.equal(start.board[sqIndex('d1')], 'Q');
    assert.equal(start.board[sqIndex('d8')], 'q');
    assert.equal(start.board[sqIndex('e1')], 'K');
    assert.equal(start.board[sqIndex('e8')], 'k');
    assert.equal(start.board[sqIndex('d4')], null);
    assert.equal(start.board[sqIndex('d5')], null);
  });

  test('mailbox border cells are offboard and interior is 64 squares', () => {
    let playable = 0;
    for (let i = 0; i < 120; i++) {
      if (start.board[i] === OFFBOARD) continue;
      playable += 1;
    }
    assert.equal(playable, 64);
    assert.equal(start.board[0], OFFBOARD);
    assert.equal(start.board[20], OFFBOARD); // left of a1
    assert.equal(start.board[99], OFFBOARD); // right of h8
    assert.equal(start.board[119], OFFBOARD);
  });

  test('state fields parse', () => {
    assert.equal(start.turn, 'w');
    assert.equal(start.castling, 0b1111);
    assert.equal(start.ep, null);
    assert.equal(start.halfmove, 0);
    assert.equal(start.fullmove, 1);
  });

  test('castling bits map per right', () => {
    assert.equal(parseFen('4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1').castling, 0b1111);
    assert.equal(parseFen('4k3/8/8/8/8/8/8/4K3 w Kq - 0 1').castling, 0b1001);
    assert.equal(parseFen('4k3/8/8/8/8/8/8/4K3 b q - 0 1').castling, 0b1000);
    assert.equal(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1').castling, 0);
  });

  test('missing clock fields default (4- and 5-field FENs accepted)', () => {
    assert.equal(
      positionToFen(parseFen('4k3/8/8/8/8/8/8/4K3 w - -')),
      '4k3/8/8/8/8/8/8/4K3 w - - 0 1'
    );
    assert.equal(
      positionToFen(parseFen('4k3/8/8/8/8/8/8/4K3 w - - 7')),
      '4k3/8/8/8/8/8/8/4K3 w - - 7 1'
    );
  });

  test('structurally broken FENs throw with a reason', () => {
    const bad = [
      null, // not a string
      '', // empty
      '8/8/8/8/8/8/8 w - - 0 1', // 7 ranks
      '8/8/8/8/8/8/8/8/8 w - - 0 1', // 9 ranks
      '9/8/8/8/8/8/8/8 w - - 0 1', // digit 9
      'ppppppppp/8/8/8/8/8/8/8 w - - 0 1', // 9 squares in a rank
      'pXpppppp/8/8/8/8/8/8/8 w - - 0 1', // bad piece char
      '8/8/8/8/8/8/8/8 x - - 0 1', // bad side to move
      '8/8/8/8/8/8/8/8 w Z - 0 1', // bad castling char
      '8/8/8/8/8/8/8/8 w KK - 0 1', // duplicate castling right
      '8/8/8/8/8/8/8/8 w - i9 0 1', // bad ep square
      '8/8/8/8/8/8/8/8 w - - abc 1', // bad halfmove clock
      '8/8/8/8/8/8/8/8 w - - 0 -2', // bad fullmove number
    ];
    for (const fen of bad) {
      assert.throws(() => parseFen(fen), /invalid FEN/, `should throw for: ${fen}`);
    }
  });
});

describe('makeMove / unmakeMove', () => {
  test('pawn double push sets the ep target and resets the clock', () => {
    applyAndRestore(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'e2',
      'e4',
      { flags: FLAG_DOUBLE },
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    );
  });

  test('quiet piece move bumps the halfmove clock', () => {
    applyAndRestore(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'g1',
      'f3',
      {},
      'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1'
    );
  });

  test('ordinary capture resets the halfmove clock', () => {
    applyAndRestore(
      'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      'e4',
      'd5',
      {},
      'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2'
    );
  });

  test('white en passant capture removes the pawn beside the target', () => {
    applyAndRestore(
      'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
      'e5',
      'f6',
      { flags: FLAG_EP },
      'rnbqkbnr/ppp1p1pp/5P2/3p4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3'
    );
  });

  test('black en passant capture removes the pawn beside the target', () => {
    applyAndRestore(
      'rnbqkbnr/ppp1pppp/8/8/3Pp3/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 3',
      'e4',
      'd3',
      { flags: FLAG_EP },
      'rnbqkbnr/ppp1pppp/8/8/8/3p4/PPP1PPPP/RNBQKBNR w KQkq - 0 4'
    );
  });

  test('white kingside castle moves the rook too', () => {
    applyAndRestore(
      'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
      'e1',
      'g1',
      { flags: FLAG_CASTLE_K },
      'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1'
    );
  });

  test('white queenside castle moves the rook too', () => {
    applyAndRestore(
      'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
      'e1',
      'c1',
      { flags: FLAG_CASTLE_Q },
      'r3k2r/8/8/8/8/8/8/2KR3R b kq - 1 1'
    );
  });

  test('black kingside castle', () => {
    applyAndRestore(
      'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1',
      'e8',
      'g8',
      { flags: FLAG_CASTLE_K },
      'r4rk1/8/8/8/8/8/8/R3K2R w KQ - 1 2'
    );
  });

  test('black queenside castle', () => {
    applyAndRestore(
      'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1',
      'e8',
      'c8',
      { flags: FLAG_CASTLE_Q },
      '2kr3r/8/8/8/8/8/8/R3K2R w KQ - 1 2'
    );
  });

  test('moving the h1 rook clears only white kingside rights', () => {
    applyAndRestore(
      'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
      'h1',
      'h5',
      {},
      'r3k2r/8/8/7R/8/8/8/R3K3 b Qkq - 1 1'
    );
  });

  test('capturing a rook on its home square clears its rights (both colors)', () => {
    // a1xa8: white loses Q (rook left a1), black loses q (rook captured on a8);
    // both kingside rights survive (kings and h-rooks still home)
    applyAndRestore(
      'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
      'a1',
      'a8',
      {},
      'R3k2r/8/8/8/8/8/8/4K2R b Kk - 0 1'
    );
  });

  test('promotion to queen', () => {
    applyAndRestore(
      '8/1P6/8/8/8/8/8/K6k w - - 0 1',
      'b7',
      'b8',
      { promotion: 'q' },
      '1Q6/8/8/8/8/8/8/K6k b - - 0 1'
    );
  });

  test('underpromotion to knight', () => {
    applyAndRestore(
      '8/1P6/8/8/8/8/8/K6k w - - 0 1',
      'b7',
      'b8',
      { promotion: 'n' },
      '1N6/8/8/8/8/8/8/K6k b - - 0 1'
    );
  });

  test('promotion with capture', () => {
    applyAndRestore(
      '2k2r2/4P3/8/8/8/8/8/4K3 w - - 0 1',
      'e7',
      'f8',
      { promotion: 'q' },
      '2k2Q2/8/8/8/8/8/8/4K3 b - - 0 1'
    );
  });

  test('a scripted opening line makes and unmakes back to the start', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const pos = parseFen(startFen);
    const before = snapshot(pos);
    const moves = [
      // [from, to, opts, fenAfter]
      ['e2', 'e4', { flags: FLAG_DOUBLE }, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
      ['e7', 'e5', { flags: FLAG_DOUBLE }, 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'],
      ['g1', 'f3', {}, 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2'],
      ['b8', 'c6', {}, 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'],
      ['f1', 'b5', {}, 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'],
      ['a7', 'a6', {}, 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4'],
    ];
    const undos = [];
    for (const [from, to, opts, fenAfter] of moves) {
      undos.push(makeMove(pos, createMove(pos, sqIndex(from), sqIndex(to), opts)));
      assert.equal(positionToFen(pos), fenAfter);
    }
    for (const undo of undos.reverse()) unmakeMove(pos, undo);
    assert.deepEqual(snapshot(pos), before);
    assert.equal(positionToFen(pos), startFen);
  });

  test('making a move for the wrong side throws', () => {
    const pos = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const blackMove = createMove(pos, sqIndex('e7'), sqIndex('e5'), { flags: FLAG_DOUBLE });
    assert.throws(() => makeMove(pos, blackMove), /turn/);
  });

  test('createMove refuses promotions outside q/r/b/n', () => {
    const pos = parseFen('8/1P6/8/8/8/8/8/K6k w - - 0 1');
    assert.throws(
      () => createMove(pos, sqIndex('b7'), sqIndex('b8'), { promotion: 'k' }),
      /invalid promotion/
    );
    assert.throws(
      () => createMove(pos, sqIndex('b7'), sqIndex('b8'), { promotion: 'Q' }),
      /invalid promotion/
    );
  });

  test('createMove refuses an empty or offboard origin', () => {
    const pos = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    assert.throws(() => createMove(pos, sqIndex('e4'), sqIndex('e5')), /no piece/);
  });

  test('FLAG_NORMAL is 0 and flag bits are distinct powers of two', () => {
    assert.equal(FLAG_NORMAL, 0);
    const flags = [FLAG_EP, FLAG_CASTLE_K, FLAG_CASTLE_Q, FLAG_DOUBLE];
    assert.equal(new Set(flags).size, 4);
    for (const flag of flags) assert.equal(flag & (flag - 1), 0);
    assert.equal(FLAG_EP | FLAG_CASTLE_K | FLAG_CASTLE_Q | FLAG_DOUBLE, 15);
  });
});

describe('check detection', () => {
  test('nobody is in check in the start position', () => {
    const pos = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    assert.equal(isCheck(pos, 'w'), false);
    assert.equal(isCheck(pos, 'b'), false);
  });

  test('fool\'s mate: white is checkmated (in check), black is not', () => {
    const pos = parseFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    assert.equal(isCheck(pos), true); // defaults to side to move (white)
    assert.equal(isCheck(pos, 'w'), true);
    assert.equal(isCheck(pos, 'b'), false);
  });

  test('rook check on the file', () => {
    const pos = parseFen('4k3/8/8/8/8/8/4R3/4K3 b - - 0 1');
    assert.equal(isCheck(pos, 'b'), true);
    assert.equal(isCheck(pos, 'w'), false);
  });

  test('a blocked slider is not a check', () => {
    const blocked = parseFen('4k3/4q3/8/8/8/4P3/8/4K3 w - - 0 1');
    const open = parseFen('4k3/4q3/8/8/8/3P4/8/4K3 w - - 0 1');
    assert.equal(isCheck(blocked, 'w'), false);
    assert.equal(isCheck(open, 'w'), true);
  });

  test('kiwipete: neither side is in check', () => {
    const pos = parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    assert.equal(isCheck(pos, 'w'), false);
    assert.equal(isCheck(pos, 'b'), false);
  });

  test('pawn attacks are diagonal only', () => {
    const start = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    assert.equal(isSquareAttacked(start, sqIndex('d3'), 'w'), true); // by e2
    assert.equal(isSquareAttacked(start, sqIndex('f3'), 'w'), true); // by e2
    assert.equal(isSquareAttacked(start, sqIndex('d6'), 'b'), true); // by e7
    assert.equal(isSquareAttacked(start, sqIndex('f6'), 'b'), true); // by e7
    assert.equal(isSquareAttacked(start, sqIndex('e4'), 'w'), false);
    assert.equal(isSquareAttacked(start, sqIndex('e1'), 'b'), false);
    // a lone pawn attacks only its two diagonals, never straight ahead
    const lone = parseFen('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
    assert.equal(isSquareAttacked(lone, sqIndex('d3'), 'w'), true);
    assert.equal(isSquareAttacked(lone, sqIndex('f3'), 'w'), true);
    assert.equal(isSquareAttacked(lone, sqIndex('e3'), 'w'), false);
    assert.equal(isSquareAttacked(lone, sqIndex('e4'), 'w'), false);
  });

  test('knight and king attacks', () => {
    const start = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    assert.equal(isSquareAttacked(start, sqIndex('c3'), 'w'), true); // by b1
    assert.equal(isSquareAttacked(start, sqIndex('a3'), 'w'), true); // by b1
    assert.equal(isSquareAttacked(start, sqIndex('d2'), 'w'), true); // by b1
    assert.equal(isSquareAttacked(start, sqIndex('e4'), 'w'), false);
    const kings = parseFen('8/8/8/3k4/3K4/8/8/8 w - - 0 1');
    assert.equal(isSquareAttacked(kings, sqIndex('d5'), 'w'), true); // white king d4
    assert.equal(isSquareAttacked(kings, sqIndex('e6'), 'w'), false); // two ranks away
  });

  test('sliding attacks stop at the first piece', () => {
    const pos = parseFen('4k3/8/8/8/8/8/4R3/4K3 b - - 0 1');
    assert.equal(isSquareAttacked(pos, sqIndex('e5'), 'w'), true); // rook e2, e-file open
    const blocked = parseFen('4k3/8/4p3/8/8/8/4R3/4K3 b - - 0 1');
    assert.equal(isSquareAttacked(blocked, sqIndex('e5'), 'w'), true); // pawn e6 blocks beyond
    assert.equal(isSquareAttacked(blocked, sqIndex('e7'), 'w'), false);
  });

  test('findKing locates the kings', () => {
    const pos = parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    assert.equal(findKing(pos, 'w'), sqIndex('e1'));
    assert.equal(findKing(pos, 'b'), sqIndex('e8'));
    const noKing = parseFen('8/8/8/8/8/8/8/8 w - - 0 1');
    assert.equal(findKing(noKing, 'w'), null);
    assert.equal(isCheck(noKing, 'w'), false); // no king: cannot be in check
  });
});

describe('clone', () => {
  test('mutating a clone leaves the original untouched', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const original = parseFen(fen);
    const clone = original.clone();
    makeMove(clone, createMove(clone, sqIndex('e2'), sqIndex('e4'), { flags: FLAG_DOUBLE }));
    assert.equal(positionToFen(original), fen);
    assert.equal(
      positionToFen(clone),
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    );
  });
});
