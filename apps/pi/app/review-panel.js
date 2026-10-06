// End-of-game review panel for Chess Coach (phase P5): the honest summary
// of the game (FR-009, SC-005) plus the copyable transcript (spec P3-1).
//
// The contract that matters (FR-009 / quality bar #9): the review lists only
// this game's user moves rated inaccuracy or worse, worst first, capped at
// five, and reproduces the in-game verdicts and reasons verbatim — none
// invented, none altered; a clean game gets a single line. That is why all
// of the selecting and sorting lives in the pure, DOM-free collectReview()
// (proved by tests/review-panel.test.js against the same comment objects the
// game renders during play) and the DOM layer below only lays the chosen
// entries out, in the same wording family as the in-game comment heads.
//
// buildTranscript() turns the finished game into plain text with the coach's
// comments (spec P3-1): every move in everyday words, each user move with
// its verdict, reasons and better move, and the result — no bare notation.

import { LEVELS } from '../engine/levels.js';
import { moveWords } from './game.js';

export const REVIEW_CAP = 5;

const VERDICT_RANK = { best: 0, good: 1, inaccuracy: 2, mistake: 3, blunder: 4 };
// The same titles as the in-game comment heads (app/coach-panel.js), so a
// review entry reads exactly like the comment the user saw during the game.
export const VERDICT_TITLES = {
  best: 'Best move',
  good: 'Good move',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

// The same result sentences as the coach panel's game-over banner
// (app/coach-panel.js); duplicated because that module is not part of this
// phase's files, and the review must speak with one voice.
const DRAW_REASONS = {
  stalemate: 'Stalemate: no legal moves and no check, so the game is drawn.',
  'fifty-move rule': 'Draw by the fifty-move rule: fifty moves passed with no pawn move and no capture.',
  'insufficient material': 'Draw by insufficient material: neither side has enough pieces left to force checkmate.',
  'threefold repetition': 'Draw by repetition: the same position appeared three times.',
};

export const CLEAN_GAME_LINE = 'No moves worth flagging — a clean game from start to finish.';

export function resultLine(over, userColor) {
  if (over === null) return 'The game was not finished.';
  if (over.status === 'checkmate') {
    return over.winner === userColor ? 'Checkmate — you win!' : 'Checkmate — the computer wins.';
  }
  return DRAW_REASONS[over.reason] ?? 'The game is drawn.';
}

// This game's user moves worth reviewing: verdict inaccuracy or worse, worst
// first, at most REVIEW_CAP. Ties keep the order they were played in. The
// returned entries are the in-game comment objects (copies) — verdict and
// reasons are never reworded here.
export function collectReview(comments) {
  return comments
    .filter((c) => (VERDICT_RANK[c.verdict] ?? 0) >= VERDICT_RANK.inaccuracy)
    .map((c) => ({
      moveNumber: c.moveNumber,
      uci: c.uci,
      fenBefore: c.fenBefore,
      verdict: c.verdict,
      reasons: [...c.reasons],
      betterMove: c.betterMove ?? null,
    }))
    .sort(
      (a, b) =>
        VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict] || a.moveNumber - b.moveNumber,
    )
    .slice(0, REVIEW_CAP);
}

// The whole finished game as text, with the coach's comments — what the copy
// button puts on the clipboard. Moves are said in words (moveWords), user
// moves carry their in-game verdict, reasons and better move, and the result
// line matches the game-over banner.
export function buildTranscript(snap) {
  const color = snap.userColor === 'w' ? 'white' : 'black';
  const label = LEVELS.find((l) => l.level === snap.level)?.label;
  const lines = [
    `Chess Coach game — you played the ${color} pieces against the computer (level ${snap.level}${label === undefined ? '' : ` — ${label}`}).`,
    resultLine(snap.over, snap.userColor),
    '',
  ];
  if (snap.history.length === 0) {
    lines.push('No moves were played.');
    return lines.join('\n');
  }
  snap.history.forEach((m, i) => {
    const words = moveWords(m.fenBefore, m.uci, m.byUser ? 'your' : 'their');
    lines.push(`${i + 1}. ${m.byUser ? 'You' : 'The computer'} played ${words ?? m.uci}.`);
    if (!m.byUser) return;
    const comment = snap.comments.find(
      (c) => c.uci === m.uci && c.fenBefore === m.fenBefore,
    );
    if (comment === undefined) return;
    const title = VERDICT_TITLES[comment.verdict] ?? comment.verdict;
    lines.push(`   Coach: ${title}.`);
    // A short acknowledgement that merely repeats the verdict (the real
    // coach's "Good move."/"Best move.") adds nothing: keep the transcript
    // proportionate without altering any other sentence.
    for (const reason of comment.reasons) {
      if (reason !== `${title}.`) lines.push(`   ${reason}`);
    }
    if (comment.betterMove !== null) {
      const better = moveWords(m.fenBefore, comment.betterMove);
      lines.push(`   Better: ${better ?? comment.betterMove}.`);
    }
  });
  return lines.join('\n');
}

