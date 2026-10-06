# Design judge 4: blind scoring of packets A and B

Each design is judged against the spec in its own packet. I checked the environment claims in this repository: `node --version` gives v26.0.0, Chrome reports 154.0.8037.93, there is no `chess-coach/` and no root `package.json`, and `tests/` holds Python. Both packets get these facts right. Design word counts, measured before the appended spec: A has 1,172 words and B has 1,505.

## 1. Score table

| Line | A | B |
|---|---|---|
| **1. Traceability** | **18**. The §8 table maps FR-001 through FR-011 and SC-001 through SC-005 to phases and proofs, for example "FR-009; SC-005 \| P2,P4 \| identity-based recap test and completed-game audit". The P3 clean-recap story falls under FR-009. One gap: the "10 coaching lines" and the "20-comment human review" are named but have no fixture owner until P4. | **13**. The table covers every FR and SC, but several proofs point at nothing. FR-009 is proved by "review-panel test + SC-005 comparison", yet P5 owns no test file. FR-010 is proved by "ui-smoke DOM asserts (turn/last-move/check badges)", but §5 defines ui-smoke as "page loads, board DOM present, zero console errors". FR-001 is traced only to P1, while repetition draws live in `app/game.js` (P4/P5). |
| **2. Architecture & contracts** | **17**. Contracts are precise: typed errors, the `GameState`/`MoveRecord` shapes, and the worker protocol `{id,type:"coachAndReply",fenBefore,userUci,fenAfter,profile}`, with "one sub-1.8-second budget between bounded review and reply search". It also commits to "Store, never recompute, reviews". What's missing: no verdict thresholds ("Thresholds are fixed in `coach.js`") and no profile depth/noise values. | **13**. The cp thresholds and detector-only reasons are concrete and strong. Three problems weaken it. `reviewMove` runs a search, but only the computer's reply is made steppable, so coaching each user move is synchronous on the main thread with no time budget, which risks FR-004. `createSearch(pos,…)` uses a `pos` type that is never defined. The no-Worker rationale ("workers fail on `file://`") is undercut by its own risk that module imports also fail on `file://`. |
| **3. Phases, ownership, parallelism** | **17**. Five sequential phases are ordered by real dependencies, with disjoint files: "No phase shares owned files; later fixes to an earlier owner stop and return through its review". P0 is large: all of FEN, move generation, apply and status sit in one `rules.js`. | **11**. The phases are smaller and correctly chained, but ownership overlaps and the plan contradicts itself: P5 owns "edits to `app/main.js`/`app/game.js`/`index.html`" while §7 says "no two phases share files". The path styles are mixed (`chess-coach/index.html` next to relative paths), and the architecture tree mis-nests the engine files. |
| **4. Checks & quality-bar verification** | **15**. The check commands are real `node --test` runs, the coaching claims are proved by replay, and the recap is tested by identity. §9 covers every bar item: 200% zoom, a 20-comment audit, a byte-for-byte recap check, and "≥2s reply fails acceptance". It has weak spots. Perft goes only "through depth 3". Level difference rests on "profiles differ" plus one human game per level. The plan does not say how the Node test drives Chrome. | **14**. Several checks are strong: "perft: start d4=197281, Kiwipete d3=97862" (both counts are correct), seeded self-play "weak proxy wins ≥6/10 at level 1, ≤1/10 at level 4", "≤ timeMs+50 ms", and ≥20 blunder probes. The UI checks, though, are smoke tests (load, DOM, console). The P4 done-when ("Play a full game in Chrome") is manual. The review, which carries the honesty bar (#9), has no automated check in its own phase. |
| **5. Grounding, risks, realism** | **17**. Every environment claim checks out ("Node is `v26.0.0`… Chrome `154.0.8037.93`"). It names the main risk (move generation, so stop on any perft mismatch) and the hardware-sensitive search, with a response to each. "22–30 hours plus reviews" is believable. It does not name the risk of driving headless Chrome without packages. | **12**. The environment claims are correct and the risk list is good (flaky levels, file://, the 200 ms chunk limit, phase overruns). Three things count against it. The design runs 1,505 words, over the 1,500 limit. Its `file://` reasoning is inconsistent: it rejects Workers for `file://` while relying on module scripts that Chrome also blocks on `file://`. It does not flag synchronous review cost on the main thread. The 5.5-day estimate is believable. |

## 2. Totals

- **A: 84 / 100** (18 + 17 + 17 + 15 + 17)
- **B: 63 / 100** (13 + 13 + 11 + 14 + 12)

## 3. Per line

1. **Traceability: A.** Every A row points to a phase that owns a matching check, while several B rows point to tests that don't exist or that don't assert what the row claims.
2. **Architecture: A.** A's worker protocol and shared time budget cover both coaching and reply. B's main-thread design leaves coaching cost unbudgeted, even though B's verdict thresholds are more concrete than A's.
3. **Phases: A.** A's file ownership is truly disjoint; B's P5 re-edits P4 files while B claims it doesn't.
4. **Checks: B, narrowly.** B's engine checks are sharper: perft at depth 4, seeded level self-play and timing bounds. But A automates the UI and recap checks that B leaves to smoke tests and manual play. I scored this line close (15 vs 14) for that reason, and A still has the higher score here.
5. **Grounding: A.** Both are correct about the environment, but B's `file://` rationale contradicts itself and B runs over the word limit.

Note: on line 4 the per-line winner (B, for engine checks) is not the higher score (A, 15 vs 14), because I weighted A's automated UI and recap checks above B's sharper engine checks.

## 4. Fatal problems

- **A:** None found.
- **B:** Nothing makes a P1 requirement impossible, but one is a serious risk. `reviewMove` searches synchronously on the main thread after every user move, with no time budget in the UI flow. That can freeze the page and break FR-004 / quality bar #7 unless the builder reworks the search contract. A second risk: if Chrome blocks module imports on `file://`, the app needs a local server anyway. Then a Worker becomes available and the steppable-search design becomes unnecessary.

## 5. Verdict

I would build from **A**. Its contracts (worker protocol, stored reviews, typed errors) can be built against directly, its phases own disjoint files, and every requirement traces to a check that a phase actually owns. B has the sharper engine tests (deeper perft, seeded level self-play), and A's builder should adopt them. But B's main-thread coaching, overlapping P4/P5 ownership and missing review test would cause rework.
