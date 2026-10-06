// Review-panel tests (phase P5): the end-of-game review (FR-009, SC-005),
// the copyable transcript (spec P3-1), and the dispose() that lets the app
// start a new game without the old one's pending work firing late (P2-1).
//
// The DOM layer of app/review-panel.js is exercised for real in headless
// Chrome (scripts/ui-smoke.sh plus the phase demo driver); what must be
// proved here is the contract between the game and the review: entries come
// only from moves actually played, verdicts and reasons are the in-game ones
// verbatim, the order is worst-first capped at five, and a clean game
// reports none.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createGame, moveWords } from '../app/game.js';
import {
  REVIEW_CAP,
  VERDICT_TITLES,
  CLEAN_GAME_LINE,
  collectReview,
  buildTranscript,
  resultLine,
} from '../app/review-panel.js';
import { legalMoves, applyMove, gameStatus, reviewMove } from '../engine/index.js';
import { pickMove, levelConfig } from '../engine/levels.js';
import { createSearch } from '../engine/search.js';
import { parseFen, isCheck, findKing, sqName, opposite } from '../engine/board.js';
import { isInsufficientMaterial } from '../engine/status.js';
import { findLegalMove, generateLegalMoves, moveToUci } from '../engine/moves.js';
import { hangingPiece } from '../engine/review.js';
import { rng } from '../engine/rng.js';

const realEngine = {
  legalMoves,
  applyMove,
  gameStatus,
  pickMove,
  createSearch,
  levelConfig,
  parseFen,
  isCheck,
  findKing,
  sqName,
  opposite,
  isInsufficientMaterial,
  findLegalMove,
  hangingPiece,
};

const stubCoach = () => ({ verdict: 'good', reasons: ['Stub.'], betterMove: null });

// A queued scheduler like tests/ui-contract.test.js's: pump() drains
// everything, step(n) runs n tasks, so tests can stop mid-reply or mid-hint.
function harness(options = {}) {
  const {
    coach = stubCoach,
    pickMove: pickMoveOverride,
    createSearch: createSearchOverride,
    level = 1,
    fen,
    userColor = 'w',
    random = rng(1),
    now,
  } = options;
  const queue = [];
  const pump = () => {
    while (queue.length > 0) queue.shift()();
  };
  const step = (n = 1) => {
    for (let i = 0; i < n && queue.length > 0; i += 1) queue.shift()();
  };
  const engine = { ...realEngine };
  if (pickMoveOverride !== undefined) engine.pickMove = pickMoveOverride;
  if (createSearchOverride !== undefined) engine.createSearch = createSearchOverride;
  const game = createGame({
    ...(fen !== undefined ? { fen } : {}),
    level,
    userColor,
    schedule: (fn) => queue.push(fn),
    random,
    coach,
    engine,
    ...(now !== undefined ? { now } : {}),
  });
  const snaps = [];
  game.onChange((s) => snaps.push(s));
  return { game, pump, step, snaps, queue };
}

function scriptedSearch(move, chunks = 1) {
  return () => {
    let calls = 0;
    return {
      step: () => {
        calls += 1;
        if (calls < chunks) return { done: false, move: null, scoreCp: 0, depth: 1 };
        return { done: true, move, scoreCp: 10, depth: 1 };
      },
    };
  };
}

const comment = (n, verdict, reasons = ['R.'], betterMove = null) => ({
  moveNumber: n,
  uci: 'e2e4',
  fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  verdict,
  reasons,
  betterMove,
});

// ------------------------------------------------------------ collectReview

test('collectReview: only inaccuracy-or-worse user moves are listed', () => {
  const out = collectReview([
    comment(1, 'best'),
    comment(2, 'good'),
    comment(3, 'inaccuracy'),
    comment(4, 'mistake'),
    comment(5, 'blunder'),
  ]);
  assert.deepEqual(out.map((e) => e.moveNumber), [5, 4, 3]);
});

test('collectReview: worst first; equal verdicts stay in played order', () => {
  const out = collectReview([
    comment(1, 'inaccuracy'),
    comment(2, 'blunder'),
    comment(3, 'mistake'),
    comment(4, 'blunder'),
    comment(5, 'inaccuracy'),
  ]);
  assert.deepEqual(out.map((e) => e.moveNumber), [2, 4, 3, 1, 5]);
});

