import { hintForPosition, reviewPositionMove } from "../engine/coach.js";
import { gameStatusForPosition, parseFen } from "../engine/rules.js";
import { searchPosition } from "../engine/search.js";

const PROFILES = Object.freeze({
  beginner: Object.freeze({
    review: Object.freeze({ timeMs: 180, maxDepth: 2 }),
    reply: Object.freeze({ timeMs: 260, maxDepth: 2, noise: 320 }),
    hint: Object.freeze({ timeMs: 180, maxDepth: 2, noise: 180 }),
  }),
  club: Object.freeze({
    review: Object.freeze({ timeMs: 320, maxDepth: 4 }),
    reply: Object.freeze({ timeMs: 620, maxDepth: 5, noise: 90 }),
    hint: Object.freeze({ timeMs: 280, maxDepth: 4, noise: 30 }),
  }),
  challenging: Object.freeze({
    review: Object.freeze({ timeMs: 620, maxDepth: 7 }),
    reply: Object.freeze({ timeMs: 1_050, maxDepth: 8, noise: 0 }),
    hint: Object.freeze({ timeMs: 450, maxDepth: 6, noise: 0 }),
  }),
});

function reply(id, values = {}) {
  self.postMessage({
    id,
    ok: true,
    review: null,
    uci: null,
    hint: null,
    error: null,
    ...values,
  });
}

function fail(id, error) {
  self.postMessage({
    id,
    ok: false,
    review: null,
    uci: null,
    hint: null,
    error: error instanceof Error ? error.message : "The coach could not finish that request.",
  });
}

self.addEventListener("message", ({ data }) => {
  const id = data?.id;
  try {
    if (!Number.isSafeInteger(id) || id < 1) throw new TypeError("Invalid request id");
    const profile = PROFILES[data.profile];
    if (!profile) throw new TypeError("Unknown strength profile");

    if (data.type === "hint") {
      const position = parseFen(data.fen);
      reply(id, { hint: hintForPosition(position, profile.hint) });
      return;
    }

    if (data.type !== "coachAndReply") throw new TypeError("Unknown worker request");
    const before = parseFen(data.fenBefore);
    const after = parseFen(data.fenAfter);
    const review = reviewPositionMove(before, data.userUci, profile.review);
    const uci = gameStatusForPosition(after) === "ongoing"
      ? searchPosition(after, profile.reply).uci
      : null;
    reply(id, { review, uci });
  } catch (error) {
    fail(id, error);
  }
});
