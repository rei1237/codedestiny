import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { loadTsModule } from '../../scripts/lib/load-ts-module.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
const { withOpenResultReferences } = loadTsModule('lib/pdf/with-open-result-references.ts');

test('PDF includes closed chart sections and restores open/closed reader choices on success and failure', async () => {
  for (const fail of [false, true]) {
    const dom = new JSDOM('<main><details data-ziwei-chart-details><p>saved chart</p></details><details data-ziwei-chart-details open><p>already open</p></details><details><p>optional tools</p></details></main>');
    try {
      const root = dom.window.document.querySelector('main'), details = [...root.querySelectorAll('details')];
      const run = withOpenResultReferences(root, async () => {
        assert.deepEqual(details.map(item => item.open), [true, true, false]);
        assert.equal(root.textContent, 'saved chartalready openoptional tools');
        if (fail) throw new Error('mock PDF failure');
        return 'downloaded';
      });
      if (fail) await assert.rejects(run, /mock PDF failure/);
      else assert.equal(await run, 'downloaded');
      assert.deepEqual(details.map(item => item.open), [false, true, false]);
    } finally { dom.window.close(); }
  }
});

test('nested shared references retain their original reader state through failed PDF capture', async () => {
  const dom = new JSDOM('<main><details data-result-reference><details data-result-reference open>nested saved evidence</details></details></main>');
  const root = dom.window.document.querySelector('main');
  try {
    await assert.rejects(withOpenResultReferences(root, async () => {
      assert.equal(root.querySelectorAll('details[open]').length, 2);
      throw new Error('capture failed');
    }), /capture failed/);
    assert.equal(root.querySelector('details').open, false);
    assert.equal(root.querySelector('details details').open, true);
  } finally { dom.window.close(); }
});

test('other service presentation changes preserve named payment, storage and parsing functions', () => {
  const scopes = {
    'app/vedic-ai/VedicAiClient.tsx': ['VedicAiClient', 'StructuredReadingResult', 'handlePdfDownload'],
    'app/astrology-ai/result/AstrologyAiResultClient.tsx': ['AstrologyAiResultClient'],
    'app/new-year-ai-consultation/NewYearAiClient.tsx': ['NewYearAiConsultationPage'],
    'app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx': ['CompatResultModal'],
  };
  for (const [file, allowed] of Object.entries(scopes)) {
    const functions = source => {
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), result = {};
      const visit = node => { if (ts.isFunctionDeclaration(node) && node.name) result[node.name.text] = node.getText(ast).replaceAll('\r\n','\n'); ts.forEachChild(node,visit); };
      visit(ast); return result;
    };
    const previous = functions(execFileSync('git',['show',`4d0fdf8a8:${file}`],{encoding:'utf8',windowsHide:true}));
    const current = functions(fs.readFileSync(file,'utf8'));
    for (const [name, source] of Object.entries(previous)) if (!allowed.includes(name)) assert.equal(current[name],source,`${file}: ${name}`);
  }
});

test('legacy result wrapper mirrors remain byte-identical', () => {
  for (const file of ['js/core/paid-editorial-report.mjs','css/paid-editorial-report.css']) {
    assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync('public/'+file,'utf8'));
  }
});

test('stored conclusions lead the reading while the original guide stays available without content mutation', () => {
  const source = fs.readFileSync('app/ziwei-ai/ZiweiAiClient.tsx', 'utf8');
  const ast = ts.createSourceFile('client.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['SECTION_ORDER', 'SECTION_GLYPHS', 'splitAssistantSections'];
  const declarations = ast.statements.filter(node =>
    ts.isFunctionDeclaration(node) && names.includes(node.name?.text)
    || ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(ast))));
  assert.equal(declarations.length, 3);
  const code = ts.transpileModule(declarations.map(node => node.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const record = JSON.stringify({ sections: {
    reading_guide: { title: 'old guide', body: 'original guide' },
    structure_core: { title: 'original character', body: 'original character body' },
    core_answer: { title: 'original answer', body: 'original answer body' },
  } });
  const sections = vm.runInNewContext(code + '\nsplitAssistantSections(record)', {
    record, parseStructuredZiweiResult: JSON.parse, asRecord: value => value || {}, toText: String,
  });
  assert.deepEqual(Array.from(sections.filter(section => !section.isGuide), section => section.body), ['original answer body', 'original character body']);
  assert.deepEqual(Array.from(sections.filter(section => section.isGuide), section => section.body), ['original guide']);
  assert.equal(JSON.parse(record).sections.reading_guide.body, 'original guide');
});
