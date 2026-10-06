import { spawn } from 'node:child_process';
const [url] = process.argv.slice(2); const port = 9900 + Math.floor(Math.random()*90);
const c = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/m-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let ws, id = 0; const P = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; P.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
for (let i = 0; i < 50; i++) { try { const t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = t.find((x) => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
await new Promise((r) => (ws.onopen = r)); ws.onmessage = (e) => { const m = JSON.parse(e.data); if (P.has(m.id)) { P.get(m.id)(m.result); P.delete(m.id); } };
for (const [w, h] of [[1280, 860], [1440, 900], [800, 600]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url }); await sleep(2000);
  const r = await send('Runtime.evaluate', { returnByValue: true, expression: `['a1','a3','a4','a5','a8'].map(s=>{const e=document.querySelector('[data-square="'+s+'"]'); const b=e.getBoundingClientRect(); return s+':'+Math.round(b.width)+'x'+Math.round(b.height)+':'+getComputedStyle(e).backgroundColor}).join(' ')` });
  console.log(`${w}x${h}`, r.result.value);
}
ws.close(); c.kill();
