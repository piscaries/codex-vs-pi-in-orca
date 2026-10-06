// Board UI for Chess Coach (phase P4): renders the 8×8 board from a FEN and
// routes square clicks. Pure rendering — all game decisions live in game.js;
// main.js decides what a click means and calls render with the highlights.
//
// Visible state (FR-010): last move, check, selection, legal targets, turn is
// in the panel's status line. Pieces use filled Unicode glyphs colored by
// side, which reads more clearly at small sizes than outline glyphs.
//
// orientation (phase P5): whose side sits at the bottom — 'w' builds the
// classic White view (rank 8 at the top, file a on the left), 'b' the Black
// view (rank 1 at the top, file h on the left), so the user always plays
// from the bottom edge.

import { parseFen, sqIndex, colorOf } from '../engine/board.js';

const FILES = 'abcdefgh';
const GLYPHS = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

export function createBoardUi({ root, onSquareClick, orientation = 'w' }) {
  root.classList.add('board');
  const squares = new Map(); // square name -> element

  // The user's edge is the bottom: rank 8 / file a first for White, rank 1 /
  // file h first for Black. Labels ride the outer edges (rank numbers on the
  // leftmost file, file letters on the bottom rank) whichever way it faces.
  const ranks = orientation === 'b' ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = orientation === 'b' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  for (const rank of ranks) {
    for (const file of files) {
      const name = FILES[file] + rank;
      const el = document.createElement('div');
      el.className = `square ${(file + rank) % 2 === 0 ? 'light' : 'dark'}`;
      el.dataset.square = name;
      if (file === files[0]) el.dataset.rank = String(rank);
      if (rank === ranks[ranks.length - 1]) el.dataset.file = FILES[file];
      el.addEventListener('click', () => onSquareClick(name));
      root.appendChild(el);
      squares.set(name, el);
    }
  }

  let promotionEl = null;

  function render({ fen, lastMove, checkSquare, selected, targets }) {
    const pos = parseFen(fen);
    const last = lastMove
      ? { from: lastMove.uci.slice(0, 2), to: lastMove.uci.slice(2, 4) }
      : null;
    for (const [name, el] of squares) {
      const piece = pos.board[sqIndex(name)];
      let cls = `square ${(name.charCodeAt(0) + Number(name[1])) % 2 === 0 ? 'light' : 'dark'}`;
      if (last && (name === last.from || name === last.to)) cls += ' last-move';
      if (checkSquare === name) cls += ' check';
      if (selected === name) cls += ' selected';
      if (targets && targets.includes(name)) cls += piece ? ' target-capture' : ' target';
      el.className = cls;
      el.textContent = '';
      if (piece !== null) {
        const glyph = document.createElement('span');
        glyph.className = `piece ${colorOf(piece) === 'w' ? 'white' : 'black'}`;
        glyph.textContent = GLYPHS[piece.toLowerCase()];
        el.appendChild(glyph);
      }
    }
  }

  // The promotion picker (spec: the user is asked, never silently defaulted).
  function showPromotionPicker({ options, color, onChoose, onCancel }) {
    hidePromotionPicker();
    promotionEl = document.createElement('div');
    promotionEl.className = 'promotion-picker';
    promotionEl.setAttribute('role', 'dialog');
    promotionEl.setAttribute('aria-label', 'choose a promotion piece');
    const label = document.createElement('div');
    label.className = 'promotion-label';
    label.textContent = 'Your pawn reached the last rank — promote it to:';
    promotionEl.appendChild(label);
    const row = document.createElement('div');
    row.className = 'promotion-row';
    for (const option of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'promotion-option';
      btn.dataset.piece = option;
      btn.setAttribute('aria-label', `promote to ${option}`);
      const glyph = document.createElement('span');
      glyph.className = `piece ${color === 'w' ? 'white' : 'black'}`;
      glyph.textContent = GLYPHS[option];
      btn.appendChild(glyph);
      btn.addEventListener('click', () => {
        hidePromotionPicker();
        onChoose(option);
      });
      row.appendChild(btn);
    }
    promotionEl.appendChild(row);
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'promotion-cancel';
    cancel.textContent = 'Cancel this move';
    cancel.addEventListener('click', () => {
      hidePromotionPicker();
      onCancel();
    });
    promotionEl.appendChild(cancel);
    root.appendChild(promotionEl);
  }

  function hidePromotionPicker() {
    if (promotionEl !== null) {
      promotionEl.remove();
      promotionEl = null;
    }
  }

  return { render, showPromotionPicker, hidePromotionPicker };
}
