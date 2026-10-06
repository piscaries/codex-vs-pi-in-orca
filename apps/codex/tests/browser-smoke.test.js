import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function waitForLine(stream, pattern, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${pattern}: ${output}`)), timeoutMs);
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(pattern);
      if (!match) return;
      clearTimeout(timer);
      stream.off("data", onData);
      resolve(match);
    };
    stream.on("data", onData);
  });
}

function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 2_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

class DevTools {
  constructor(url) {
    this.sequence = 0;
    this.pending = new Map();
    this.events = [];
    this.socket = new WebSocket(url);
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data.toString());
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else {
        this.events.push(message);
      }
    });
  }

  async call(method, params = {}) {
    await this.opened;
    this.sequence += 1;
    const id = this.sequence;
    const response = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.socket.send(JSON.stringify({ id, method, params }));
    return response;
  }

  async evaluate(expression) {
    const result = await this.call("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  }

  close() {
    this.socket.close();
  }
}

async function waitFor(devtools, expression, timeoutMs = 5_000) {
  const deadline = performance.now() + timeoutMs;
  let lastValue;
  while (performance.now() < deadline) {
    lastValue = await devtools.evaluate(expression);
    if (lastValue) return lastValue;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${expression}; last value: ${JSON.stringify(lastValue)}`);
}

async function navigate(devtools, url) {
  await devtools.call("Page.navigate", { url });
  await waitFor(devtools, "document.readyState === 'complete' && window.__chessCoachReady === true");
}

