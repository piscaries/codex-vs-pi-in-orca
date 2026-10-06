// Same coaching positions as the run-5 comparison: hung queen, mate in one, weak first move, and 1.e4 then 2.Ba6.
import { pathToFileURL } from 'node:url';
const E = await import(pathToFileURL(process.argv[2]).href);
const cases = [
  ['Qd4?? (queen hangs to c5 pawn)', '4k3/8/8/2p5/8/8/8/3QK3 w - - 0 1', 'd1d4'],
  ['Qxf7# (mate)', 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7'],
  ['1.g4', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'g2g4'],
  ['2.Ba6 after 1.e4 e5', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'f1a6'],
];
for (const [name, fen, uci] of cases) {
  const times = []; let r;
  for (let i = 0; i < 5; i++) { const t = performance.now(); r = E.reviewMove(fen, uci); times.push(Math.round(performance.now() - t)); }
  console.log(JSON.stringify({ name, verdict: r.verdict, reasons: r.reasons, betterMove: r.betterMove, ms: times }));
}
