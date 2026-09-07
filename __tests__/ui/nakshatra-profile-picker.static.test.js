const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(process.cwd(), "app", "nakshatra");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("nakshatra premium screens share the profile picker", () => {
  const clients = [
    ["lord-report", "LordReportClient.tsx"],
    ["dasha-map", "DashaMapClient.tsx"],
    ["muhurta", "MuhurtaClient.tsx"],
    ["vvip", "VvipClient.tsx"],
    ["ai", "NakshatraAiClient.tsx"],
    ["compat", "NakshatraCompatClient.tsx"],
  ];

  for (const [directory, file] of clients) {
    const source = read(directory, file);
    assert.match(source, /NakshatraProfilePicker/);
    assert.match(source, /<NakshatraProfilePicker/);
  }
});

test("profile context preserves the free result before falling back to profiles", () => {
  const source = read("_lib", "nakshatra-context.ts");

  assert.match(source, /NAKSHATRA_RESULT_STORAGE_KEY/);
  assert.match(source, /readStoredResult/);
  assert.match(source, /fetchNakshatraProfileCards/);
  assert.match(source, /fetchCurrentDestinyProfile/);
  assert.match(source, /cardToFormValues/);
  assert.match(source, /ianaOffsetHours/);
  assert.match(source, /\/api\/nakshatra\/resolve/);
});

test("compatibility keeps the partner payload independent from the self profile", () => {
  const source = read("compat", "NakshatraCompatClient.tsx");

  assert.match(source, /const \[a, setA\]/);
  assert.match(source, /const \[b, setB\]/);
  assert.match(source, /payload\(b\)/);
  assert.match(source, /latitude/);
  assert.match(source, /longitude/);
  assert.match(source, /timezone/);
});
