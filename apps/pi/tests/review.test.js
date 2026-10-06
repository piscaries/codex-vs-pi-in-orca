// Tests for phase P3 (coach): the reviewMove facade, the verdict scale, and
// — the point of this phase — truthful reasons. The truthfulness prober below
// re-verifies every concrete claim a reason makes against the position with
// detectors and raw rules (quality bar #2, FR-006): "captured for free" is
// checked by enumerating legal moves after the capture, mate claims by
// applying the mating move and reading the status. Good/best moves must get a
// short acknowledgement only and no better-move suggestion (FR-005/007).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseFen } from '../engine/board.js';
import { generateLegalMoves, moveToUci } from '../engine/moves.js';
import { legalMoves, applyMove, gameStatus, reviewMove } from '../engine/index.js';
import { mateInOne, hangingPiece, materialTally } from '../engine/review.js';
import { PIECE_VALUES } from '../engine/eval.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_1_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

// ------------------------------------------------------- truthfulness prober

// Square names ("f6") are explained board coordinates, not bare notation; any
// OTHER digit in a sentence would be an unexplained engine number (FR-007).
function stripSquares(sentence) {
  return sentence.replace(/[a-h][1-8]/g, '');
}

function assertPlainSentences(reasons, context) {
  assert.ok(Array.isArray(reasons) && reasons.length >= 1 && reasons.length <= 2,
    `${context}: reasons must be 1-2 sentences, got ${JSON.stringify(reasons)}`);
  for (const sentence of reasons) {
    assert.equal(typeof sentence, 'string', `${context}: reason must be a string`);
    assert.ok(sentence.length <= 220, `${context}: sentence too long: "${sentence}"`);
    assert.ok(/[.!]$/.test(sentence), `${context}: sentence must end like one: "${sentence}"`);
    assert.equal(/\d/.test(stripSquares(sentence)), false,
      `${context}: unexplained number in "${sentence}"`);
  }
}

// Does `color` (the side to move in `fen`) have any legal capture at all?
function anyLegalCapture(fen, color) {
  const pos = parseFen(fen);
  assert.equal(pos.turn, color, 'probe helper: color must be the side to move');
  return generateLegalMoves(pos).some((m) => m.captured !== null);
}

// Machine re-verification of the concrete claims in one reason list. `before`
// is the position the move was played in; `after` the position it created.
function verifyReasons(fen, uci, verdict, reasons) {
  const after = applyMove(fen, uci);
  const mover = parseFen(fen).turn;
  const opponent = mover === 'w' ? 'b' : 'w';
  for (const sentence of reasons) {
    if (sentence.startsWith('Good move.') || sentence.startsWith('Best move.')) continue;

    if (/captured for free/.test(sentence)) {
      const threat = hangingPiece(after);
      assert.ok(threat !== null && threat.free, `"${sentence}": detector disagrees (${JSON.stringify(threat)})`);
      const capture = threat.bySquare + threat.square;
      assert.ok(legalMoves(after).includes(capture),
        `"${sentence}": ${capture} is not a legal capture in ${after}`);
      assert.equal(anyLegalCapture(applyMove(after, capture), mover), false,
        `"${sentence}": the victim does have a legal capture after all`);
      assert.ok(sentence.includes(PIECE_NAMES[threat.piece]) && sentence.includes(threat.square)
        && sentence.includes(PIECE_NAMES[threat.by]) && sentence.includes(threat.bySquare),
        `"${sentence}": does not name the pieces and squares of ${JSON.stringify(threat)}`);
    }

    if (/taking it back wins you only/.test(sentence)) {
      const threat = hangingPiece(after);
      assert.ok(threat !== null && threat.recapture !== null,
        `"${sentence}": detector sees no recapture (${JSON.stringify(threat)})`);
      assert.ok(PIECE_VALUES[threat.occupant] < PIECE_VALUES[threat.piece],
        `"${sentence}": occupant is not worth less than the piece`);
      const capture = threat.bySquare + threat.square;
      assert.ok(legalMoves(after).includes(capture), `"${sentence}": ${capture} not legal`);
    }

    if (/can now be captured by/.test(sentence)) {
      const threat = hangingPiece(after);
      assert.ok(threat !== null, `"${sentence}": no capture threat exists in ${after}`);
      assert.ok(threat.netCp >= 200, `"${sentence}": capture does not win material (${threat.netCp} cp)`);
    }

    if (/would have won the game at once/.test(sentence)) {
      const mates = mateInOne(fen, mover);
      assert.ok(mates.length >= 1, `"${sentence}": no mate in one existed in ${fen}`);
      assert.equal(gameStatus(applyMove(fen, moveToUci(mates[0]))), 'checkmate',
        'the claimed mating move does not mate');
    }

    if (/can deliver checkmate/.test(sentence)) {
      const mates = mateInOne(after, opponent);
      assert.ok(mates.length >= 1, `"${sentence}": opponent has no mate in one in ${after}`);
      assert.equal(gameStatus(applyMove(after, moveToUci(mates[0]))), 'checkmate',
        'the opponent mating move does not mate');
      assert.equal(verdict, 'blunder', 'allowing mate in one must be a blunder');
    }

    if (/stalemate/.test(sentence)) {
      assert.equal(gameStatus(after), 'stalemate', `"${sentence}": position is not stalemate`);
      const tally = materialTally(fen);
      assert.ok(tally[mover] - tally[opponent] >= 100, `"${sentence}": mover is not ahead in material`);
    }

    if (sentence.startsWith('A stronger move was')) {
      assert.ok(['inaccuracy', 'mistake', 'blunder'].includes(verdict),
        `"${sentence}": fix sentence outside inaccuracy-or-worse`);
    }
  }
}

