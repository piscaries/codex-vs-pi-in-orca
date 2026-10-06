# Blind judgment: product specs A and B

I scored all nine lines for A before reading and scoring B, then compared the completed scores. Evidence cites numbered source lines in `docs/run5/spec-rescore/A.md` and `docs/run5/spec-rescore/B.md`; this judges the specifications, not an implemented product. Both meet the under-1,200-word limit (`wc -w`: A 1,072; B 1,198); length and presentation earned no points.

## Score table

Bands follow the rubric: top quarter means nothing substantive missing; second means sound with one or two gaps; third means several gaps or vagueness; bottom means missing or wrong.

| Rubric line (maximum) | Packet A: score and evidence | Packet B: score and evidence |
| --- | --- | --- |
| 1. User and problem (10) | **10/10 — Top quarter.** A:4 names adult beginners roughly under 1200, repeated tactical mistakes, complete winnable games, and learning while decisions are fresh. | **10/10 — Top quarter.** B:5 identifies the adult beginner under roughly 1200, recurring losses without explanations, beatable games and immediate truthful, understandable coaching. |
| 2. Stories and acceptance scenarios (15) | **10/15 — Second quarter.** A:8–10 supplies P1 stories; A:16–22 supplies given/when/then game, feedback, hint, and review cases. A:17 says only that the position/result are 'correct', without fixture inputs or expected results; chosen-strength outcomes have no acceptance scenario. | **7/15 — Third quarter.** B:9–12 supplies a separate P1 story for each requested outcome; B:20–33 supplies runnable hint/review actions. B:25 incorrectly requires missed mate-in-one to imply the opponent can mate; B:20 gives no fixture/expected legal moves, and no scenario tests illegal rejection or chosen-level strength. |
| 3. Requirements (15) | **10/15 — Second quarter.** A:26–36 covers the main functions and expressly adopts the fixed interface. It does not require no third-party packages, plain HTML/CSS/JS, no build step, or launch from a local file/static server; 'observably different challenge' (A:33) lacks an objective acceptance threshold. | **9/15 — Second quarter.** B:37–46 covers gameplay, the fixed interface, coaching, hints, review and board; B:67,71 requires local operation without network. No requirement preserves the no-third-party-packages, plain-HTML/CSS/JS, no-build-step or local-file/static-server constraints; B:25 also conflicts with the truthfulness requirement in B:42. |
| 4. Scope discipline (10) | **10/10 — Top quarter.** A:60 explicitly excludes accounts, multiplayer, deployment, history, clocks, ratings, courses, puzzles, chat and grandmaster analysis. A:64 covers promotion, off-turn hints, terminal positions, analysis limits, invalid inputs and repetition history; A:68–72 labels decisions, an assumption and open interface questions. | **7/10 — Second quarter.** B:71–75 supplies explicit non-goals; B:79–85 handles illegal input, promotion, draws, no legal moves, thinking and game end. B:89–95 labels decisions, but no assumption is explicitly identified as an assumption; the FEN-only repetition boundary and terminal bestMove behavior are unaddressed. |
| 5. Rules correctness (10) | **7/10 — Second quarter.** A:27 and A:69 together name all nine required rules. A:40 requires 'reference positions and perft counts', but never identifies the counts as published/reference move counts or gives an independent source for expected counts. | **5/10 — Third quarter.** B:37 names castling, en passant, promotion, check, checkmate, stalemate, fifty-move and insufficient material, but repetition is not specified as threefold. B:50 requires tricky positions and correct legal moves/status; B:62 invokes the owner suite, without a reference/published perft move-count validation requirement. |
| 6. Engine strength and levels (10) | **5/10 — Third quarter.** A:26 requires at least three labeled levels; A:45 says a beginner can beat the lowest and 'rarely beats the highest', with 'repeatable comparison'. No win-rate thresholds, participant definition, game count or measurable separation criterion is supplied. | **7/10 — Second quarter.** B:39 requires at least three ordered levels; B:64 tests ten games, a majority of wins at the lowest and at most one win at the highest. 'Novice-strength opponent' is uncalibrated, and no measurable test distinguishes the middle level(s) from adjacent levels. |
| 7. Coaching truth and usefulness (15) | **10/15 — Second quarter.** A:29 names all five verdicts but does not define their distinctions. A:19,30–31 requires concrete problems, legal improvements, plain words and short acknowledgement; A:41,54 requires replay verification and rejects any false claim. A legal continuation alone does not establish a forced consequence, and no claim-specific truth criteria are supplied. | **6/15 — Third quarter.** B:41–43,51–54 requires short plain comments, concrete reasons, better moves, proportionate praise and zero false claims on at least twenty probes. B:92 only partially defines verdicts ('mistake clearly worse; inaccuracy slightly worse'), omitting best/good criteria; the mandatory false assertion in B:25 directly defeats coaching truthfulness. |
| 8. Responsiveness and board clarity (10) | **10/10 — Top quarter.** A:28 requires turn, last move, check and distinguishable pieces; A:33,46 requires replies within two seconds at every strength without freezing the page, reinforced by the full-game criterion in A:53. | **10/10 — Top quarter.** B:40 requires every level to reply within two seconds while the page remains interactive; B:46 requires visible turn, last move, check and distinguishable pieces, reinforced by B:56–57. |
| 9. End-of-game review (5) | **5/5 — Top quarter.** A:21,34,48,56 requires at most three actually played moves, earlier verdicts/reasons, and 'zero disagreement from in-game feedback'; A:22 prevents invented criticism in clean games. | **5/5 — Top quarter.** B:32–33,45,58 requires only played user moves and the same earlier verdict/reason, with at most five entries or none; B:66 forbids invented or altered comments. |

