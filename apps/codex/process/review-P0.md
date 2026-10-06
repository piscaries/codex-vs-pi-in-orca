# Phase P0 code review

Verdict: PASS

Checks run:
- `node --test chess-coach/tests/rules.test.js` → PASS, 19/19 tests, ~202ms
- `npm test --prefix chess-coach` → PASS, 19/19 tests, ~206ms

Blocking findings: none

Non-blocking (Nit:) suggestions:

1. `engine/rules.js:387-392` — `revokeRookRight` calls `squareToIndex("a1")` etc. on every invocation. Precomputing the four corner indices as module-level constants would avoid redundant string parsing during move generation.
2. `engine/rules.js:378` — `[...BISHOP_DIRECTIONS, ...ROOK_DIRECTIONS]` allocates a new array for every queen on every call to `generatePseudoMoves`. A precomputed `QUEEN_DIRECTIONS` constant would eliminate the per-queen allocation.

What was done well:

- **Perft correctness.** Start position and Kiwipete through depth 3 match published reference counts exactly, and the builder reports supplemental positions 3–6 also pass. This is a strong correctness gate for the full rules engine.
- **FEN validation is thorough.** Checks 6 fields, 8 ranks, no adjacent digits, valid piece characters, king counts, piece limits per side, pawn-rank exclusion, en-passant backing pawn, and side-that-just-moved not in check. This exceeds the minimum the design calls for.
- **Contracts match the accepted design exactly.** `parseFen` returns the specified shape with fresh values (tested by mutation). Internal moves have `{from,to,promotion,flags}`. TypeErrors for invalid input, Error for illegal moves. UCI promotion suffix `q|r|b|n`.
- **Castling implementation correctly checks start, transit, and destination squares** for attacks, verifies the rook is actually present, and revokes rights on king move, rook move, and rook capture—including the case where a rook is captured on its home square by the opponent.
- **En passant discovered-check edge case** is correctly handled by the generate-then-filter approach and explicitly tested (pinned EP capture with rook on same rank).
- **`gameStatusForPosition` correctly gives no-legal-move precedence** over the fifty-move clock, so checkmate is never masked. Tested with halfmove=100 + checkmate.
- **Repetition key** correctly normalizes unusable en-passant squares and omits clock fields, with specific tests for both usable and unusable EP.
- **Immutability discipline** is consistent: `clonePosition` in `makeMove`, `Set` for castling, `applyUciMove` builds on `makeMove` so the caller's position is never mutated (tested).
- **Test specificity.** Each test targets one concern with tight assertions. The perft tests would fail on any single incorrect move in any position. The invalid-input tests cover 12 distinct malformed FENs plus bad squares, UCI, and depths.
- **Ownership is clean.** Only the three owned files plus the phase report were touched. No files outside `chess-coach/` were modified.

Remaining limits:

- The six-function public API (`engine/index.js`) is deferred to P2 per the accepted plan.
- Threefold repetition counting is session-level and deferred to P2; P0 provides only the normalized key.
- FEN validation does not prove that a position could have arisen from a legal game history (acknowledged in the builder report; not required by the design).
- `repetitionKey` calls `generateLegalMoves` to detect usable en passant, which is correct but O(legal-moves) per call. This is fine for the session-level use in P2 but worth noting for any future hot-path use.

Task / Dispatch: task_70a5ee00f59e / ctx_486918b37751
Role: code reviewer
Base commit: 4ab45b4
Output: docs/run5/review-P0.md
Decisions made: PASS — the change is correct, well-tested, matches the design contracts, and only touches owned files. The two nits (precomputed corner indices and queen directions) are minor allocations, not correctness or design issues.
Checks: `node --test chess-coach/tests/rules.test.js` → PASS (19/19); `npm test --prefix chess-coach` → PASS (19/19)
Open questions: none
Next: coordinator routes PASS to the next phase (P1 builder assignment)
