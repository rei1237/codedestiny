const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");

function loadBookmark(storage) {
  const root = path.resolve(__dirname, "../../src/features/fortune-tea-house");
  function load(file) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(source, {
      exports, window: { localStorage: storage },
      require: () => load(path.join(root, "data/entryStory.ts")),
    });
    return exports;
  }
  return load(path.join(root, "lib/entryBookmark.ts"));
}

test("reading bookmarks reject corrupt, unsupported and out-of-range positions", () => {
  let raw = null;
  const api = loadBookmark({ getItem: () => raw });
  for (const value of ["broken", "null", "[]", '{"stage":"result","line":0}', '{"stage":"doorOpened","line":-1}', '{"stage":"doorOpened","line":6}', '{"stage":"doorOpened","line":1.5}']) {
    raw = value;
    assert.equal(api.readEntryBookmark(), null, value);
  }
  raw = '{"stage":"yeoniReveal","line":5}';
  assert.equal(api.readEntryBookmark().stage, "yeoniReveal");
  assert.equal(api.readEntryBookmark().line, 5);
});

test("reading progress uses a separate key and clears without touching consultation recovery", () => {
  const map = new Map([["paid-recovery", "keep"]]);
  const api = loadBookmark({ getItem: key => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) });
  api.saveEntryBookmark({ stage: "pigDialogue", line: 4 });
  assert.equal(api.readEntryBookmark().line, 4);
  api.saveEntryBookmark(null);
  assert.equal(api.readEntryBookmark(), null);
  assert.equal(map.get("paid-recovery"), "keep");
});

test("blocked local storage never prevents opening or finishing the story", () => {
  const blocked = () => { throw new Error("Storage unavailable"); };
  const api = loadBookmark({ getItem: blocked, setItem: blocked, removeItem: blocked });
  assert.equal(api.readEntryBookmark(), null);
  assert.doesNotThrow(() => api.saveEntryBookmark({ stage: "doorOpened", line: 0 }));
  assert.doesNotThrow(() => api.saveEntryBookmark(null));
});
