// Game core for Chess Coach (phase P4): the DOM-free game loop and state
// machine behind the app. One game between the user (White by default) and
// the computer at a chosen level.
//
// Responsibilities (design §2): the turn/state machine, the full move log
// (which the end-of-game review will reuse, SC-005), threefold-repetition
// draws (invisible to a bare FEN, so the app tracks its own position
// history), the async computer reply drained in small scheduler chunks so
// the page never freezes, the per-move coach comment, and the hint.
//
// Everything that touches time or randomness is injected ({schedule, now,
// random, coach, engine}), which is what tests/ui-contract.test.js drives;
// the defaults are the real engine and setTimeout(0). The DOM is never
// touched here — app/main.js and app/board-ui.js own rendering.

import {
  START_FEN,
  WHITE,
  BLACK,
  parseFen,
  isCheck,
  findKing,
  sqName,
  opposite,
  FLAG_CASTLE_K,
  FLAG_CASTLE_Q,
  FLAG_EP,
} from '../engine/board.js';
import { findLegalMove } from '../engine/moves.js';
import { isInsufficientMaterial } from '../engine/status.js';
import { createSearch } from '../engine/search.js';
import { pickMove, levelConfig } from '../engine/levels.js';
import { rng } from '../engine/rng.js';
import { legalMoves, applyMove, gameStatus, reviewMove } from '../engine/index.js';
import { hangingPiece } from '../engine/review.js';

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

// How much synchronous work one scheduler chunk may do while draining the
// steppable search (level-4 replies and hints). 40 ms keeps the page fluid;
// the search's own budget still bounds the total (design §2, §5).
const CHUNK_WORK_MS = 40;

// Hints are the coach's honest best (spec decision): the same full-strength
// search the top level plays with.
const HINT_BUDGET_MS = 1200;

