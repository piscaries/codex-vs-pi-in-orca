# Spec judging — run 5, judge 3

Packets scored: `docs/run5/spec-rescore/A.md`, `docs/run5/spec-rescore/B.md`. Rubric: five lines × 20, from the project quality bar. Scored independently against the brief and quality bar only.

## 1. Score table

| Rubric line | A | B |
| --- | --- | --- |
| User value and clarity of the problem (20) | **18** — "Success means finishing legal games at a chosen challenge and recognizing how to avoid costly mistakes": problem, user, and success outcome all named. | **18** — "Two outcomes matter: a correct, playable game, and coaching that is true and understandable": equally crisp problem, user, and priority ordering. |
| Stories and acceptance scenarios independently testable (20) | **16** — broad coverage ("terminal/draw states" get their own scenario) but triggers are abstract: "Given a mistake or blunder, when feedback appears…" names no position or move. | **17** — concrete, self-executing triggers: "Given a mate-in-one was available and missed, Then the coach says plainly the opponent can now mate"; but no scenario covers draw/stalemate endings or starting a new game. |
| Requirements complete, testable, free of implementation detail (20) | **18** — FR-011 pins the fixed interface "with exactly the specified inputs, outputs, verdict vocabulary, and illegal-move behavior" and FR-010 covers restart; one obligation per FR, no tech choices. | **17** — equally testable and clean ("throwing on illegal moves, answering within roughly the requested time"), but new-game/restart exists only as story P2-1, not as a functional requirement. |
| Quality bar turned into checkable criteria (20) | **17** — all nine items mapped and perft is used ("reference positions and perft counts show no legality… error"), but the level check is unquantified: "repeatable comparison shows increasing challenge; a beginner can beat the lowest and rarely beats the highest." | **18** — quantified and falsifiable: "on ≥20 known-mistake probes, every concrete claim checks out; one false claim fails" and "In 10 games at the lowest level… at most one of 10"; minor wording risk in "a novice-strength opponent wins most" (readable backwards). |
| Scope discipline: non-goals, edge cases, assumptions (20) | **19** — broadest non-goals, plus the sharpest edge-case note in either packet: "Repetition uses the game's move history; FEN-only status is limited to facts encoded by that input"; open questions target real interface gaps (malformed FEN, terminal `bestMove`). | **18** — solid non-goals and concrete edge cases ("Promotion: the user is asked which piece; never silently defaulted"), but it adds unrequested features beyond the brief: "P2-2 Play as Black" and "P3-1 Copy the finished game as text with comments." |

## 2. Totals and overall

- **A: 88/100** (18 + 16 + 18 + 17 + 19)
- **B: 88/100** (18 + 17 + 17 + 18 + 18)

Tie on rubric points; no fatal problems found in either packet (both are testable, faithful to the brief, and free of implementation detail). On tie-break, **B is marginally stronger overall**: its edges lie in the two areas hardest to verify after the fact — coach truthfulness (quantified probe counts, "one false claim fails") and level separation (10-game thresholds) — while A's edges (a restart FR, a draw-status scenario, the FEN/repetition note) are one-line grafts onto any base.

## 3. Per-line winners

- **User value and clarity:** even — both name the under-1200 beginner, the "result without a reason" problem, and the outcomes that matter.
- **Stories/scenarios:** **B** — concrete triggers ("a piece capturable for free", "a mate-in-one was available and missed") make each scenario independently runnable; A's "Given a mistake or blunder" forces the tester to invent the position.
- **Requirements:** **A** — every brief obligation has its own FR, including restart (FR-010) and a verbatim pin of the six-function fixed interface (FR-011); B leaves restart story-only.
- **Quality-bar criteria:** **B** — numeric thresholds (≥20 probes, 10 games per level, at most one of 10) turn the bar into pass/fail; A's level check names no measurement.
- **Scope discipline:** **A** — no feature creep and the most technically honest edge-case handling in either packet (FEN cannot encode repetition history; analysis time-limit fallback); B quietly adds two features the brief never asked for.

## 4. If I had to build from one packet

I would build from **B**, because its concrete scenario triggers and quantified truthfulness/level checks attack the project's least-testable risks head-on, and its gaps are cheap to patch. Specifically, I would graft A's restart requirement (FR-010, with confirmation) and A's edge-case note that FEN-only `gameStatus` cannot see threefold repetition — that note prevents a real hidden-suite surprise. I would also cut or explicitly owner-approve B's two extra features (play as Black, copy-as-text) before engineering design starts.

---

*Blindness audit: judged only from the two packet files as labeled A and B; neither reveals its author. No other folders, worktrees, branches, or git history were inspected for this scoring.*
