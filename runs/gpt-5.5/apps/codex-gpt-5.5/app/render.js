const FILES = "abcdefgh";
const PIECES = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

const VERDICT_RANK = {
  blunder: 5,
  mistake: 4,
  inaccuracy: 3,
  good: 2,
  best: 1,
};

function squareName(file, rank) {
  return FILES[file] + String(rank + 1);
}

function parseFenBoard(fen) {
  const fields = fen.trim().split(/\s+/);
  const ranks = fields[0].split("/");
  const board = new Map();

  ranks.forEach((rankText, fenRank) => {
    let file = 0;
    const rank = 7 - fenRank;
    for (const char of rankText) {
      if (/^\d$/.test(char)) {
        file += Number(char);
      } else {
        board.set(squareName(file, rank), char);
        file += 1;
      }
    }
  });

  return board;
}

function turnFromFen(fen) {
  return fen.trim().split(/\s+/)[1];
}

function colorOf(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

function pieceName(piece) {
  const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  const color = colorOf(piece) === "w" ? "White" : "Black";
  return `${color} ${names[piece.toLowerCase()]}`;
}

function kingSquare(board, color) {
  const king = color === "w" ? "K" : "k";
  for (const [square, piece] of board.entries()) {
    if (piece === king) return square;
  }
  return null;
}

function isSlidingAttack(board, targetFile, targetRank, byColor, directions, attackers) {
  for (const [df, dr] of directions) {
    let file = targetFile + df;
    let rank = targetRank + dr;
    while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
      const piece = board.get(squareName(file, rank));
      if (piece) {
        if (colorOf(piece) === byColor && attackers.includes(piece.toLowerCase())) {
          return true;
        }
        break;
      }
      file += df;
      rank += dr;
    }
  }
  return false;
}

export function checkInfo(fen) {
  const board = parseFenBoard(fen);
  const color = turnFromFen(fen);
  const square = kingSquare(board, color);
  if (!square) return { inCheck: false, square: null };

  const targetFile = FILES.indexOf(square[0]);
  const targetRank = Number(square[1]) - 1;
  const byColor = color === "w" ? "b" : "w";

  const pawnRank = targetRank + (byColor === "w" ? -1 : 1);
  for (const df of [-1, 1]) {
    const piece = board.get(squareName(targetFile + df, pawnRank));
    if (piece === (byColor === "w" ? "P" : "p")) return { inCheck: true, square };
  }

  for (const [df, dr] of [
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ]) {
    const piece = board.get(squareName(targetFile + df, targetRank + dr));
    if (piece === (byColor === "w" ? "N" : "n")) return { inCheck: true, square };
  }

  if (
    isSlidingAttack(
      board,
      targetFile,
      targetRank,
      byColor,
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ],
      ["r", "q"],
    ) ||
    isSlidingAttack(
      board,
      targetFile,
      targetRank,
      byColor,
      [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ],
      ["b", "q"],
    )
  ) {
    return { inCheck: true, square };
  }

  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (df === 0 && dr === 0) continue;
      const piece = board.get(squareName(targetFile + df, targetRank + dr));
      if (piece === (byColor === "w" ? "K" : "k")) return { inCheck: true, square };
    }
  }

  return { inCheck: false, square };
}

export function formatStatus(status, threefold = false) {
  if (threefold) return "Draw by repetition";
  if (status === "checkmate") return "Checkmate";
  if (status === "stalemate") return "Stalemate";
  if (status === "draw") return "Draw";
  return "Ongoing";
}

export function worstReviews(reviews, limit = 3) {
  return reviews
    .filter((review) => ["inaccuracy", "mistake", "blunder"].includes(review.verdict))
    .slice()
    .sort((a, b) => VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict] || a.ply - b.ply)
    .slice(0, limit);
}

export function renderBoard(root, state, onSquareClick) {
  const board = parseFenBoard(state.fen);
  const checked = checkInfo(state.fen);
  root.replaceChildren();

  for (let rank = 7; rank >= 0; rank -= 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = squareName(file, rank);
      const piece = board.get(square);
      const button = document.createElement("button");
      button.type = "button";
      button.className = [
        "square",
        (file + rank) % 2 === 0 ? "dark" : "light",
        state.selectedSquare === square ? "selected" : "",
        state.legalTargets.includes(square) ? "target" : "",
        piece && state.legalTargets.includes(square) ? "has-piece" : "",
        state.lastMove?.from === square || state.lastMove?.to === square ? "last" : "",
        checked.inCheck && checked.square === square ? "in-check" : "",
      ]
        .filter(Boolean)
        .join(" ");
      button.dataset.square = square;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", piece ? `${square}, ${pieceName(piece)}` : `${square}, empty`);
      button.textContent = piece ? PIECES[piece] : "";
      if (rank === 0 || file === 0) {
        const coord = document.createElement("span");
        coord.className = "coord";
        coord.textContent = file === 0 ? square[1] : square[0];
        button.append(coord);
      }
      button.addEventListener("click", () => onSquareClick(square));
      root.append(button);
    }
  }
}

export function renderState(elements, state, onSquareClick) {
  const checked = checkInfo(state.fen);
  const statusText = formatStatus(state.status, state.threefold);
  const latestReview = state.reviews.at(-1);

  renderBoard(elements.board, state, onSquareClick);
  elements.summary.textContent = state.message;
  elements.turn.textContent = turnFromFen(state.fen) === "w" ? "White" : "Black";
  elements.status.textContent = statusText;
  elements.lastMove.textContent = state.lastMove ? state.lastMove.uci : "None";
  elements.check.textContent = checked.inCheck ? "Yes" : "No";
  elements.hint.textContent = state.hint ? `${state.hint.move}: ${state.hint.reason}` : "Ask when it is your turn.";
  elements.hintButton.disabled = state.pending || state.gameOver || turnFromFen(state.fen) !== "w";
  elements.level.value = state.level;

  elements.verdict.textContent = latestReview ? latestReview.verdict : "Make your first move.";
  elements.reasons.replaceChildren(
    ...((latestReview?.reasons ?? []).map((reason) => {
      const item = document.createElement("li");
      item.textContent = reason;
      return item;
    })),
  );
  elements.better.textContent = latestReview?.betterMove ? `Better: ${latestReview.betterMove}` : "";

  elements.moves.replaceChildren(
    ...state.moves.map((move) => {
      const item = document.createElement("li");
      item.textContent = `${move.side}: ${move.uci}`;
      return item;
    }),
  );

  elements.review.replaceChildren(
    ...worstReviews(state.reviews).map((review) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.className = "weak";
      label.textContent = `${review.uci} ${review.verdict}`;
      item.append(label, `: ${review.reasons.join(" ")}${review.betterMove ? ` Better: ${review.betterMove}.` : ""}`);
      return item;
    }),
  );
}

export function readBoardPiece(fen, square) {
  return parseFenBoard(fen).get(square) ?? null;
}