const defaultEngine = {
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

// A move described the way a beginner reads it (same wording family as the
// coach's own sentences): which piece, from which square, to which square,
// with castling, en passant and promotion said in words. `whose` is 'your'
// or 'their'. Returns null for a move that is not legal in the position.
export function moveWords(fen, uci, whose = 'your') {
  const move = findLegalMove(parseFen(fen), uci);
  if (move === null) return null;
  const from = sqName(move.from);
  const to = sqName(move.to);
  const piece = PIECE_NAMES[move.piece.toLowerCase()];
  if (move.flags & (FLAG_CASTLE_K | FLAG_CASTLE_Q)) {
    const side = move.flags & FLAG_CASTLE_K ? 'kingside' : 'queenside';
    return `castling ${whose} king to the ${side}`;
  }
  if (move.flags & FLAG_EP) {
    return `capturing the pawn on ${to} en passant with ${whose} pawn from ${from}`;
  }
  if (move.captured !== null) {
    const victim = PIECE_NAMES[move.captured.toLowerCase()];
    if (move.promotion !== null) {
      return `capturing the ${victim} on ${to} with ${whose} pawn from ${from}, promoting to a ${PIECE_NAMES[move.promotion]}`;
    }
    return `capturing the ${victim} on ${to} with ${whose} ${piece} from ${from}`;
  }
  if (move.promotion !== null) {
    return `moving ${whose} pawn from ${from} to ${to}, promoting to a ${PIECE_NAMES[move.promotion]}`;
  }
  return `moving ${whose} ${piece} from ${from} to ${to}`;
}

const cap = (sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1);

export function createGame(options = {}) {
  const {
    fen: startFen = START_FEN,
    level: startLevel = 1,
    userColor = WHITE,
    schedule = (fn) => setTimeout(fn, 0),
    now = Date.now,
    random = rng((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0),
    coach = (fenBefore, uci) => reviewMove(fenBefore, uci),
    engine = defaultEngine,
  } = options;

  if (userColor !== WHITE && userColor !== BLACK) throw new Error(`invalid userColor: ${userColor}`);
  engine.levelConfig(startLevel); // validates the level number

  let fen = startFen;
  let phase = 'user'; // 'user' | 'review' | 'reply' | 'promotion' | 'over'
  let level = startLevel;
  let history = []; // {uci, byUser, fenBefore, fenAfter}
  let comments = []; // {moveNumber, uci, fenBefore, verdict, reasons, betterMove}
  let pendingPromotion = null; // {from, to, options}
  let hint = null; // {uci, sentence}
  let hintPending = false;
  let over = null; // {status, winner, reason}
  let disposed = false; // set by dispose(): pending scheduler work stops
  const listeners = [];

  // ---- repetition (the one rule a bare FEN cannot see; same key convention
  // as scripts/levels-check.js: position, side to move, castling, en passant)
  const seen = new Map();
  const positionKey = (f) => f.split(' ').slice(0, 4).join(' ');
  const bump = (f) => {
    const key = positionKey(f);
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    return count;
  };

  function checkSquareOf(fenNow) {
    const pos = engine.parseFen(fenNow);
    if (!engine.isCheck(pos)) return null;
    return engine.sqName(engine.findKing(pos, pos.turn));
  }

  // The end state of the game after `fenNow`, or null while it goes on.
  function endState(fenNow) {
    const status = engine.gameStatus(fenNow);
    if (status === 'checkmate') {
      const mover = engine.opposite(fenNow.split(' ')[1]); // the side that just moved wins
      return { status: 'checkmate', winner: mover, reason: 'checkmate' };
    }
    if (status === 'stalemate') return { status: 'draw', winner: null, reason: 'stalemate' };
    if (status === 'draw') {
      const insufficient = engine.isInsufficientMaterial(engine.parseFen(fenNow));
      return { status: 'draw', winner: null, reason: insufficient ? 'insufficient material' : 'fifty-move rule' };
    }
    if ((seen.get(positionKey(fenNow)) ?? 0) >= 3) {
      return { status: 'draw', winner: null, reason: 'threefold repetition' };
    }
    return null;
  }

  function snapshot() {
    const last = history[history.length - 1] ?? null;
    return {
      fen,
      phase,
      level,
      userColor,
      turn: fen.split(' ')[1],
      checkSquare: checkSquareOf(fen),
      lastMove: last === null ? null : { uci: last.uci, byUser: last.byUser, fenBefore: last.fenBefore },
      pendingPromotion: pendingPromotion === null ? null : { ...pendingPromotion },
      hint: hint === null ? null : { ...hint },
      hintPending,
      comments: comments.map((c) => ({ ...c, reasons: [...c.reasons] })),
      history: history.map((m) => ({ ...m })),
      userMoveCount: history.filter((m) => m.byUser).length,
      over: over === null ? null : { ...over },
    };
  }

  function notify() {
    const snap = snapshot();
    for (const listener of listeners) listener(snap);
  }

  // ------------------------------------------------------------ user moves

  function tryUserMove(from, to) {
    if (phase !== 'user') return false;
    const matches = engine.legalMoves(fen).filter(
      (u) => u.slice(0, 2) === from && u.slice(2, 4) === to,
    );
    if (matches.length === 0) return false; // not a legal click: refused quietly
    if (matches.length > 1) {
      // A promotion from/to matches all four piece choices: ask, never
      // silently default (spec edge cases).
      pendingPromotion = { from, to, options: matches.map((u) => u[4]) };
      phase = 'promotion';
      notify();
      return true;
    }
    applyUserMove(matches[0]);
    return true;
  }

  function applyUserMove(uci) {
    const fenBefore = fen;
    fen = engine.applyMove(fenBefore, uci);
    history.push({ uci, byUser: true, fenBefore, fenAfter: fen });
    bump(fen);
    pendingPromotion = null;
    hint = null;
    phase = 'review';
    notify(); // the board paints the user's move before the coach blocks

    schedule(() => {
      if (disposed) return; // a new game took over: stop coaching this one
      const verdict = coach(fenBefore, uci);
      comments.push({
        moveNumber: history.filter((m) => m.byUser).length,
        uci,
        fenBefore,
        verdict: verdict.verdict,
        reasons: [...verdict.reasons],
        betterMove: verdict.betterMove ?? null,
      });
      const end = endState(fen);
      if (end !== null) {
        finishGame(end);
        return;
      }
      phase = 'reply';
      notify(); // paints "thinking…" before the reply work starts
      startReply();
    });
  }

  function choosePromotion(piece) {
    if (phase !== 'promotion') return false;
    const { from, to } = pendingPromotion;
    const uci = `${from}${to}${piece}`;
    if (!engine.legalMoves(fen).includes(uci)) return false;
    applyUserMove(uci);
    return true;
  }

  function cancelPromotion() {
    if (phase !== 'promotion') return;
    pendingPromotion = null;
    phase = 'user';
    notify();
  }

  // ------------------------------------------------------- computer reply

  function startReply() {
    if (disposed) return;
    const pos = engine.parseFen(fen);
    const config = engine.levelConfig(level);

    if (config.candidatePool === 1 && config.blunderChance === 0) {
      // Full strength: drain the steppable search in bounded chunks so the
      // page stays interactive (design §2). Same search and budget as
      // pickMove uses for this level — just chunked.
      const search = engine.createSearch(pos, config.budgetMs);
      const chunk = () => {
        if (disposed) return;
        const chunkStart = now();
        let result;
        do {
          result = search.step();
        } while (!result.done && now() - chunkStart < CHUNK_WORK_MS);
        if (result.done) {
          finishReply(result.move);
          return;
        }
        schedule(chunk);
      };
      schedule(chunk);
      return;
    }

    // Weakened levels: the engine's own pick (depth-capped candidate pool).
    // One bounded chunk; level budgets keep it small (levels 1–2 ≤ ~200 ms,
    // level 3 ≤ ~950 ms with its 900 ms valve).
    schedule(() => {
      if (disposed) return;
      finishReply(engine.pickMove(pos, level, random));
    });
  }

  function finishReply(uci) {
    let move = uci;
    if (move === null || !engine.legalMoves(fen).includes(move)) {
      move = engine.legalMoves(fen)[0] ?? null; // contract guard: always legal
    }
    if (move === null) {
      finishGame(endState(fen) ?? { status: 'draw', winner: null, reason: 'no legal moves' });
      return;
    }
    const fenBefore = fen;
    fen = engine.applyMove(fenBefore, move);
    history.push({ uci: move, byUser: false, fenBefore, fenAfter: fen });
    bump(fen);
    hint = null;
    hintPending = false;
    const end = endState(fen);
    if (end !== null) {
      finishGame(end);
      return;
    }
    phase = 'user';
    notify();
  }

  function finishGame(end) {
    over = end;
    phase = 'over';
    hint = null;
    hintPending = false;
    notify();
  }

  // ----------------------------------------------------------------- hint

  // One legal move plus a one-sentence reason, on the user's turn, on
  // request. Never plays the move: the only state that changes is the hint
  // itself. Chunked like the reply, so the page stays interactive.
  function hintNow() {
    if (phase !== 'user' || hintPending) return null;
    hintPending = true;
    hint = null;
    notify();
    const fenAtStart = fen;
    const search = engine.createSearch(engine.parseFen(fenAtStart), HINT_BUDGET_MS);
    const chunk = () => {
      if (disposed) return;
      const chunkStart = now();
      let result;
      do {
        result = search.step();
      } while (!result.done && now() - chunkStart < CHUNK_WORK_MS);
      if (!result.done) {
        schedule(chunk);
        return;
      }
      hintPending = false;
      // A move played while the hint thought makes it stale: drop it.
      if (fen !== fenAtStart || phase !== 'user') {
        notify();
        return;
      }
      if (result.move !== null) {
        hint = { uci: result.move, sentence: hintSentence(fenAtStart, result.move) };
      }
      notify();
    };
    schedule(chunk);
    return { pending: true };
  }

  // Every claim below is verified on the exact position: mate via gameStatus,
  // the "for free"/"wins material" claims via review.js's hangingPiece
  // detector (which gates on a ≥ 200 cp material net), check via isCheck.
  function hintSentence(fenNow, uci) {
    const move = engine.findLegalMove(engine.parseFen(fenNow), uci);
    const after = engine.applyMove(fenNow, uci);
    if (engine.gameStatus(after) === 'checkmate') {
      return `${cap(moveWords(fenNow, uci))} gives checkmate — the game ends at once.`;
    }
    if (move !== null && move.captured !== null) {
      const threat = engine.hangingPiece(fenNow);
      if (
        threat !== null &&
        threat.square === engine.sqName(move.to) &&
        threat.bySquare === engine.sqName(move.from)
      ) {
        const victim = PIECE_NAMES[threat.piece];
        const by = PIECE_NAMES[threat.by];
        if (threat.free) {
          return `Their ${victim} on ${threat.square} can be captured for free by your ${by} from ${threat.bySquare}.`;
        }
        return `Capturing their ${victim} on ${threat.square} with your ${by} from ${threat.bySquare} wins material.`;
      }
    }
    let sentence = `The strongest move I see is ${moveWords(fenNow, uci)}`;
    if (engine.isCheck(engine.parseFen(after))) sentence += ', and it gives check';
    return `${sentence}.`;
  }

  // ------------------------------------------------------------- surface

  function setLevel(newLevel) {
    engine.levelConfig(newLevel); // throws RangeError for unknown levels
    level = newLevel;
    notify();
  }

  // Stop this game: every scheduled callback (coach review, computer reply,
  // hint chunk) checks `disposed` and drops out, so starting a new game
  // cannot leave the old one's work firing late. Called by main.js when the
  // user starts a new game (spec P2-1).
  function dispose() {
    disposed = true;
  }

  bump(startFen);
  const initialEnd = endState(startFen);
  if (initialEnd !== null) {
    over = initialEnd;
    phase = 'over';
  } else if (startFen.split(' ')[1] !== userColor) {
    // The user plays Black: the computer opens the game (spec P2-2).
    phase = 'reply';
    schedule(startReply);
  }

  return {
    tryUserMove,
    choosePromotion,
    cancelPromotion,
    hint: hintNow,
    setLevel,
    dispose,
    onChange(listener) {
      listeners.push(listener);
      listener(snapshot());
    },
    state: snapshot,
  };
}
