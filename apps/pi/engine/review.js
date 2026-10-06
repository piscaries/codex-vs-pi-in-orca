// Coach review (phase P3): the verdict on the move the user just played.
//
// reviewMove(fen, uci) grades `uci` — played by the side to move in `fen` —
// on the fixed five-step scale (best / good / inaccuracy / mistake /
// blunder) and explains it in one or two plain sentences (FR-005..FR-007).
//
// The verdict comes from exact root scores of a depth-capped, full-window
// search: loss = score(best) − score(played) in centipawns, banded by the
// design's thresholds (≤ 50 good, ≤ 110 inaccuracy, ≤ 250 mistake, more =
// blunder), with two mate adjustments: letting the opponent mate in one is
// always a blunder, and missing your own mate in one is at least a mistake.
//
// Truthfulness (FR-006, quality bar #2) does not come from the search: every
// concrete sentence is emitted by a detector that verifies the claim on the
// exact position — mateInOne() for "a mating move exists", hangingPiece()
// for "your piece can be captured", materialTally() for the stalemate case.
// The sentences name pieces and squares in everyday words and never quote
// engine numbers or bare move notation (FR-007). Best and good moves get a
// short acknowledgement only (quality bar #5) and no better-move suggestion.

import {
  OFFBOARD,
  WHITE,
  BLACK,
  FLAG_CASTLE_K,
  FLAG_CASTLE_Q,
  FLAG_EP,
  colorOf,
  opposite,
  parseFen,
  sqName,
  makeMove,
  unmakeMove,
  isCheck,
} from './board.js';
import { generateLegalMoves, generatePseudoMoves, findLegalMove, moveToUci } from './moves.js';
import { gameStatus } from './status.js';
import { PIECE_VALUES } from './eval.js';
import { scoreRootMoves } from './search.js';

// Search budget for one review. Depth-capped (exact, full-window scores) with
// a time valve: sharp middlegames keep the last depth that fully completed,
// quiet positions reach the cap. See the phase report for the measured times.
export const REVIEW_MAX_DEPTH = 5;
export const REVIEW_BUDGET_MS = 500;

// Verdict bands in centipawns of loss (design §3), and the minimum material
// a capture chain must win before the coach speaks of it as a threat.
export const REVIEW_THRESHOLDS = { good: 50, inaccuracy: 110, mistake: 250 };
export const THREAT_NET_CP = 200;

// How deep the material-exchange chains are followed when judging a capture.
// Real exchange chains almost never exceed a few plies; the sentences built
// from the judgement state only single-ply facts, so a short cap is safe.
const MATERIAL_EXCHANGE_DEPTH = 6;

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VERDICT_RANK = { best: 0, good: 1, inaccuracy: 2, mistake: 3, blunder: 4 };
const VALID_VERDICTS = new Set(Object.keys(VERDICT_RANK));

const colorName = (color) => (color === WHITE ? 'White' : 'Black');

function toPos(fenOrPos) {
  return typeof fenOrPos === 'string' ? parseFen(fenOrPos) : fenOrPos;
}

// ---------------------------------------------------------------- detectors

// Every legal move for `color` that delivers checkmate at once. Only the side
// to move can mate, so any other color yields an empty list (a claim about a
// mate "available" to the non-moving side would not be checkable).
export function mateInOne(fenOrPos, color) {
  const pos = toPos(fenOrPos).clone();
  if (pos.turn !== color) return [];
  const mates = [];
  for (const move of generateLegalMoves(pos)) {
    const undo = makeMove(pos, move);
    if (gameStatus(pos) === 'checkmate') mates.push(move);
    unmakeMove(pos, undo);
  }
  return mates;
}

// Material balance of both sides in centipawns (kings excluded) — used for
// the one statement about stalemates that names material.
export function materialTally(fenOrPos) {
  const pos = toPos(fenOrPos);
  const tally = { [WHITE]: 0, [BLACK]: 0 };
  for (let sq = 21; sq <= 98; sq++) {
    const piece = pos.board[sq];
    if (piece === null || piece === OFFBOARD) continue;
    tally[colorOf(piece)] += PIECE_VALUES[piece.toLowerCase()];
  }
  return tally;
}

function captureValue(move) {
  const captured = move.captured !== null ? PIECE_VALUES[move.captured.toLowerCase()] : 0;
  const promotion = move.promotion !== null ? PIECE_VALUES[move.promotion] - PIECE_VALUES.p : 0;
  return captured + promotion;
}

