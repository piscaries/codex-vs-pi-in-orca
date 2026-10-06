// App boot for Chess Coach (phase P4, extended in phase P5): wires the game
// core (game.js), the board (board-ui.js), the coach panel (coach-panel.js)
// and the end-of-game review panel (review-panel.js) together, and owns
// click-to-move selection.
//
// Phase P5 adds the game-level controls the spec asks for: a new game
// without reloading (P2-1), the side choice with the board turned to face
// the user (P2-2), and — through the review panel — the copyable transcript
// (P3-1). newGame() disposes the running game (its pending scheduler work
// stops) and re-boots the same wiring; boot({fen}) is honored for the first
// game only, so re-boots always start a fresh standard game.
//
// boot() renders synchronously, so scripts/ui-smoke.sh can assert the board
// right after load. The returned controller exposes the current game/board/
// panels (live across new games) plus newGame() for tests and the demo.

import { LEVELS } from '../engine/levels.js';
import { legalMoves } from '../engine/index.js';
import { parseFen, sqIndex, colorOf, WHITE, BLACK } from '../engine/board.js';
import { createGame, moveWords } from './game.js';
import { createBoardUi } from './board-ui.js';
import { createCoachPanel } from './coach-panel.js';
import { createReviewPanel } from './review-panel.js';

const COLOR_NAMES = { w: 'white', b: 'black' };

export function boot(options = {}) {
  const {
    boardRoot = document.getElementById('board'),
    panelRoot = document.getElementById('panel'),
    controlsRoot = document.getElementById('game-controls'),
    fen,
    level = 1,
    userColor = WHITE,
    schedule,
    now,
    random,
  } = options;

  let snap = null;
  let selected = null; // selected square name, or null
  let current = null; // { game, board, panel, review }

  // ---------------------------------------------- game controls (P2-1/P2-2)
  // New game + the side choice live in the topbar, always reachable. The
  // side choice applies to the next game: it never interrupts a running one.
  if (controlsRoot !== null) {
    controlsRoot.replaceChildren();
    const sideLabel = document.createElement('label');
    sideLabel.htmlFor = 'side-select';
    sideLabel.textContent = 'You play';
    const sideSelect = document.createElement('select');
    sideSelect.id = 'side-select';
    sideSelect.title = 'Takes effect when you start a new game.';
    for (const color of [WHITE, BLACK]) {
      const option = document.createElement('option');
      option.value = color;
      option.textContent = color === WHITE ? 'White' : 'Black';
      sideSelect.appendChild(option);
    }
    sideSelect.value = userColor;
    const newGameButton = document.createElement('button');
    newGameButton.type = 'button';
    newGameButton.id = 'new-game-button';
    newGameButton.textContent = 'New game';
    newGameButton.addEventListener('click', () => newGame({ userColor: sideSelect.value }));
    controlsRoot.append(sideLabel, sideSelect, newGameButton);
  }

  function newGame(settings = {}) {
    const previous = current === null ? null : current.game.state();
    startGame({
      level: settings.level ?? (previous === null ? level : previous.level),
      userColor:
        settings.userColor === WHITE || settings.userColor === BLACK
          ? settings.userColor
          : previous === null
            ? userColor
            : previous.userColor,
    });
  }

  function startGame({ level: gameLevel, userColor: color }) {
    if (current !== null) current.game.dispose();
    selected = null;
    boardRoot.replaceChildren();
    panelRoot.replaceChildren();

    const game = createGame({
      userColor: color,
      level: gameLevel,
      ...(fen !== undefined && current === null ? { fen } : {}), // custom start: first game only
      ...(schedule !== undefined ? { schedule } : {}),
      ...(now !== undefined ? { now } : {}),
      ...(random !== undefined ? { random } : {}),
    });

    const board = createBoardUi({ root: boardRoot, onSquareClick, orientation: color });
    const panel = createCoachPanel({
      root: panelRoot,
      levels: LEVELS,
      onLevelChange: (n) => game.setLevel(n),
      onHint: () => game.hint(),
    });
    const review = createReviewPanel({ root: panelRoot });
    current = { game, board, panel, review };

    game.onChange((next) => {
      snap = next;
      render();
    });
  }

  // Whose piece is on a square — for click routing only.
  const pieceAt = (square) => parseFen(snap.fen).board[sqIndex(square)];
  const legalTargets = (from) =>
    legalMoves(snap.fen)
      .filter((uci) => uci.slice(0, 2) === from)
      .map((uci) => uci.slice(2, 4));

  // Click-to-move: click one of your pieces, then a legal target. Illegal
  // clicks are refused quietly (spec edge cases); clicks while the computer
  // thinks or the game is over are ignored.
  function onSquareClick(square) {
    if (snap === null || snap.phase === 'over' || snap.phase === 'promotion') return;
    if (snap.phase !== 'user') {
      selected = null;
      render();
      return;
    }
    if (selected !== null && legalTargets(selected).includes(square)) {
      const from = selected;
      selected = null;
      current.game.tryUserMove(from, square);
      return; // the move's onChange re-renders
    }
    const piece = pieceAt(square);
    if (piece !== null && colorOf(piece) === snap.userColor && square !== selected) {
      selected = square;
    } else {
      selected = null; // deselect on a second click, an empty square, or an opponent piece
    }
    render();
  }

  function render() {
    current.board.render({
      fen: snap.fen,
      lastMove: snap.lastMove,
      checkSquare: snap.checkSquare,
      selected,
      targets: selected === null ? [] : legalTargets(selected),
    });
    current.panel.render(snap);
    current.review.render(snap);
    if (snap.pendingPromotion !== null) {
      current.board.showPromotionPicker({
        options: snap.pendingPromotion.options,
        color: snap.userColor,
        onChoose: (piece) => current.game.choosePromotion(piece),
        onCancel: () => current.game.cancelPromotion(),
      });
    } else {
      current.board.hidePromotionPicker();
    }
    // FR-010's "last move" in words as well as highlights, for a first-time
    // viewer.
    const lastMoveLine = document.getElementById('last-move');
    if (snap.lastMove !== null) {
      const whose = snap.lastMove.byUser ? 'You' : 'The computer';
      const words = moveWords(
        snap.lastMove.fenBefore,
        snap.lastMove.uci,
        snap.lastMove.byUser ? 'your' : 'their',
      );
      lastMoveLine.textContent = `Last move: ${whose} played ${words}.`;
    } else {
      lastMoveLine.textContent = `The game has just started — you play the ${COLOR_NAMES[snap.userColor]} pieces.`;
    }
  }

  startGame({ level, userColor });

  // Smoke-test sentinel (scripts/ui-smoke.sh reads the DOM after load).
  document.body.dataset.coachBoot = 'ready';
  const smokeErrors = document.getElementById('smoke-errors');
  if (smokeErrors !== null) {
    smokeErrors.textContent = JSON.stringify(window.__coachErrors ?? ['collector missing']);
  }

  return {
    get game() {
      return current.game;
    },
    get board() {
      return current.board;
    },
    get panel() {
      return current.panel;
    },
    get review() {
      return current.review;
    },
    render,
    onSquareClick,
    newGame,
  };
}
