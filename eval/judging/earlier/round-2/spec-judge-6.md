# Spec judge 6: blind scoring of A and B

Word counts: A 1072, B 1198. Both are under the 1,200 limit, so there is no scope or realism deduction.

## 1. Score table

| Line | A | B |
| --- | --- | --- |
| 1. User value and problem | **15**. "ordinary opponents show that they lost, not why" names the user and problem. The outcome ("finishing legal games at a chosen challenge and recognizing how to avoid costly mistakes") is somewhat generic. | **16**. "chess apps show a result, not a reason" and "Two outcomes matter: a correct, playable game, and coaching that is true and understandable". The outcomes are clearer than A's, though still brief. |
| 2. Stories and acceptance scenarios | **13**. Seven scenarios, but #2 bundles castling, en passant, promotion and terminal/draw states: "Given positions for castling, en passant, promotion, and terminal/draw states". A tester cannot run that independently. No strength-level scenario, and the P2 and P3 stories only have scenarios 6–7. | **14**. Concrete, runnable scenarios: "Given a move leaves a piece capturable for free…", "Given a mate-in-one was available and missed…", "Given a hint was shown, When they play a different move…". Omissions: no stalemate or draw scenario, no strength-level scenario, and the P2 stories have no scenarios. |
| 3. Requirements | **16**. FR-011 covers the fixed interface exactly. FR-005 is "true reason and legal better move, identifying concrete pieces, squares, captures, or mate threats". FR-002 packs many rules into one item. "selectable destinations" is a small design leak. | **15**. FR-001 to FR-010 cover the brief and are mostly testable. Gaps: FR-003 "rarely at the highest" has no numbers (SC-003 adds them). It invents scope with P2 "Play as Black" and P3 "Copy the finished game as text", and no requirement covers either. |
| 4. Quality bar as checkable criteria | **15**. All nine are present, but some are weak. #6 "repeatable comparison shows increasing challenge" has no threshold. #8 "observation confirms distinct pieces" has no method. #1 "reference positions and perft counts" and #7 "at most two seconds" are checkable. | **17**. Most carry a number or method. #2 "≥20 known-mistake probes… one false claim fails". #6 "wins most games at the lowest level, almost none at the highest", with SC-003 giving at most 1 of 10. #8 "a first-time viewer names the turn, last move, and any check within seconds". |
| 5. Scope discipline | **17**. Non-goals are explicit. Edge cases are real: "Invalid FEN or UCI fails explicitly", "Repetition uses the game's move history; FEN-only status is limited to facts encoded by that input". Assumptions are labelled and it flags interface gaps: "NEEDS CLARIFICATION: … malformed FEN, terminal `bestMove`, or illegal `reviewMove` behavior". | **16**. Explicit non-goals, including "Coaching the computer's moves". Edge cases are real: promotion prompt, no legal moves, game over, thinking-time input. Assumptions are labelled. Omissions: it does not note that repetition can't be seen from a FEN alone, and it names no interface gaps. |

## 2. Totals

- **A: 76 / 100**
- **B: 78 / 100**

## 3. Per line

1. **User value:** B is slightly better, because it states the two outcomes more crisply.
2. **Stories and scenarios:** B is slightly better, because its scenarios are concrete and independently runnable. A's rules scenario is a bundle.
3. **Requirements:** A is slightly better, because B adds unrequested scope (Black, copy as text) without requirements for it.
4. **Quality bar:** B is better, because its checks have counts, thresholds and methods. A's are more often just restated.
5. **Scope discipline:** A is slightly better, because it identifies real ambiguities in the fixed interface and the FEN-only repetition limit.

## 4. Fatal problems

None in either packet. Neither makes a P1 requirement impossible or the product wrong. Two minor issues:
- A lets the user choose neither colour nor start position. This is stated as a decision and is consistent with the brief.
- B's P2 and P3 stories (Black, copy as text) go beyond the brief. They are low-priority and harmless, but they are scope creep.

## 5. Verdict

I would build from B, by a narrow margin. Its scenarios and quality-bar criteria are more concrete and can be run directly as tests, which matters most for a builder. A is tighter on scope and interface ambiguities, and I would borrow its NEEDS CLARIFICATION notes, but its scenarios are bundled and several of its criteria are not measurable. The 2-point gap is within judging noise.
