// Coach panel for Chess Coach (phase P4): the app's voice. Shows the status
// line (turn / thinking / check), the level selector, the per-move verdicts
// with their reasons and better moves in plain words, the hint area, and the
// game-over banner. Pure rendering — game.js owns all decisions and text
// that makes claims; this module only lays sentences out.
//
// Wording rules it enforces (FR-007): verdicts in plain words, reasons as
// one or two sentences, better moves described in words, never bare
// notation or engine numbers.

import { moveWords } from './game.js';

const VERDICT_TITLES = {
  best: 'Best move',
  good: 'Good move',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

const DRAW_REASONS = {
  stalemate: 'Stalemate: no legal moves and no check, so the game is drawn.',
  'fifty-move rule': 'Draw by the fifty-move rule: fifty moves passed with no pawn move and no capture.',
  'insufficient material': 'Draw by insufficient material: neither side has enough pieces left to force checkmate.',
  'threefold repetition': 'Draw by repetition: the same position appeared three times.',
};

export function createCoachPanel({ root, levels, onLevelChange, onHint }) {
  root.classList.add('panel');

  const status = document.createElement('div');
  status.className = 'status';
  status.id = 'status';

  const controls = document.createElement('div');
  controls.className = 'controls';
  const levelLabel = document.createElement('label');
  levelLabel.htmlFor = 'level-select';
  levelLabel.textContent = 'Computer strength';
  const levelSelect = document.createElement('select');
  levelSelect.id = 'level-select';
  for (const { level, label } of levels) {
    const option = document.createElement('option');
    option.value = String(level);
    option.textContent = `${level} · ${label}`;
    levelSelect.appendChild(option);
  }
  levelSelect.addEventListener('change', () => onLevelChange(Number(levelSelect.value)));
  controls.append(levelLabel, levelSelect);

  const hintArea = document.createElement('div');
  hintArea.className = 'hint-area';
  const hintButton = document.createElement('button');
  hintButton.type = 'button';
  hintButton.id = 'hint-button';
  hintButton.textContent = 'Give me a hint';
  hintButton.addEventListener('click', onHint);
  const hintText = document.createElement('div');
  hintText.className = 'hint-text';
  hintText.id = 'hint-text';
  hintArea.append(hintButton, hintText);

  const comments = document.createElement('div');
  comments.className = 'comments';
  comments.id = 'comments';

  const overBanner = document.createElement('div');
  overBanner.className = 'over-banner';
  overBanner.id = 'over-banner';

  root.append(status, controls, hintArea, comments, overBanner);

  function setStatus(snap) {
    if (snap.over !== null) {
      status.textContent = 'Game over';
      status.className = 'status over';
      return;
    }
    if (snap.phase === 'promotion') {
      status.textContent = 'Choose a piece for your promotion.';
    } else if (snap.phase === 'review') {
      status.textContent = 'The coach is looking at your move…';
    } else if (snap.phase === 'reply') {
      status.textContent = `The computer is thinking (level ${snap.level})…`;
    } else if (snap.checkSquare !== null) {
      status.textContent = 'Your move — you are in check!';
    } else {
      status.textContent = 'Your move.';
    }
    status.className = `status ${snap.phase}${snap.checkSquare !== null && snap.phase === 'user' ? ' check' : ''}`;
  }

  function commentEl(comment) {
    const el = document.createElement('div');
    el.className = `comment verdict-${comment.verdict}`;
    el.dataset.move = String(comment.moveNumber);
    const head = document.createElement('div');
    head.className = 'comment-head';
    head.textContent = `Your move ${comment.moveNumber} · ${VERDICT_TITLES[comment.verdict] ?? comment.verdict}`;
    el.appendChild(head);
    for (const reason of comment.reasons) {
      const p = document.createElement('p');
      p.className = 'comment-reason';
      p.textContent = reason;
      el.appendChild(p);
    }
    if (comment.betterMove !== null) {
      const better = document.createElement('div');
      better.className = 'comment-better';
      const words = moveWords(comment.fenBefore, comment.betterMove);
      better.textContent =
        words === null ? `Better move: ${comment.betterMove}.` : `Better: ${words}.`;
      el.appendChild(better);
    }
    return el;
  }

  function render(snap) {
    setStatus(snap);
    if (levelSelect.value !== String(snap.level)) levelSelect.value = String(snap.level);

    hintButton.disabled = snap.phase !== 'user' || snap.hintPending;
    hintButton.textContent = snap.hintPending ? 'Thinking of a hint…' : 'Give me a hint';
    if (snap.hint !== null) {
      hintText.textContent = `Hint: ${snap.hint.sentence}`;
    } else {
      hintText.textContent = '';
    }

    comments.textContent = '';
    if (snap.comments.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'comments-empty';
      empty.textContent = 'After each of your moves, the coach comments here.';
      comments.appendChild(empty);
    } else {
      // Latest first: the freshest verdict is the one the user reads.
      for (const comment of [...snap.comments].reverse()) comments.appendChild(commentEl(comment));
    }

    overBanner.textContent = '';
    overBanner.className = 'over-banner';
    if (snap.over !== null) {
      overBanner.className = 'over-banner visible';
      const title = document.createElement('div');
      title.className = 'over-title';
      if (snap.over.status === 'checkmate') {
        title.textContent =
          snap.over.winner === snap.userColor ? 'Checkmate — you win!' : 'Checkmate — the computer wins.';
      } else {
        title.textContent = 'The game is drawn.';
      }
      overBanner.appendChild(title);
      const reason = document.createElement('div');
      reason.className = 'over-reason';
      reason.textContent = DRAW_REASONS[snap.over.reason] ?? snap.over.reason;
      overBanner.appendChild(reason);
    }
  }

  return { render };
}
