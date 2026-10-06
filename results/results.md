# Results: Codex (GPT-5.6 Sol) and Pi (GLM-5.3) each build Chess Coach

**Teams.** Codex CLI with `gpt-5.6-sol`, reasoning high, clean config (track label t3). Pi with `zai-coding-cn/glm-5.3`, thinking high, no skills (track label t2). Z.ai compares GLM-5.3 with GPT-5.6 Sol in its own launch benchmarks, so the two are a like-for-like generation.
**Reviewer for both:** Claude Code `claude-opus-4-6`, fresh session per review, given only the track label. Codex's own handoff notes named its model family ("Codex, GPT-5 family"), which the reviewer noticed; Pi's notes named no model. See Limits.
**How this came about:** the first run paired Pi with Codex on GPT-5.5, an older model carried over from earlier experiments. The Codex team was rerun from the same start commit with GPT-5.6 Sol, using task messages identical apart from the track label (including in the run note), the Run ID and the commits. Pi's team was not rerun. The first run is kept in [`runs/gpt-5.5/`](../runs/gpt-5.5/).

**Both apps passed acceptance on the first round and pass all 43 hidden tests.**

## How they built it

| Stage | Measure | Codex (GPT-5.6 Sol) | Pi (GLM-5.3) |
| --- | --- | --- | --- |
| Spec | Reviewer, single review | ACCEPT, 88 | ACCEPT, 87 |
| | Blind judges: Claude Opus 5.5 / GPT-6.1 Sol | 75 / **77** | **82** / 66 |
| Design | Reviewer, single review | ACCEPT, 88 | ACCEPT, 87 |
| | Blind judges: Claude Opus 5.5 / GPT-6.1 Sol | 58 / **61** | **65** / 53 |
| Build | Phases planned | 5 | 6 |
| | Code reviews passed on the first round | 5 / 5 | 6 / 6 |
| | Questions to the coordinator | 3 | 2 |
| Effort | Author active minutes (spec / design / build) | **48.3** (4.0 / 4.7 / 39.6) | 217.3 (7.2 / 3.5 / 206.6) |
| | Author tokens (output, incl. reasoning) | **10.8M (150,153)** | 32.0M (540,643) |
| | Cost at API list prices | **$9.24** ($12.31 at GPT-5.6 Sol's launch price) | $11.42 |

**Judging.** Two strong blind judges, Claude Opus 5.5 and GPT-6.1 Sol, scored the specs, the designs and the finished apps side by side as A and B, with Claude Sonnet 5.5 as a weaker comparison. Each rubric has a general half (engineering practice) and a chess-coach half (rules, engine strength, coaching, responsiveness, board, end-of-game review); for the finished apps the judges ran both, tested them and played the two engines against each other. Rubrics, score sheets and a line-by-line summary: [`eval/judging/`](../eval/judging/).

| Scoring | Claude Opus 5.5 | GPT-6.1 Sol | Claude Sonnet 5.5 (comparison) |
| --- | --- | --- | --- |
| Spec, Codex – Pi | 75 – **82** | **77** – 66 | 75 – **81** |
| Design, Codex – Pi | 58 – **65** | **61** – 53 | 67 – **69.5** |
| Finished app, Codex – Pi | 65 – **70** | **63** – 62 | 63 – **77** |

- **The judges split on the totals** (Opus and Sonnet preferred Pi in all three scorings, GPT-6.1 Sol preferred Codex), **but agreed on what is specific to a chess coach:**
  - **Engine strength:** Pi far ahead in the design (planned search and evaluation) and in the finished app (Codex 4–6, Pi 12–13 of 15). In the judges' own games between the two engines, Pi won 6.5–1.5, 3½–½ and 13–1 with 2 draws.
  - **Responsiveness:** Codex ahead. It planned and built its search in a background worker; Pi's search runs on the page's main thread, and judges measured the page stalling for 0.5–0.8 s while the computer thinks.
- **Measured by the product judges:** Pi's page stalls while it thinks (the design judges had flagged this risk); its weakening noise has almost no effect (about 0.03 centipawns), so its levels differ only by search depth and time, and the search is shallow at every level.
- **Earlier rounds, superseded** ([`eval/judging/earlier/`](../eval/judging/earlier/)): round 1 used a mid-tier judge, a judge on Pi's own model and the reviewer's prompt; round 2 used strong judges but a generic rubric, and preferred Codex's design by 21 points while Codex's engine lost the match 1–19. With chess-coach criteria and a scoring of the finished apps, the judges' engine-strength scores agree with the match. See [`eval/judging/README.md`](../eval/judging/README.md).

## What they built

| Measure | Codex (GPT-5.6 Sol) | Pi (GLM-5.3) |
| --- | --- | --- |
| Hidden tests (43) | 43 / 43 | 43 / 43 |
| Engine match, 200 ms per move, Codex's rules as referee (20 games) | 1 (two draws) | **19** (18 checkmates) |
| Engine match, 1 s per move, Pi's rules as referee (20 games) | 3.5 (seven draws) | **16.5** (13 checkmates) |
| Average time per move, 200 ms match (mean of per-game averages) | 194 ms | 167 ms |
| Coach on Qd4?? (queen hangs) | blunder: "Your opponent can capture your queen on d4 with their pawn from c5." Better d1c1 | blunder: "Your queen on d4 can now be captured for free by the pawn on c5. A stronger move was moving your queen from d1 to d5." |
| Coach on Qxf7# (mate) | best: "That was the strongest move." | best: "Checkmate — you win the game." |
| Coach on 1.g4 | best | inaccuracy, better Nc3 |
| Coach on 1.e4 e5 2.Ba6 | mistake, bishop can be taken by b7; better a2a4 (the app says the same) | blunder, same reason; better Nc3 |
| Coach time per comment | 30–351 ms | about 500 ms |
| Acceptance review | ACCEPT | ACCEPT |
| Board layout (measured in headless Chrome) | rows with pieces 89×123 px, empty rows 89×55 px; colours correct; at 1280×860 the first rank is below the fold | rows with pieces 69×94 px, empty rows 69×44 px; **light and dark squares swapped** |

Coaching outputs: [`coaching-codex.jsonl`](coaching-codex.jsonl), [`coaching-pi.jsonl`](coaching-pi.jsonl), produced by [`eval/coaching.mjs`](../eval/coaching.mjs). Match logs: [`match-200ms.json`](match-200ms.json), [`match-1000ms-refB.json`](match-1000ms-refB.json).

## What review caught and missed

- Every code review on both teams passed on the first round, and both acceptance reviews passed.
- No AI reviewer reported the unequal row heights on either board, or Pi's swapped square colours. The coordinator found them by measuring the page.
- Reviewing each design on its own, the reviewer scored them 88 and 87 and accepted both. Side by side, the judges found the engine and responsiveness gaps that single reviews passed.
- Pi's page stalls for 0.5–0.8 s while the computer thinks, and Codex's level-weakening noise has no effect; no reviewer reported either, and the product judges measured both.

## Limits

- This compares two agent-and-model pairs: the agent and the model changed together, so the results cannot say which of the two made the difference.
- Both ran at their "high" reasoning setting, which is not the top setting for either (Codex: xhigh; Pi: xhigh and max), and the two vendors' levels are not calibrated to each other.
- Codex's spec session read an early ledger in the workspace that mentioned the planned engine match; Pi's sessions never read it.
- One project, one run per team. Pi's run and Codex's rerun happened a day apart on the same machine.
- The agents' workspace was not a fresh repository: it held earlier-run material and an early ledger naming the two agents, though never the track mapping. Both teams started from the same commit with the same content. See [REPRODUCE.md](../REPRODUCE.md) §2.
- The round-3 rubric was written after the earlier judging rounds had contradicted the engine match and after the board defects were known; its product line names "colours correct (a1 dark)". Both teams were scored against the same rubric.
- Neither app works opened directly as a local file. Both need a local web server (Codex's ships its own `server.mjs`).
- The reviewer was blind by design but not in practice for Codex: Codex ended each document with a handoff note naming its model family, which the team charter does not ask for, and the spec reviewer remarked on it. Pi's notes named no model. The judges' packets had these notes removed.
- The reviewer was Claude Opus 4.6, a generation older than the judges, for both teams.
- Codex's and Claude's costs are computed, not billed; Pi's harness logs its own. Pi's minutes include about 13 minutes waiting for a coordinator reply.
