#!/usr/bin/env python3
"""Token usage and active time for one agent session, read from the harness's own log.

usage: scripts/agent-usage.py <harness> <worktree-path> [--since ISO-8601]

Finds the session log whose working directory is <worktree-path>:
  claude  ~/.claude/projects/<path with / and . as ->/*.jsonl
  codex   $CODEX_HOME, ~/.codex or ~/.codex-clean (set CODEX_HOME to the clean home the agent ran with) sessions/**/rollout-*.jsonl whose session_meta cwd matches
  pi      ~/.pi/agent/sessions/--<path with / as ->--/*.jsonl
and prints one JSON object. Input tokens are split into uncached and cached,
because cached reads dominate long sessions and are priced far lower.
Messages before --since (the Orca dispatch time) are ignored, so a priming message is not counted.
"""
import glob, json, os, sys
from datetime import datetime

def ts(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))

def lines(path):
    with open(path) as f:
        for line in f:
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                pass

def claude(wt, since):
    d = os.path.expanduser('~/.claude/projects/' + wt.replace('/', '-').replace('.', '-'))
    seen, out = set(), dict(uncached=0, cache_write=0, cached=0, output=0, models=set(), times=[])
    for p in glob.glob(d + '/*.jsonl'):
        for e in lines(p):
            if e.get('type') != 'assistant' or (since and ts(e['timestamp']) < since):
                continue
            m = e['message']
            key = (m.get('id'), e.get('requestId'))
            if key in seen:
                continue
            seen.add(key)
            u = m.get('usage') or {}
            out['uncached'] += u.get('input_tokens', 0)
            out['cache_write'] += u.get('cache_creation_input_tokens', 0)
            out['cached'] += u.get('cache_read_input_tokens', 0)
            out['output'] += u.get('output_tokens', 0)
            out['models'].add(m.get('model'))
            out['times'].append(ts(e['timestamp']))
    return out

def codex(wt, since):
    out = dict(uncached=0, cache_write=0, cached=0, output=0, reasoning=0, models=set(), times=[])
    homes = [os.environ.get('CODEX_HOME', ''), '~/.codex', '~/.codex-clean']
    files = sorted({f for h in homes if h for f in glob.glob(os.path.expanduser(h + '/sessions/*/*/*/rollout-*.jsonl'))})
    for p in files:
        es = list(lines(p))
        meta = next((e for e in es if e.get('type') == 'session_meta'), None)
        if not meta or meta['payload'].get('cwd') != wt:
            continue
        base = None
        for e in es:
            t = ts(e['timestamp'])
            pl = e.get('payload', {})
            if e.get('type') == 'turn_context' and pl.get('model'):
                out['models'].add(pl['model'])
            if pl.get('type') != 'token_count' or not pl.get('info'):
                continue
            tot = pl['info']['total_token_usage']
            if since and t < since:
                base = tot  # usage before the dispatch, subtracted below
                continue
            last = tot
            out['times'].append(t)
        if out['times']:
            b = base or {}
            g = lambda k: last.get(k, 0) - b.get(k, 0)
            out['cached'] += g('cached_input_tokens')
            out['uncached'] += g('input_tokens') - g('cached_input_tokens')
            out['output'] += g('output_tokens')
            out['reasoning'] += g('reasoning_output_tokens')
    return out

def pi(wt, since):
    d = os.path.expanduser('~/.pi/agent/sessions/--' + wt.strip('/').replace('/', '-') + '--')
    out = dict(uncached=0, cache_write=0, cached=0, output=0, reasoning=0, cost_usd=0.0, models=set(), times=[])
    for p in glob.glob(d + '/*.jsonl'):
        for e in lines(p):
            m = e.get('message', {})
            if e.get('type') != 'message' or m.get('role') != 'assistant' or (since and ts(e['timestamp']) < since):
                continue
            u = m.get('usage') or {}
            out['uncached'] += u.get('input', 0)
            out['cache_write'] += u.get('cacheWrite', 0)
            out['cached'] += u.get('cacheRead', 0)
            out['output'] += u.get('output', 0)
            out['reasoning'] += u.get('reasoning', 0)
            out['cost_usd'] += (u.get('cost') or {}).get('total', 0)
            out['models'].add(m.get('provider', '') + '/' + m.get('model', ''))
            out['times'].append(ts(e['timestamp']))
    return out

if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] in ('-h', '--help'):
        sys.exit(__doc__)
    harness, wt = sys.argv[1], os.path.abspath(sys.argv[2])
    since = ts(sys.argv[sys.argv.index('--since') + 1]) if '--since' in sys.argv else None
    r = {'claude': claude, 'codex': codex, 'pi': pi}[harness](wt, since)
    t = r.pop('times')
    r['models'] = sorted(x for x in r['models'] if x)
    r['first'] = min(t).isoformat() if t else None
    r['last'] = max(t).isoformat() if t else None
    r['active_minutes'] = round((max(t) - min(t)).total_seconds() / 60, 1) if t else 0
    if 'cost_usd' in r:
        r['cost_usd'] = round(r['cost_usd'], 4)
    print(json.dumps({'harness': harness, 'worktree': wt, **r}))
