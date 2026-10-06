# Product spec — Chess Coach

## 1. Problem and users

An adult beginner (under ~1200 rating) can play a computer but loses the same way every time: chess apps show a result, not a reason. The user knows how the pieces move, wants games at a beatable strength, and wants each mistake explained immediately. Two outcomes matter: a correct, playable game, and coaching that is true and understandable.

## 2. User stories

**P1-1 Play a full game at a chosen strength.** The core promise. Demo: pick a level, play to a correct result.
**P1-2 Get a verdict after every move I make.** The learning loop. Demo: hang a piece, see a plain verdict, the threat, and a better move.
**P1-3 Ask for a hint when stuck.** Required by the brief. Demo: get one legal move with a one-line reason.
**P1-4 End-of-game review of my worst moves.** Consolidates the lesson. Demo: finish a game, see the worst moves played with their in-game reasons.
**P2-1 New game without reloading.** Demo: board resets, comments clear.
**P2-2 Play as Black.** Demo: the computer moves first.
**P3-1 Copy the finished game as text with comments.**

## 3. Acceptance scenarios

**P1-1**
- Given a running game, When any legal move is played (castling, en passant, promotion), Then it is accepted and the computer replies legally within two seconds.
- Given a user move delivers checkmate, Then the app declares the winner and accepts no further moves.

**P1-2**
- Given a move leaves a piece capturable for free, Then the coach shows a harsh verdict, names the piece and threat, and offers a better move.
- Given a mate-in-one was available and missed, Then the coach says plainly the opponent can now mate, and shows the mating move.

**P1-3**
- Given the user's turn, When they ask for a hint, Then they get one legal move plus a one-sentence reason.
- Given a hint was shown, When they play a different move, Then it is accepted and coached — a hint never plays itself.

**P1-4**
- Given the game ended, When the review appears, Then it lists only moves actually played, worst first, at most five, with verdict, reason, and better move — or reports none.
- Given a move was called "blunder" with reason R in-game, When the review lists it, Then the same verdict and reason appear.

## 4. Functional requirements

- **FR-001** Rules: exactly the legal moves are accepted; castling (with restrictions), en passant, promotion, check, checkmate, stalemate, and draws by repetition, fifty-move rule, and insufficient material are handled.
- **FR-002** Fixed testing interface: the engine exposes exactly the functions in the brief's fixed interface, with the specified inputs and returns, throwing on illegal moves, answering within roughly the requested time.
- **FR-003** Strength: at least three ordered levels; the described beginner can win at the lowest, rarely at the highest.
- **FR-004** Responsiveness: every computer reply completes within two seconds at every level; the page stays interactive while it thinks.
- **FR-005** Per-move verdict: a verdict on the fixed five-step scale, one or two plain sentences, and a legal better move for mistake, blunder, and (when one exists) inaccuracy.
- **FR-006** Truthfulness: every concrete claim (piece unprotected, material lost, mate available) is true in the position shown.
- **FR-007** Plain, proportionate comments: everyday words, chess terms explained, no unexplained numbers or bare notation; good moves get a short acknowledgement only.
- **FR-008** Hint: on the user's turn, on request, one legal move plus a one-sentence reason; it never moves for the user.
- **FR-009** Review: lists this game's user moves rated inaccuracy or worse, worst first, capped at five, matching in-game verdicts and reasons; a clean game gets one line.
- **FR-010** Board and result: turn, last move, and check always visible; pieces easy to tell apart; checkmate names the winner; draw reasons in plain words.

## 5. Quality bar applied

1. **Rules never wrong** → tricky positions (castling through check, en passant, pins, underpromotion) yield exactly the legal moves and correct status.
2. **Coach never false** → on ≥20 known-mistake probes, every concrete claim checks out; one false claim fails.
3. **Reason and fix** → every mistake/blunder names the piece, square, or threat; the suggested move is legal and better.
4. **Plain words** → a reader who knows only piece movement understands every comment unaided; no evaluation numbers or bare notation.
5. **Proportionate** → in a full-game transcript, good/best moves get at most a short acknowledgement; explanations concentrate on inaccuracy and worse.
6. **Levels differ** → a novice-strength opponent wins most games at the lowest level, almost none at the highest.
7. **Responsive** → every reply under two seconds; the page never freezes.
8. **Clear board** → a first-time viewer names the turn, last move, and any check within seconds.
9. **Honest review** → every entry matches a move actually played, with the in-game verdict and reason.

## 6. Success criteria

- **SC-001** The owner's hidden test suite over the fixed interface passes completely.
- **SC-002** On ≥20 probe positions with known blunders (hanging pieces, missed mates, allowing mate), the review returns the correct verdict, a true reason, and a genuinely better move.
- **SC-003** In 10 games at the lowest level a novice-strength opponent wins most; at the highest, at most one of 10.
- **SC-004 (judged by reading)** A person reading one full game's comments, board hidden, finds every comment true, understandable, and proportionate.
- **SC-005** The review reproduces exactly the moves and comments given during the game, none invented or altered.
- **SC-006** The brief's demo — a full game in Chrome with per-move comments and final review — runs locally, no console errors or network.

## 7. Non-goals

- Online play, accounts, publishing, any network use.
- Teaching content beyond move comments: no opening theory, lessons, puzzles.
- Clocks, tournaments, statistics; saving or resuming games.
- Coaching the computer's moves; the coach speaks only about the user's moves.
- Takebacks (see open questions).

## 8. Edge cases and failure behavior

- **Illegal move attempt:** the piece does not move in the app; the interface throws. No error dialogs.
- **Promotion:** the user is asked which piece; never silently defaulted.
- **Draw endings** (repetition, fifty-move, insufficient material) end the game with a plain-word explanation.
- **No legal moves:** checkmate if in check, stalemate otherwise — never a crash or stuck board.
- **Best/good move:** no better-move suggestion is shown.
- **Computer thinking:** the board stays interactive; premature input is ignored.
- **Game over:** the review shows; further moves refused quietly.

## 9. Assumptions and open questions

Decisions, overridable:
- User plays White by default; Black is P2.
- At least three levels; count and labels left to design.
- The five-value scale in product terms: blunder loses material or allows mate; mistake clearly worse; inaccuracy slightly worse.
- Hints are the coach's honest best; the level weakens only the computer's play.
- The review covers only user moves, capped at five.
- Chrome is the target browser; others untested.

Open questions:
- **NEEDS CLARIFICATION (non-blocking):** takebacks — currently a non-goal; wanted for the demo?
- **NEEDS CLARIFICATION (non-blocking):** five-move review cap, or list all mistakes?

---

Task / Dispatch: task_072b1b06337d / ctx_8b1f3e347734
Role: product designer (track t2)
Base commit: 693f48f
Output: docs/run5/spec.md
Decisions made: user plays White by default (simplest first game); minimum three levels, labels to design (product sets the outcome, not the count); hint is honest best regardless of level (level weakens only the computer); review lists user moves rated inaccuracy or worse, worst first, capped at five (brief says "short review"); coach comments only on user moves (brief wording).
Checks: brief.md and quality-bar.md read and match task text; repo has no chess code; spec body `wc -w` → 1198; no code run (none exists).
Open questions: takebacks in or out; review cap of five (both non-blocking).
Next: spec reviewer → owner approval → engineering designers (track t2).
