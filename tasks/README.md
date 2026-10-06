# Task messages

Every message sent to an agent, exactly as it was sent. Orca adds its own short preamble (task and dispatch IDs) in front of each one; that part is not included.

The agents and the reviewer only ever saw track labels: **t3 = Codex (GPT-5.6 Sol)**, **t2 = Pi (GLM-5.3)**. Track t1 was Codex on GPT-5.5 in the earlier run; its messages are in [`../runs/gpt-5.5/tasks/`](../runs/gpt-5.5/tasks/).

| File | Sent to | Stage |
| --- | --- | --- |
| `spec-t3.md`, `spec-t2.md` | author | product spec |
| `spec-review-t*.md` | reviewer | spec review |
| `design-t*.md` | author | engineering design and build plan |
| `design-review-t*.md` | reviewer | design review |
| `build-t*-P*.md` | author | one build phase each (Codex planned 5 phases, Pi 6) |
| `cr-t*-P*.md` | reviewer | code review of that phase |
| `acceptance-t*.md` | reviewer | acceptance review of the finished app |
| `judge-spec-*.md`, `judge-design-*.md`, `judge-product-*.md` | blind judges | 7 = Claude Opus 5.5, 8 = GPT-6.1 Sol, 9 = Claude Sonnet 5.5 (weaker comparison) |

Every review passed on the first round, so there are no rework messages.

**Regenerating them.** The author and reviewer messages come from `scripts/make-task.py`. For example:

```sh
ORCA_RUN=run_370854e5aac1 RUN_TRACKS="t3 and t2" scripts/make-task.py spec t3 693f48f   # = spec-t3.md
ORCA_RUN=run_31a428bb9cb0 RUN_TRACKS="t1 and t2" scripts/make-task.py spec t2 693f48f   # = spec-t2.md
```

The base and head commits for each message are the ones named inside it. The t3 and t2 messages differ only in the track label (also in the run note: "t3 and t2" against "t1 and t2"), the Run ID and the commits. The judge messages follow [`../eval/judging/rubrics.md`](../eval/judging/rubrics.md), with the brief and quality bar appended. Earlier rounds' judge messages are in [`../eval/judging/earlier/`](../eval/judging/earlier/).