// --------------------------------------------------- shared review assertions

function checkProbe({ name, fen, uci, expectVerdict }) {
  const result = reviewMove(fen, uci);
  assertPlainSentences(result.reasons, name);
  const allowed = Array.isArray(expectVerdict) ? expectVerdict : [expectVerdict];
  assert.ok(allowed.includes(result.verdict),
    `${name}: verdict ${result.verdict}, expected ${allowed.join('|')}`);
  assert.ok(['inaccuracy', 'mistake', 'blunder'].includes(result.verdict) || result.betterMove === null,
    `${name}: betterMove must be null for best/good`);
  if (['inaccuracy', 'mistake', 'blunder'].includes(result.verdict)) {
    assert.ok(result.betterMove !== null, `${name}: inaccuracy-or-worse needs a better move`);
    assert.notEqual(result.betterMove, uci, `${name}: betterMove is the played move`);
    assert.ok(legalMoves(fen).includes(result.betterMove), `${name}: betterMove not legal`);
  }
  verifyReasons(fen, uci, result.verdict, result.reasons);
  return result;
}

describe('reviewMove: shape and errors', () => {
  test('returns exactly {verdict, reasons, betterMove} with a known verdict', () => {
    const result = reviewMove(START, 'e2e4');
    assert.deepEqual(Object.keys(result).sort(), ['betterMove', 'reasons', 'verdict']);
    assert.ok(['best', 'good', 'inaccuracy', 'mistake', 'blunder'].includes(result.verdict));
    assert.ok(Array.isArray(result.reasons) && result.reasons.length >= 1);
    assert.ok(result.betterMove === null || typeof result.betterMove === 'string');
  });

  test('throws on malformed or illegal moves', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    for (const bad of ['e2e5', 'e2e9', 'xxxx', 'e7e5', 'e2e4e4', '', null, 42]) {
      assert.throws(() => reviewMove(fen, bad), /illegal move/, `move ${bad}`);
    }
  });

  test('throws on a finished position and on promotions without the piece', () => {
    const mateFen = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
    assert.equal(gameStatus(applyMove(mateFen, 'a1a8')), 'checkmate');
    assert.throws(() => reviewMove(applyMove(mateFen, 'a1a8'), 'g8g7'), /illegal move/);
    assert.throws(() => reviewMove('7k/5P2/6K1/8/8/8/8/8 w - - 0 1', 'f7f8'), /illegal move/);
  });

  test('is deterministic for the same position and move', () => {
    const fen = '4k3/8/4p3/Q2p4/8/8/8/4K3 w - - 0 1';
    assert.deepEqual(reviewMove(fen, 'a5b4'), reviewMove(fen, 'a5b4'));
  });
});

