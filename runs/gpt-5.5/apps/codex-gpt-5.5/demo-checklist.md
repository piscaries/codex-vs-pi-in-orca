# Chess Coach demo checklist

## Local run
- Served `chess-coach/` with `python3 -m http.server 8766 --directory chess-coach` because port 8765 was already in use.
- Opened `http://127.0.0.1:8766/index.html` in headless Google Chrome.
- Drove the real page through Chrome DevTools Protocol, rendered the final game state through the app modules, and captured screenshot artifact at `/tmp/chess-coach-p3-demo.png`.

## Recorded game
- Level: Easy.
- Hint before moving: visible; the rendered demo records legal hint `b1c3`.
- Moves played: `f2f3 e7e5 g2g4 d8h4`.
- Result: checkmate, with the board showing White in check and last move `d8h4`.
- Coach comments: visible after user moves; `g2g4` was reviewed as a blunder because it lets Black deliver checkmate with `d8h4`.
- End review: listed the stored `g2g4` review with the same verdict, reason, and better move as the move-time comment.

## Notes
- The scripted demo uses the app state helpers for the forced black replies so the integration check is deterministic.
- The browser smoke verifies the static page loads locally without network, accounts, or build steps.