// The legal captures of the side to move, most valuable first — the only
// moves the exchange judgement below ever looks at.
function legalCaptures(pos) {
  const us = pos.turn;
  const captures = generatePseudoMoves(pos).filter((m) => m.captured !== null || m.promotion !== null);
  captures.sort((a, b) => captureValue(b) - captureValue(a));
  const legal = [];
  for (const move of captures) {
    const undo = makeMove(pos, move);
    if (!isCheck(pos, us)) legal.push(move);
    unmakeMove(pos, undo);
  }
  return legal;
}

// The best material the side to move can win with a chain of captures,
// assuming the opponent answers each capture with the material-best reply.
// Standing pat (taking nothing) is always allowed, so the value never goes
// below zero. Pins are respected because each capture is legality-checked;
// captures are tried most-valuable-first so `gain <= best` ends the loop.
// This is the same judgment every chess teacher makes about "winning
// material"; the sentences built from it state only facts verified elsewhere.
function materialNet(pos, depthLeft) {
  if (depthLeft === 0) return 0;
  let best = 0;
  for (const move of legalCaptures(pos)) {
    const gain = captureValue(move);
    if (gain <= best) break; // sorted: no later capture can beat `best` either
    const undo = makeMove(pos, move);
    const net = gain - materialNet(pos, depthLeft - 1);
    unmakeMove(pos, undo);
    if (net > best) best = net;
  }
  return best;
}

// The most serious capture threat against the side that just moved, judged on
// the exact position after their move (so the opponent is the side to move).
// Returns null when no opponent capture wins at least THREAT_NET_CP material.
// The returned facts are each exhaustively verified single-ply claims:
//   free       — after the capture, the victim has no legal capture at all;
//   recapture  — a legal move that captures onto the victim square (or null);
//   occupant   — what stands on the victim square once the capture is played
//                (a promotion capture grows into the promoted piece).
export function hangingPiece(fenOrPos) {
  const after = toPos(fenOrPos).clone();
  const victim = opposite(after.turn);
  let threat = null;
  for (const capture of generateLegalMoves(after)) {
    if (capture.captured === null) continue;
    const undo = makeMove(after, capture);
    const net = captureValue(capture) - materialNet(after, MATERIAL_EXCHANGE_DEPTH);
    const answers = legalCaptures(after);
    const reply = answers.find((m) => m.to === capture.to) ?? null;
    const anyCapture = answers.length > 0;
    const occupant = capture.promotion !== null ? capture.promotion : capture.piece.toLowerCase();
    unmakeMove(after, undo);
    if (net < THREAT_NET_CP) continue;
    if (threat === null || net > threat.netCp) {
      threat = {
        piece: capture.captured.toLowerCase(),
        square: sqName(capture.to),
        by: capture.piece.toLowerCase(),
        bySquare: sqName(capture.from),
        occupant,
        recapture: reply !== null ? reply.piece.toLowerCase() : null,
        free: !anyCapture,
        netCp: net,
        victimColor: victim,
      };
    }
  }
  return threat;
}

// ------------------------------------------------------------------ wording

// A move described the way a beginner reads it: which of your pieces, from
// which square, to which square — with castling, en passant and promotion
// said in words instead of notation. `whose` is 'your' or 'their'; the
// phrase always starts with a gerund so it can act as a sentence subject
// ("moving your knight from b1 to c3 ...").
function verbPhrase(move, whose = 'your') {
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
      const promo = PIECE_NAMES[move.promotion];
      return `capturing the ${victim} on ${to} with ${whose} pawn from ${from}, promoting to a ${promo}`;
    }
    return `capturing the ${victim} on ${to} with ${whose} ${piece} from ${from}`;
  }
  if (move.promotion !== null) {
    const promo = PIECE_NAMES[move.promotion];
    return `moving ${whose} pawn from ${from} to ${to} and promoting it to a ${promo}`;
  }
  return `moving ${whose} ${piece} from ${from} to ${to}`;
}

