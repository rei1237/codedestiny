// A paid love or mindscan body whose cards are not a held server draw is refused before any payment lookup
// (worker/lib/paid-tarot-draw.js). A tab opened before the server draw shipped, or a PortOne return carrying
// an old resume descriptor, still sends such a body. The React clients turn that refusal into a redraw under
// the paid requestId, instead of looping on the "saved sections" error or opening checkout a second time.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const between = (source, start, end) => {
  const at = source.indexOf(start);
  assert.ok(at >= 0, `missing ${start}`);
  const stop = source.indexOf(end, at + start.length);
  assert.ok(stop > at, `missing ${end} after ${start}`);
  return source.slice(at, stop);
};

test("the client redraw reasons are exactly the server's final draw refusals", () => {
  const server = [...read("worker/lib/paid-tarot-draw.js").matchAll(/reason: '(TAROT_[A-Z_]+)', retryable: false/g)].map((m) => m[1]).sort();
  assert.deepEqual(server, ["TAROT_CARDS_FORGED", "TAROT_DRAW_OWNER_MISMATCH", "TAROT_DRAW_REQUIRED"]);
  const client = read("app/_lib/oracle-delivery.ts").match(/TAROT_REDRAW_REASONS = \[([^\]]+)\]/);
  assert.ok(client, "app/_lib/oracle-delivery.ts names TAROT_REDRAW_REASONS");
  assert.deepEqual([...client[1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]).sort(), server);
  const legacy = read("js/tarot-love-experience.js").match(/LOVE_REDRAW_REASONS = \[([^\]]+)\]/);
  assert.ok(legacy, "js/tarot-love-experience.js names LOVE_REDRAW_REASONS");
  assert.deepEqual([...legacy[1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]).sort(), server);
});

for (const [file, draw, submit] of [
  ["app/components/LoveRelationshipTarot.tsx", "async function startDraw()", "async function loadReading()"],
  ["app/components/MindScanTarot.tsx", "const dealPicks = useCallback(", "const handleGenerateReading = useCallback("],
]) {
  test(`${file}: a refused or draw-less paid request asks for a redraw that keeps the paid requestId`, () => {
    const source = read(file);
    // The refusal is read before the generic "saved sections" error.
    assert.match(between(source, "performReading", "저장된 본문을 보존했습니다"),
      /if \(needsTarotRedraw\(result\)\) \{ askRedraw\(requestId\); throw new Error\(copy\.redrawRequired\); \}/);
    // A saved request without a draw (written before the server draw) is not restored as paid cards.
    assert.match(between(source, "-result${entry?.resultId", "paidAccessGrantedRef.current = true"),
      /if \(!entry\.resultId && !entry\.body\.drawId\) \{ askRedraw\(entry\.body\.requestId\);/);
    // The carry replaces the stale entry, so a reload asks again instead of resending it.
    const ask = between(source, "askRedraw = ", "\n  }");
    assert.match(ask, /recoveryRef\.current = null/);
    assert.match(ask, /redrawRequestIdRef\.current = paidRequestId/);
    // The next server draw continues the paid request instead of starting a new one.
    assert.match(between(source, draw, "} finally"), /redrawRequestIdRef\.current[\s\S]*paidAccessGrantedRef\.current/);
    // Checkout never opens for cards that name no server draw; a saved result id still resumes as before.
    assert.match(between(source, submit, "await ensurePaidAccess({"), /if \(!drawIdRef\.current && !recoveryRef\.current\?\.resultId\) \{ askRedraw\(/);
  });
}
