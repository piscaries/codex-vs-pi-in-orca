// Engine match runner (owner-only), run 5: also records every move and position. Plays engine A against engine B from fixed openings, both colors.
// usage: node match.mjs <engineA.js> <engineB.js> [timeMs=200] [maxPlies=160] > result.json
// Legality is refereed by BOTH engines: a move must be legal according to the referee engine (A's rules
// unless REFEREE=B). An illegal move, an exception, or no move loses the game.
import { pathToFileURL } from 'node:url';

const [pa, pb, tArg, pArg] = process.argv.slice(2);
const A = await import(pathToFileURL(pa).href), B = await import(pathToFileURL(pb).href);
const R = process.env.REFEREE === 'B' ? B : A;
const timeMs = Number(tArg || 200), maxPlies = Number(pArg || 160);
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OPENINGS = [
  'e2e4 e7e5 g1f3 b8c6', 'd2d4 d7d5 c2c4 e7e6', 'e2e4 c7c5 g1f3 d7d6', 'e2e4 e7e6 d2d4 d7d5',
  'e2e4 c7c6 d2d4 d7d5', 'd2d4 g8f6 c2c4 g7g6', 'c2c4 e7e5 b1c3 g8f6', 'g1f3 d7d5 g2g3 g8f6',
  'e2e4 e7e5 f1c4 g8f6', 'd2d4 d7d5 c1f4 g8f6',
];
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');

function play(white, black, opening) {
  let fen = START;
  for (const m of opening.split(' ')) fen = R.applyMove(fen, m);
  const seen = new Map([[key(fen), 1]]);
  const moves = [], fens = [], times = { w: [], b: [] };
  for (let ply = 0; ply < maxPlies; ply++) {
    const st = R.gameStatus(fen);
    if (st === 'checkmate') return { result: fen.split(' ')[1] === 'w' ? '0-1' : '1-0', reason: 'checkmate', moves, fens, times };
    if (st !== 'ongoing') return { result: '1/2-1/2', reason: st, moves, fens, times };
    const side = fen.split(' ')[1], eng = side === 'w' ? white : black;
    let m, t = Date.now();
    try { m = eng.mod.bestMove(fen, { timeMs }); } catch (e) { return { result: side === 'w' ? '0-1' : '1-0', reason: `${eng.name} threw: ${e.message}`, moves, fens, times }; }
    times[side].push(Date.now() - t);
    if (!R.legalMoves(fen).includes(m)) return { result: side === 'w' ? '0-1' : '1-0', reason: `${eng.name} illegal move ${m}`, fen, moves, fens, times };
    moves.push(m);
    fen = R.applyMove(fen, m); fens.push(fen);
    const k = key(fen); seen.set(k, (seen.get(k) || 0) + 1);
    if (seen.get(k) >= 3) return { result: '1/2-1/2', reason: 'threefold', moves, fens, times };
  }
  return { result: '1/2-1/2', reason: 'ply limit', moves, fens, times };
}

const ea = { name: 'A', mod: A }, eb = { name: 'B', mod: B };
const games = [];
let score = { A: 0, B: 0 };
for (const op of OPENINGS) for (const [w, b] of [[ea, eb], [eb, ea]]) {
  const g = play(w, b, op);
  const pts = g.result === '1-0' ? [1, 0] : g.result === '0-1' ? [0, 1] : [0.5, 0.5];
  score[w.name] += pts[0]; score[b.name] += pts[1];
  const avg = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
  games.push({ moves: g.moves, fens: g.fens, startFen: (()=>{let f=START; for (const m of op.split(' ')) f=R.applyMove(f,m); return f;})(), opening: op, white: w.name, black: b.name, result: g.result, reason: g.reason, plies: g.moves.length, avgMsWhite: avg(g.times.w), avgMsBlack: avg(g.times.b), maxMs: Math.max(0, ...g.times.w, ...g.times.b) });
  process.stderr.write(`${op} | ${w.name} vs ${b.name}: ${g.result} (${g.reason}, ${g.moves.length} plies)\n`);
}
console.log(JSON.stringify({ engineA: pa, engineB: pb, timeMs, maxPlies, referee: R === A ? 'A' : 'B', score, games }, null, 2));
