// UI contract tests (phase P4): the app's game core (app/game.js) driven
// through Node with an injectable scheduler — the same flows the browser
// runs through setTimeout. The DOM modules (board-ui, coach-panel, main) are
// exercised for real by scripts/ui-smoke.sh in headless Chrome; what needs
// proving here is the contract between the UI and the game: legal clicks
// only, promotion asked, comment before reply, hints that never auto-play,
// repetition draws the FEN cannot see, and the reply pipeline's timing.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createGame, moveWords } from '../app/game.js';
import { legalMoves, applyMove, gameStatus, reviewMove } from '../engine/index.js';
import { pickMove, levelConfig } from '../engine/levels.js';
import { createSearch } from '../engine/search.js';
import { parseFen, isCheck, findKing, sqName, opposite } from '../engine/board.js';
import { isInsufficientMaterial } from '../engine/status.js';
import { findLegalMove, generateLegalMoves, moveToUci } from '../engine/moves.js';
import { hangingPiece } from '../engine/review.js';
import { rng } from '../engine/rng.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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

// A queued scheduler: pump() drains everything, step(n) runs n tasks —
// that is how tests observe intermediate states (e.g. comment before reply).
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

// A createSearch stand-in whose search finishes after `chunks` steps and
// then reports `move` — deterministic hint and reply drains.
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

test('boot: initial state is the start position, user to move', () => {
  const { game } = harness();
  const s = game.state();
  assert.equal(s.fen, START);
  assert.equal(s.phase, 'user');
  assert.equal(s.userColor, 'w');
  assert.equal(s.turn, 'w');
  assert.equal(s.lastMove, null);
  assert.equal(s.checkSquare, null);
  assert.equal(s.comments.length, 0);
  assert.equal(s.history.length, 0);
  assert.equal(s.over, null);
  assert.equal(s.level, 1);
});

