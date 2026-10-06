# Blind product-spec judgment

A was scored independently before B was read and scored; the comparison below followed both assessments. Only the supplied packets were used as evidence. Both are within the 1,200-word limit by whitespace count (A: 1,072; B: 1,198), so neither receives a length deduction.

## Scores and evidence

Each rubric line is worth 20 points.

| Rubric line | Packet A | Packet B |
| --- | --- | --- |
| 1. User value and problem | **20** — “The primary user is a roughly under-1200 player who wants a complete, winnable game and truthful guidance while each decision is fresh.” The surrounding problem and success statements explicitly connect repeated tactical mistakes to learning how to avoid them. | **20** — “The user knows how the pieces move, wants games at a beatable strength, and wants each mistake explained immediately.” The preceding sentence identifies the adult beginner and repeated-loss problem, and the following sentence states the desired outcomes. |
| 2. Stories and acceptance scenarios | **16** — “Given a legal user move, when completed, then one allowed verdict and at most two plain-language sentences appear and remain visible.” All core outcomes have stories and scenarios, including hints and faithful reviews; however, the bundled rules scenario says only that “the position and result are correct,” without specifying individual expected outcomes, and strength selection/difference lacks a runnable scenario. | **13** — “Given the user's turn, When they ask for a hint, Then they get one legal move plus a one-sentence reason.” Each core outcome has a story and some scenarios, but no scenario verifies feedback after every user move, strength selection, illegal input, or draw endings; the missed-mate scenario also requires an unjustified conclusion about the opponent's mating opportunity. |
| 3. Requirements | **16** — “The owner-defined engine module exposes `legalMoves`, `applyMove`, `perft`, `gameStatus`, `bestMove`, and `reviewMove` with exactly the specified inputs, outputs, verdict vocabulary, and illegal-move behavior.” Core behavior is comprehensively specified without prescribing engine design, but delivery requirements omit plain HTML/CSS/JavaScript, no third-party packages, and no build step, and do not explicitly require local-file or local-static-server operation. | **16** — “The brief's demo — a full game in Chrome with per-move comments and final review — runs locally, no console errors or network.” Core rules, coaching, hints, review, strength, responsiveness, and the fixed interface are covered, but plain HTML/CSS/JavaScript, no third-party packages, and no build step are omitted. |
| 4. Quality bar as checkable criteria | **18** — “Across ten curated mistake/blunder positions, every response gives a legal improvement and replay confirms every reason.” All nine quality items have checks, including beginner reading, board observation, and transcript comparison; strength testing lacks a defined participant/sample and win threshold, and responsiveness lacks a specified interaction check while thinking. | **18** — “In 10 games at the lowest level a novice-strength opponent wins most; at the highest, at most one of 10.” All nine items have observable criteria, with concrete probe and strength samples; the novice-strength opponent is undefined, intermediate-level differences are not tested, and responsiveness lacks a specified interaction check while thinking. |
| 5. Scope discipline | **20** — “Repetition uses the game's move history; FEN-only status is limited to facts encoded by that input.” Explicit non-goals and labeled assumptions accompany concrete illegal-input, promotion, hint, terminal-state, and analysis-limit behavior, with special moves and common draws covered elsewhere. | **18** — “Promotion: the user is asked which piece; never silently defaulted.” Explicit non-goals and declared decisions accompany useful illegal-move, draw, no-legal-move, thinking, and game-over behavior; missing are malformed FEN/UCI handling and the history limitation of repetition detection through a FEN-only interface. |

**Totals: A — 90/100; B — 85/100.**

## Comparison by line

1. **Tie:** both identify the specific beginner, repeated mistakes, and immediate, truthful learning during beatable games.
2. **A is better:** its scenarios cover every-move feedback, illegal input, draw endings, and clean reviews more directly, while B's missed-mate scenario is incorrect.
3. **Tie:** both cover the core product requirements and fixed interface but omit the package/build restrictions, with neither fully satisfying this line.
4. **Tie:** both translate all nine items into checks, with B stronger on strength sample size and A stronger on explicit beginner-reading and board-observation coverage, while both leave verification details unresolved.
5. **A is better:** it explicitly handles malformed input, terminal search assumptions, and the distinction between game-history repetition and FEN-only status.

## Fatal problems

**A: none identified.** Its FEN-history caveat correctly avoids promising stateless detection of repetition.

**B: a P1 acceptance requirement contradicts truthful coaching.** It says, “Given a mate-in-one was available and missed, Then the coach says plainly the opponent can now mate, and shows the mating move.” Missing an available mating move does not establish that the opponent can mate; in positions where no such reply exists, satisfying this scenario would violate FR-006 and the quality bar's prohibition on false comments, so the packet cannot be followed literally on this case.

## Verdict

I would build from **A** because its acceptance coverage and edge-case boundaries are more dependable, and it contains no identified requirement to give false coaching. B offers useful concrete quality probes, but its incorrect missed-mate scenario undermines the central learning promise; both packets still omit explicit package/build constraints.
