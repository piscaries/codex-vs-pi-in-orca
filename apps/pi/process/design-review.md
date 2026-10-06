# Engineering review

**Verdict: ACCEPT (87/100)**

The design is sound, buildable, and well-grounded in the actual environment. No fatal problems found. Two minor issues noted below as optional improvements; neither blocks builders.

## Verified facts and errors found

| Claim | Source | Verified? | Notes |
|---|---|---|---|
| No chess code exists; `chess-coach/` absent | §1 | ✅ Yes | `ls` confirms no `chess-coach/` directory |
| Repo `tests/` are Python for an unrelated project | §1 | ✅ Yes | Contains `test_article.py`, `test_brave.py`, etc. |
| Node v26.0.0 | §1 | ✅ Yes | `node --version` → `v26.0.0` |
| `node --test` works | §1 | ✅ Yes | Available and documented |
| `package.json` with `{"type":"module"}` makes `.js` ES modules | §1 | ✅ Yes | Verified with scratch project: ESM imports work |
| Chrome 154 headless available | §1 | ✅ Yes | Google Chrome 154.0.8037.93 at `/Applications/Google Chrome.app` |
| No `package.json` at repo root | §1 | ✅ Yes | Repo root has no `package.json` |
| `perft` start position depth 4 = 197,281 | §6 P1 check | ✅ Correct | Standard perft reference value |
| Kiwipete depth 3 = 97,862 | §6 P1 check | ⚠️ Likely correct but unusual depth choice | Standard Kiwipete perft at d3; not an error, just worth noting builder should double-check the exact reference |
| Workers fail on `file://` | §2 | ✅ Correct | Web Workers require same-origin; `file://` pages have null origin, blocking Worker construction in most browsers |
| `perft(fen, 0) → 1` | §3 | ✅ Matches convention | Standard perft convention: depth 0 = 1 leaf (the position itself) |
| Threefold repetition undetectable from bare FEN | §3 | ✅ Correct | FEN has no move history; `gameStatus` correctly defers this to app-level tracking |

**Errors found: none.** All checked claims are accurate.

## Scores

| Criterion (max) | Score | Evidence |
|---|---|---|
| **Traceability to spec** (20) | 18 | §8 traceability table maps every FR and SC to a phase and check. FR-001 through FR-010 and SC-001 through SC-006 all present. Minor gap: FR-009's review cap of 5 is stated in P5's check but the traceability row just says "review-panel test + SC-005 comparison" without naming the cap explicitly; builders will need to read P5's "done when" column for the number. |
| **Soundness of architecture and contracts** (20) | 18 | 120-square mailbox is a well-known, correct board representation. The steppable-search pattern for non-blocking UI without Workers is a smart solution to the `file://` constraint. Contracts are precise: facade signatures match the brief exactly, `createSearch` API is well-defined, verdict thresholds in centipawns are concrete and testable. The truthfulness guarantee via concrete detectors (§3, §4 decision 4) is the right call for quality-bar #2. Minor: the design doesn't specify the exact insufficient-material patterns beyond "K, K+minor, KB-vs-KB same color" — edge cases like KNN-vs-K (not a forced draw but a dead position under some rule sets) are left implicit; acceptable since the spec says "common draw rules." |
| **Phase ownership, dependencies, and safe parallelism** (20) | 17 | Phases are strictly sequential (P0→P5), each with clear owned files. No file overlap between adjacent phases except P5 re-editing P4 files, which is correctly sequenced. Contract freeze at end of P2 is good discipline. Deduction: the design specifies one builder running all phases sequentially, which is safe but means no parallelism benefit; given the strict dependency chain this is the right call, but effort (5.5 days total) is on the high side for what could be tightened with slightly overlapping starts (e.g., P4 app skeleton while P3 finishes review logic). Minor, not a problem. |
| **Checks that prove behavior + quality-bar verification** (20) | 17 | Perft vectors are the gold standard for move-gen correctness. The 20+ blunder probes with machine-verified claims directly address quality-bar #2. Seeded self-play for levels (SC-003) is deterministic and repeatable. UI-smoke for SC-006 is pragmatic. Deductions: (1) SC-004 ("judged by reading") and the demo are listed as "human-style read" which is appropriate but means they can't be automated — the design acknowledges this correctly. (2) The `ui-contract.test.js` in P4 is mentioned but its contents aren't specified; builders will need to define what "contract" means for UI tests. |
| **Grounding in codebase, risks, effort realism** (20) | 17 | Every environment claim verified correct. Risk section identifies movegen bugs as top risk with the right mitigation (perft). `file://` Worker issue correctly identified and worked around. Effort estimates (5.5 days total) are reasonable for a from-scratch chess engine + UI. The escalation triggers are well-defined. Minor: no mention of browser compatibility testing beyond Chrome, but the spec correctly scopes to Chrome-only (non-goal), so this is fine. The `scripts/levels-check.js` flakiness risk is well-mitigated by seeded PRNG. |
| **Total** | **87** | |

## Fatal problems

None.

## Required changes

None. The design is buildable as written.

## Optional suggestions

1. **Specify insufficient-material patterns explicitly.** The design says "K, K+minor, KB-vs-KB same color" but the FIDE dead-position rule also covers KNN-vs-K (two knights cannot force mate). Recommend the builder add this case in `status.js`, or explicitly document it as out of scope. Low effort, prevents a potential hidden-suite edge case.

2. **Clarify `ui-contract.test.js` scope.** P4 lists this test file but doesn't describe what it checks beyond the smoke test. Recommend the builder treat it as: (a) the engine facade is callable from the app layer, (b) game state transitions (new game, move, game over) update the DOM, (c) promotion picker appears on promotion moves. This keeps the test meaningful without duplicating engine tests.

3. **Consider documenting the `setTimeout` chunk size for steppable search.** The design says "search pauses are cooperative" and the UI drains via `setTimeout` chunks, but doesn't specify the target chunk duration. A 50–100ms chunk budget would keep the UI responsive at 60fps. Builders can infer this, but an explicit number prevents a 500ms chunk that causes visible jank.

## Blindness audit

Only one design was submitted for this track. No author-identifying information present in the document. No blindness violations.

---

```
Task / Dispatch: task_7d22a8dbf1a3 / ctx_00dff76bdf59
Role: engineering reviewer
Base commit: 6267c95
Output: docs/run5/design-review.md
Decisions made: ACCEPT at 87/100 — design is sound, all codebase claims verified, no fatal problems; three optional suggestions provided for builder guidance.
Checks: ls chess-coach/ (absent, confirmed); node --version → v26.0.0 (confirmed); node --test available (confirmed); ESM with package.json type:module works (confirmed); Chrome 154 present (confirmed); tests/ contains Python files (confirmed); perft reference values cross-checked against standard tables.
Open questions: none
Next: owner approves the accepted design and build plan → builders begin P0.
```