test("the real browser app plays, teaches, promotes, resets, and stays responsive", { timeout: 30_000 }, async (t) => {
  const server = spawn(process.execPath, ["server.mjs", "--port", "0"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => stopProcess(server));
  const serverMatch = await waitForLine(server.stdout, /http:\/\/127\.0\.0\.1:(\d+)/);
  const origin = `http://127.0.0.1:${serverMatch[1]}`;

  const head = await fetch(origin, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.match(head.headers.get("content-security-policy"), /worker-src 'self'/);
  assert.equal((await fetch(`${origin}/missing`)).status, 404);
  assert.equal((await fetch(origin, { method: "POST" })).status, 405);

  const profile = await mkdtemp(join(tmpdir(), "chess-coach-chrome-"));
  t.after(() => rm(profile, { recursive: true, force: true }));
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--no-default-browser-check",
    "--no-first-run",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  t.after(() => stopProcess(chrome));
  const chromeMatch = await waitForLine(chrome.stderr, /DevTools listening on (ws:\/\/[^\s]+)/);
  const browserUrl = new URL(chromeMatch[1]);
  const target = await fetch(
    `http://${browserUrl.host}/json/new?${encodeURIComponent(origin)}`,
    { method: "PUT" },
  ).then((response) => response.json());
  const devtools = new DevTools(target.webSocketDebuggerUrl);
  t.after(() => devtools.close());
  await devtools.call("Page.enable");
  await devtools.call("Runtime.enable");
  await waitFor(devtools, "window.__chessCoachReady === true");

  const initial = await devtools.evaluate(`({
    squares: document.querySelectorAll('[data-square]').length,
    levels: document.querySelectorAll('#level option').length,
    turn: document.querySelector('#turn-indicator').textContent,
    pieces: [...document.querySelectorAll('[data-square]')].map((node) => node.textContent).join(''),
  })`);
  assert.deepEqual({ squares: initial.squares, levels: initial.levels, turn: initial.turn }, {
    squares: 64,
    levels: 3,
    turn: "Your turn",
  });

  await devtools.evaluate(`(() => {
    const level = document.querySelector('#level');
    level.value = 'challenging';
    level.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-square="e2"]').click();
  })()`);
  const destinations = await devtools.evaluate(`({
    selected: document.querySelector('[data-square="e2"]').classList.contains('selected'),
    e3: document.querySelector('[data-square="e3"]').classList.contains('destination'),
    e4: document.querySelector('[data-square="e4"]').classList.contains('destination'),
  })`);
  assert.deepEqual(destinations, { selected: true, e3: true, e4: true });

  const moveStarted = performance.now();
  const responsive = await devtools.evaluate(`new Promise((resolve) => {
    window.__responsiveTick = false;
    setTimeout(() => { window.__responsiveTick = true; }, 30);
    document.querySelector('[data-square="e4"]').click();
    setTimeout(() => resolve({
      tick: window.__responsiveTick,
      thinking: document.querySelector('#turn-indicator').textContent.includes('thinking'),
      disabled: document.querySelector('[data-square="e2"]').disabled,
    }), 100);
  })`);
  assert.deepEqual(responsive, { tick: true, thinking: true, disabled: true });

  await waitFor(
    devtools,
    `document.querySelector('#turn-indicator').textContent === 'Your turn'
      && !document.querySelector('#feedback h2').textContent.includes('Reviewing')`,
    3_000,
  );
  const replyElapsed = performance.now() - moveStarted;
  assert.ok(replyElapsed < 2_000, `computer reply took ${Math.round(replyElapsed)}ms`);
  const afterTurn = await devtools.evaluate(`({
    last: document.querySelectorAll('.last-move').length,
    verdict: document.querySelector('#feedback h2').textContent,
    feedback: document.querySelector('#feedback p').textContent,
    errorHidden: document.querySelector('#error').hidden,
    pieces: [...document.querySelectorAll('[data-square]')].map((node) => node.textContent).join(''),
  })`);
  assert.equal(afterTurn.last, 2);
  assert.match(afterTurn.verdict, /^(Best|Good|Inaccuracy|Mistake|Blunder)$/);
  assert.ok(afterTurn.feedback.length > 0);
  assert.equal(afterTurn.errorHidden, true);
  assert.notEqual(afterTurn.pieces, initial.pieces);

  const beforeHint = afterTurn.pieces;
  await devtools.evaluate("document.querySelector('#hint-button').click()");
  await waitFor(devtools, "!document.querySelector('#hint').textContent.includes('Looking')");
  const afterHint = await devtools.evaluate(`({
    hint: document.querySelector('#hint').textContent,
    pieces: [...document.querySelectorAll('[data-square]')].map((node) => node.textContent).join(''),
  })`);
  assert.match(afterHint.hint, /Consider moving your/);
  assert.equal(afterHint.pieces, beforeHint);

  await devtools.evaluate(`(() => {
    window.confirm = () => false;
    document.querySelector('#new-game').click();
  })()`);
  assert.equal(
    await devtools.evaluate("[...document.querySelectorAll('[data-square]')].map((node) => node.textContent).join('')"),
    beforeHint,
  );
  await devtools.evaluate(`(() => {
    window.confirm = () => true;
    document.querySelector('#new-game').click();
  })()`);
  assert.equal(await devtools.evaluate("document.querySelectorAll('.last-move').length"), 0);
  assert.equal(await devtools.evaluate("document.querySelector('[data-square=\"e2\"]').textContent.includes('♙')"), true);

  const promotionFen = encodeURIComponent("7k/P7/8/8/8/8/8/K7 w - - 0 1");
  await navigate(devtools, `${origin}/?test=1&fen=${promotionFen}`);
  await devtools.evaluate(`(() => {
    document.querySelector('[data-square="a7"]').click();
    document.querySelector('[data-square="a8"]').click();
  })()`);
  await waitFor(devtools, "document.querySelector('#promotion-dialog').open");
  await devtools.evaluate("document.querySelector('[data-promotion=\"q\"]').click()");
  await waitFor(devtools, "document.querySelector('[data-square=\"a8\"]').textContent.includes('♕')");
  assert.equal(await devtools.evaluate("document.querySelector('#promotion-dialog').open"), false);

  const mateFen = encodeURIComponent("7k/8/5KQ1/8/8/8/8/8 w - - 0 1");
  await navigate(devtools, `${origin}/?test=1&fen=${mateFen}`);
  await devtools.evaluate(`(() => {
    document.querySelector('[data-square="g6"]').click();
    document.querySelector('[data-square="g7"]').click();
  })()`);
  await waitFor(
    devtools,
    "document.querySelector('#turn-indicator').textContent === 'Game over'"
      + " && !document.querySelector('#recap-panel').hidden",
  );
  const ending = await devtools.evaluate(`({
    result: document.querySelector('#result').textContent,
    checked: document.querySelector('[data-square="h8"]').classList.contains('in-check'),
    recapVisible: !document.querySelector('#recap-panel').hidden,
    recap: document.querySelector('#recap').textContent,
    errorHidden: document.querySelector('#error').hidden,
  })`);
  assert.match(ending.result, /Checkmate — you win/);
  assert.equal(ending.checked, true);
  assert.equal(ending.recapVisible, true);
  assert.match(ending.recap, /avoided any major mistakes/i);
  assert.equal(ending.errorHidden, true);
});
