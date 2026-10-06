# Judging v3: line-by-line scores

Rubric: a general half and a chess-coach half ([`rubrics.md`](rubrics.md)). Judges: Claude Opus 5.5 and GPT-6.1 Sol, with Claude Sonnet 5.5 as a weaker comparison. Each cell is **Codex – Pi**; the higher score is in bold. Packet letters were drawn at random for each scoring and are mapped back here: spec A = Codex, B = Pi; design A = Pi, B = Codex; product A = Codex, B = Pi. Every line total below matches the judge's own total.

## 1. Product spec

| Line (points) | Opus 5.5 | GPT-6.1 Sol | Sonnet 5.5 |
| --- | --- | --- | --- |
| 1. User and problem (10) | 9 – 9 | 10 – 10 | 8 – 8 |
| 2. Stories and scenarios (15) | 9 – **10** | **10** – 7 | 10 – **12** |
| 3. Requirements (15) | 11 – **13** | **10** – 9 | 12 – 12 |
| 4. Scope discipline (10) | **9** – 8 | **10** – 7 | 8 – 8 |
| *General subtotal (50)* | *38 – **40*** | ***40** – 33* | *38 – **40*** |
| 5. Rules correctness (10) | **9** – 7 | **7** – 5 | **9** – 7 |
| 6. Engine strength and levels (10) | 5 – **8** | 5 – **7** | 5 – **8** |
| 7. Coaching truth and usefulness (15) | 10 – **13** | **10** – 6 | 11 – **13** |
| 8. Responsiveness and board (10) | 9 – 9 | 10 – 10 | 8 – 8 |
| 9. End-of-game review (5) | 4 – **5** | 5 – 5 | 4 – **5** |
| *Chess-coach subtotal (50)* | *37 – **42*** | ***37** – 33* | *37 – **41*** |
| **Total (100)** | 75 – **82** | **77** – 66 | 75 – **81** |

## 2. Engineering design and build plan

| Line (points) | Opus 5.5 | GPT-6.1 Sol | Sonnet 5.5 |
| --- | --- | --- | --- |
| 1. Traceability (10) | 6 – **8** | **8** – 7 | 7 – **8** |
| 2. Architecture and contracts (15) | 10 – 10 | **10** – 9 | **12.5** – 12 |
| 3. Phases, ownership, parallelism (10) | **7** – 6 | **9** – 4 | **8** – 7 |
| 4. Checks that prove behaviour (10) | 5 – **6** | 5 – **6** | 7 – 7 |
| 5. Grounding, risks, realism (5) | **4** – 3 | 3 – 3 | 4 – 4 |
| *General subtotal (50)* | *32 – **33*** | ***35** – 29* | ***38.5** – 38* |
| 6. Rules engine and its proof (10) | 6 – **9** | 7 – **8** | 5.5 – **7** |
| 7. Engine strength (15) | 3 – **7** | 3 – **6** | 4 – **8** |
| 8. Truthful coaching (10) | 6 – **8** | **5** – 4 | 7 – 7 |
| 9. Responsiveness under search (10) | **9** – 5 | **9** – 3 | **9** – 6 |
| 10. Levels and board clarity (5) | 2 – **3** | 2 – **3** | 3 – **3.5** |
| *Chess-coach subtotal (50)* | *26 – **32*** | ***26** – 24* | *28.5 – **31.5*** |
| **Total (100)** | 58 – **65** | **61** – 53 | 67 – **69.5** |

## 3. Finished product

| Line (points) | Opus 5.5 | GPT-6.1 Sol | Sonnet 5.5 |
| --- | --- | --- | --- |
| 1. Meets the brief (10) | **8** – 7 | **6** – 5 | 7 – **8** |
| 2. Code quality (10) | 7 – 7 | **8** – 7 | 7 – **8** |
| 3. Tests (10) | 6 – **7** | 7 – 7 | 7 – **9** |
| 4. Robustness (10) | 8 – 8 | 6 – 6 | 7 – 7 |
| *General subtotal (40)* | *29 – 29* | ***27** – 25* | *28 – **32*** |
| 5. Rules correctness (10) | 10 – 10 | **9** – 7 | 10 – 10 |
| 6. Engine strength (15) | 4 – **12** | 6 – **13** | 6 – **13** |
| 7. Coaching quality (15) | 8 – **10** | **9** – 7 | 6 – **12** |
| 8. Responsiveness and board (15) | **9** – 5 | **9** – 5 | **9** – 5 |
| 9. End-of-game review (5) | **5** – 4 | 3 – **5** | 4 – **5** |
| *Chess-coach subtotal (60)* | *36 – **41*** | ***36** – 37* | *35 – **45*** |
| **Total (100)** | 65 – **70** | **63** – 62 | 63 – **77** |

## What the judges found

- **Engine strength (product).** All three judges played the engines against each other with their own scripts: Pi won 6.5–1.5 (Opus), 3 wins and 1 draw in 4 games (GPT, 250 ms per move), and 13 wins, 2 draws, 1 loss in 16 games (Sonnet, 200 ms). Codex's search reaches depth 1–2 in middlegames; in GPT's measurement it did not complete depth 1 on Kiwipete within 500 ms (machine-dependent). Its default depth cap of 4 binds only in simple positions; in harder ones it uses its whole time budget.
- **Codex's weakening noise does nothing.** Its level "noise" spreads move scores by about 0.03 centipawns across opening moves (GPT), so it only breaks ties; Codex's levels differ only by search depth and time.
- **Pi freezes the page while thinking.** Pi runs its search on the page's main thread: judges measured timer gaps of 0.5–0.8 s while the computer thought, against under 25 ms for Codex, which uses a Web Worker. The design judges had flagged the same risk (line 9 of the design).
- **Both boards have rows of unequal height** (judges measured them), and Pi's light and dark squares are swapped: this costs Pi most on product line 8.
- **Coaching.** Opus and Sonnet preferred Pi's coaching; GPT preferred Codex's. Judges found false "best move" claims in Codex's coach (for example a2a3, f2f3 and g1h3 from the start all called "the strongest move") and reasons that name a minor capture instead of the real threat; Pi's coach has its own errors (GPT found a false en passant claim and a "better move" equal to the move just played). The judges split on coaching.
- **Spec and design.** The chess-coach half separates the teams more than the general half. Pi's documents score higher on engine strength (spec and design) and on the rules proof in the design; Codex's score higher on responsiveness (it planned a Web Worker from the start), on phase ownership in the design, and on the rules line of the spec.

## Where the judges disagree

GPT-6.1 Sol's totals favour Codex on all three scorings (by 11, 8 and 1 points); Opus 5.5 and Sonnet 5.5 favour Pi on all three. On the lines most specific to this product, engine strength, the three agree strongly in Pi's favour. The split comes from coaching (GPT prefers Codex's), phase ownership in the design, and the general half of the spec. GPT-6.1 Sol comes from the same vendor as Codex's model; one run cannot tell whether that matters.