## Totals

| Packet | General / 50 | Chess coach / 50 | Total / 100 |
| --- | ---: | ---: | ---: |
| A | 40 | 37 | **77** |
| B | 33 | 33 | **66** |

## Comparison by rubric line

1. **Tie:** Both name the specified beginner, the recurring-mistake problem, and the desired combination of playable games and useful immediate coaching.
2. **A:** Its acceptance cases cover feedback, hints and faithful reviews without B's false missed-mate expectation, although both leave rule fixtures and strength acceptance underspecified.
3. **A:** Both cover the main functions and omit several runtime constraints, but B also contradicts its own truthfulness requirement with the required comment in B:25.
4. **A:** Both have meaningful non-goals and edge cases, while A explicitly states a terminal-engine assumption and the FEN/history boundary for repetition.
5. **A:** It explicitly names threefold repetition and requires perft counts with reference positions, whereas B lacks an explicit threefold threshold and move-count validation.
6. **B:** Its ten-game majority-win and at-most-one-win targets make the endpoints measurable, while A supplies only qualitative outcomes and a repeatable comparison.
7. **A:** Its concrete reasons and replay checks have no mandated false comment, whereas B's useful truthfulness checks are undermined by B:25.
8. **Tie:** Both require two-second replies at every level, an interactive page, visible turn/last move/check, and distinguishable pieces.
9. **Tie:** Both restrict review entries to played moves and require agreement with their earlier comments; the different caps and ordering are permissible product choices.

## Fatal problems

**B has a P1 coaching contradiction.** B:25 requires: “Given a mate-in-one was available and missed, Then the coach says plainly the opponent can now mate, and shows the mating move.” Missing one's own mate-in-one does not imply that the opponent has a mating move, so satisfying this scenario can violate B:42 (“every concrete claim ... is true”) and the brief's never-false quality bar.

A concrete legal counterexample is FEN `6k1/8/6KQ/8/8/8/8/8 w - - 0 1`: White has king g6 and queen h6; Black has only king g8. White can play `h6g7` (Qg7#): the queen covers f8/h8/f7/h7 and checks g8, while the white king protects g7. If White instead plays the legal `h6h5`, Black can legally move `g8f8`, but cannot deliver mate with a lone king; the required opponent-mate assertion is false.

**No fatal problem identified in A.** Its unspecified strength metrics, verdict boundaries and validation details are material gaps, but do not make a P1 requirement inherently impossible. The fixed interface's inability to reconstruct repetition history from a FEN alone is inherited from the brief; A:64 acknowledges that boundary, so it is not treated as an author-created fatal flaw.

## Verdict

**I would ship A: 77/100 versus B's 66/100.** A gives the safer basis for truthful coaching and more explicit rules verification and interface edge cases, despite lacking measurable strength targets and precise verdict boundaries. B has stronger endpoint strength measurements, but its P1 missed-mate scenario requires misinformation in legal positions.
