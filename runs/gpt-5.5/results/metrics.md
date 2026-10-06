# Run 5 metrics per worktree

From each harness's own session log (`scripts/agent-usage.py`), messages after the worktree's first dispatch. Active minutes = first to last logged message, so they include time spent waiting for the coordinator. Cost appears only where the harness logs it (Pi). Codex and Claude ran on subscriptions.

| Worktree | Track | Stage | Harness · model | Active min | Uncached in | Cached in | Output | Cost (log) |
|---|---|---|---|---|---|---|---|---|
| r5-t1-spec | t1 | spec | codex · gpt-5.5 | 3.3 | 33,401 | 514,432 | 10,308 | — |
| r5-t2-spec | t2 | spec | pi · zai-coding-cn/glm-5.3 | 7.2 | 46,502 | 1,083,968 | 35,331 | $0.50 |
| r5-t1-spec-review | t1 | review | claude · claude-opus-4-6 | 2.3 | 8 | 165,182 | 5,176 | — |
| r5-t1-design | t1 | design | codex · gpt-5.5 | 3.3 | 58,232 | 591,104 | 10,404 | — |
| r5-t2-spec-review | t2 | review | claude · claude-opus-4-6 | 1.8 | 10 | 243,774 | 3,994 | — |
| r5-t2-design | t2 | design | pi · zai-coding-cn/glm-5.3 | 3.5 | 21,870 | 301,952 | 12,191 | $0.16 |
| r5-t1-design-review | t1 | review | claude · claude-opus-4-6 | 2.8 | 12 | 352,491 | 6,592 | — |
| r5-spec-judge-1 | — | judge | claude · claude-sonnet-5-5 | 0.5 | 8 | 103,061 | 2,962 | — |
| r5-spec-judge-2 | — | judge | codex · gpt-5.6-sol | 2.0 | 19,603 | 267,904 | 4,469 | — |
| r5-spec-judge-3 | — | judge | pi · zai-coding-cn/glm-5.3 | 1.8 | 15,915 | 87,616 | 7,723 | $0.08 |
| r5-t2-design-review | t2 | review | claude · claude-opus-4-6 | 1.8 | 12 | 347,064 | 4,608 | — |
| r5-t1-p0 | t1 | build | codex · gpt-5.5 | 7.6 | 100,216 | 1,876,736 | 22,349 | — |
| r5-t2-p0 | t2 | build | pi · zai-coding-cn/glm-5.3 | 9.8 | 63,105 | 951,808 | 46,166 | $0.54 |
| r5-design-judge-1 | — | judge | claude · claude-sonnet-5-5 | 0.6 | 10 | 149,284 | 4,190 | — |
| r5-design-judge-2 | — | judge | codex · gpt-5.6-sol | 1.9 | 41,486 | 587,008 | 9,006 | — |
| r5-design-judge-3 | — | judge | pi · zai-coding-cn/glm-5.3 | 3.4 | 27,175 | 324,928 | 12,707 | $0.18 |
| r5-t1-cr-p0 | t1 | code review | claude · claude-opus-4-6 | 3.3 | 14 | 585,955 | 8,327 | — |
| r5-t2-cr-p0 | t2 | code review | claude · claude-opus-4-6 | 2.1 | 12 | 461,153 | 4,562 | — |
| r5-t2-p1 | t2 | build | pi · zai-coding-cn/glm-5.3 | 9.6 | 68,439 | 1,238,336 | 47,075 | $0.62 |
| r5-t1-p1 | t1 | build | codex · gpt-5.5 | 5.3 | 66,131 | 796,032 | 16,460 | — |
| r5-t1-cr-p1 | t1 | code review | claude · claude-opus-4-6 | 2.6 | 12 | 404,206 | 5,530 | — |
| r5-t1-p2 | t1 | build | codex · gpt-5.5 | 10.1 | 176,332 | 2,463,104 | 25,685 | — |
| r5-t2-cr-p1 | t2 | code review | claude · claude-opus-4-6 | 2.4 | 14 | 577,219 | 5,163 | — |
| r5-t2-p2 | t2 | build | pi · zai-coding-cn/glm-5.3 | 35.0 | 104,042 | 3,763,200 | 76,730 | $1.46 |
| r5-t1-cr-p2 | t1 | code review | claude · claude-opus-4-6 | 2.8 | 16 | 650,911 | 5,575 | — |
| r5-t1-p3 | t1 | build | codex · gpt-5.5 | 28.1 | 227,533 | 4,396,544 | 23,939 | — |
| r5-t2-cr-p2 | t2 | code review | claude · claude-opus-4-6 | 8.1 | 13 | 570,017 | 9,666 | — |
| r5-t1-cr-p3 | t1 | code review | claude · claude-opus-4-6 | 1.5 | 12 | 371,052 | 3,093 | — |
| r5-t1-acceptance | t1 | acceptance | claude · claude-opus-4-6 | 12.7 | 29 | 1,553,491 | 25,631 | — |
| r5-t2-p3 | t2 | build | pi · zai-coding-cn/glm-5.3 | 40.3 | 154,938 | 5,800,576 | 108,321 | $2.20 |
| r5-t2-cr-p3 | t2 | code review | claude · claude-opus-4-6 | 3.8 | 15 | 661,029 | 6,423 | — |
| r5-t2-p4 | t2 | build | pi · zai-coding-cn/glm-5.3 | 78.4 | 182,447 | 11,036,864 | 135,288 | $3.72 |
| r5-t2-cr-p4 | t2 | code review | claude · claude-opus-4-6 | 6.0 | 28 | 1,573,857 | 6,663 | — |
| r5-t2-p5 | t2 | build | pi · zai-coding-cn/glm-5.3 | 33.5 | 120,689 | 6,477,440 | 79,541 | $2.20 |
| r5-t2-cr-p5 | t2 | code review | claude · claude-opus-4-6 | 2.6 | 14 | 677,908 | 4,644 | — |
| r5-t2-acceptance | t2 | acceptance | claude · claude-opus-4-6 | 7.9 | 39 | 2,562,915 | 19,906 | — |

## Author totals per track (spec + design + build worktrees, including rework)

| Track | Harness | Worktrees | Active min (spec / design / build) | Uncached in | Cached in | Output | Cost (log) |
|---|---|---|---|---|---|---|---|
| t1 | codex | 6 | 57.7 (3.3 / 3.3 / 51.1) | 661,845 | 10,637,952 | 109,145 | — |
| t2 | pi | 8 | 217.3 (7.2 / 3.5 / 206.6) | 762,032 | 30,654,144 | 540,643 | $11.42 |
