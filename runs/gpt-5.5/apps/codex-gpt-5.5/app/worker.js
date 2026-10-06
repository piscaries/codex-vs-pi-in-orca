import { applyMove, chooseComputerMove } from "../engine/index.js";

self.addEventListener("message", (event) => {
  const { id, fen, level } = event.data ?? {};
  try {
    const move = chooseComputerMove(fen, level);
    self.postMessage({ id, move, fen: move ? applyMove(fen, move) : fen });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});
