# Engineering review

## Verdict

**ACCEPT** — score 88 / 100. The design is buildable phase by phase, every requirement traces to a check, codebase claims are verified, and no fatal problems were found. Optional suggestions below would strengthen coaching verification and phase-boundary clarity.

## Verified facts and errors found

All codebase and environment claims in §1 were checked against the working tree.

| Claim | Verification | Result |
| --- | --- | --- |
| `node --version` returns v26.0.0 | Ran `node --version` | **Confirmed**: v26.0.0 |
| No `chess-coach/` product files exist | Ran `find chess-coach -type f` | **Confirmed**: directory does not exist |
| No `package.json` or build config | Ran `find . -name "package.json"` and `ls *.json` | **Confirmed**: only `skills-lock.json` in root |
| Chrome path exists | Tested `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | **Confirmed**: present |
| Existing Python tests: 181 pass | Ran `python3 -m unittest discover -s tests -v` | **Confirmed**: 181 tests OK in 0.87 s |
| Accepted spec at `docs/run5/spec.md` | Read file | **Confirmed**: 94-line accepted spec present |
| Brief and quality bar paths | Read both files | **Confirmed**: `projects/chess-coach/brief.md` (43 lines), `projects/chess-coach/quality-bar.md` (21 lines) |
| Base commit d2fbfc2 | Ran `git rev-parse HEAD` | **Note**: current HEAD is eb5a5a4, which is one commit ahead (the design commit itself). Design was written at d2fbfc2 — consistent |

No factual errors found. All six function signatures in §3 match the brief's fixed testing interface table exactly: `legalMoves`, `applyMove`, `perft`, `gameStatus`, `bestMove`, and `reviewMove` with correct parameter and return shapes.

## Scores

| Criterion (max) | Score | Evidence |
| --- | --- | --- |
| **Traceability to the spec** (20) | 18 | §8 maps all 12 FRs and all 7 SCs to phases and check commands. Every row names a concrete test file. Minor: the notation "FR-005, P3 user story" conflates spec priority labels with build-phase names, which could confuse a builder reading the table cold. |
| **Soundness of architecture and contracts** (20) | 18 | Clean module decomposition (fen → board → movegen → status → search → evaluate → coach). Public interface matches the brief exactly. `gameStatus` returning `"draw"` for halfmove ≥ 100 and insufficient material is correct; threefold repetition is honestly deferred to UI history, with an explicit escalation path (§10). `bestMove` returning `null` when the game is over is a reasonable extension the brief doesn't prohibit. Truth-first coaching policy (§4) is well-motivated and aligns with quality bar item 2. |
| **Phase ownership, dependencies, and safe parallelism** (20) | 17 | File ownership per phase is clear. Sequential default (P0→P1→P2→P3) is safe. The conditional parallelism rule ("P1 and P2 can overlap if P2 doesn't edit engine/**") is sound. Deducted: P1's note "may update `engine/index.js` after P0" means P1 touches a P0-owned file. This is necessary (P1 adds `bestMove`/`reviewMove` exports) but the design should state explicitly what P1 adds to `index.js` so builders know the contract boundary. |
| **Checks that prove behavior + quality-bar verification** (20) | 16 | P0 checks are strong: perft against known counts, special-rule positions, illegal-move throws. P1 checks verify timing, legal output, and verdict shape. §9 addresses all 9 quality-bar items. Deducted: automated coaching-truth verification is shape-only ("sampled blunders include true reason and legal better move") — the test checks that a reason string exists and `betterMove` is legal, but does not independently verify that the stated reason is true for the position. The design mitigates this architecturally (truth-first policy, §4) and with human review (§8 maps SC-004/SC-005 to "human review of five comments"), which is reasonable for this hard problem but leaves a gap in automated coverage. |
| **Grounding in the real codebase, risks, and effort realism** (20) | 19 | Every environment claim verified (see table above). Risk identification is thorough: perft correctness as highest risk, false coaching prose, threefold limitation. Escalation triggers are specific. Effort estimate (3 days total) is realistic for four phases of a custom chess engine with coaching. Deducted: no mention of the risk that a Web Worker (`app/worker.js`) cannot directly import ES modules via `file://` protocol — this may require a local server, which the brief permits but the design doesn't address. |
| **Total** | **88** | |

## Fatal problems

None. Every P1 requirement from the spec is reachable through the build plan. No phases write the same file concurrently. All checks can fail on incorrect implementations. Quality-bar verification covers all 9 items.

## Required changes

None.

## Optional suggestions

1. **Clarify what P1 adds to `engine/index.js`.** The design says P1 "may update `engine/index.js` after P0" but does not specify which exports P1 adds. Stating explicitly that P1 adds the `bestMove`, `reviewMove`, and any coach-related exports to `index.js` would prevent ownership confusion between builders.

2. **Add a coaching-truth fixture test.** The P1 check verifies verdict shape and that `betterMove` is legal, but does not verify that the stated `reasons` text is true for the position. Adding one or two fixture positions where the expected reason is known (e.g., "a position where Nf3 hangs the queen — verify the reason mentions the queen") would strengthen automated coverage of quality bar item 2.

3. **Address the Web Worker + `file://` risk.** ES module imports in a Web Worker may fail under the `file://` protocol due to CORS restrictions. The brief permits a local static server. The design should note whether the app requires a server or works from `file://`, and if the former, include the server setup in the P2 check or demo checklist.

4. **Disambiguate the traceability table notation.** "FR-005, P3 user story" mixes spec priority labels (P3) with build-phase names (P2, P3). Rephrasing to "FR-005 (spec story: board clarity)" or similar would avoid misreading by a builder who sees "P3" as only the build phase.

---

```
Task / Dispatch: task_870042fef7de / ctx_b79a1d13df50
Role: engineering reviewer
Base commit: eb5a5a4
Output: docs/run5/design-review.md
Decisions made: ACCEPT at 88/100 — the design is buildable, all FRs and SCs trace to phases and checks, all codebase claims verified, no fatal problems; four optional suggestions would improve phase-boundary clarity and coaching-truth test coverage.
Checks: node --version → v26.0.0; find chess-coach → does not exist; test Chrome path → present; python3 -m unittest discover → 181 OK; git rev-parse HEAD → eb5a5a4; read spec.md, brief.md, quality-bar.md → all present and consistent; cross-referenced all 6 fixed-interface functions against design §3 → match.
Open questions: none (the design's open question about threefold repetition in gameStatus is correctly flagged and deferred).
Next: coordinator routes the accepted design to builders.
```
