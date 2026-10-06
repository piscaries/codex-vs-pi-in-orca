# Phase P5 report — endgame & polish (track t2)

Task / Dispatch: task_ef38ab5137b9 / ctx_2735ea1cd913
Base commit: df7a096 (branch r5-t2-p5)

## What was built

Exactly phase P5 of `docs/run5/design.md`: the end-of-game review, and the
polish the spec's P2/P3 stories ask for.

- **`chess-coach/app/review-panel.js`** (new) — the honest end-of-game
  review (FR-009, SC-005) and the copyable transcript (P3-1). Pure, DOM-free
  `collectReview(comments)` (only this game's user moves rated inaccuracy or
  worse, worst first, capped at five, entries are verbatim copies of the
  in-game comment objects), `buildTranscript(snap)` (whole game in everyday
  words with each user move's verdict, reasons and better move, plus the
  result line), `resultLine` (the banner's exact sentences), and a thin DOM
  factory: review section (hidden until game over; clean games get the one
  line "No moves worth flagging — a clean game from start to finish."), a
  readonly textarea with the transcript, and a copy button with an honest
  feedback line (never a false "Copied.").
- **`chess-coach/app/game.js`** — `dispose()`: every scheduled callback
  (coach review, computer reply, level-4 search chunk, hint chunk) checks a
  `disposed` flag and drops out, so starting a new game can never leave the
  old game's work firing late.
- **`chess-coach/app/main.js`** — re-bootable wiring: `startGame()` disposes
  the running game, clears the board/panel roots and re-creates the same
  real wiring (board oriented to face the user, coach panel, review panel);
  `newGame({level, userColor})` starts a fresh game (the level select's
  current value and the chosen side carry over; a custom `fen` passed to
  `boot()` applies to the first game only). The topbar gains the game-level
  controls: a "You play White/Black" select (applies to the next game — it
  never interrupts a running one) and a "New game" button (P2-1/P2-2). The
  first-move line now names the user's color dynamically.
- **`chess-coach/app/board-ui.js`** — `orientation` parameter ('w' classic
  view, 'b' rank 1 at the top, file h on the left) so the user always plays
  from the bottom edge; edge labels follow the orientation.
- **`chess-coach/index.html`** — `#game-controls` container in the topbar;
  color-neutral opening line.
- **`chess-coach/app/app.css`** — styles for the game controls and the
  review panel (entry cards reuse the verdict color family, transcript box,
  copy button/feedback).
- **`chess-coach/tests/review-panel.test.js`** (new) — 19 tests (below).

Draw/mate messages themselves shipped in P4 (banner with plain-word draw
reasons, winner named on checkmate); the review panel repeats the same
result sentence at the top of the review and transcript.

## Ownership additions (coordinator-approved)

The design's P5 row lists `app/review-panel.js` + edits to `main.js`,
`game.js`, `index.html`; three more touches were approved on the task
channel (question answered "Approved: A, B and C…"):

- **A** `chess-coach/app/app.css` — styles for the new UI (unstyled controls
  and review would not ship).
- **B** `chess-coach/app/board-ui.js` — the orientation parameter only (the
  P4 report deferred board flipping to P5).
- **C** `chess-coach/tests/review-panel.test.js` — the design's FR-009
  traceability row names a "review-panel test + SC-005 comparison".

No P0–P3 engine file was touched.

## Decisions made

1. **Review selection is pure and consumes the game's own comment objects**
   (`collectReview`), so SC-005 (verbatim, none invented or altered) is a
   structural property: verdict strings, reason arrays (order included) and
   better moves are copied, never reworded. Ties in severity stay in played
   order (earliest first) — stable and matches "worst first".
2. **Wording matches P4 verbatim**: same verdict titles and head format
   ("Your move N · Blunder"), same draw sentences and result lines as the
   banner (duplicated maps in review-panel.js with a pointer comment,
   because coach-panel.js is not in this phase's files).
3. **Transcript is words-only** (moveWords for every move; no bare UCI
   anywhere) per FR-007. One deduplication: a reason line that exactly
   equals the printed verdict title ("Good move.") is not repeated — every
   other sentence is verbatim.
4. **New game = re-boot of the same wiring** (the design's stated plan),
   with `dispose()` added to game.js so pending work stops; proven by tests
   at each stage (review pending, chunked reply half-drained, pickMove
   reply scheduled, hint half-drained).
5. **Side choice applies to the next game only** (no destructive
   mid-game restart); the board is rebuilt oriented to the user's side.
   `boot({fen})` is honored for the first game only, so "New game" always
   returns to the standard start.
6. **Copy is honest about failure**: clipboard API → textarea-select +
   legacy `execCommand` fallback → explicit "Copy is blocked here — select
   the text in the box and copy it yourself." In headless Chrome the
   fallback line is what shows (clipboard is denied there); the transcript
   stays visible and selectable either way.
7. **Review shows only at game over** (hidden during play), below the
   in-game comments; the copy control rides inside it (spec: "the finished
   game").

## Checks and results

- Phase check `node --test chess-coach/tests/*.test.js` → **201 pass,
  0 fail** (~13.7 s): 182 P0–P4 tests intact + 19 new
  (collectReview filter/order/cap-5/ties/clean/verbatim-copies; VERDICT_TITLES
  equality; SC-005 scripted game verbatim; SC-005 end-to-end with the real
  coach — h1g1 blunder, level-4 mate, review shows it; transcript contents,
  checkmate/stalemate/empty cases, no-bare-notation regex; resultLine
  equality; dispose at all four stages; fresh-game-after-dispose; moveWords
  kinds).
- `bash chess-coach/scripts/ui-smoke.sh` → **PASS** (file:// and
  http://127.0.0.1: both boot, 64 squares, 32 pieces, zero recorded errors).
- **Real-browser demo** (headless Chrome 154, scratch driver in /tmp — same
  style as P4's, deleted after): **32 checks, 0 FAIL, zero console errors**:
  - A: blunder allows mate → banner "Checkmate — the computer wins."; review
    visible, exactly 1 entry, its head and reasons **match the in-game
    comment DOM verbatim** (SC-005 in the real DOM); transcript textarea
    equals `buildTranscript(snap)` and contains the result + the coach's
    mate sentence; copy feedback is the honest blocked-line (headless
    clipboard denial).
  - B: New game button → fresh state (0 history/comments, 32 pieces,
    placeholder comments, review hidden, fresh last-move line); the old
    game's queued work stays dead; a fresh game plays and replies.
  - C: side select → Black + New game → **the computer opens**, board
    flipped (first DOM square h1, last a8), last move in words, Black's own
    click-move works, review hidden during play.
  - D: mate-in-1 boot → "Checkmate — you win!", clean-game review line, no
    entries, transcript with the mating move in words.
  - Layout probe at 1100 px: controls on the title row (vertically centered,
    clear of the board), button/select sized, board square still ~69 px,
    review hidden at boot; at narrow widths the controls wrap to a
    right-aligned second row, still clear of the board.
- **Full-game integration** (Node through the real `game.js`, real coach,
  beginner proxy 80 % depth-1-best / 20 % random vs level 1, seed 20251002):
  69 user moves, ended **draw by threefold repetition** (the app's own
  repetition rule), 9 in-game flagged moves → review lists the **5 worst**,
  SC-005 self-check OK (every entry verbatim from its in-game comment),
  293-line transcript, 36.9 s wall (~0.53 s per user move including the real
  review).

## Sample output (integration game)

Review (5 worst of 9 flagged, worst first):

```
Your move 23 · Blunder — A stronger move was moving your knight from f3 to e5.
Your move 29 · Blunder — Your knight on h7 can now be captured by the king on g8,
  and no piece of yours can capture that king back. Better: moving your rook from d1 to e1.
Your move 34 · Blunder — Your bishop on c6 can now be captured by the rook on d6, …
Your move 50 · Blunder — Your rook on e3 can be captured by the pawn on d4; taking it
  back wins you only that pawn, worth far less than your rook. Better: capturing the
  bishop on e6 with your rook from e4.
Your move 51 · Blunder — A stronger move was moving your rook from e3 to d3.
```

Transcript (head and tail):

```
Chess Coach game — you played the white pieces against the computer (level 1 — Beginner).
Draw by repetition: the same position appeared three times.

1. You played moving your knight from b1 to c3.
   Coach: Best move.
…
137. You played moving your queen from a1 to d4.
   Coach: Best move.
```

## Known limits

- **Clipboard in unusual contexts**: over plain `file://` (not a secure
  context) or headless Chrome, the clipboard write is denied; the app falls
  back to select-and-copy and says so honestly. Over `http://127.0.0.1` in a
  normal window the clipboard API works (secure context).
- **The review lists at most five moves** (FR-009's cap); the transcript is
  the complete record when more are wanted.
- **A mid-game side change does not restart the game** (applies to the next
  one) — the control's tooltip says so.
- Chrome-build quirk (test tooling, not the app): `--dump-dom` on this
  build needs the smoke's background/file pattern, and heavy synchronous
  level-4 searches in a dump-dom page can prevent the dump; the demo
  therefore plays its heavy scenario at level 4 only on the tiny mate FENs
  and uses level 1 for the start-position scenarios.

## Handoff

Task / Dispatch: task_ef38ab5137b9 / ctx_2735ea1cd913
Role: builder (phase P5)
Base commit: df7a096 · phase commit: one commit on r5-t2-p5 (see `git log -1`)
Output: `chess-coach/app/review-panel.js`, `chess-coach/tests/review-panel.test.js`
(new); edits in `chess-coach/app/{main.js,game.js,board-ui.js,app.css}`,
`chess-coach/index.html`, `docs/run5/phase-P5.md`
Decisions: see "Decisions made" (7)
Checks: full suite 201 pass; ui-smoke PASS (file:// + http://); browser demo
32/32 with zero console errors; layout probe ok; full-game integration ok
Open questions: none
Next: code reviewer for P5; then acceptance review against the spec
