#!/usr/bin/env node
/**
 * 사주 종합 풀이 조사(로/가/를/와) 받침 불일치 감사 — 읽기 전용, 보고만 한다.
 *
 * 렌더러가 `값+'로'`·`값+'가'` 처럼 조사를 고정으로 이어 붙여서, 받침 있는 값이 들어오면
 * '근육가'·'보석로' 같은 문장이 나온다. 패리티 픽스처의 26개 렌더(연이·영냥이)를 실제로 그려
 * "받침 있는 음절 + 로/가/를/와" 후보를 센다. 동사 어미(~는)·의문형(~ㄴ가)·실제 명사(전문가·진로)는 뺀다.
 *
 * 실행: node scripts/audit-saju-josa.mjs   (출력이 비면 끝, 끝은 '건수 페르소나 단어')
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { buildSajuSectionHtml } = await import(pathToFileURL(path.join(root, 'worker/lib/saju-section/report.js')));
const P = JSON.parse(readFileSync(path.join(root, '__tests__/fixtures/saju-section-client-parity.json'), 'utf8'));

const NOUNS = new Set(('진로 경로 통로 과로 한로 백로 전문가 작가 역술가 상담가 평가 물가 대가 국가 예술가 사업가 활동가 기업가 '
  + '투자가 정치가 전략가 분석가 실천가 기획가 혁신가 연구가 탐험가 몽상가 개척가 교육가 건축가 비평가 음악가 소설가 '
  + '사상가 외교가 실업가 애호가 낙천가 노력가 수집가 감정가 평론가 운동가 원가 단가 시가 정가 증가 추가 휴가 여가 '
  + '부가 고가 저가 미술가 법률가').split(' '));
const QUESTION = /(인|는|은|란|린|런|뭔|었|았|했|갔|왔|많|없|있|않|옳|잘|할|될|한|된)$/;
const jong = (ch) => { const c = ch.charCodeAt(0) - 0xac00; return c < 0 || c > 11171 ? -1 : c % 28; };

const hits = new Map();
for (const r of P.renders) {
  const c = P.cases.find((e) => e.id === r.id);
  const { html } = buildSajuSectionHtml({
    birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
    gender: c.gender, name: c.name, mode: r.mode, place: c.place, jongDecision: c.jong, now: new Date(P.now), featureKey: 'section_summary',
  });
  const text = html.replace(/<[^>]+>/g, ' ');
  for (const m of text.matchAll(/([가-힣]{1,6})(로|가|를|와)(?=[\s.,·)!?'"’]|$)/g)) {
    const [, w, josa] = m;
    const j = jong(w.at(-1));
    if (j <= 0 || (josa === '로' && j === 8) || (josa === '가' && QUESTION.test(w)) || NOUNS.has(w + josa)) continue;
    const key = `${r.mode === 'neo' ? '영냥이' : '연이'} ${w}${josa}`;
    hits.set(key, (hits.get(key) || 0) + 1);
  }
}
for (const [k, n] of [...hits].sort((a, b) => b[1] - a[1])) console.log(n, k);
console.error(`[audit-saju-josa] 후보 ${hits.size}종 (렌더 ${P.renders.length}개)`);
