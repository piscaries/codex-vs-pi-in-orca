# Design judge 9: blind scoring of A and B

Both designs were scored against their own specs. The repo has no chess code, so claims about greenfield, Node 26 and Chrome were taken as consistent with the brief. Word counts of the design parts: A ≈1505 (at the limit), B ≈1172.

## 1. Score table

| Line (max) | A | B |
|---|---|---|
| 1 Traceability (10) | **8**. §8 maps FR-001..010 and SC-001..006 to phases and checks. SC-004/006 rest on human reading and demo. | **7**. §8 maps all FRs and SCs. Several proofs are "human review" or "audit". Row labels sit loosely against the FRs. |
| 2 Architecture and contracts (15) | **12**. Precise `createSearch` contract, verdict thresholds in cp, `gameStatus` order, and an honest note that FEN cannot see repetition. A reasoned no-Worker decision ("workers fail on `file://`"). The tree listing is garbled (files shown outside `engine/`). | **12.5**. Typed errors, `parseFen` shape, `MoveRecord`/`GameState`, worker message protocol and stale-id handling. Store-never-recompute recap. Thresholds are "fixed in coach.js" without values. The facade is honoured. |
| 3 Phases, ownership, parallelism (10) | **7**. Six small, ordered phases. But P2 adds `bestMove` and P3 adds `reviewMove` to `engine/index.js`, which only P1 owns. P5 edits P4 files, yet §7 claims "no two phases share files". | **8**. Five phases with time estimates and truly disjoint owned files. Rollback dependencies are stated. P0 is large but coherent. |
| 4 Checks that prove behaviour (10) | **7**. Perft, mate-in-1 on 10 FENs, a seeded level win-rate check, ≥20 probes re-verified by detectors. `ui-smoke` only checks load, DOM and console errors, so a reply over 2 s is not caught automatically. | **7**. Perft, 10 replayed coaching lines, Chrome smoke that asserts responsiveness. The level check ("profiles differ") has no stated test. |
| 5 Grounding, risks, realism (5) | **4**. Verified claims (`type:module`, Node, Chrome). Risks named with responses. Estimate 5.5 days. | **4**. Verified facts. Risks named. Estimate 22–30 h. Notes hardware-sensitive strength. |
| 6 Rules engine and proof (10) | **7**. Own mailbox generator. Perft start d4 (197281) and Kiwipete d3 (97862), plus targeted castling/ep-pin/promotion suites. Only two perft positions. | **5.5**. Generate-then-reject. Perft for start and Kiwipete "through depth 3" only. Specials are tested, but depth and position coverage are thin. |
| 7 Engine strength (15) | **8**. Iterative-deepening alpha-beta with quiescence, material + PST eval, deadline-driven, ~1.2 s cap, mate finding tested. Move ordering, TT and other pruning are not named, and nps/depth is not measured. Strength is measured by seeded self-play against a weak proxy. | **4**. "deadline-checked iterative-deepening alpha-beta". No quiescence, ordering or eval named. No strength or speed measurement beyond "legal and timely". |
| 8 Truthful coaching (10) | **7**. Reasons come only from detectors verified on the exact position (`hangingPiece`, `mateInOne`), in templates. A truthfulness prober re-checks claims on ≥20 probes. Plain language is only "wording asserts". | **7**. "only describes consequences witnessed in legal lines", with replay proving reason and fix. Sentence/score lint plus a 20-comment human read. Mechanism is less concrete than A's detectors. |
| 9 Responsiveness (10) | **6**. Steppable search drained over `setTimeout`, so the page never freezes. Reply cap ~1.2 s, but the review-search budget for the coach comment is never stated, so the total is not shown to be under 2 s. | **9**. Web Worker for all coaching and search. "one sub-1.8-second budget" is divided between review and reply per profile, which is exactly the required sum. Served over a local server, so worker-on-file is moot. |
| 10 Levels and board clarity (5) | **3.5**. Levels defined (depth cap, blunder chance, pool size). Seeded self-play thresholds (≥6/10 at L1, ≤1/10 at L4). Board clarity is DOM-asserted in smoke. No page measurement. | **3**. Profiles with depth and noise. "profiles differ" is unquantified. Chrome assertions, keyboard and 200% zoom check. Clarity is reviewed by eye. |

## 2. Totals

| | General (50) | Task-specific (50) | Total |
|---|---|---|---|
| A | 38 | 31.5 | **69.5** |
| B | 38.5 | 28.5 | **67.0** |

## 3. Per line

1. Traceability: A, slightly more complete mapping with concrete checks.
2. Architecture and contracts: tie; B has better runtime and worker contracts, A has more precise numeric ones.
3. Phases and ownership: B, because its owned files are genuinely disjoint, whereas A's `index.js` is extended by later phases it doesn't own.
4. Checks: tie.
5. Grounding and risks: tie.
6. Rules and proof: A, with perft to depth 4 on the start position plus targeted suites.
7. Engine strength: A, which names quiescence, eval and a strength measurement; B names almost nothing.
8. Truthful coaching: tie, with A's detector-based mechanism slightly more concrete.
9. Responsiveness: B, which states a sub-1.8 s budget shared by review and reply; A leaves the coach-comment time unaccounted.
10. Levels and board clarity: A, with a quantified level check.

## 4. Fatal problems

None for either. Neither makes a P1 requirement impossible.

- A: ownership of `engine/index.js` is ambiguous across P1/P2/P3. The "no shared files" claim is false.
- B: the engine description is too thin to guarantee the strength levels. Perft at depth 3 may miss deep-rule bugs.

## 5. Verdict

I would ship A, narrowly. It specifies a stronger engine (quiescence, eval, measured level differences) and deeper perft proof, which are the largest task-specific gaps. B is cleaner on ownership and responsiveness budgeting, and those are cheap for A to fix. B's single-sentence search design leaves most of the 15-point engine-strength line unaddressed.