test('boot: a terminal starting FEN ends the game at once', () => {
  const { game } = harness({ fen: 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1' }); // back-rank mate on the board
  const s = game.state();
  assert.equal(s.phase, 'over');
  assert.equal(s.over.status, 'checkmate');
  assert.equal(s.over.winner, 'w');
});

test('legal user move is accepted, coached, and answered by a legal reply', () => {
  const coachArgs = [];
  const coach = (fenBefore, uci) => {
    coachArgs.push({ fenBefore, uci });
    return { verdict: 'inaccuracy', reasons: ['Stub reason.'], betterMove: 'g1f3' };
  };
  const { game, pump } = harness({ coach, pickMove: () => 'e7e5' });
  assert.equal(game.tryUserMove('e2', 'e4'), true);
  pump();
  const s = game.state();
  assert.equal(s.history.length, 2);
  assert.deepEqual(
    s.history.map((m) => m.uci),
    ['e2e4', 'e7e5'],
  );
  assert.equal(s.history[0].byUser, true);
  assert.equal(s.history[1].byUser, false);
  assert.equal(s.phase, 'user');
  assert.equal(s.comments.length, 1);
  assert.equal(s.comments[0].uci, 'e2e4');
  assert.equal(s.comments[0].moveNumber, 1);
  assert.equal(s.comments[0].verdict, 'inaccuracy');
  assert.equal(s.comments[0].betterMove, 'g1f3');
  assert.deepEqual(coachArgs, [{ fenBefore: START, uci: 'e2e4' }]);
  assert.equal(s.lastMove.uci, 'e7e5');
  assert.equal(s.lastMove.byUser, false);
});

test('the coach comment is recorded before the computer replies', () => {
  // The comment's reasons describe the position right after the user's
  // move; the reply must not land first (FR-006 freshness).
  const { game, step } = harness({ pickMove: () => 'e7e5' });
  game.tryUserMove('e2', 'e4');
  step(1); // the review task only
  const mid = game.state();
  assert.equal(mid.phase, 'reply');
  assert.equal(mid.comments.length, 1);
  assert.equal(mid.history.length, 1);
  step(1); // the reply task
  const done = game.state();
  assert.equal(done.phase, 'user');
  assert.equal(done.history.length, 2);
});

test('illegal clicks are refused quietly and change nothing', () => {
  const { game } = harness({ pickMove: () => 'e7e5' });
  const before = game.state().fen;
  assert.equal(game.tryUserMove('e2', 'e5'), false); // pawns do not move that way
  assert.equal(game.tryUserMove('e7', 'e5'), false); // opponent's pawn
  assert.equal(game.tryUserMove('e2', 'e2'), false); // no move to its own square
  const s = game.state();
  assert.equal(s.fen, before);
  assert.equal(s.history.length, 0);
  assert.equal(s.comments.length, 0);
  assert.equal(s.phase, 'user');
});

test('input is ignored while the coach reviews and the computer thinks', () => {
  const { game, step } = harness({ pickMove: () => 'e7e5' });
  game.tryUserMove('e2', 'e4');
  assert.equal(game.state().phase, 'review');
  assert.equal(game.tryUserMove('d2', 'd4'), false);
  step(1);
  assert.equal(game.state().phase, 'reply');
  assert.equal(game.tryUserMove('d2', 'd4'), false);
  step(1);
  assert.equal(game.state().phase, 'user');
  assert.equal(game.tryUserMove('d2', 'd4'), true);
});

test('promotion: the user is asked, never silently defaulted', () => {
  const fen = 'k7/4P3/8/8/8/8/8/4K2R w - - 0 1'; // spare rook keeps material sufficient after an underpromotion
  const { game, pump } = harness({ fen, pickMove: () => 'a8a7' });
  assert.equal(game.tryUserMove('e7', 'e8'), true);
  const pending = game.state();
  assert.equal(pending.phase, 'promotion');
  assert.deepEqual(pending.pendingPromotion, {
    from: 'e7',
    to: 'e8',
    options: ['q', 'r', 'b', 'n'],
  });
  assert.equal(game.tryUserMove('a2', 'a3'), false); // wait for the choice
  assert.equal(game.choosePromotion('x'), false); // not a piece
  assert.equal(game.choosePromotion('n'), true);
  pump();
  const s = game.state();
  assert.equal(s.history[0].uci, 'e7e8n');
  assert.equal(s.fen.split(' ')[0].includes('N'), true); // a knight, not a queen
  assert.equal(s.comments[0].uci, 'e7e8n');
  assert.equal(s.phase, 'user');
});

test('promotion: cancelling returns to the user turn untouched', () => {
  const fen = 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1';
  const { game } = harness({ fen });
  game.tryUserMove('e7', 'e8');
  game.cancelPromotion();
  const s = game.state();
  assert.equal(s.phase, 'user');
  assert.equal(s.pendingPromotion, null);
  assert.equal(s.fen, fen);
  assert.equal(s.history.length, 0);
  assert.equal(game.choosePromotion('q'), false); // no pending promotion anymore
});

test('checkmate by the user ends the game and refuses all input', () => {
  const fen = '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1'; // Ra8 is mate
  const { game, pump } = harness({ fen, pickMove: () => { throw new Error('no reply after mate'); } });
  assert.equal(game.tryUserMove('a1', 'a8'), true);
  pump();
  const s = game.state();
  assert.equal(s.phase, 'over');
  assert.equal(s.over.status, 'checkmate');
  assert.equal(s.over.winner, 'w');
  assert.equal(s.over.winner, s.userColor);
  assert.equal(s.comments.length, 1); // the mating move still gets its comment
  assert.equal(game.tryUserMove('h2', 'h3'), false);
  assert.equal(game.hint(), null);
});

test('checkmate by the computer ends the game', () => {
  const fen = 'r5k1/8/8/7R/8/8/5PPP/6K1 w - - 0 1';
  const { game, pump } = harness({ fen, pickMove: () => 'a8a1' });
  game.tryUserMove('h5', 'h4');
  pump();
  const s = game.state();
  assert.equal(s.phase, 'over');
  assert.equal(s.over.status, 'checkmate');
  assert.equal(s.over.winner, 'b');
  assert.equal(game.state().history.length, 2);
});

test('threefold repetition is declared from the app position history', () => {
  // K+R vs K: the computer (White) shuffles its rook, the user shuffles the
  // king; the starting setup returns for the third time after 8 moves.
  const fen = '3k4/8/8/8/8/8/1R6/3K4 w - - 0 1';
  const scriptedWhite = ['b2b3', 'b3b2', 'b2b3', 'b3b2'];
  let called = 0;
  const { game, pump } = harness({
    fen,
    userColor: 'b',
    pickMove: () => scriptedWhite[called++],
  });
  // The computer moves first because the user plays Black.
  assert.equal(game.state().phase, 'reply');
  pump();
  assert.equal(game.state().history[0].byUser, false);
  assert.equal(game.state().phase, 'user');
  for (const [from, to] of [
    ['d8', 'd7'],
    ['d7', 'd8'],
    ['d8', 'd7'],
    ['d7', 'd8'],
  ]) {
    assert.equal(game.tryUserMove(from, to), true);
    pump();
  }
  const s = game.state();
  assert.equal(s.phase, 'over');
  assert.equal(s.over.status, 'draw');
  assert.equal(s.over.reason, 'threefold repetition');
});

test('fifty-move rule ends the game with a plain draw reason', () => {
  const fen = 'k7/8/8/8/8/8/8/K6R w - - 99 100';
  const { game, pump } = harness({ fen });
  assert.equal(game.tryUserMove('h1', 'h2'), true);
  pump();
  const s = game.state();
  assert.equal(s.phase, 'over');
  assert.equal(s.over.status, 'draw');
  assert.equal(s.over.reason, 'fifty-move rule');
});

test('insufficient material is detected at boot', () => {
  const { game } = harness({ fen: 'k7/8/8/8/8/8/8/K6B w - - 0 1' });
  const s = game.state();
  assert.equal(s.phase, 'over');
  assert.equal(s.over.reason, 'insufficient material');
});

test('stalemate by the user move ends the game as a draw', () => {
  // K+Q vs K: Qb6 stalemates the lone king on a8.
  const fen = 'k7/8/8/1Q6/8/8/8/K7 w - - 0 1';
  const { game, pump } = harness({ fen });
  assert.equal(game.tryUserMove('b5', 'b6'), true);
  pump();
  const s = game.state();
  assert.equal(s.phase, 'over');
  assert.equal(s.over.status, 'draw');
  assert.equal(s.over.reason, 'stalemate');
});

test('hint: one legal move, one sentence, and nothing is played', () => {
  const { game, pump } = harness({ createSearch: scriptedSearch('g1f3') });
  assert.deepEqual(game.hint(), { pending: true });
  pump();
  const s = game.state();
  assert.equal(s.hintPending, false);
  assert.equal(s.hint.uci, 'g1f3');
  assert.ok(legalMoves(s.fen).includes(s.hint.uci));
  assert.equal(typeof s.hint.sentence, 'string');
  assert.ok(s.hint.sentence.length > 0);
  assert.ok(s.hint.sentence.endsWith('.'));
  // The hint never plays: the position is untouched.
  assert.equal(s.fen, START);
  assert.equal(s.phase, 'user');
  assert.equal(s.history.length, 0);
});

test('hint: a different move is still accepted and coached afterwards', () => {
  const { game, pump } = harness({ createSearch: scriptedSearch('g1f3'), pickMove: () => 'e7e5' });
  game.hint();
  pump();
  assert.ok(game.state().hint !== null);
  assert.equal(game.tryUserMove('e2', 'e4'), true);
  pump();
  const s = game.state();
  assert.equal(s.history.length, 2);
  assert.equal(s.comments.length, 1);
  assert.equal(s.hint, null); // cleared by the move
});

test('hint: refused outside the user turn; stale hints are dropped', () => {
  const { game, pump } = harness({ createSearch: scriptedSearch('g1f3', 2), pickMove: () => 'e7e5' });
  assert.equal(game.state().phase, 'user');
  game.hint();
  assert.equal(game.hint(), null); // already thinking about one
  // The user moves before the hint finishes: the hint must not land stale.
  game.tryUserMove('e2', 'e4');
  pump();
  const s = game.state();
  assert.equal(s.hintPending, false);
  assert.equal(s.hint, null);
  assert.equal(s.history.length, 2);
});

test('hint sentence states verified facts: free capture, mate, check', () => {
  // Free capture: the search is scripted to Bxd4 so the sentence is stable.
  const hanging = 'k7/8/8/8/3n4/2B5/8/K7 w - - 0 1';
  const free = harness({ fen: hanging, createSearch: scriptedSearch('c3d4') });
  free.game.hint();
  free.pump();
  assert.equal(
    free.game.state().hint.sentence,
    'Their knight on d4 can be captured for free by your bishop from c3.',
  );

  // Checkmate in one: a real full-strength search finds it fast.
  const mate = harness({ fen: '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1' });
  mate.game.hint();
  mate.pump();
  const mateHint = mate.game.state().hint;
  assert.equal(mateHint.uci, 'a1a8');
  assert.ok(mateHint.sentence.includes('checkmate'), mateHint.sentence);
  assert.ok(mateHint.sentence.includes('rook from a1 to a8'), mateHint.sentence);

  // Plain move with check: scripted.
  const check = harness({ fen: 'k7/8/8/8/8/8/8/K6R w - - 0 1', createSearch: scriptedSearch('h1h8') });
  check.game.hint();
  check.pump();
  assert.equal(
    check.game.state().hint.sentence,
    'The strongest move I see is moving your rook from h1 to h8, and it gives check.',
  );
});

test('levels: the engine level drives the reply; level 4 uses the steppable search', () => {
  const seen = [];
  const spyPick = (pos, lvl) => {
    seen.push(lvl);
    return moveToUci(generateLegalMoves(pos)[0]);
  };
  const h = harness({ level: 2, pickMove: spyPick });
  h.game.tryUserMove('e2', 'e4');
  h.pump();
  assert.equal(h.game.state().level, 2);
  h.game.setLevel(3);
  h.game.tryUserMove('d2', 'd4');
  h.pump();
  assert.deepEqual(seen, [2, 3]);
  assert.throws(() => h.game.setLevel(9), RangeError);

  // Level 4 bypasses pickMove and drains createSearch in chunks.
  const h4 = harness({ level: 4, pickMove: () => { throw new Error('level 4 must use createSearch'); } });
  const t0 = Date.now();
  h4.game.tryUserMove('e2', 'e4');
  h4.pump();
  const elapsed = Date.now() - t0;
  const s4 = h4.game.state();
  assert.equal(s4.phase, 'user');
  assert.equal(s4.history.length, 2);
  const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
  assert.ok(legalMoves(afterE4).includes(s4.history[1].uci));
  assert.ok(elapsed < 2000, `level-4 reply took ${elapsed} ms`);
});

test('reply drains the search in more than one scheduler chunk', () => {
  // The start position keeps the level-4 search busy for its whole budget,
  // so a 40 ms chunk cap must split the work across tasks (FR-004).
  let scheduled = 0;
  const queue = [];
  const game = createGame({
    level: 4,
    coach: stubCoach,
    schedule: (fn) => {
      scheduled += 1;
      queue.push(fn);
    },
    random: rng(1),
  });
  game.tryUserMove('e2', 'e4');
  while (queue.length > 0) queue.shift()();
  assert.ok(scheduled >= 3, `expected chunked drain, scheduled=${scheduled}`);
});

test('real coach integration: comment shape and a true blunder reason', () => {
  // The queen on h5 is attacked by the knight on f6; a2a3 abandons it.
  const fen = 'rnbqkbn1/pppp1ppp/5n2/7Q/4P3/8/PPPP1PPP/RNBQKBNR w - - 0 1';
  const { game, pump } = harness({ fen, pickMove: () => 'f6h5', coach: (f, u) => reviewMove(f, u) });
  game.tryUserMove('a2', 'a3');
  pump();
  const comment = game.state().comments[0];
  assert.ok(['best', 'good', 'inaccuracy', 'mistake', 'blunder'].includes(comment.verdict));
  for (const reason of comment.reasons) assert.ok(reason.endsWith('.'));
  assert.equal(comment.verdict, 'blunder');
  assert.ok(comment.reasons.some((r) => r.includes('queen on h5')), comment.reasons.join(' '));
  assert.notEqual(comment.betterMove, null);
  assert.ok(legalMoves(fen).includes(comment.betterMove));
  // The computer took the queen, as the coach said it could.
  assert.equal(game.state().history[1].uci, 'f6h5');
});

test('real coach integration: good opening moves get a short ack only', () => {
  const { game, pump } = harness({ pickMove: () => 'e7e5', coach: (f, u) => reviewMove(f, u) });
  game.tryUserMove('e2', 'e4');
  pump();
  const comment = game.state().comments[0];
  assert.ok(['best', 'good'].includes(comment.verdict), comment.verdict);
  assert.equal(comment.betterMove, null);
  assert.ok(comment.reasons.length <= 1);
});

test('moveWords: every move kind is described in plain words', () => {
  assert.equal(moveWords(START, 'a2a3'), 'moving your pawn from a2 to a3');
  assert.equal(moveWords(START, 'g1f3'), 'moving your knight from g1 to f3');
  const castle = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
  assert.equal(moveWords(castle, 'e1g1'), 'castling your king to the kingside');
  assert.equal(moveWords(castle, 'e1c1'), 'castling your king to the queenside');
  const ep = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w - d6 0 3';
  assert.equal(
    moveWords(ep, 'e5d6'),
    'capturing the pawn on d6 en passant with your pawn from e5',
  );
  assert.equal(
    moveWords('k7/4P3/8/8/8/8/8/K7 w - - 0 1', 'e7e8q'),
    'moving your pawn from e7 to e8, promoting to a queen',
  );
  assert.equal(
    moveWords('3r3k/4P3/8/8/8/8/8/K7 w - - 0 1', 'e7d8q'),
    'capturing the rook on d8 with your pawn from e7, promoting to a queen',
  );
  assert.equal(
    moveWords('k7/8/8/8/8/8/1q6/1R5K w - - 0 1', 'b1b2'),
    'capturing the queen on b2 with your rook from b1',
  );
  assert.equal(moveWords(START, 'b1a3', 'their'), 'moving their knight from b1 to a3');
  assert.equal(moveWords(START, 'e2e5'), null); // illegal
});

test('checkSquare and lastMove feed the board badges (FR-010)', () => {
  const { game, step, pump } = harness({ fen: 'k7/8/8/8/8/8/8/K6R w - - 0 1', pickMove: () => 'a8a7' });
  game.tryUserMove('h1', 'h8'); // Rh8+ — the checked king must light up
  step(1); // review done, reply still pending
  const mid = game.state();
  assert.equal(mid.checkSquare, 'a8');
  assert.equal(mid.lastMove.uci, 'h1h8');
  assert.equal(mid.lastMove.byUser, true);
  pump();
  assert.equal(game.state().checkSquare, null); // king escaped to a7
});
