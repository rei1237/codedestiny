const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const ast = ts.createSourceFile('runtime.js', fs.readFileSync('js/runtime-stability.js', 'utf8'), ts.ScriptTarget.Latest, true);
let code;
function visit(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === 'ensureMainUiVisible') code = n.getText(ast); ts.forEachChild(n, visit); }
visit(ast);
for (const visibility of ['hidden', 'visible']) test(`late recovery preserves saju handoff while result is ${visibility}`, () => {
  const dom = new JSDOM(`<div class="wrap"><main id="inputPage" style="display:none"></main><article id="resultPage" style="display:block;visibility:${visibility}"></article></div>`);
  new Function('document', `${code};ensureMainUiVisible();`)(dom.window.document);
  assert.equal(dom.window.document.getElementById('inputPage').style.display, 'none');
  assert.equal(dom.window.document.getElementById('resultPage').style.visibility, visibility);
  dom.window.close();
});
test('boot recovery still reveals the home when no result is active', () => {
  const dom = new JSDOM('<div class="wrap"><main id="inputPage" style="display:none"></main><article id="resultPage" style="display:none"></article></div>');
  new Function('document', `${code};ensureMainUiVisible();`)(dom.window.document);
  assert.equal(dom.window.document.getElementById('inputPage').style.display, '');
  dom.window.close();
});
