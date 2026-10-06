# Metrics per worktree: Codex (GPT-5.6 Sol) and Pi (GLM-5.3)

From each harness's own session log (`scripts/agent-usage.py`), counting messages after the worktree's first dispatch. Active minutes run from the first to the last logged message, so they include time spent waiting for the coordinator. Output tokens include reasoning. Codex and Claude ran on subscriptions; Pi's harness logs a cost.

The Codex rows are the GPT-5.6 Sol rerun (track t3, `r6-` worktrees). The Pi rows are from the first run (track t2, `r5-` worktrees) and are unchanged: Pi's track was not rerun.

## Codex, GPT-5.6 Sol (t3)

| Worktree | Stage | Harness · model | Active min | Uncached in | Cached in | Output |
|---|---|---|---|---|---|---|
| r6-t3-spec | spec | codex · gpt-5.6-sol | 4.0 | 44,990 | 656,384 | 11,508 |
| r6-t3-spec-review | review | claude · claude-opus-4-6 | 1.8 | 10 | 222,753 | 3,622 |
| r6-t3-design | design | codex · gpt-5.6-sol | 4.7 | 35,268 | 531,584 | 13,773 |
| r6-t3-design-review | review | claude · claude-opus-4-6 | 1.8 | 10 | 253,034 | 3,511 |
| r6-t3-P0 | build | codex · gpt-5.6-sol | 8.4 | 148,402 | 1,242,880 | 24,946 |
| r6-t3-cr-P0 | code review | claude · claude-opus-4-6 | 3.7 | 11 | 386,275 | 8,586 |
| r6-t3-P1 | build | codex · gpt-5.6-sol | 8.4 | 70,832 | 1,670,272 | 25,646 |
| r6-t3-cr-P1 | code review | claude · claude-opus-4-6 | 2.9 | 13 | 513,564 | 5,931 |
| r6-t3-P2 | build | codex · gpt-5.6-sol | 6.1 | 67,927 | 1,402,112 | 17,365 |
| r6-t3-cr-P2 | code review | claude · claude-opus-4-6 | 2.3 | 17 | 793,919 | 4,741 |
| r6-t3-P3 | build | codex · gpt-5.6-sol | 10.7 | 88,863 | 2,288,512 | 30,027 |
| r6-t3-cr-P3 | code review | claude · claude-opus-4-6 | 2.9 | 13 | 501,722 | 5,986 |
| r6-t3-P4 | build | codex · gpt-5.6-sol | 6.0 | 95,304 | 2,296,960 | 26,888 |
| r6-t3-cr-P4 | code review | claude · claude-opus-4-6 | 2.6 | 14 | 541,512 | 4,878 |
| r6-t3-acceptance | acceptance | claude · claude-opus-4-6 | 12.3 | 42 | 2,426,080 | 30,180 |

## Pi, GLM-5.3 (t2)

| Worktree | Stage | Harness · model | Active min | Uncached in | Cached in | Output | Cost (log) |
|---|---|---|---|---|---|---|---|
| r5-t2-spec | spec | pi · zai-coding-cn/glm-5.3 | 7.2 | 46,502 | 1,083,968 | 35,331 | $0.50 |
| r5-t2-spec-review | review | claude · claude-opus-4-6 | 1.8 | 10 | 243,774 | 3,994 | — |
| r5-t2-design | design | pi · zai-coding-cn/glm-5.3 | 3.5 | 21,870 | 301,952 | 12,191 | $0.16 |
| r5-t2-design-review | review | claude · claude-opus-4-6 | 1.8 | 12 | 347,064 | 4,608 | — |
| r5-t2-p0 | build | pi · zai-coding-cn/glm-5.3 | 9.8 | 63,105 | 951,808 | 46,166 | $0.54 |
| r5-t2-cr-p0 | code review | claude · claude-opus-4-6 | 2.1 | 12 | 461,153 | 4,562 | — |
| r5-t2-p1 | build | pi · zai-coding-cn/glm-5.3 | 9.6 | 68,439 | 1,238,336 | 47,075 | $0.62 |
| r5-t2-cr-p1 | code review | claude · claude-opus-4-6 | 2.4 | 14 | 577,219 | 5,163 | — |
| r5-t2-p2 | build | pi · zai-coding-cn/glm-5.3 | 35.0 | 104,042 | 3,763,200 | 76,730 | $1.46 |
| r5-t2-cr-p2 | code review | claude · claude-opus-4-6 | 8.1 | 13 | 570,017 | 9,666 | — |
| r5-t2-p3 | build | pi · zai-coding-cn/glm-5.3 | 40.3 | 154,938 | 5,800,576 | 108,321 | $2.20 |
| r5-t2-cr-p3 | code review | claude · claude-opus-4-6 | 3.8 | 15 | 661,029 | 6,423 | — |
| r5-t2-p4 | build | pi · zai-coding-cn/glm-5.3 | 78.4 | 182,447 | 11,036,864 | 135,288 | $3.72 |
| r5-t2-cr-p4 | code review | claude · claude-opus-4-6 | 6.0 | 28 | 1,573,857 | 6,663 | — |
| r5-t2-p5 | build | pi · zai-coding-cn/glm-5.3 | 33.5 | 120,689 | 6,477,440 | 79,541 | $2.20 |
| r5-t2-cr-p5 | code review | claude · claude-opus-4-6 | 2.6 | 14 | 677,908 | 4,644 | — |
| r5-t2-acceptance | acceptance | claude · claude-opus-4-6 | 7.9 | 39 | 2,562,915 | 19,906 | — |

## Author totals (spec + design + build worktrees)

| Team | Worktrees | Active min (spec / design / build) | Uncached in | Cached in | Output | Total tokens |
|---|---|---|---|---|---|---|
| Codex, GPT-5.6 Sol | 7 | 48.3 (4.0 / 4.7 / 39.6) | 551,586 | 10,088,704 | 150,153 | 10.79M |
| Pi, GLM-5.3 | 8 | 217.3 (7.2 / 3.5 / 206.6) | 762,032 | 30,654,144 | 540,643 | 31.96M |

## Cost at API list prices

The agents ran on subscriptions, so cost is computed from the token counts above at each model's list price per million tokens (input / cached input / output). Cache-write surcharges are not included for either model.

| Team | Price per M tokens | Cost |
|---|---|---|
| Codex, GPT-5.6 Sol | $4 / $0.40 / $20 (price since the 2026-08-21 cut) | **$9.24** |
| Codex, GPT-5.6 Sol | $5 / $0.50 / $30 (launch price) | $12.31 |
| Pi, GLM-5.3 | $1.40 / $0.26 / $4.40 (as logged by Pi) | $11.42 |

Questions to the coordinator during the run: Codex 3 (design edge cases, a test-position FEN, a test command), Pi 2 (a time budget backed by a measurement, a file-ownership exception).
