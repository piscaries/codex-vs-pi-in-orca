#!/usr/bin/env bash
# Headless-Chrome smoke test for the Chess Coach app (phase P4, design §5/§6).
#
# Loads index.html twice — once over file:// (Chrome needs
# --allow-file-access-from-files for ES modules there) and once over a local
# static server (no special flags) — and asserts for each:
#   1. the app booted: the body carries data-coach-boot="ready";
#   2. the board rendered: exactly 64 squares and the 32 opening pieces;
#   3. zero console/runtime errors, collected in the page itself by the
#      inline collector in index.html (Chrome's own stderr is too noisy to
#      use as a signal).
#
# Note: this Chrome build does not exit after --dump-dom, so the script runs
# it in the background, waits for the closing </html>, then kills it.
# Exits non-zero on any failure.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)" # chess-coach/
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PAGE="index.html"

if [ ! -x "$CHROME" ]; then
  echo "ui-smoke: Chrome not found at $CHROME (set CHROME=... to override)"
  exit 2
fi

# run_chrome <url> [extra flags...] — prints the dumped DOM on stdout.
run_chrome() {
  local url="$1"
  shift
  local out prof pid i
  out="$(mktemp)"
  prof="$(mktemp -d)"
  "$CHROME" --headless --disable-gpu --no-first-run --no-default-browser-check \
    --user-data-dir="$prof" --virtual-time-budget=4000 "$@" --dump-dom "$url" \
    >"$out" 2>/dev/null &
  pid=$!
  for i in $(seq 1 60); do
    grep -q '</html>' "$out" 2>/dev/null && break
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.25
  done
  kill -9 "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  rm -rf "$prof"
  cat "$out"
  rm -f "$out"
}

# check_dom <label> <dom> — asserts the booted, rendered, error-free app.
check_dom() {
  local label="$1" dom="$2" failures=0 squares pieces errors boot
  boot="$(printf '%s' "$dom" | grep -c 'data-coach-boot="ready"')"
  squares="$(printf '%s' "$dom" | grep -o 'data-square="[a-h][1-8]"' | sort -u | wc -l | tr -d ' ')"
  pieces="$(printf '%s' "$dom" | grep -o 'class="piece \(white\|black\)"' | wc -l | tr -d ' ')"
  errors="$(printf '%s' "$dom" | sed -n 's/.*<div id="smoke-errors"[^>]*>\(.*\)<\/div>.*/\1/p' | head -1)"

  if [ "$boot" != "1" ]; then
    echo "ui-smoke FAIL [$label]: boot sentinel missing (modules or boot failed)"
    failures=1
  fi
  if [ "$squares" != "64" ]; then
    echo "ui-smoke FAIL [$label]: $squares unique squares rendered, expected 64"
    failures=1
  fi
  if [ "$pieces" != "32" ]; then
    echo "ui-smoke FAIL [$label]: $pieces pieces rendered, expected 32 in the opening position"
    failures=1
  fi
  if [ "$errors" != "[]" ]; then
    echo "ui-smoke FAIL [$label]: console/runtime errors recorded: $errors"
    failures=1
  fi
  if [ "$failures" = "0" ]; then
    echo "ui-smoke ok [$label]: booted, 64 squares, 32 pieces, no console errors"
  fi
  return "$failures"
}

status=0

# --- file:// (requires Chrome's module-access flag) ---
dom_file="$(run_chrome "file://$ROOT/$PAGE" --allow-file-access-from-files)"
check_dom "file://" "$dom_file" || status=1

# --- local static server (no flags; how the demo can also run) ---
server_log="$(mktemp)"
node -e '
const http = require("http");
const fs = require("fs");
const path = require("path");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const root = process.argv[1];
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  fs.readFile(path.join(root, p), (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});
server.listen(0, "127.0.0.1", () => console.log(server.address().port));
' "$ROOT" >"$server_log" 2>/dev/null &
server_pid=$!
port=""
for i in $(seq 1 20); do
  port="$(head -1 "$server_log" 2>/dev/null | tr -dc '0-9')"
  [ -n "$port" ] && break
  sleep 0.25
done
if [ -z "$port" ]; then
  echo "ui-smoke FAIL [http://]: static server did not start"
  status=1
else
  dom_http="$(run_chrome "http://127.0.0.1:$port/$PAGE")"
  check_dom "http://127.0.0.1:$port" "$dom_http" || status=1
fi
kill "$server_pid" 2>/dev/null
wait "$server_pid" 2>/dev/null
rm -f "$server_log"

if [ "$status" = "0" ]; then
  echo "ui-smoke: PASS"
fi
exit "$status"