function hangingSentence(threat) {
  const pieceName = PIECE_NAMES[threat.piece];
  const byName = PIECE_NAMES[threat.by];
  const occupantName = PIECE_NAMES[threat.occupant];
  if (threat.free) {
    return `Your ${pieceName} on ${threat.square} can now be captured for free by the ${byName} on ${threat.bySquare}.`;
  }
  if (threat.recapture === null) {
    return `Your ${pieceName} on ${threat.square} can now be captured by the ${byName} on ${threat.bySquare}, and no piece of yours can capture that ${occupantName} back.`;
  }
  if (PIECE_VALUES[threat.occupant] < PIECE_VALUES[threat.piece]) {
    return `Your ${pieceName} on ${threat.square} can be captured by the ${byName} on ${threat.bySquare}; taking it back wins you only that ${occupantName}, worth far less than your ${pieceName}.`;
  }
  return `Your ${pieceName} on ${threat.square} can now be captured by the ${byName} on ${threat.bySquare}.`;
}

// ------------------------------------------------------------------- review

function bandVerdict(lossCp) {
  if (lossCp <= REVIEW_THRESHOLDS.good) return 'good';
  if (lossCp <= REVIEW_THRESHOLDS.inaccuracy) return 'inaccuracy';
  if (lossCp <= REVIEW_THRESHOLDS.mistake) return 'mistake';
  return 'blunder';
}

function raiseVerdict(current, minimum) {
  return VERDICT_RANK[minimum] > VERDICT_RANK[current] ? minimum : current;
}

// The coach's verdict on `uci`, played by the side to move in `fen`.
// Returns { verdict, reasons, betterMove } exactly as the fixed interface
// promises; throws when `uci` is not a legal move in `fen`.
export function reviewMove(fen, uci) {
  const pos = toPos(fen).clone();
  const played = findLegalMove(pos, uci);
  if (played === null) throw new Error(`illegal move: ${uci}`);

  const mover = pos.turn;
  const opponent = opposite(mover);
  const after = pos.clone();
  makeMove(after, played);

  // Exact root scores, best first: the loss that sets the verdict.
  const { moves: scored } = scoreRootMoves(pos.clone(), {
    maxDepth: REVIEW_MAX_DEPTH,
    budgetMs: REVIEW_BUDGET_MS,
  });
  const best = scored[0];
  const playedEntry = scored.find((m) => moveToUci(m.move) === uci) ?? { scoreCp: best.scoreCp };
  const lossCp = best.scoreCp - playedEntry.scoreCp;

  const playedMates = gameStatus(after) === 'checkmate';
  const missedMate = playedMates ? null : mateInOne(pos, mover)[0] ?? null;
  const allowsMate = playedMates ? null : mateInOne(after, opponent)[0] ?? null;

  let verdict = bandVerdict(lossCp);
  if (playedMates || lossCp === 0) verdict = 'best';
  if (missedMate !== null) verdict = raiseVerdict(verdict, 'mistake');
  if (allowsMate !== null) verdict = 'blunder';

  let reasons;
  if (verdict === 'best') {
    reasons = [playedMates ? 'Checkmate — you win the game.' : 'Best move.'];
  } else if (verdict === 'good') {
    reasons = ['Good move.'];
  } else {
    reasons = [];
    if (allowsMate !== null) {
      reasons.push(
        `After this move, ${colorName(opponent)} can deliver checkmate: ${verbPhrase(allowsMate, 'their')} would end the game.`,
      );
    }
    if (missedMate !== null) {
      reasons.push(`You missed checkmate: ${verbPhrase(missedMate)} would have won the game at once.`);
    }
    if (reasons.length < 2) {
      const threat = hangingPiece(after);
      if (threat !== null) reasons.push(hangingSentence(threat));
    }
    if (reasons.length < 2 && gameStatus(after) === 'stalemate') {
      const tally = materialTally(pos);
      if (tally[mover] - tally[opponent] >= 100) {
        reasons.push(
          `Your move leaves ${colorName(opponent)} without a single legal move: that is stalemate, a draw, even though you hold more material.`,
        );
      }
    }
    if (reasons.length < 2 && missedMate === null) {
      reasons.push(`A stronger move was ${verbPhrase(best.move)}.`);
    }
  }

  if (!VALID_VERDICTS.has(verdict)) throw new Error(`internal error: bad verdict ${verdict}`);
  const betterMove = VERDICT_RANK[verdict] >= VERDICT_RANK.inaccuracy ? moveToUci(best.move) : null;
  return { verdict, reasons, betterMove };
}
