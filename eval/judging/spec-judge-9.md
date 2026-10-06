# Spec judging (blind): A vs B

## 1. Score table

| Line | Max | A | B |
| --- | --- | --- | --- |
| 1. User and problem | 10 | **8**. Names under-1200 adult beginner, "show that they lost, not why", outcome "finishing legal games… recognizing how to avoid costly mistakes". Outcome is a bit soft. | **8**. Same user, "chess apps show a result, not a reason"; two outcomes named (correct game, true coaching). Equally specific. |
| 2. Stories and scenarios | 15 | **10**. Five stories, seven numbered scenarios, but scenarios are generic and not tied one-to-one to stories ("Given positions for castling… when each condition occurs, then correct"). The rules scenario bundles many conditions, so it is not independently runnable. | **12**. Scenarios sit under each P1 story and are concrete: "mate-in-one was available and missed… shows the mating move", "a hint never plays itself", "blunder with reason R in-game… same reason appear". P2/P3 stories have no scenarios. |
| 3. Requirements | 15 | **12**. FR-001–011 cover strength, rules, board, verdicts, hints, review, restart, interface. Testable. FR-010 confirm-on-restart is invented but harmless. No strength measurement in FRs. | **12**. FR-001–010 cover the same. Rules and strength are testable. Adds Black as P2 and copy-as-text as P3, which the brief did not ask for. |
| 4. Scope discipline | 10 | **8**. Non-goals list, edge cases (promotion waits, hints off-turn, FEN-only repetition limit), explicit Decision/Assumption labels, and honest NEEDS CLARIFICATION about interface gaps (terminal `bestMove`, illegal `reviewMove`). | **8**. Non-goals include "coach speaks only about the user's moves". Edge cases are about game flow (premature input ignored, no legal moves). Assumptions labelled, two open questions. Misses the interface gaps A caught. |
| 5. Rules correctness | 10 | **9**. FR-002 names castling, en passant, promotion, check, checkmate, stalemate, insufficient material, fifty-move, repetition. Shows correctness via "reference positions and perft counts". Notes FEN-only repetition limit. | **7**. FR-001 lists all rules. Shows correctness through "tricky positions (castling through check, en passant, pins, underpromotion)" and the hidden suite. No perft or published counts. |
| 6. Engine strength and levels | 10 | **5**. "Repeatable comparison shows increasing challenge; a beginner can beat the lowest and rarely beats the highest." No numbers, no method for the opponent. | **8**. SC-003: "10 games at the lowest level a novice-strength opponent wins most; at the highest, at most one of 10." Measurable, though "novice-strength opponent" and the lowest-level target are still loose. |
| 7. Coaching truth and usefulness | 15 | **11**. Verdict scale is named. Mistake needs a piece or square, the opponent's opportunity, and a legal better move. Truth is checked by "replay confirms". Two-sentence cap. Only 10 probe positions, and the scale is not defined in product terms. | **13**. Verdict scale defined in product terms ("blunder loses material or allows mate; mistake clearly worse; inaccuracy slightly worse"). At least 20 probes, "one false claim fails". Also SC-004 reading test, plain-word and proportionality rules. |
| 8. Responsiveness and board clarity | 10 | **8**. FR-008 and QB7: two seconds at every level, page stays responsive. Board: turn, last move, check, result, distinct pieces, destinations. Checked by "observation". | **8**. FR-004: two seconds at every level, page interactive. FR-010: turn, last move, check, pieces easy to tell apart. Checked by a first-time viewer naming them. Equal. |
| 9. End-of-game review | 5 | **4**. Up to three played moves, "same verdicts and compatible reasons". "Compatible" is weaker than "match". | **5**. "Lists only moves actually played… same verdict and reason appear"; SC-005 "exactly the moves and comments given during the game". |

## 2. Totals

| | General (50) | Task-specific (50) | Total (100) |
| --- | --- | --- | --- |
| A | 38 | 37 | **75** |
| B | 40 | 41 | **81** |

## 3. Per line

1. User and problem: tie. Both name the same user and problem.
2. Stories and scenarios: B. Scenarios are tied to each P1 story and concrete. A's are generic and bundle many rules into one.
3. Requirements: tie. Both are complete and testable. A is slightly tighter, and B adds out-of-brief extras.
4. Scope discipline: tie. A flags the interface gaps. B has richer game-flow edge cases.
5. Rules correctness: A. A names perft counts and reference positions as proof. B names only tricky positions.
6. Engine strength and levels: B. B gives a 10-game target (at most 1 win at the highest). A is non-numeric.
7. Coaching truth and usefulness: B. B defines the scale, runs at least 20 probes, and adds a reading test. A has 10 probes.
8. Responsiveness and board clarity: tie.
9. End-of-game review: B. B requires the same verdict and reason. A says only "compatible".

## 4. Fatal problems

None in either. Neither makes a P1 requirement impossible. B's cap of five worst moves and A's cap of three are both defensible. B's optional Black play and copy-as-text are extra scope, not wrong.

## 5. Verdict

Ship B. It has more concrete, measurable targets for strength (SC-003) and for coaching truth (at least 20 probes), and it requires the end-of-game review to repeat in-game verdicts and reasons exactly. A is better on proof of rules correctness (perft) and on spotting interface gaps, but its strength measure is vague. B is ahead by about six points, so the margin is moderate, not overwhelming.
