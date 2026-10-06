# Phase P4 report — playable app (track t2)

Task / Dispatch: task_b89c108190ec / ctx_babb9017e13d
Base commit: 01b1392 (branch r5-t2-p4)

## What was built

Exactly phase P4 of `docs/run5/design.md`: the playable app.

- **`chess-coach/index.html`** — page skeleton (board + panel layout), the
  smoke error collector (first inline script: window error, unhandled
  rejection, `console.error`), and an inline module script calling
  `boot()` from `app/main.js`.
- **`chess-coach/app/app.css`** — board, pieces (filled Unicode glyphs
  colored per side, dark outline on White for contrast), last-move/check/
  selection/target highlights, rank/file labels, promotion picker overlay,
  coach panel with verdict-colored comments, status line, game-over banner.
- **`chess-coach/app/game.js`** — the DOM-free game core: phase state
  machine (`user | review | reply | promotion | over`), click legality,
  promotion pending/choose/cancel, the per-move coach comment recorded
  before the computer replies, the computer reply (levels 1–3 via
  `pickMove`; level 4 via `createSearch` drained in ≤ 40 ms scheduler
  chunks), threefold-repetition draws from the app's own position history,
  draw/mate end states with plain reasons, check-square computation, the
  hint (full-strength chunked search + one verified sentence), `moveWords`
  (UCI → plain words for every move kind), and injectable
  `schedule/now/random/coach/engine` for tests.