describe('reviewMove: short acknowledgement for best and good (FR-007, bar #5)', () => {
  test('an opening move gets a one-word acknowledgement and no suggestion', () => {
    for (const [fen, uci] of [
      [START, 'e2e4'],
      [AFTER_1_E4, 'e7e5'],
    ]) {
      const result = reviewMove(fen, uci);
      assert.ok(['best', 'good'].includes(result.verdict), `${uci}: ${result.verdict}`);
      assert.equal(result.betterMove, null, `${uci}: no better move for best/good`);
      assert.equal(result.reasons.length, 1);
      assert.ok(['Best move.', 'Good move.'].includes(result.reasons[0]),
        `${uci}: ack is "${result.reasons[0]}"`);
    }
  });

  test('playing the mate-in-one is "best"; so is the free queen grab', () => {
    const mate = reviewMove('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 'a1a8');
    assert.equal(mate.verdict, 'best');
    assert.equal(mate.betterMove, null);
    assert.equal(mate.reasons[0], 'Checkmate — you win the game.');

    const grab = reviewMove('6k1/8/8/qR6/8/8/8/4K3 w - - 0 1', 'b5a5');
    assert.equal(grab.verdict, 'best');
    assert.equal(grab.betterMove, null);
    assert.equal(grab.reasons[0], 'Best move.');
  });
});

describe('reviewMove: verdict scale bands (FR-005)', () => {
  test('a small positional error is an inaccuracy, with a legal better move', () => {
    // Retreating the developed knight to g1 (loss ≈ 90 cp at review depth).
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
    const result = checkProbe({ name: 'Ng1 retreat', fen, uci: 'f3g1', expectVerdict: 'inaccuracy' });
    assert.ok(result.reasons[0].startsWith('A stronger move was'));
  });

  test('losing a knight for a pawn is a mistake, with a legal better move', () => {
    // Nxe5 Nxe5: knight (320) for pawn (100) — loss ≈ 170 cp.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
    checkProbe({ name: 'Nxe5??', fen, uci: 'f3e5', expectVerdict: 'mistake' });
  });
});

// The SC-002 probe set: known mistakes with known ground truth. Every probe
// must return a correct verdict, a reason whose claims survive the machine
// prober above, and a legal better move that differs from the played move.
describe('reviewMove: blunder probes (SC-002, FR-006)', () => {
  const HANGING = [
    { name: 'queen takes a pawn defended by a pawn', fen: '4k3/8/4p3/Q2p4/8/8/8/4K3 w - - 0 1', uci: 'a5d5' },
    { name: 'knight develops onto an attacked square (knight for pawn)', fen: 'rnbqkbnr/pppp1ppp/8/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', uci: 'g8f6' },
    { name: 'bishop walks onto a pawn-covered square, undefended', fen: '4k3/8/8/3p4/8/8/4B3/4K3 w - - 0 1', uci: 'e2c4' },
    { name: 'rook parks on a knight-controlled square', fen: '6k1/8/8/8/8/5n2/8/R6K w - - 0 1', uci: 'a1e1' },
    { name: 'queen next to a knight, nothing defends it', fen: '4k3/8/8/8/8/4n3/8/3QK3 w - - 0 1', uci: 'd1c2' },
    { name: 'queen captures a bishop defended by a pawn (queen for bishop)', fen: '4k3/4p3/3b4/8/8/8/8/3QK3 w - - 0 1', uci: 'd1d6' },
    { name: 'knight captures a twice-defended pawn', fen: '4k3/8/2p1p3/3p4/5N2/8/8/4K3 w - - 0 1', uci: 'f4d5' },
    { name: 'queen lands on a knight-controlled square (black to be hit)', fen: '2k5/8/2n5/8/8/3Q4/8/4K3 w - - 0 1', uci: 'd3d4' },
    { name: 'rook steps beside the enemy queen', fen: '6k1/8/8/4q3/8/8/8/5RK1 w - - 0 1', uci: 'f1f4' },
    { name: 'bishop onto a rook-controlled square', fen: '4k3/8/8/8/8/3r4/8/2B1K3 w - - 0 1', uci: 'c1e3' },
  ];

  const MISSED_MATES = [
    { name: 'missed back-rank mate', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', uci: 'a1b1' },
    { name: 'missed scholar\'s mate', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', uci: 'b1a3' },
    { name: 'missed queen mate', fen: '7k/8/6K1/8/8/8/8/3Q4 w - - 0 1', uci: 'd1b3' },
    { name: 'missed rook mate on the eighth', fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', uci: 'b6a5' },
    { name: 'missed smothered mate', fen: '6rk/6pp/8/6N1/8/8/8/7K w - - 0 1', uci: 'h1g1' },
    { name: 'missed promotion mate', fen: '7k/5P2/6K1/8/8/8/8/8 w - - 0 1', uci: 'g6f5' },
  ];

  const ALLOWS_MATES = [
    { name: 'ignores the back-rank threat (rook mate)', fen: 'r5k1/8/8/8/8/8/1N3PPP/6K1 w - - 0 1', uci: 'b2c4' },
    { name: 'rook abandons the first rank (queen mate)', fen: '1q4k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', uci: 'a1a2' },
    { name: 'ignores the promoting pawn (promotion mate)', fen: 'R7/8/8/8/8/6k1/5p2/7K w - - 0 1', uci: 'a8b8' },
    { name: 'knight wanders while the back rank is weak', fen: '3r2k1/5ppp/8/8/8/7N/5PPP/6K1 w - - 0 1', uci: 'h3g5' },
    { name: 'king steps into a back-rank mate', fen: 'r5k1/5ppp/8/8/8/8/5PPP/7K w - - 0 1', uci: 'h1g1' },
  ];

  test('every hanging-piece probe: harsh verdict, true reason, better move', () => {
    for (const probe of HANGING) {
      const result = checkProbe({ ...probe, expectVerdict: ['mistake', 'blunder'] });
      assert.ok(result.reasons.some((s) => /captured/.test(s)),
        `${probe.name}: no hanging claim in ${JSON.stringify(result.reasons)}`);
      // The detector itself must back the claim on the exact position,
      // and the size of the loss must match the verdict band.
      const threat = hangingPiece(applyMove(probe.fen, probe.uci));
      assert.ok(threat !== null, `${probe.name}: detector finds no threat`);
      assert.ok(threat.netCp >= 200, `${probe.name}: threat wins only ${threat.netCp} cp`);
      assert.equal(result.verdict, threat.netCp >= 300 ? 'blunder' : 'mistake',
        `${probe.name}: net ${threat.netCp} cp`);
    }
  });

  test('every missed-mate probe: at least a mistake, mate named, better move mates', () => {
    for (const probe of MISSED_MATES) {
      const result = checkProbe({ ...probe, expectVerdict: ['mistake', 'blunder'] });
      assert.ok(result.reasons.some((s) => /checkmate/.test(s)),
        `${probe.name}: no mate claim in ${JSON.stringify(result.reasons)}`);
      assert.equal(gameStatus(applyMove(probe.fen, result.betterMove)), 'checkmate',
        `${probe.name}: betterMove ${result.betterMove} does not mate`);
    }
  });

  test('every allows-mate probe: blunder, opponent mate named truthfully', () => {
    for (const probe of ALLOWS_MATES) {
      const result = checkProbe({ ...probe, expectVerdict: 'blunder' });
      assert.ok(result.reasons.some((s) => /can deliver checkmate/.test(s)),
        `${probe.name}: no allowed-mate claim in ${JSON.stringify(result.reasons)}`);
    }
  });

  test('stalemating a lone king while missing mate: two true reasons, one fix', () => {
    // Kc6+Qb7 vs Ka8: Kb6 mates at once; Qb7-c7 instead stalemates the king.
    const fen = 'k7/1Q6/2K5/8/8/8/8/8 w - - 0 1';
    const result = checkProbe({ name: 'stalemate instead of mate', fen, uci: 'b7c7', expectVerdict: 'blunder' });
    assert.ok(result.reasons.some((s) => /missed checkmate/.test(s)), 'names the missed mate');
    assert.ok(result.reasons.some((s) => /stalemate/.test(s)), 'names the stalemate');
    assert.equal(result.reasons.length, 2, 'exactly the two concrete sentences');
    assert.equal(gameStatus(applyMove(fen, 'b7c7')), 'stalemate');
    assert.equal(gameStatus(applyMove(fen, result.betterMove)), 'checkmate');
  });

  test('probe count reaches the design\'s twenty (SC-002)', () => {
    assert.ok(HANGING.length + MISSED_MATES.length + ALLOWS_MATES.length >= 20);
  });
});

describe('reviewMove: no false claims on normal moves (bar #2)', () => {
  // Ordinary, sound moves. Whatever the verdict, the reasons must survive the
  // machine prober — and a best/good verdict may not whisper a single
  // concrete "threat" that the position does not contain.
  const NORMAL = [
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'd2d4'],
    ['r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 3', 'g8f6'],
    ['r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', 'e1g1'],
    ['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', 'd3d4'],
    ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 'g2g3'],
  ];

  test('normal moves never draw false threats', () => {
    for (const [fen, uci] of NORMAL) {
      const result = reviewMove(fen, uci);
      assertPlainSentences(result.reasons, `normal ${uci}`);
      if (['best', 'good'].includes(result.verdict)) {
        assert.equal(result.betterMove, null);
        assert.ok(['Best move.', 'Good move.'].includes(result.reasons[0]),
          `${uci}: best/good must be a bare ack, got "${result.reasons[0]}"`);
      } else {
        verifyReasons(fen, uci, result.verdict, result.reasons);
        assert.ok(legalMoves(fen).includes(result.betterMove), `${uci}: betterMove not legal`);
      }
      const after = applyMove(fen, uci);
      if (['best', 'good'].includes(result.verdict) && !result.reasons[0].startsWith('Checkmate')) {
        // The detector must agree there is no material threat to speak of.
        const threat = hangingPiece(after);
        assert.ok(threat === null || threat.netCp < 200,
          `${uci} called ${result.verdict} but ${JSON.stringify(threat)} exists`);
      }
    }
  });
});

describe('detectors: mateInOne, hangingPiece, materialTally', () => {
  test('mateInOne lists exactly the mating moves of the side to move', () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1';
    const mates = mateInOne(fen, 'w');
    assert.deepEqual(mates.map(moveToUci), ['f3f7']);
    assert.equal(gameStatus(applyMove(fen, 'f3f7')), 'checkmate');

    assert.deepEqual(mateInOne(fen, 'b'), [], 'the side not to move cannot mate');
    const quiet = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    assert.deepEqual(mateInOne(quiet, 'w'), []);
  });

  test('hangingPiece is silent when nothing hangs', () => {
    for (const fen of [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 3',
    ]) {
      for (const uci of legalMoves(fen).slice(0, 12)) {
        assert.equal(hangingPiece(applyMove(fen, uci)), null, `${uci} in ${fen}`);
      }
    }
  });

  test('hangingPiece reports the free queen hang with exact squares', () => {
    const after = applyMove('4k3/8/4p3/Q2p4/8/8/8/4K3 w - - 0 1', 'a5d5');
    assert.deepEqual(hangingPiece(after), {
      piece: 'q', square: 'd5', by: 'p', bySquare: 'e6', occupant: 'p',
      recapture: null, free: true, netCp: 900, victimColor: 'w',
    });
  });

  test('materialTally counts both sides, kings excluded', () => {
    assert.deepEqual(materialTally('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), { w: 0, b: 0 });
    assert.deepEqual(materialTally('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1'), { w: 900, b: 0 });
    assert.deepEqual(materialTally('4k3/4p3/8/8/8/8/8/Q3K3 w - - 0 1'), { w: 900, b: 100 });
  });
});
