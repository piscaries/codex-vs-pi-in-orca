# Product spec
## 1. Problem and users

Adult beginners repeat tactical mistakes because ordinary opponents show that they lost, not why. The primary user is a roughly under-1200 player who wants a complete, winnable game and truthful guidance while each decision is fresh. Success means finishing legal games at a chosen challenge and recognizing how to avoid costly mistakes.

## 2. User stories

- **P1 — Play a complete game.** I choose a strength and play under all standard rules. This is the core activity; demo by completing a game and exercising special-rule positions.
- **P1 — Learn move by move.** Each move gets a proportionate verdict; mistakes explain the danger and a better move, and hints are available. This is the core learning value; demo with good, material-losing, and mate-threatening moves.
- **P1 — Review the game.** At game end, I see a short, faithful recap of my worst moves. This reinforces learning; demo by comparing a recap with the move history and earlier comments.
- **P2 — Start over easily.** I can start another game at a different strength without reloading. Demo after finishing or abandoning a game.
- **P3 — Handle a clean game honestly.** If I made no major mistake, the review says so. Demo with no moves rated mistake or blunder.

## 3. Acceptance scenarios

1. **Legal game:** Given a chosen strength, when the user tries a legal move and then an illegal one, then only the legal move changes the position and the computer replies legally.
2. **Rules and ending:** Given positions for castling, en passant, promotion, and terminal/draw states, when each condition occurs, then the position and result are correct and play stops after game end.
3. **Immediate feedback:** Given a legal user move, when completed, then one allowed verdict and at most two plain-language sentences appear and remain visible.
4. **Actionable mistake:** Given a mistake or blunder, when feedback appears, then it names a piece or square, the opponent's opportunity, and a legal better move; replay confirms the claim.
5. **Hint:** Given the user's turn, when a hint is requested, then a legal move and short reason appear without changing the position.
6. **Faithful recap:** Given a completed game with mistakes, when the review appears, then it lists at most three played moves and agrees with their earlier feedback.
7. **Clean recap:** Given a completed game without mistakes or blunders, when the review appears, then it acknowledges that fact and invents no criticism.

## 4. Functional requirements

- **FR-001:** The user can start a standard game after choosing among at least three labeled strength levels.
- **FR-002:** The product permits every legal move and refuses every illegal move without altering the position, including correct castling, en passant, promotion choice, check, checkmate, stalemate, insufficient-material, fifty-move, and repetition behavior.
- **FR-003:** The board shows turn, last move, check, final result, distinguishable pieces, and selectable destinations.
- **FR-004:** After every legal user move, the product assigns exactly one verdict: best, good, inaccuracy, mistake, or blunder.
- **FR-005:** A mistake or blunder includes a true reason and legal better move, identifying concrete pieces, squares, captures, or mate threats.
- **FR-006:** Best/good moves receive only a short acknowledgement. Feedback uses one or two plain-language sentences without unexplained scores or notation.
- **FR-007:** On the user's turn, a hint supplies a legal move and a concise reason without playing the move.
- **FR-008:** Every strength replies legally within two seconds without freezing the page, and levels provide observably different challenge.
- **FR-009:** At game end, the product presents up to three worst user moves in game order, with the same verdicts and compatible reasons shown during play; if none qualify, it says so.
- **FR-010:** The user can start over; active games require confirmation and prior game content is cleared.
- **FR-011:** The owner-defined engine module exposes `legalMoves`, `applyMove`, `perft`, `gameStatus`, `bestMove`, and `reviewMove` with exactly the specified inputs, outputs, verdict vocabulary, and illegal-move behavior.

## 5. Quality bar applied

1. **Correct:** reference positions and perft counts show no legality, checkmate, or stalemate error.
2. **Truthful:** legal continuation verifies every coaching claim; any false claim fails review.
3. **Actionable:** every mistake/blunder names the consequence and a legal improvement.
4. **Plain:** comments are at most two sentences with no unexplained score or notation.
5. **Proportionate:** best/good feedback is acknowledgement, not a lecture.
6. **Selectable strength:** repeatable comparison shows increasing challenge; a beginner can beat the lowest and rarely beats the highest.
7. **Responsive:** every reply takes at most two seconds and the page stays responsive.
8. **Clear board:** observation confirms distinct pieces and visible last move, check, turn, destinations, and result.
9. **Honest review:** every recap entry matches a played move and its earlier feedback.

## 6. Success criteria

- **SC-001:** The owner suite accepts all six fixed-interface functions with zero legality or status failures.
- **SC-002:** In a full-game demo, every legal user move receives feedback, every computer move is legal, and every reply arrives within two seconds.
- **SC-003:** Across ten curated mistake/blunder positions, every response gives a legal improvement and replay confirms every reason.
- **SC-004:** A beginner reading twenty comments finds each understandable, at most two sentences, and concrete for every mistake/blunder.
- **SC-005:** A completed-game recap has at most three entries, all played, with zero disagreement from in-game feedback.

## 7. Non-goals

Accounts, online or human multiplayer, deployment, network services, saved cross-session history, clocks, ratings, opening courses, puzzles, free-form chat, and grandmaster-strength analysis are outside this release.

## 8. Edge cases and failure behavior

Illegal moves leave board and turn unchanged. Promotion waits for a valid piece choice. Hints are unavailable off-turn or after game end. Terminal positions show the result and stop play. At an analysis time limit, the product favors a legal response and omits unsupported claims. Invalid FEN or UCI fails explicitly. Repetition uses the game's move history; FEN-only status is limited to facts encoded by that input.

## 9. Assumptions and open questions

- **Decision:** User play starts from the standard position; choosing color and importing positions are out of scope.
- **Decision:** “Common draw rules” means stalemate, insufficient material, fifty-move, and threefold repetition.
- **Decision:** The recap prioritizes mistake/blunder severity and is capped at three moves.
- **Assumption:** `bestMove` is requested only for ongoing positions, because a terminal position has no legal move.
- **NEEDS CLARIFICATION:** The fixed interface does not define malformed FEN, terminal `bestMove`, or illegal `reviewMove` behavior.

Task / Dispatch: task_11d4deb17dca / ctx_4360865669a4
Role: product designer
Model: Codex (GPT-5 family; exact minor version not exposed to this worker)
Base commit: 693f48f
Output: docs/run5/spec.md
Decisions made: three mandatory outcomes are separate P1 stories so each can be demonstrated; three strength levels provide a meaningful choice; reviews are capped at three moves for brevity; common draws include stalemate, insufficient material, fifty-move, and repetition.
Checks: `wc -w docs/run5/spec.md` → 1,189 words; heading/ID counts → 9 sections, 7 acceptance scenarios, 11 FRs, 5 SCs; `git diff --cached --check` → clean.
Open questions: malformed-input and terminal-call behavior for the fixed engine interface need owner clarification.
Next: spec reviewer should assess this document against the brief, quality bar, and rubric.
