# Run 5 results: Codex and Pi each build Chess Coach under equal conditions

**Tracks:** t1 = **Codex** (`gpt-5.5`, reasoning high, clean config with the task-continuity plugin only). t2 = **Pi** (`glm-5.3` via Z.AI, thinking high, no skills). The mapping was kept from reviewers and judges; they saw only t1/t2 or A/B. **Reviewer for both:** Claude Code `claude-opus-4-6`. Conditions are listed in `REPRODUCE.md`; the remaining differences are each harness's built-in tools (Codex has web search and image tools).

Both tracks built the whole product independently from their own spec and design, and **both products passed acceptance on the first round and pass all 43 of the owner's hidden tests.**

## Layer 1: how they built it

| Stage | Measure | Codex | Pi |
| --- | --- | --- | --- |
| Spec | Track reviewer (single review) | ACCEPT, 82 | ACCEPT, 87 |
| | Blind judges (Claude / Codex / Pi) | 73 / 90 / 82 | **85 / 94 / 90** |
| Design | Track reviewer (single review) | ACCEPT, **88** | ACCEPT, 87 |
| | Blind judges | 59 / 69 / 77 | **85 / 87 / 93** |
| | Phases | 4 | 6 |
| Build | Code reviews, first-time pass | 4 / 4 | 6 / 6 |
| | Questions to the coordinator | 0 | 2 (both measured or reasoned) |
| Effort | Author active minutes (spec / design / build) | **57.7** (3.3 / 3.3 / 51.1) | 217.3 (7.2 / 3.5 / 206.6) |
| | Author output tokens | **109,145** | 540,643 |
| | Cost logged by the harness | subscription, not logged | $11.42 |

## Layer 2: what they built

| Measure | Codex | Pi |
| --- | --- | --- |
| Owner's hidden tests (43) | 43 / 43 | 43 / 43 |
| Engine match, 200 ms per move (20 games) | 0 | **20** (all checkmates) |
| Engine match, 1 s per move, Pi's rules as referee | 0.5 | **19.5** |
| Coach on Qd4?? (queen hangs) | "It lets Black capture the queen on d4." Better d1c1 | "Your queen on d4 can now be captured for free by the pawn on c5. A stronger move was moving your queen from d1 to d5." |
| Coach on Qxf7# | "Best move. It handles the position cleanly." | "Checkmate — you win the game." |
| Coach on 1.g4 | rated **best** | inaccuracy, better Nc3 |
| Coach time per move | 48–189 ms on the final code (varies with JIT warm-up) | ~0.5 s after tuning (was ~1.2 s) |
| Move notation in the UI | raw (e2e4, "d1d3 keeps the position safer") | plain words ("moving your knight from b1 to c3") |
| Acceptance review | ACCEPT; QB3 partial | ACCEPT; QB3 partial |
| Board layout (coordinator measurement) | squares 84×100 vs 84×69 px | squares 69×94 vs 69×44 px; **colours inverted** |

## What review caught and missed

- Every code review on both tracks passed on the first round. None of them, and neither acceptance review, reported the uneven squares or Pi's inverted board colours; both acceptance reviewers rated "clear board" a pass. The coordinator found them by measuring the page.
- Reviewing each design alone, the track reviewer scored Codex 88 and Pi 87. Compared side by side, all three blind judges preferred Pi's by 16–26 points.
- The acceptance reviewer of Codex's app rated "plain words" a pass while its own screenshots show raw notation.

## Limits

- The agents' workspace was not a fresh repository: it held earlier-run material and an early ledger naming the two agents (never the track mapping). Same commit and content for both teams; see REPRODUCE.md §2.
- Neither app works opened directly as a local file (empty board); both need a local web server.

One project, one run per track. Codex and Claude costs are not logged by their harnesses (subscriptions). Pi's minutes include about 13 minutes waiting for a coordinator reply.
