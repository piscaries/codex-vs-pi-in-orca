# Judge rubrics

Three blind scorings, each by Claude Opus 5.5 and GPT-6.1 Sol, with Claude Sonnet 5.5 as a weaker comparison. Every rubric has two halves:

- **General (engineering practice):** would apply to any project.
- **Task-specific (chess coach):** what this product needs to be good, taken from the brief and the quality bar.

Packets are A and B in a fresh random order, stripped of names, models, track labels, commit hashes and handoff notes. Each judge sees one message: the brief, the quality bar, what the authors were asked to do, and the rubric below. The rules carried over from round 2: score each packet on its own before comparing, give evidence for every score, do not reward length or style, use the whole scale.

**Bands for every line**, scaled to the line's points: top quarter = nothing of substance missing; second = sound with one or two gaps; third = several gaps or vague; bottom = missing or wrong. The descriptions below say what "nothing missing" means for each line.

---

## 1. Product spec (100)

### General (50)

| Line | Points | Full marks when |
| --- | --- | --- |
| User and problem | 10 | Names the user, their problem and the outcome that matters, specific to this brief |
| Stories and acceptance scenarios | 15 | Every must-have outcome has a story with given/when/then scenarios a tester could run independently |
| Requirements | 15 | Complete against the brief, each testable, no implementation choices beyond the fixed interface |
| Scope discipline | 10 | Explicit non-goals, real edge cases, assumptions stated as such |

### Task-specific: chess coach (50)

| Line | Points | Full marks when |
| --- | --- | --- |
| Rules correctness | 10 | Lists every rule the brief names (castling, en passant, promotion, check, checkmate, stalemate, fifty-move, threefold, insufficient material) and says how correctness will be shown (reference positions, published move counts) |
| Engine strength and levels | 10 | Gives measurable targets: a beginner can win at the lowest level, rarely wins at the highest, and levels are clearly different; says how that will be measured |
| Coaching truth and usefulness | 15 | Defines the verdict scale; requires a concrete reason and a better move for mistakes; makes "never false" checkable; sets plain-language and proportionality rules |
| Responsiveness and board clarity | 10 | Reply within two seconds at every level, no frozen page; board shows last move, check and turn, pieces easy to tell apart |
| End-of-game review | 5 | Lists only moves actually played; its comments must match the ones shown during the game |

---

## 2. Engineering design and build plan (100)

### General (50)

| Line | Points | Full marks when |
| --- | --- | --- |
| Traceability | 10 | Every requirement and success criterion maps to a phase and a check |
| Architecture and contracts | 15 | Sound structure; internal contracts precise enough to build against; the fixed interface honoured exactly |
| Phases, ownership, parallelism | 10 | Small phases ordered by real dependencies; owned files never overlap |
| Checks that prove behaviour | 10 | Each phase check would fail if the behaviour broke |
| Grounding, risks, realism | 5 | Correct claims about the codebase and environment; main risks named with a response; believable estimate |

### Task-specific: chess coach (50)

| Line | Points | Full marks when |
| --- | --- | --- |
| Rules engine and its proof | 10 | A move generator design that handles every special rule, verified by perft on standard positions to a stated depth |
| **Engine strength** | 15 | Names the search (for example alpha-beta with iterative deepening and quiescence), the pruning and move ordering that make it fast, an evaluation beyond material, how it uses the whole time budget, and how its strength and speed (depth or nodes per second) will be measured |
| Truthful coaching | 10 | A mechanism that makes every claim true by construction (for example derived from search or from verified tactics), plus how plain language is enforced and tested |
| Responsiveness under search | 10 | Search never blocks the page (worker or time slicing); time budgets add up to under two seconds for the reply plus the coach comment |
| Levels and board clarity | 5 | How levels are calibrated and checked to differ; how board clarity (equal squares, last move, check, turn) is verified, ideally by measuring the page |

---

## 3. Finished product (100)

The judges get each team's finished app, `A/` and `B/` (code and tests only, no process documents), and may run anything: the app in headless Chrome, the tests, the engines directly, including against each other. They do not get the hidden tests or our match logs.

### General (40)

| Line | Points | Full marks when |
| --- | --- | --- |
| Meets the brief | 10 | Everything the brief asks for works when you run it |
| Code quality | 10 | Clear structure and names, small focused modules, no dead or duplicated logic |
| Tests | 10 | The project's own tests pass, cover the important behaviour, and would fail if it broke |
| Robustness | 10 | Bad input and edge cases are handled without crashes; errors leave the app usable |

### Task-specific: chess coach (60)

| Line | Points | Full marks when |
| --- | --- | --- |
| Rules correctness | 10 | No illegal move allowed or legal move rejected in the judge's own checks (special moves, draws, perft) |
| **Engine strength** | 15 | Plays well for its time budget: searches deeply in the time given and wins or holds its own in the judge's test games between A and B |
| Coaching quality | 15 | On positions the judge chooses: verdicts sensible, reasons true and concrete, a good better move, plain words, proportionate |
| Responsiveness and board | 15 | Reply within two seconds, page never freezes; board squares equal, colours correct (a1 dark), last move, check and turn shown (measured, not eyeballed) |
| End-of-game review | 5 | Lists only moves played; comments match those shown during the game |

---

## Decisions

1. **Weights.** General 50 / task-specific 50 for the spec and the design; 40 / 60 for the finished product. Engine strength and coaching carry the most task-specific points.
2. **The product judges could play the two engines against each other**, with their own script, through the fixed interface only, at no more than 1 s per move.
3. **Budget.** About 20 minutes per document scoring; about 45 minutes per product scoring.

The exact messages each judge received are in `../../tasks/judge-*.md`.
