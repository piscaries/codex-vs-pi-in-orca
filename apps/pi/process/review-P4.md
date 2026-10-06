# Code review: phase P4 — playable app

Verdict: PASS

## Checks run

- `node --test chess-coach/tests/ui-contract.test.js` → 24 pass, 0 fail (3.8 s)
- `node --test chess-coach/tests/*.test.js` → 182 pass, 0 fail (13.4 s)
- `bash chess-coach/scripts/ui-smoke.sh` → PASS (file:// and http:// both boot with 64 squares, 32 pieces, zero errors)
- `node chess-coach/scripts/levels-check.js` → PASS (proxy 7/10 at level 1, 0/10 at level 4)
- Browser screenshot via headless Chrome at http://127.0.0.1 → app renders correctly: board, pieces, panel, level selector, hint button, status line, comments area all present and laid out as expected

## Blocking findings

None.

## Non-blocking (Nit:) suggestions

1. `app/game.js:104` — The random seed `(Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0` mixes two entropy sources but the xor-then-unsigned-shift is fine for game randomness. A comment noting this is intentionally non-cryptographic would help a future reader, but not blocking.

2. `app/coach-panel.js:138` — `comments.textContent = ''` clears all children on every render, rebuilding the full comment list each time. For a game with ≤40 user moves this is negligible, but an append-only strategy would be more efficient. Not blocking — the game length is bounded.

3. `app/board-ui.js:42` — The square color class is recomputed from the square name on every render (`(name.charCodeAt(0) + Number(name[1])) % 2`), duplicating the initial construction logic (`(file + rank) % 2`). Both are correct; a slight inconsistency in the two expressions (one uses char code, the other array index) but both produce the same light/dark assignment. Not blocking.

## What was done well

- **Comment-before-reply ordering** is a strong architectural choice: the test at line 147 of ui-contract.test.js proves the comment lands before the reply starts, which keeps FR-006 truthfulness guarantees intact. This is the hardest invariant in the phase and it's well-defended.

- **Injectable everything in game.js**: schedule, now, random, coach, and engine are all injected, making the 24 contract tests fast and deterministic. The harness pattern in the test file is clean and reusable.

- **Hint design**: chunked search (same 40 ms cap as replies), staleness detection when the user moves during hint computation, verified-fact sentences (mate/capture/check gated on actual position analysis rather than search scores). The three hint sentence tests pin the exact wording, which catches regressions.

- **Engine edits are minimal and well-documented**: the two approved constant changes (`REVIEW_BUDGET_MS` 1200→500, level-3 `budgetMs` 60000→900) are accompanied by measurements in the phase report, and the full suite confirms no regressions.

- **UI smoke test** covers both file:// and http:// transport, uses the page's own error collector rather than Chrome stderr (which is noisy), and the server-start/kill lifecycle is clean.

- **CSS is solid**: dark theme with good contrast, piece outlines for white pieces on light squares, verdict-colored comment borders, responsive board sizing via `min()` and `aspect-ratio`, accessible promotion picker with `role="dialog"` and aria-labels.

- **moveWords** covers every move kind (quiet, capture, castling, en passant, promotion, promotion-capture) and the test at line 462 pins all of them.

## Remaining limits

- Level-3 reply is one synchronous chunk of ≤ ~950 ms (documented and approved; levels 1–2 ≤ ~200 ms, level 4 chunked).
- Review valve at 500 ms costs ~one ply vs 1200 ms on sharp positions (documented; probe margins hold).
- No new-game or play-Black UI (P5 scope).
- Board is White's view only until P5.
- `file://` requires Chrome's `--allow-file-access-from-files` flag for ES modules (documented; http:// works without flags).
