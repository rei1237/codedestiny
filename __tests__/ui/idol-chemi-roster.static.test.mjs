import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ROSTER_GROUPS, ROSTER_VERSION, ROSTER_CHECKED_ON } from "../../lib/idol-chemi/data/roster.js";
import { validateRoster } from "../../lib/idol-chemi/data/rosterSchema.js";
import { LEGACY_PRESETS } from "../../lib/idol-chemi/data/legacyPresets.generated.js";
import { PRESET_PARTNERS, ROSTER_PARTNERS, resolvePartner, searchPartners } from "../../lib/idol-chemi/data/partners.js";
import { buildLegacyPresets, renderModule } from "../../scripts/idol-chemi/export-legacy-presets.mjs";

const members = ROSTER_GROUPS.flatMap((g) => g.members);

test("roster passes schema (ids unique, real ISO dates, sources>=1, no birth time)", () => {
  const result = validateRoster(ROSTER_GROUPS, { checkedOnMax: ROSTER_CHECKED_ON });
  assert.deepEqual(result.errors, []);
  assert.ok(result.ok);
  assert.match(ROSTER_VERSION, /^kpop-roster-\d{4}\.\d{2}-v\d+$/);
});

test("every member has birthTimeKnown=false and no birthTime key; sources carry http url + checkedOn", () => {
  for (const m of members) {
    assert.equal(m.birthTimeKnown, false, m.id);
    assert.equal("birthTime" in m, false, m.id);
    assert.ok(m.sources.length >= 1, m.id);
    for (const s of m.sources) {
      assert.match(s.url, /^https?:/, m.id);
      assert.match(s.checkedOn, /^\d{4}-\d{2}-\d{2}$/, m.id);
    }
  }
});

test("roster source text never contains birth time / MBTI fields", () => {
  const text = readFileSync(new URL("../../lib/idol-chemi/data/roster.js", import.meta.url), "utf8");
  // 필드 키로만 검사한다(머리말 주석의 금지 문구는 허용).
  assert.equal(/birthTime\s*:/.test(text), false);
  assert.equal(/mbti\s*:/i.test(text), false);
});

test("generated legacy presets are in sync with celebrityProfiles.ts and keep category counts", () => {
  const current = readFileSync(new URL("../../lib/idol-chemi/data/legacyPresets.generated.js", import.meta.url), "utf8");
  assert.equal(current, renderModule(buildLegacyPresets()));
  const counts = {};
  for (const p of LEGACY_PRESETS) counts[p.category] = (counts[p.category] || 0) + 1;
  assert.deepEqual(counts, { 걸그룹: 110, 보이그룹: 100, "가수·솔로": 35, 배우: 12, 정치인: 10, "애니 캐릭터": 28 });
  assert.equal(LEGACY_PRESETS.length, 295);
  for (const p of LEGACY_PRESETS) {
    assert.equal(p.birthTimeKnown, false, p.id);
    assert.equal("birthTime" in p, false, p.id);
    assert.match(p.birthDate, /^\d{4}-\d{2}-\d{2}$/, p.id);
  }
});

test("partners: roster first in search, shadowed presets hidden, unknown refs resolve to null", () => {
  assert.ok(ROSTER_PARTNERS.length >= 70);
  assert.ok(PRESET_PARTNERS.length < LEGACY_PRESETS.length, "duplicates of roster members must be hidden");
  const hits = searchPartners("정국");
  assert.equal(hits[0].kind, "roster");
  assert.equal(hits.some((r) => r.kind === "preset" && r.groupLabel === "BTS" && r.displayName === "정국"), false);
  assert.equal(resolvePartner({ kind: "roster", id: "no-such-member" }), null);
  assert.equal(resolvePartner({ kind: "custom", id: "bts-jin" }), null);
  assert.equal(resolvePartner({ kind: "roster", id: "../etc" }), null);
  const jin = resolvePartner({ kind: "roster", id: "bts-jin" });
  assert.equal(jin.birthTimeKnown, false);
  assert.equal(jin.groupId, "bts");
  const preset = resolvePartner({ kind: "preset", id: "bias-celeb-1" });
  assert.equal(preset.kind, "preset");
});