- **`chess-coach/app/board-ui.js`** — 64-square board render (White's view),
  click routing hook, highlights, promotion picker (4 options + cancel).
- **`chess-coach/app/coach-panel.js`** — status line (turn / thinking /
  check), level selector, per-move comments (verdict word, reasons, better
  move in words), hint button + hint text, game-over banner with plain-word
  reasons.
- **`chess-coach/app/main.js`** — `boot(options)` wiring everything: click
  selection logic, rendering from snapshots, promotion picker glue, the
  last-move line in words, smoke sentinel. Exported (and parameterizable)
  so P5 can re-boot for new games / playing Black.
- **`chess-coach/scripts/ui-smoke.sh`** — headless-Chrome smoke: loads the
  app over `file://` (with `--allow-file-access-from-files`) and over a
  local static server; asserts boot sentinel, 64 squares, 32 pieces, zero
  recorded console/runtime errors.
- **`chess-coach/tests/ui-contract.test.js`** — 24 tests (details below).

## Approved engine edits (outside P4's owned files — coordinator-approved)

Both edits were asked about via the task channel (question msg_8e1e70e95610,
answered "Approved: both A and B" with conditions: only these two constants,
suite stays green, both edits + measurements + residual documented here).

1. **`engine/review.js`: `REVIEW_BUDGET_MS` 1200 → 500.** The per-move
   comment must render *before* the computer replies: review reasons like
   "Your knight on f7 can now be captured" describe the pre-reply position
   and go stale (or visibly false) once the reply is on the board. At 1200
   ms, comment + level-4 reply ≈ 2.45 s > FR-004's 2 s; at 500 ms the worst
   case is ≈ 0.55 s + 1.25 s ≈ 1.8 s. Evidence: full suite 158/158 (now
   182/182) passes at 500; on 126 self-play middlegames the review reaches
   depth ≥ 3 on 92% (vs 99% at 1200) and depth 4–5 on 40% (vs 72%); probe
   verdicts keep wide margins. This edit was pre-authorized in the P3
   report and by its reviewer.
2. **`engine/levels.js`: level-3 `budgetMs` 60000 → 900** (plus the comment
   update). Measured `pickMove` level 3 (full-window depth 4, valve that
   never fired): median 669 ms, p90 2.1 s, **max 4.6 s** over 126 self-play
   middlegames — the app's level-3 reply would have blown FR-004's 2 s and
   frozen the page for seconds. Levels 1–2 measured ≤ 190 ms (their 60 s
   valves never bite; play stays seed-reproducible). Level 3 becomes
   time-valved exactly like the documented level-4 behavior;
   `levels-check.js` (levels 1 and 4 only) is unaffected — re-run: PASS
   (7/10 proxy wins at level 1, 0/10 at level 4).

**Known residual (condition of the approval):** the level-3 reply is one
synchronous `pickMove` chunk of ≤ ~950 ms (page input is already refused —
it is the computer's turn — but hover/animation pause). A fully chunked
level-3 reply would need a steppable `scoreRootMoves` in `engine/search.js`
(P2 surgery, not proposed). Levels 1–2 reply in ≤ ~200 ms; level 4 replies
in ≤ 40 ms chunks (p99 step 75 ms measured in P2); the coach review blocks
≤ ~550 ms after the user's move (board paints first).

## Decisions made

1. **Comment → reply ordering is fixed**: user move applies and paints, then
   the review runs (≤ ~550 ms), the comment renders, and only then does the
   reply start. This keeps every concrete reason checkable against the
   board (FR-006's "true in the position shown") and keeps review + reply
   inside 2 s. Proven by a test asserting the comment exists at the moment
   the phase becomes `reply`.
2. **`boot(options)` exported from main.js; index.html calls it.** The
   driver (and P5's new game / play-Black) re-boots the same real wiring
   instead of a copy. Verified in a real browser by driving the actual
   `boot()` with a pumped scheduler.
3. **Level routing mirrors `pickMove`'s own branch**: `candidatePool === 1
   && blunderChance === 0` → chunked `createSearch` at `config.budgetMs`;
   otherwise the engine's `pickMove(pos, level, random)` in one bounded
   chunk. One seeded `rng` stream per game (levels.js contract).
4. **Hints are chunked like replies** (same 40 ms chunk cap, full-strength
   1200 ms budget = the spec's "honest best"), refuse to overlap, and are
   dropped if the user moves while the hint thinks. Hint sentences state
   only verified facts: mate via `gameStatus`, "captured for free"/"wins
   material" via `hangingPiece` (gated at ≥ 200 cp) matched to the exact
   capture, check via `isCheck`; otherwise "The strongest move I see is …".
5. **Repetition key = first 4 FEN fields**, same convention as
   `levels-check.js` (position + turn + castling + ep); threefold → draw
   with a plain-words reason. Draw disambiguation: `gameStatus` says
   "draw" → `isInsufficientMaterial` distinguishes it from the fifty-move
   rule.
6. **Check-square bug found by browser verification**: `findKing(pos)`
   without the color argument defaults to the *black* king, so the check
   highlight lit the wrong king whenever White was to move. (The Node test
   passed by coincidence — its checked side was Black.) Fixed in game.js;
   the browser check scenario now pins it.
7. **Selection UX**: clicking your piece selects (legal targets dotted),
   clicking a legal target applies, second click on the same square or any
   illegal square deselects; illegal clicks never move anything.
8. **Level select is live anytime** and applies from the next computer
   move (documented in the panel as "Computer strength").
9. **Board orientation**: White at the bottom (user plays White in P4;
   flipping for Black arrives with P5). Filled glyphs colored per side for
   beginner-legible pieces.

## Checks and results

- Phase check `node --test chess-coach/tests/ui-contract.test.js` → **24
  pass, 0 fail** (~3.7 s): boot states, legal/illegal clicks, comment-
  before-reply ordering, promotion ask/choose/cancel, checkmate by user
  and by computer (input refused after), threefold repetition, fifty-move,
  insufficient material, stalemate, hints (legal, non-playing, stale-drop,
  fact sentences for free capture / mate / check), level routing (spy +
  level-4 createSearch path ≤ 2 s), chunked drain (≥ 3 scheduler chunks),
  real-`reviewMove` integration (blunder verdict + true hanging reason +
  legal better move; good opening move → short ack only), `moveWords` for
  every move kind, checkSquare/lastMove badges.
- `bash chess-coach/scripts/ui-smoke.sh` → **PASS**: `file://` (with
  `--allow-file-access-from-files`) and `http://127.0.0.1:<port>` both
  boot with 64 squares, 32 pieces, zero recorded errors.
- Full suite `node --test chess-coach/tests/*.test.js` → **182 pass, 0
  fail** (158 P0–P3 tests intact).
- `node chess-coach/scripts/levels-check.js` → **PASS** (proxy 7/10 wins
  at level 1, 0/10 at level 4) — confirms the engine edits left SC-003
  intact.
- **Real-browser verification** (headless Chrome 154, scratch driver pages
  since deleted — headless dump-dom pages throttle timers, so the driver
  pumped the injected scheduler): 4 scenarios, all ok — opening (selection,
  targets, reply, last-move highlights + word line, comment, hint, illegal
  and opponent clicks ignored), promotion (picker with q/r/b/n, cancel,
  underpromotion to knight, comment), checkmate (banner "Checkmate — you
  win!", further input refused), check (status "you are in check!", king
  square highlighted). A layout probe verified computed styles/geometry:
  560×560 board, 69 px squares, classic square colors from app.css, 50 px
  glyphs, 400 px panel beside the board.
- **Full-game integration**: a beginner-ish proxy (depth-1 best 80% /
  random 20%) played a complete game against level 1 through the real
  `game.js` defaults: 19 user moves, all coached, won by checkmate, 9.8 s
  wall total (~0.5 s per user move including the real review).

## Sample output (from the integration game and browser runs)

```
1. best — Best move.
6. mistake (better: e4e5) — A stronger move was moving your pawn from e4 to e5.
13. mistake (better: e4e5)
     Your knight on d4 can now be captured by the knight on c6.
     A stronger move was moving your pawn from e4 to e5.
19. best — Checkmate — you win the game.
```

Browser status line while thinking: "The computer is thinking (level 2)…";
last-move line: "Last move: The computer played moving their knight from g8
to f6."; hint: "Hint: The strongest move I see is moving your pawn from e4
to e5."

## Known limits

- **file:// needs `--allow-file-access-from-files`** for ES-module imports
  (verified: without the flag Chrome blocks them; with it, or over a local
  server, everything works). The design's risk table anticipated this; the
  demo should run via `bash chess-coach/scripts/ui-smoke.sh`'s server trick
  or any static server, or Chrome launched with the flag.
- **Level-3 reply is one ≤ ~950 ms synchronous chunk** (residual documented
  above, per the approval's condition); levels 1–2 ≤ ~200 ms; level 4 and
  hints chunk at ≤ 40 ms.
- **Review valve at 500 ms** costs roughly one ply of review depth on sharp
  middlegames vs 1200 ms (92% vs 99% of positions reach depth ≥ 3); all
  probe margins hold.
- **No new-game / play-Black UI in P4** (P5 scope by design); reload starts
  a new game. `userColor: 'b'` and re-`boot()` are already supported and
  tested at the game-core level.
- **Board does not flip** (White view only) until P5.
- **Timers are throttled in headless dump-dom pages** (a browser testing
  artifact, not a product issue — verified real pages run the full loop;
  the smoke asserts the synchronous boot only).

## Handoff

Task / Dispatch: task_b89c108190ec / ctx_babb9017e13d
Role: builder (phase P4)
Base commit: 01b1392 · phase commit: one commit on r5-t2-p4 (see `git log -1`)
Output: `chess-coach/index.html`, `chess-coach/app/{app.css,game.js,board-ui.js,
coach-panel.js,main.js}`, `chess-coach/scripts/ui-smoke.sh`,
`chess-coach/tests/ui-contract.test.js`, `docs/run5/phase-P4.md`; approved
one-constant edits in `chess-coach/engine/{review.js,levels.js}`
Decisions: see "Decisions made" (comment-before-reply ordering; exported
boot(); pickMove-mirroring level routing; chunked verified-fact hints;
repetition key; check-square fix; selection UX; live level select; White view)
Checks: ui-contract 24 pass; ui-smoke PASS (file:// + http://); full suite
182 pass; levels-check PASS; real-browser driver scenarios all ok
Open questions: none
Next: code reviewer for P4; then P5 (review panel, draw/mate polish, new
game, play Black, copy transcript) re-edits main.js/game.js/index.html and
adds app/review-panel.js