test(`collectReview: at most ${REVIEW_CAP} entries, the worst ones`, () => {
  assert.equal(REVIEW_CAP, 5); // FR-009's cap
  const out = collectReview([
    comment(1, 'blunder'),
    comment(2, 'inaccuracy'),
    comment(3, 'blunder'),
    comment(4, 'mistake'),
    comment(5, 'inaccuracy'),
    comment(6, 'blunder'),
    comment(7, 'mistake'),
  ]);
  assert.deepEqual(out.map((e) => e.moveNumber), [1, 3, 6, 4, 7]);
});

test('collectReview: a clean game reviews nothing', () => {
  assert.deepEqual(collectReview([comment(1, 'best'), comment(2, 'good')]), []);
  assert.deepEqual(collectReview([]), []);
  assert.equal(CLEAN_GAME_LINE.length > 0, true); // the panel's one-liner exists
});

test('collectReview: entries carry the comment verbatim (copies, not reworded)', () => {
  const out = collectReview([comment(2, 'mistake', ['First.', 'Second.'], 'g1f3')]);
  assert.equal(out[0].verdict, 'mistake');
  assert.deepEqual(out[0].reasons, ['First.', 'Second.']);
  assert.equal(out[0].betterMove, 'g1f3');
  out[0].reasons.push('mutated');
  // the copy does not reach back into the source comments
  assert.deepEqual(collectReview([comment(2, 'mistake', ['First.', 'Second.'], 'g1f3')])[0].reasons, [
    'First.',
    'Second.',
  ]);
});

test('VERDICT_TITLES: the same five plain words as the in-game comments', () => {
  assert.deepEqual(VERDICT_TITLES, {
    best: 'Best move',
    good: 'Good move',
    inaccuracy: 'Inaccuracy',
    mistake: 'Mistake',
    blunder: 'Blunder',
  });
});

// ------------------------------------------------- SC-005: review == game

test('SC-005: review entries match the in-game verdicts and reasons verbatim', () => {
  const script = new Map([
    ['e2e4', { verdict: 'blunder', reasons: ['Your rook on h1 is hanging.', 'A second true sentence.'], betterMove: 'g1f3' }],
    ['g1f3', { verdict: 'good', reasons: ['Good move.'], betterMove: null }],
    ['f1c4', { verdict: 'inaccuracy', reasons: ['Slightly passive.'], betterMove: 'd2d4' }],
    ['a2a3', { verdict: 'mistake', reasons: ['Weakens the pawns.'], betterMove: 'c2c4' }],
  ]);
  const coach = (fenBefore, uci) => script.get(uci);
  const { game, pump } = harness({ coach, pickMove: () => 'e7e5' });

  for (const uci of ['e2e4', 'g1f3', 'f1c4', 'a2a3']) {
    assert.equal(game.tryUserMove(uci.slice(0, 2), uci.slice(2, 4)), true);
    pump();
  }
  const snap = game.state();
  const review = collectReview(snap.comments);

  // Only user moves actually played, worst first, verbatim.
  assert.deepEqual(review.map((e) => e.uci), ['e2e4', 'a2a3', 'f1c4']);
  for (const entry of review) {
    const inGame = snap.comments.find((c) => c.moveNumber === entry.moveNumber);
    assert.notEqual(inGame, undefined, 'review lists a move that was not played');
    assert.equal(entry.verdict, inGame.verdict);
    assert.deepEqual(entry.reasons, inGame.reasons);
    assert.equal(entry.betterMove, inGame.betterMove);
    assert.equal(entry.fenBefore, inGame.fenBefore);
    assert.ok(game.state().history.some((m) => m.byUser && m.uci === entry.uci));
  }
});