// ---------------------------------------------------------------- DOM layer

export function createReviewPanel({ root }) {
  const wrap = document.createElement('section');
  wrap.className = 'review';
  wrap.id = 'review';
  wrap.setAttribute('aria-label', 'game review');
  wrap.hidden = true; // the review appears only when the game is over

  const title = document.createElement('h2');
  title.className = 'review-title';
  title.textContent = 'Game review';

  const result = document.createElement('div');
  result.className = 'review-result';

  const body = document.createElement('div');
  body.className = 'review-body';

  const copyRow = document.createElement('div');
  copyRow.className = 'review-copy';
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.id = 'copy-button';
  copyButton.textContent = 'Copy the game with comments';
  const copyFeedback = document.createElement('span');
  copyFeedback.className = 'review-copy-feedback';
  copyFeedback.id = 'copy-feedback';
  copyRow.append(copyButton, copyFeedback);

  const transcript = document.createElement('textarea');
  transcript.className = 'review-transcript';
  transcript.id = 'review-transcript';
  transcript.readOnly = true;
  transcript.setAttribute('aria-label', 'the game as text, with the coach’s comments');
  transcript.spellcheck = false;

  wrap.append(title, result, body, copyRow, transcript);
  root.appendChild(wrap);

  function entryEl(entry) {
    const el = document.createElement('div');
    el.className = `review-entry verdict-${entry.verdict}`;
    el.dataset.move = String(entry.moveNumber);
    const head = document.createElement('div');
    head.className = 'review-entry-head';
    // The same head as the in-game comment (coach-panel.js), verbatim.
    head.textContent = `Your move ${entry.moveNumber} · ${VERDICT_TITLES[entry.verdict] ?? entry.verdict}`;
    el.appendChild(head);
    for (const reason of entry.reasons) {
      const p = document.createElement('p');
      p.className = 'review-entry-reason';
      p.textContent = reason;
      el.appendChild(p);
    }
    if (entry.betterMove !== null) {
      const better = document.createElement('div');
      better.className = 'review-entry-better';
      const words = moveWords(entry.fenBefore, entry.betterMove);
      better.textContent =
        words === null ? `Better: ${entry.betterMove}.` : `Better: ${words}.`;
      el.appendChild(better);
    }
    return el;
  }

  // Copy the transcript (spec P3-1). The clipboard API needs a secure
  // context and permission; the fallback selects the visible textarea and
  // tries the legacy copy command; if even that is blocked, the feedback
  // line tells the user to copy the text from the box themselves — never a
  // false "copied".
  async function copyTranscript() {
    const text = transcript.value;
    let ok = false;
    if (navigator.clipboard !== undefined && navigator.clipboard.writeText !== undefined) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      transcript.focus();
      transcript.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
    }
    copyFeedback.textContent = ok
      ? 'Copied.'
      : 'Copy is blocked here — select the text in the box and copy it yourself.';
    return ok;
  }
  copyButton.addEventListener('click', copyTranscript);

  function render(snap) {
    if (snap.over === null) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    result.textContent = resultLine(snap.over, snap.userColor);
    body.textContent = '';
    const entries = collectReview(snap.comments);
    if (entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'review-clean';
      p.textContent = CLEAN_GAME_LINE;
      body.appendChild(p);
    } else {
      for (const entry of entries) body.appendChild(entryEl(entry));
    }
    transcript.value = buildTranscript(snap);
    copyFeedback.textContent = '';
  }

  return { render, copyTranscript };
}
