# Engineering design review

## Verdict

**ACCEPT (88/100)**

The design is buildable, well-grounded in the verified environment, and traces every functional requirement and success criterion to a phase and check. Architecture decisions are conservative and defensible. Two minor gaps noted below should be addressed during build but do not block acceptance.

## Verified facts and errors found

| Claim | Method | Result |
|---|---|---|
| `chess-coach/` does not exist (greenfield) | `ls chess-coach/` | ✅ Confirmed — directory absent |
| Root `package.json` absent | `ls package.json` | ✅ Confirmed — file absent |
| Node v26.0.0, `node --test` succeeds with 0 tests | `node --version`, `node --test` | ✅ Confirmed |
| Chrome 154.0.8037.93 at standard macOS path | `/Applications/Google Chrome.app/…/Google Chrome --version` | ✅ Confirmed |
| No third-party packages, no build step | Brief constraint | ✅ Design complies — ES modules, no bundler, no npm install |
| camelCase exports, kebab-case files | Design §1 | ✅ Consistent with brief's `legalMoves`, `applyMove`, etc. |

No factual errors found. All codebase and environment claims checked out.

## Scores

| Criterion (weight) | Score | Evidence |
|---|---|---|
| **Traceability to the spec** (20) | 18 | §8 maps all 11 FRs and 5 SCs to phases and proof. FR-002's draw variants (insufficient material, fifty-move, repetition) are each addressed: repetition in session history (§3–4), fifty-move via halfmove clock (§3), insufficient material in `gameStatus` (§3). Minor: FR-010's confirmation UX is noted only as "confirm/cancel/reset state" without specifying the mechanism; adequate for a design doc but leaves builder discretion. |
| **Soundness of architecture and contracts** (20) | 19 | Clean layering: `rules.js` → `search.js` → `coach.js` → `game.js` → `main.js`. Public API is synchronous, Worker wraps only the UI path. Contract §3 specifies FEN field completeness, error typing (`TypeError`/`Error`/`RangeError`), and `reviewMove` shape. The decision to keep the fixed API synchronous while using a Worker only for the browser is sound — it keeps the owner test suite simple and the UI responsive. Repetition-count design (session-owned, FEN-only `gameStatus` limited) is explicitly stated and well-reasoned. |
| **Phase ownership, dependencies, and safe parallelism** (20) | 17 | Five sequential phases with disjoint file ownership. Dependency chain is clear and rollback semantics are stated. Deduction: the design mandates sequential execution but does not discuss what happens if a code reviewer returns REWORK on an early phase while a later phase is in progress — though the sequential constraint and "stop and return through its review" rule (§7) implicitly prevent this. Also, `engine/index.js` (P2) imports from `rules.js` (P0), `search.js` (P1), and `coach.js` (P1), but integration testing of those imports is deferred entirely to P2, which could surface surprises late. |
| **Checks that actually prove behavior, plus quality-bar verification** (20) | 17 | Perft at depth 3 for start and kiwipete is a strong correctness gate. Ten coaching replay lines and the stored-review identity test directly address the quality bar's "never say something false" and "recap matches." Browser smoke tests cover responsiveness. Deduction: the design says "20-comment human review" for SC-004 (plain language), which is a manual step rather than an automated check — acceptable given the nature of the requirement but worth noting. The quality-bar verification section (§9) is thorough, specifying byte-for-byte recap comparison and full Chrome game at each level. |
| **Grounding in the real codebase, risks, and effort realism** (20) | 17 | All environment facts verified. Risk section correctly identifies legal move generation as highest risk and specifies perft as the stop gate. Effort estimate of 22–30 hours is realistic for a from-scratch chess engine with coaching. Deduction: the design does not discuss the risk of `performance.now()` granularity in Node vs. browser (timer resolution differs), though the deadline-with-legal-fallback mitigates this. The "hardware-sensitive" note for search strength is honest but vague — no concrete mitigation beyond "tune depth/noise." |
| **Total** | **88** | |

## Fatal problems

None. The design satisfies all P1 requirements, phases have disjoint file ownership, checks can fail on real defects, and quality-bar verification is specified.

## Required changes

None required to accept the design. The two items below are advisory.

## Optional suggestions

1. **Confirm/cancel mechanism for FR-010:** The design says "confirm/cancel/reset state" but does not specify the UI pattern (modal dialog, inline button, etc.). The builder should decide this in P3 but should document the choice for the code reviewer.

2. **Timer resolution note:** `performance.now()` has different resolution characteristics in Node (high-res) vs. browser (potentially reduced by cross-origin isolation). Since the design already uses a legal-fallback mechanism, this is mitigated, but the builder should test deadline behavior in both environments during P1/P3.

3. **Integration smoke between P1 and P2:** Consider having P1's test file import from `rules.js` using the same path style that `engine/index.js` will use in P2, to catch module-resolution surprises early.

---

Task / Dispatch: task_c06515b888ae / ctx_d03b58eccc62
Role: engineering reviewer
Base commit: f1eff0f
Output: docs/run5/design-review.md
Decisions made: ACCEPT at 88/100 — design is buildable and well-grounded; no fatal problems found; deductions are for minor gaps in phase-transition handling, manual-only plain-language check, and timer-resolution risk discussion.
Checks: `ls chess-coach/` → absent (greenfield confirmed); `ls package.json` → absent; `node --version` → v26.0.0; `node --test` → 0 tests pass; Chrome version → 154.0.8037.93. All match design claims.
Open questions: none
Next: owner approves accepted design; builders begin P0.
