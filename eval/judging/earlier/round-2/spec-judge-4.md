# Spec judge 4: blind scoring of A and B

Each packet was scored against the rubric before the two were compared. Word counts (`wc -w`): A 1,072, B 1,198. Both are under the 1,200-word limit.

## 1. Score table

| Line | A | B |
| --- | --- | --- |
| 1. User value and problem | **17**: "Adult beginners repeat tactical mistakes because ordinary opponents show that they lost, not why… wants a complete, winnable game and truthful guidance while each decision is fresh." Names the user, the problem and the outcome. Section 1 does not name the brief's mistake types (hanging pieces, missed captures, mates). | **17**: "loses the same way every time: chess apps show a result, not a reason… wants games at a beatable strength, and wants each mistake explained immediately." Equally specific, and has the same omission of the concrete mistake types in section 1. |
| 2. Stories and acceptance scenarios | **13**: Scenarios are bundled and not mapped to stories. "Given positions for castling, en passant, promotion, and terminal/draw states, when each condition occurs, then the position and result are correct" is one scenario standing in for many unnamed positions. No scenario covers levels being different, the two-second reply, or the P2 restart story. | **14**: Scenarios are grouped per story and are more concrete: "Given a move leaves a piece capturable for free, Then the coach shows a harsh verdict, names the piece and threat…". Several have no When clause. Stalemate, draws and strength choice have no scenario, and neither do the P2 stories. "Given a mate-in-one was available and missed, Then the coach says plainly the opponent can now mate" mixes up missing your own mate with allowing the opponent's. |
| 3. Requirements | **17**: FR-001 to FR-011 cover every must-have outcome, plus restart (FR-010) and the fixed interface (FR-011). One small design leak ("selectable destinations"). FR-008's "observably different challenge" is weakly testable. | **16**: FR-001 to FR-010 cover every must-have outcome, and truthfulness gets its own requirement (FR-006 "every concrete claim… is true in the position shown"). But the P2 stories "New game without reloading" and "Play as Black" have no requirement behind them. |
| 4. Quality bar as checkable criteria | **13**: Section 5 mostly restates the bar without saying how to check it, e.g. "Proportionate: best/good feedback is acknowledgement, not a lecture." and "Selectable strength: repeatable comparison shows increasing challenge". Items 1 and 2 (perft, replay check) and SC-003/SC-004 add some methods. Items 3, 5, 6 and 8 have no real procedure. | **17**: Most items name a procedure and a pass rule: "on ≥20 known-mistake probes, every concrete claim checks out; one false claim fails"; "in a full-game transcript, good/best moves get at most a short acknowledgement"; SC-003 "at the highest, at most one of 10"; "a first-time viewer names the turn, last move, and any check within seconds". Weak spots: item 3 does not say how "better" is judged, and "novice-strength opponent" is undefined. |
| 5. Scope discipline | **18**: Explicit non-goals. Real edge cases, including a subtle one: "Repetition uses the game's move history; FEN-only status is limited to facts encoded by that input". Assumptions are labelled Decision / Assumption / NEEDS CLARIFICATION, including gaps in the fixed interface (malformed FEN, terminal `bestMove`). | **17**: Explicit non-goals (including "Coaching the computer's moves" and takebacks). Solid edge cases ("No legal moves: checkmate if in check, stalemate otherwise"). Assumptions are labelled "Decisions, overridable". Misses the repetition-versus-FEN gap and the undefined interface behaviours. |

## 2. Totals

- **A: 78 / 100**
- **B: 81 / 100**

## 3. Per line

1. **User value:** Tie. Both name the same user, problem and outcome with the same level of detail.
2. **Stories and scenarios:** B, because its scenarios are tied to stories and use concrete triggers (a free capture, a hint not followed), while A's rules scenario lumps everything together. B's mate-in-one scenario is muddled.
3. **Requirements:** A, because every story, including restart, has a requirement behind it. B's two P2 stories have no requirement.
4. **Quality bar:** B, because almost every item comes with a sample size or procedure and a pass/fail rule, where A's mostly restates the bar.
5. **Scope:** A, narrowly, because it catches that repetition cannot be read from a FEN and lists the interface behaviours the brief leaves undefined.

## 4. Fatal problems

Neither packet has one. Both make every P1 outcome achievable and consistent with the fixed interface. Two points are worth noting but are not fatal:
- B's missed-mate scenario would test the wrong claim if built literally.
- B requires repetition draws (FR-001) and also exact interface behaviour (FR-002), but never says that `gameStatus(fen)` cannot see move history. A builder could still handle this in the app.

## 5. Verdict

If I had to build from one packet, I would pick **B**. Its quality bar arrives as checks a tester can run (probe counts, win-rate limits, transcript reading), and the bar is where this product most easily fails. A is the tidier spec on requirements and edge cases, but its quality-bar section would leave the builder to invent how "proportionate", "plain" and "levels differ" are verified.
