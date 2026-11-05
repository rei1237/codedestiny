import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { buildSync } from 'esbuild';

// 일주·월령 문장이 든 서버 전용 전체 읽기 깊이 모듈(lib/saju/reading-depth.mjs)을 브라우저 전역 스크립트로 묶는다.
// 공개 번들(js/core/saju/reading-depth.generated.js)에는 그 문장이 없다.
export function fullReadingDepthSource() {
  const out = buildSync({ entryPoints: ['lib/saju/reading-depth.mjs'], bundle: true, format: 'iife', globalName: 'SajuReadingDepth', platform: 'browser', target: 'es2020', charset: 'utf8', write: false });
  return out.outputFiles[0].text;
}

// 원국 해석 생성기(ilju·십성 개요/카드/상세·조후·억부)는 reading-rich.js 에서 서버 원본으로 옮겼다(worker/lib/saju-section/paid-natal-reading.src.js).
// 비한국어판은 paid-natal-intl.src.js(rich.natalIntl)다. 이 도우미는 두 원본을 reading-rich.js 의 같은 범위에 끼워 넣어 예전처럼 합친 모양으로 돌려준다.
// 서버 런타임은 같은 두 파일을 같은 범위로 묶으므로(scripts/extract-saju-section-runtime.mjs) 생성 문장은 같다.
export function loadRichWithNatal(extraSource = '', beforeRich = '') {
  const engine = readFileSync('js/saju-engine.js', 'utf8');
  const tables = engine.slice(engine.indexOf('var GAN={'), engine.indexOf('/* ─── 십성 DB ─── */'));
  const tenGod = engine.slice(engine.indexOf('function getTenGod(dayGan,target){'), engine.indexOf('function parseTimeZoneOffsetName'));
  const rich = readFileSync('js/core/saju/reading-rich.js', 'utf8');
  const natal = readFileSync('worker/lib/saju-section/paid-natal-reading.src.js', 'utf8') + '\n' + readFileSync('worker/lib/saju-section/paid-natal-intl.src.js', 'utf8');
  const at = rich.indexOf('  root.SajuReadingRich = {');
  if (at < 0) throw new Error('reading-rich.js 내보내기 자리를 찾지 못했다');
  const kit = '\n  root.__natalKit = { ilju: ilju, climate: climate, strength: strength, tenOverview: tenOverview, tenCards: tenCards, godDetail: godDetail, natalIntl: natalIntl };\n';
  const context = vm.createContext({});
  vm.runInContext(tables + tenGod + beforeRich + rich.slice(0, at) + natal + kit + rich.slice(at) + extraSource, context);
  return { context, rich: Object.assign({}, context.SajuReadingRich, context.__natalKit) };
}