test('SC-005 end-to-end: real coach, blunder allows mate, review shows it', () => {
  // White to move; h1g1 walks into a back-rank mate.
  const { game, pump } = harness({
    fen: 'r5k1/5ppp/8/8/8/8/5PPP/7K w - - 0 1',
    level: 4, // full strength: the computer will play the mate
    coach: (fenBefore, uci) => reviewMove(fenBefore, uci), // the real coach
  });
  assert.equal(game.tryUserMove('h1', 'g1'), true);
  pump();
  const snap = game.state();
  assert.equal(snap.phase, 'over');
  assert.equal(snap.over.status, 'checkmate');
  assert.equal(snap.over.winner, 'b');

  const review = collectReview(snap.comments);
  assert.equal(review.length, 1);
  assert.equal(review[0].verdict, 'blunder');
  assert.ok(
    review[0].reasons.some((r) => /checkmate/i.test(r)),
    `no mate claim in ${JSON.stringify(review[0].reasons)}`,
  );
  assert.equal(review[0].verdict, snap.comments[0].verdict);
  assert.deepEqual(review[0].reasons, snap.comments[0].reasons);
  assert.ok(snap.history.some((m) => !m.byUser && m.fenAfter === snap.fen));
});

// ------------------------------------------------------------ buildTranscript

test('buildTranscript: moves in words, comments attached, result line, no bare notation', () => {
  const coach = (fenBefore, uci) =>
    uci === 'e2e4'
      ? { verdict: 'mistake', reasons: ['Your pawn on e4 can now be captured for free by the knight on d5.'], betterMove: 'g1f3' }
      : { verdict: 'good', reasons: ['Good move.'], betterMove: null };
  const { game, pump } = harness({ coach, pickMove: () => 'e7e5' });
  assert.equal(game.tryUserMove('e2', 'e4'), true);
  pump();
  assert.equal(game.tryUserMove('g1', 'f3'), true);
  pump();
  const text = buildTranscript(game.state());

  assert.match(text, /you played the white pieces against the computer \(level 1 — Beginner\)/);
  assert.match(text, /The game was not finished\./); // still going: said honestly
  assert.match(text, /1\. You played moving your pawn from e2 to e4\./);
  assert.match(text, /2\. The computer played moving their pawn from e7 to e5\./);
  assert.match(text, /Coach: Mistake\./);
  assert.match(text, /Your pawn on e4 can now be captured for free by the knight on d5\./);
  assert.match(text, /Better: moving your knight from g1 to f3\./);
  assert.match(text, /Coach: Good move\./);
  // FR-007: no bare notation anywhere (squares appear only inside words).
  assert.doesNotMatch(text, /\b[e-h][1-8][e-h][1-8]\b/);
});

test('buildTranscript: checkmate you deliver ends the transcript with the win', () => {
  const { game, pump } = harness({
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    coach: (fenBefore, uci) => reviewMove(fenBefore, uci), // the real coach
  });
  assert.equal(game.tryUserMove('a1', 'a8'), true);
  pump();
  const snap = game.state();
  assert.equal(snap.over.status, 'checkmate');
  assert.equal(snap.over.winner, 'w');
  const text = buildTranscript(snap);
  assert.match(text, /Checkmate — you win!/);
  assert.match(text, /1\. You played moving your rook from a1 to a8\./);
  assert.match(text, /Checkmate — you win the game\./); // the coach's comment, verbatim
});

test('buildTranscript: stalemate is drawn with a plain-words reason', () => {
  const { game, pump } = harness({
    fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1',
    coach: () => ({ verdict: 'good', reasons: ['Good move.'], betterMove: null }),
  });
  assert.equal(game.tryUserMove('f1', 'f7'), true);
  pump();
  const snap = game.state();
  assert.equal(snap.over.status, 'draw');
  assert.equal(snap.over.reason, 'stalemate');
  const text = buildTranscript(snap);
  assert.match(text, /Stalemate: no legal moves and no check, so the game is drawn\./);
});

