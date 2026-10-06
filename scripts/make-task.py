#!/usr/bin/env python3
"""Task generator used in the run. Every task message starts with the team charter and the role file,
so every harness receives its role in the same place. Prints the message; send it with
`orca orchestration worker-start --spec "$(scripts/make-task.py ...)"`.

Reads team/ and project/ from this repository. The messages refer to paths inside the agents'
workspace (projects/chess-coach/, docs/run5/, chess-coach/); see REPRODUCE.md for that layout.
Set ORCA_RUN to your Orca Run ID and RUN_TRACKS to the two track labels (default 't1 and t2').

usage:
  scripts/make-task.py spec <track> <base>
  scripts/make-task.py spec-review <track> <base>
  scripts/make-task.py design <track> <base>
  scripts/make-task.py design-review <track> <base>
  scripts/make-task.py rework <track> <base> <kind: spec|design> <review-file>
  scripts/make-task.py build <track> <base> <phase>
  scripts/make-task.py code-review <track> <base> <head> <phase> [round]
  scripts/make-task.py code-rework <track> <base> <phase> <review-file>
  scripts/make-task.py acceptance <track> <base>
  scripts/make-task.py judge <kind: spec|design> <n> <base>   (round-1 judge prompt, superseded; round 2 used
                                                    eval/judging/earlier/round-2/judge-prompt.md, round 3 eval/judging/rubrics.md)
"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN = os.environ.get('ORCA_RUN', '<orca-run-id>')
# The run note names both tracks: 't1 and t2' for the first run, 't3 and t2' for the GPT-5.6 Sol rerun.
TRACKS = os.environ.get('RUN_TRACKS', 't1 and t2')

def read(p):
    return open(f'{ROOT}/{p}').read().strip()

def role(name):
    return (read('team/TEAM.md') + '\n\n' + read(f'team/{name}.md') + '\n\n'
            '## Run 5 note (applies to everything above)\n'
            f'This run has two independent tracks, {TRACKS}. Each track builds the whole product from its own spec and design. '
            'There is no merging and no competing round inside a track: the reviewer reviews one document or one change and returns '
            'ACCEPT/PASS or REWORK with specific findings. Never look at other worktrees, other branches, ~/orca/workspaces, or the other track\'s files.\n\n'
            '---\n\n')

def project():
    return read('project/brief.md') + '\n\n' + read('project/quality-bar.md')

SPEC_RUBRIC = """## Rubric (100)
- User value and clarity of the problem: 20
- Stories and acceptance scenarios that are independently testable: 20
- Requirements that are complete, testable, and free of implementation detail: 20
- Quality bar turned into checkable criteria: 20
- Scope discipline (non-goals, edge cases, assumptions): 20"""
DESIGN_RUBRIC = """## Rubric (100)
- Traceability to the spec (every FR/SC has a phase and a check): 20
- Soundness of architecture and contracts: 20
- Phase ownership, dependencies, and safe parallelism: 20
- Checks that actually prove behavior, plus quality-bar verification: 20
- Grounding in the real codebase, risks, and effort realism: 20"""

def envelope(track, base, lines):
    return '\n# Envelope\n' + '\n'.join(f'- {l}' for l in [
        f'Run: {RUN} (task and dispatch IDs are in your Orca preamble) · Track: {track}',
        f'Workspace: your own Orca worktree on branch run5-{track}, base commit {base}'] + lines)

DONE = 'When finished: commit only the files named above, send worker_done with --report-path set to the absolute path of your output, and end with the handoff block from the team charter.'

def main(a):
    if not a:
        sys.exit(__doc__)
    kind = a[0]
    if kind == 'spec':
        track, base = a[1:3]
        return (role('product-designer') + '# Task: write the product spec\n\n' + project() + '\n\n' + SPEC_RUBRIC +
                '\n\nThe "Fixed testing interface" in the brief is an owner constraint, not an implementation choice; your spec may refer to it.' +
                envelope(track, base, ['Output: docs/run5/spec.md (write nothing else). The repository has no chess code yet.',
                                       'Budget: about 25 minutes; under 1,200 words.', DONE]))
    if kind == 'spec-review':
        track, base = a[1:3]
        return (role('spec-reviewer') + '# Task: review one product spec\n\n'
                'Review docs/run5/spec.md against the brief, the quality bar and the rubric below. Score it with evidence, list fatal problems, '
                'and give a verdict: ACCEPT, or REWORK with each required change stated precisely. Do not rewrite the spec yourself.\n\n' +
                project() + '\n\n' + SPEC_RUBRIC +
                envelope(track, base, ['Output: docs/run5/spec-review.md with headings Verdict, Scores, Fatal problems, Required changes, Optional suggestions. Commit only that file.',
                                       'Budget: about 20 minutes.', 'Send worker_done with --report-path; put the verdict on the first line of your summary. End with the handoff block.']))
    if kind == 'design':
        track, base = a[1:3]
        return (role('engineering-designer') + '# Task: write the engineering design and build plan\n\n'
                'Design from your track\'s accepted spec, docs/run5/spec.md, plus the brief and quality bar below.\n\n' + project() + '\n\n' + DESIGN_RUBRIC +
                envelope(track, base, ['Output: docs/run5/design.md (write nothing else). New code goes under chess-coach/.',
                                       'Builders: the same agent as you will build every phase of this track, one phase per task, and each phase gets a code review before the next starts. Phases may run in parallel only if they own disjoint files.',
                                       'Give every phase a short ID (P0, P1, ...), its owned files, a check command and a done-when.',
                                       'Budget: about 30 minutes; under 1,500 words.', DONE]))
    if kind == 'design-review':
        track, base = a[1:3]
        return (role('engineering-reviewer') + '# Task: review one engineering design\n\n'
                'Review docs/run5/design.md against your track\'s accepted spec (docs/run5/spec.md), the brief, the quality bar and the rubric. Verify its claims about the environment where it matters. '
                'Score it with evidence, list fatal problems, and give a verdict: ACCEPT, or REWORK with each required change stated precisely. Do not rewrite the design yourself.\n\n' +
                project() + '\n\n' + DESIGN_RUBRIC +
                envelope(track, base, ['Output: docs/run5/design-review.md with headings Verdict, Verified facts and errors, Scores, Fatal problems, Required changes, Optional suggestions. Commit only that file.',
                                       'Budget: about 25 minutes.', 'Send worker_done with --report-path; put the verdict on the first line of your summary. End with the handoff block.']))
    if kind == 'rework':
        track, base, what, review = a[1:5]
        doc = f'docs/run5/{what}.md'
        return ('# Task: revise your ' + ('product spec' if what == 'spec' else 'engineering design') + ' (review verdict: REWORK)\n\n'
                f'The reviewer returned REWORK on {doc}. Apply every required change below; keep everything else unless a change requires it. '
                'Optional suggestions are yours to take or leave; say which you took.\n\n## Review\n\n' + open(review).read().strip() +
                envelope(track, base, [f'Output: an updated {doc} (write nothing else); same length limit as before.', DONE]))
    if kind == 'build':
        track, base, phase = a[1:4]
        return (role('builder') + f'# Task: build phase {phase}\n\n'
                f'Implement exactly phase {phase} of your track\'s accepted design, docs/run5/design.md (its contracts are binding). '
                'The accepted spec is docs/run5/spec.md; the brief and quality bar are in projects/chess-coach/.\n\n'
                'The owner runs a separate acceptance suite against the fixed testing interface in the brief. Builders do not see it.' +
                envelope(track, base, [f'Owned files: exactly those your design lists for {phase}. Ask the coordinator before touching anything else.',
                                       'Checks: the phase check from your design, plus the full test command of your project; all must pass.',
                                       f'Report: docs/run5/phase-{phase}.md (what you built, decisions, checks and results, limits).',
                                       'Commit the phase as one commit. Send worker_done with --files-modified and --report-path, and end with the handoff block.']))
    if kind == 'code-review':
        track, base, head, phase = a[1:5]
        rnd = a[5] if len(a) > 5 else '1'
        out = f'docs/run5/review-{phase}' + ('' if rnd == '1' else f'-r{rnd}') + '.md'
        return (role('code-reviewer') + f'# Task: code review of phase {phase}' + ('' if rnd == '1' else f' (round {rnd}, after rework)') + '\n\n'
                f'- Change: commits {base}..{head} in this worktree (git diff {base}..{head}). The builder\'s report is docs/run5/phase-{phase}.md.\n'
                f'- The track\'s accepted design is docs/run5/design.md (the row for {phase} and the contracts); accepted spec docs/run5/spec.md; quality bar projects/chess-coach/quality-bar.md.\n'
                + ('- This is a re-review: earlier reviews of this phase are in docs/run5/review-' + phase + '*.md. Check their blocking findings are fixed, then review the whole phase again.\n' if rnd != '1' else '') +
                envelope(track, head, ['Run the phase check and the project\'s full test command yourself. If the phase has a user interface, run it.',
                                       f'Output: {out} using the output block in your role prompt. Commit only that file.',
                                       'Send worker_done with --outcome succeeded and --report-path; put the verdict (PASS / REWORK / BLOCKED) on the first line of your summary. End with the handoff block.']))
    if kind == 'code-rework':
        track, base, phase, review = a[1:5]
        return (f'# Task: rework phase {phase} (code review verdict: REWORK)\n\n'
                f'Fix every blocking finding below in phase {phase}; keep everything else unchanged. Add or fix a test so each finding cannot regress silently.\n\n## Review\n\n'
                + open(review).read().strip() +
                envelope(track, base, [f'Owned files: the files of phase {phase} in your design, plus docs/run5/phase-{phase}.md (add a "Rework" section).',
                                       'Checks: the phase check and the project\'s full test command must pass.',
                                       'Commit the rework as one commit. Send worker_done with --files-modified and --report-path, and end with the handoff block.']))
    if kind == 'acceptance':
        track, base = a[1:3]
        return (role('acceptance-reviewer') + '# Task: acceptance review of Chess Coach\n\n'
                'Judge the finished product of this track the way its user would: an adult beginner under ~1200 who wants to play real games and learn from each mistake.\n\n'
                '- Start the product as its README or design says. Google Chrome is installed and can be driven headless (for example over the DevTools protocol with plain Node).\n'
                '- Accepted spec: docs/run5/spec.md. Quality bar and brief: projects/chess-coach/. Code reviews and phase reports in docs/run5/ are context only.\n\n'
                'What to do:\n1. Play at least two complete games in Chrome through the UI as a beginner would, at two different levels, including at least one deliberate blunder and one hint request. Use real clicks or DOM events on the board.\n'
                '2. Read every coach comment shown. Quote any that are false, confusing, or missing a reason or better move.\n'
                '3. Check every quality-bar item (1–9) and every P1 acceptance scenario of the spec against what you saw.\n'
                '4. Check the end-of-game review against the game.\n'
                '5. Save at least three screenshots (start, a coach comment after a mistake, the end-of-game review) under docs/run5/acceptance/ and reference them.' +
                envelope(track, base, ['Output: docs/run5/acceptance-review.md with the output block from your role prompt, plus the screenshots. Commit only those files.',
                                       'worker_done with --outcome succeeded and --report-path; verdict (ACCEPT / REWORK / BLOCKED) on the first line of your summary. End with the handoff block.']))
    if kind == 'judge':
        what, n, base = a[1:4]
        noun = 'product specs' if what == 'spec' else 'engineering designs and build plans'
        return (role('spec-reviewer' if what == 'spec' else 'engineering-reviewer') +
                f'# Task: independent blind scoring of two {noun} (scoring only)\n\n'
                f'You are an independent judge. Score only: do not merge, rewrite, or review for acceptance. The two packets are docs/run5/{what}-rescore/A.md and B.md'
                + (' (each design was written for its own spec, included at the top of its packet)' if what == 'design' else '') +
                '. Score each independently on the rubric. Do not look for authors, other folders, other worktrees, branches, or git history.\n\n' +
                project() + '\n\n' + (SPEC_RUBRIC if what == 'spec' else DESIGN_RUBRIC) +
                f'\n\n# Output (docs/run5/{what}-judge-{n}.md)\n1. A score table: packet × rubric line, each cell with the score and a one-line quote or omission as evidence.\n'
                '2. Totals and which packet is stronger overall.\n3. For each rubric line, which packet is better and why (one line each).\n'
                '4. Two or three sentences: if you had to build from one packet, which and why.'
                f'\n\n# Envelope\n- Run: {RUN} (IDs in your Orca preamble) · Base commit {base} · Budget about 20 minutes\n'
                f'- Commit only docs/run5/{what}-judge-{n}.md, send worker_done with --report-path, and end with the handoff block.')
    sys.exit('unknown kind')

if __name__ == '__main__':
    print(main(sys.argv[1:]))
