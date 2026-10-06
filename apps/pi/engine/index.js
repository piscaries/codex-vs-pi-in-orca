// Fixed testing interface (project brief). Positions are FEN strings, moves
// are UCI strings such as `e2e4` or `e7e8q`.
//
// Phase P1 provides the rules half of the facade: legalMoves, applyMove,
// perft, gameStatus. bestMove arrived with search in phase P2 and reviewMove
// with the coach in phase P3; later phases re-export from this module so
// the fixed surface stays stable.

import { parseFen, positionToFen, makeMove } from './board.js';
import { generateLegalMoves, moveToUci, findLegalMove, perft as perftPosition } from './moves.js';
import { gameStatus as statusOfPosition } from './status.js';
import { createSearch } from './search.js';

// The coach's verdict on the move `uci` played in `fen`:
// { verdict, reasons, betterMove } — verdict on the fixed five-step scale,
// reasons as plain sentences, betterMove a legal UCI move for inaccuracy and
// worse, null for best/good. Throws on an illegal move.
export { reviewMove } from './review.js';

// All legal moves as UCI strings, any order. Promotions list all four
// choices (`e7e8q`, `e7e8r`, `e7e8b`, `e7e8n`).
export function legalMoves(fen) {
  const pos = parseFen(fen);
  return generateLegalMoves(pos).map(moveToUci);
}

// The FEN after playing `uci`. Throws `illegal move: …` when the string is
// malformed or the move is not legal in the position (including moving the
// opponent's pieces, ignoring a pin, castling without rights or through an
// attacked square, and promotions without an explicit piece).
export function applyMove(fen, uci) {
  const pos = parseFen(fen);
  const move = findLegalMove(pos, uci);
  if (move === null) throw new Error(`illegal move: ${uci}`);
  makeMove(pos, move);
  return positionToFen(pos);
}

// Number of leaf nodes of the legal move tree at `depth`; depth 0 → 1.
export function perft(fen, depth) {
  return perftPosition(parseFen(fen), depth);
}

// One of "ongoing", "checkmate", "stalemate", "draw" (draw covers the
// fifty-move rule and insufficient material; repetition needs game history,
// see engine/status.js).
export function gameStatus(fen) {
  return statusOfPosition(parseFen(fen));
}

// A legal UCI move for the side to move, chosen within roughly `timeMs`
// (default 1000). Throws when the game is already over (any terminal
// status — checkmate, stalemate, or a draw the FEN itself can prove).
export function bestMove(fen, opts = {}) {
  const pos = parseFen(fen);
  const status = statusOfPosition(pos);
  if (status !== 'ongoing') throw new Error(`no move to find: position is ${status}`);

  const timeMs = typeof opts?.timeMs === 'number' && opts.timeMs > 0 ? opts.timeMs : 1000;
  const search = createSearch(pos, timeMs);
  let result;
  do {
    result = search.step();
  } while (!result.done);
  if (result.move !== null) return result.move;

  // Deadline pathology guard: never break the contract's "always a legal
  // move" promise even if the search produced nothing.
  const legal = generateLegalMoves(pos);
  if (legal.length === 0) throw new Error('no move to find: position is terminal');
  return moveToUci(legal[0]);
}
