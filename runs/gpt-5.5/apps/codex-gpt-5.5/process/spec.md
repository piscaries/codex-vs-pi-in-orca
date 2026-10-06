# Product spec
## 1. Problem and users
Adult beginners who know the moves but not strategy often lose to repeated tactical mistakes and learn only that they lost, not why. The primary user needs a local browser opponent they can sometimes beat, plus immediate, truthful coaching while the position is fresh. The main outcome is a playable full game that teaches concrete fixes in plain language.

## 2. User stories
P1: As a beginner, I can play a complete legal game against the computer at a chosen strength. Priority: coaching needs a trustworthy game. Demo: choose a level, play legal moves including special rules, and reach a result.

P1: As a beginner, after each move I see a short verdict, a reason when needed, and a better move for mistakes. Priority: this is the core learning loop. Demo: make a good move and a blunder from known positions and compare feedback.

P1: As a beginner, I can request a hint before moving and see an end review of my worst moves. Priority: users need help before they fail and a concise recap. Demo: ask for a hint, finish a game, and read the review.

P2: As a returning beginner, I can tell strength levels apart and pick one that feels beatable or challenging. Priority: calibration improves practice value. Demo: compare short openings at different levels.

P3: As a learner, I can understand board state at a glance. Priority: clear cues reduce confusion. Demo: inspect last move, check, side to move, legal selection, and result cues.

## 3. Acceptance scenarios
Given a new game at easy strength, When the user makes legal moves, Then the computer responds until checkmate, stalemate, draw, or optional stop.

Given castling, en passant, or promotion is legal, When the user attempts it, Then the move is accepted and the position is correct.

Given the user tries an illegal move, When they attempt it, Then the board rejects it without changing the game.

Given a user move does not materially worsen the position, When it is submitted, Then the coach gives a brief positive or neutral verdict.

Given a move loses material or permits mate, When submitted, Then the coach names the problem, opponent consequence, and legal better move.

Given the coach cannot support a claim, When producing feedback, Then it omits that claim.

Given it is the user's turn, When they request a hint, Then the app suggests a legal move with a short reason.

Given a completed game, When the end review appears, Then it lists worst actual user moves and matches earlier comments.

## 4. Functional requirements
FR-001: The game must enforce legal movement, check, castling, en passant, promotion, checkmate, stalemate, and common draw outcomes.

FR-002: The app must never apply an illegal move and must leave the current position unchanged after an illegal attempt.

FR-003: The user must choose at least three computer strength levels before or at game start.

FR-004: The computer must make only legal moves and respond after each legal user move while the game is ongoing.

FR-005: The board must show current position, side to move, last move, check state, and final game status.

FR-006: After each legal user move, the coach must show exactly one verdict from best, good, inaccuracy, mistake, or blunder.

FR-007: For each mistake or blunder, feedback must include a concrete reason and a legal better move when available.

FR-008: Feedback must be one or two beginner-readable sentences and must not rely on unexplained engine scores.

FR-009: The hint control must provide a legal suggested move for the user's current turn with a short reason.

FR-010: The end-of-game review must list the user's worst reviewed moves, their original verdicts, reasons, and better moves where available.

FR-011: The fixed owner testing interface must accept FEN positions and UCI moves and return the specified results.

FR-012: All required play and coaching features must work locally without accounts, network access, publishing, or secret configuration.

## 5. Quality bar applied
Rules are checked by legal move, perft, and status tests over normal and special-rule positions. Coach truth is checked by requiring each tactical claim to match the position. Mistakes and blunders are checked for a named problem, affected square or piece when relevant, opponent consequence, and fix. Plain words are checked by reading comments for beginner vocabulary and no unexplained numbers. Proportion is checked by brief good-move acknowledgements. Strength is checked by distinct beginner, intermediate, and hard behavior. Responsiveness is checked by replies within two seconds without page lockup. Board clarity is checked visually for last move, check, turn, and distinguishable pieces. End reviews are checked against move history and earlier comments.

## 6. Success criteria
SC-001: Owner tests can call every fixed interface function and receive results in the specified shape.

SC-002: Standard perft positions, including special rules, match known leaf counts for the tested depths.

SC-003: In a browser demo, a user can complete a full game at any strength without illegal state changes.

SC-004: Five sampled mistake or blunder comments identify a true tactical problem and legal better move.

SC-005: A beginner-profile reader can understand sampled coach comments without engine terminology.

SC-006: Computer replies and hints appear within two seconds.

SC-007: The end review lists only moves actually played by the user and does not contradict earlier feedback.

## 7. Non-goals
This release excludes accounts, saved profiles, online play, lessons, puzzles, clocks, ratings, multiplayer, cloud analysis, reports, and themes beyond a clear board.

## 8. Edge cases and failure behavior
Invalid FEN input should fail clearly rather than returning a fabricated result. Illegal UCI moves must throw or be rejected as specified and never corrupt the game. Promotion must require or infer a valid promoted piece. If no meaningful better move exists, `betterMove` may be null and the reason must stay honest. If the game is over, move, hint, and coach controls must say play has ended. If analysis is limited, the coach should give only a verdict it can justify.

## 9. Assumptions and open questions
Assumption: common draw rules include stalemate, insufficient material, threefold repetition, and fifty-move rule. Assumption: playing as White is sufficient for the core demo unless later approved otherwise. Assumption: resignation is optional. NEEDS CLARIFICATION: whether the owner expects exact draw labels or only `"draw"` for all draw types.

```
Task / Dispatch: task_38c2629e3584 / ctx_7817597a65d8
Role: product designer
Base commit: 693f48f
Output: docs/run5/spec.md
Decisions made: P1 covers legal play, coaching, hints, and end review because they form the required learning loop; strength calibration and visual polish are P2/P3; comments omit unsupported claims because false coaching violates the quality bar.
Checks: orca check twice -> no messages; git rev-parse/status/rg -> base 693f48f, clean before writing; sed brief and quality bar -> read both; ls docs/run5 -> ledger only before writing; wc -w docs/run5/spec.md -> 1176 final; git diff --check -> pass; git status --short -> only docs/run5/spec.md changed
Open questions: Whether exact draw subtypes must be visible to the user or only collapsed as "draw".
Next: spec reviewer should review docs/run5/spec.md for ACCEPT or REWORK.
```