test('buildTranscript: an empty history says so instead of nothing', () => {
  const { game } = harness({ fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1' }); // stalemate at once
  const text = buildTranscript(game.state());
  assert.match(text, /No moves were played\./);
});

test('resultLine: same sentences as the game-over banner', () => {
  assert.equal(resultLine({ status: 'checkmate', winner: 'w' }, 'w'), 'Checkmate — you win!');
  assert.equal(resultLine({ status: 'checkmate', winner: 'b' }, 'w'), 'Checkmate — the computer wins.');
  assert.equal(resultLine({ status: 'draw', winner: null, reason: 'threefold repetition' }, 'w'),
    'Draw by repetition: the same position appeared three times.');
  assert.equal(resultLine({ status: 'draw', winner: null, reason: 'fifty-move rule' }, 'w'),
    'Draw by the fifty-move rule: fifty moves passed with no pawn move and no capture.');
  assert.equal(resultLine({ status: 'draw', winner: null, reason: 'insufficient material' }, 'w'),
    'Draw by insufficient material: neither side has enough pieces left to force checkmate.');
  assert.equal(resultLine(null, 'w'), 'The game was not finished.');
});

// ------------------------------------------------------------------ dispose

test('dispose: pending coach review is dropped (no late comment, no reply)', () => {
  const { game, pump, snaps } = harness({ pickMove: () => 'e7e5' });
  assert.equal(game.tryUserMove('e2', 'e4'), true); // move applied, review scheduled
  const afterMove = game.state();
  game.dispose();
  const snapsAfterMove = snaps.length;
  pump();
  assert.equal(game.state().comments.length, 0); // the coach never ran
  assert.equal(game.state().history.length, 1); // no computer reply arrived
  assert.equal(game.state().fen, afterMove.fen); // nothing else changed
  assert.equal(snaps.length, snapsAfterMove); // no further notifications
});

test('dispose: a half-drained full-strength reply stops for good', () => {
  let t = 0;
  const now = () => (t += 100); // > CHUNK_WORK_MS per call: one search step per chunk
  const { game, step, pump } = harness({
    level: 4, // the chunked createSearch reply path
    createSearch: scriptedSearch('g8f6', 3),
    now,
  });
  assert.equal(game.tryUserMove('e2', 'e4'), true);
  step(1); // coach comment + reply scheduled
  step(1); // reply chunk 1 of 3
  const midFen = game.state().fen;
  game.dispose();
  pump(); // remaining chunks dropped
  assert.equal(game.state().fen, midFen);
  assert.equal(game.state().history.length, 1);
  assert.equal(game.state().comments.length, 1); // the comment that existed stays
});

test('dispose: a weakened-level reply scheduled but not run is dropped', () => {
  const { game, pump } = harness({ level: 1, pickMove: () => 'e7e5' });
  assert.equal(game.tryUserMove('e2', 'e4'), true);
  game.dispose();
  pump();
  assert.equal(game.state().history.length, 1);
});

test('dispose: a half-drained hint stops without setting one', () => {
  let t = 0;
  const now = () => (t += 100); // one search step per chunk
  const { game, step, pump } = harness({
    level: 4,
    createSearch: scriptedSearch('g1f3', 3),
    now,
  });
  game.hint();
  step(1); // hint chunk 1 of 3
  game.dispose();
  pump();
  assert.equal(game.state().hint, null);
});

test('after dispose, a fresh game runs normally (the new-game flow)', () => {
  const first = harness({ pickMove: () => 'e7e5' });
  assert.equal(first.game.tryUserMove('e2', 'e4'), true);
  first.game.dispose();
  first.pump();

  const second = harness({ pickMove: () => 'c7c5' });
  assert.equal(second.game.tryUserMove('d2', 'd4'), true);
  second.pump();
  const s = second.game.state();
  assert.equal(s.history.length, 2);
  assert.equal(s.comments.length, 1);
  assert.equal(s.phase, 'user');
  assert.equal(first.game.state().history.length, 1); // the old game stays frozen
});

test('moveWords stays available to the review for every move kind it lists', () => {
  // The review and transcript lean on moveWords for their better-move lines;
  // pin one representative wording per kind.
  const cases = [
    ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1', /castling your king to the kingside/],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4', /moving your pawn from e2 to e4/],
    ['4k3/8/8/8/8/8/6p1/4K2R b - - 0 1', 'g2h1q', /promoting to a queen/],
  ];
  for (const [fen, uci, pattern] of cases) {
    const words = moveWords(fen, uci);
    assert.notEqual(words, null, `${uci} should be legal in ${fen}`);
    assert.match(words, pattern);
  }
});
