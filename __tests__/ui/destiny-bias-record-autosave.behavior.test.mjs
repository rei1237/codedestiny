import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';
import ts from 'typescript';
const source = readFileSync(new URL('../../app/saju/destiny-bias/DestinyBiasClient.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('client.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'DestinyBiasClient');
const shareBar = readFileSync(new URL('../../app/saju/destiny-bias/components/chemi/ChemiShareBar.tsx', import.meta.url), 'utf8');
test('free result has no archive/autosave hooks, collection actions or records links', () => {
  assert.doesNotMatch(source, /saveReading|handleSaveCollection|authFetch|archiveId|recordRequestsRef|savedRecordPath|href="\/records\/"/);
  assert.doesNotMatch(shareBar, /canSaveCollection|onSaveCollection|컬렉션에 저장|로그인하면 결과/);
});
// Run the production sharing handlers with local image and share-dialog fixtures.
// Any new fetch call fails, including a hidden share-snapshot write.
for (const name of ['handleShareCard', 'handleSaveImage', 'handleShareToX', 'handleShareToInstagram']) {
  test(name + ' shares or downloads without any server result storage', async () => {
    const node = component.body.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(row => row.name.getText(ast) === name));
    assert.ok(node, 'production handler exists');
    const handler = node.declarationList.declarations[0].initializer.arguments[0].getText(ast);
    const { code } = await transform('(' + handler + ')', { loader: 'ts', format: 'cjs' });
    const calls = [];
    const fetch = () => { throw new Error('Free result must not reach server storage'); };
    const scope = {
      outcome: { partner: { id: 'fixture', displayName: '최애' }, result: { chemiTypeNameKo: '친구', chemiTypeId: 'friend' }, copy: { oneLiner: '예시' } },
      shareBusy: false, shareTitle: '예시', shareRatio: 'square',
      setShareBusy: () => {}, setShareStatus: () => {}, trackFunnelStep: () => {}, trackShare: () => {},
      exportShareCardBlob: async () => new Blob(['fixture'], { type: 'image/png' }),
      downloadBlob: async () => calls.push('download'),
      buildInviteUrl: () => 'https://fixture.invalid/saju/destiny-bias/?m=fixture',
      shareThrough: async () => { calls.push('dialog'); return { status: 'copied' }; },
      friendlyErrorMessage: () => 'fixture', FUNNEL: 'fixture',
      navigator: {}, window: { location: { origin: 'https://fixture.invalid' }, open: () => ({ location: {} }) }, fetch,
    };
    const run = new Function(...Object.keys(scope), 'return ' + code.trim().replace(/;$/, ''))(...Object.values(scope));
    await run();
    if (name === 'handleSaveImage' || name === 'handleShareToInstagram') assert.ok(calls.includes('download'));
    if (name === 'handleShareCard' || name === 'handleShareToInstagram') assert.ok(calls.includes('dialog'));
  });
}
