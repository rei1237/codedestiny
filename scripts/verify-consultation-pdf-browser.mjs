import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { buildFusionFortuneContext, generateFusionFortuneWithMockLLM } from '../worker/lib/fusion-fortune.js';
const output = process.argv[2] || 'build-cache/consultation-pdf';
await mkdir(output, { recursive: true });
const bundle = await build({
  stdin: { contents: 'export {exportFusionReportPdf} from "./lib/pdf/export-fusion-report-pdf"; export {exportResultPdf} from "./lib/pdf/export-result-pdf";', resolveDir: process.cwd() },
  plugins: process.env.PDF_BASELINE_REF ? [{ name: 'baseline-exporters', setup(build) { build.onLoad({ filter: /export-(result|fusion-report)-pdf\.ts$/ }, args => ({ contents: execFileSync('git', ['show', process.env.PDF_BASELINE_REF + ':lib/pdf/' + args.path.split(/[\\/]/).at(-1)], { encoding: 'utf8' }), loader: 'ts' })); } }] : [],
  bundle: true, write: false, format: 'iife', globalName: 'pdfExports', platform: 'browser',
  define: { 'process.env.NEXT_PUBLIC_ASSETS_BASE_URL': '"https://assets.code-destiny.com"' },
});
const fontFiles = {};
for (const name of ['Mulmaru.ttf', 'Paperlogy-5Medium.ttf']) {
  const path = output + '/' + name;
  try { fontFiles[name] = await readFile(path); }
  catch {
    // Public static fonts only; never contact an API or load credentials.
    const response = await fetch('https://assets.code-destiny.com/' + name);
    assert(response.ok, name);
    fontFiles[name] = Buffer.from(await response.arrayBuffer());
    await writeFile(path, fontFiles[name]);
  }
}
const INPUT = {
  birthDate: "1995-04-18",
  birthTime: "08:30",
  calendarType: "solar",
  gender: "female",
  nickname: "달빛",
  topic: "연애와 관계",
  concern: "이 사람과 계속 만나도 될지 모르겠어요",
  birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
};

const ADAPTERS = {
  saju: async () => ({ dayMaster: "갑목", currentFlowSummary: "정리한 기준을 행동으로 옮기는 흐름", evidence: ["saju.dayMaster"] }),
  ziwei: async () => ({ lifePalaceSummary: "명궁의 역할을 정리하는 흐름", topicPalaceSummary: "관록궁의 책임을 조율하는 흐름", evidence: ["ziwei.lifePalace"] }),
  vedic: async () => ({ moonSignSummary: "달의 감정 리듬", nakshatraSummary: "반복되는 회복 습관", innerRhythm: "감정의 속도를 알아차리는 리듬", evidence: ["vedic.nakshatra"] }),
  sukuyo: async () => ({ birthMansion: "묘숙", relationshipPattern: "관계의 거리를 천천히 맞추는 흐름", evidence: ["sukuyo.birthMansion"] }),
  astrology: async () => ({ sunSummary: "태양의 목표 방향", moonSummary: "달의 정서적 안정", currentMoodSummary: "기준을 먼저 확인하는 흐름", evidence: ["astrology.sun"] }),
  tarot: async () => ({
    spreadType: "fusion_six_system_bridge",
    spreadId: "fusion_six_system_bridge",
    symbolicMessage: "여섯 장을 현실 행동으로 연결합니다.",
    cards: ["바보", "마법사", "여사제", "여황제", "황제", "연인"].map((name, index) => ({
      name, orientation: "upright", positionKey: `position_${index}`, meaningSummary: `${name}의 선택 상징`,
    })),
  }),
};

const built = await buildFusionFortuneContext(INPUT, { adapters: ADAPTERS });
assert(built.ok, JSON.stringify(built));
const result = await generateFusionFortuneWithMockLLM({ context: built.context, now: new Date('2026-10-14T00:00:00Z') });
await writeFile(output + '/synthetic-result.json', JSON.stringify(result));
const browser = await chromium.launch({ headless: true });
try {
  for (const mode of ['typeset', 'long-cover', 'themed-new-year', 'themed-love', 'font-failure']) {
    const context = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if(url.pathname.startsWith('/images/service-introductions/'))return route.fulfill({body:await readFile('public'+url.pathname),contentType:'image/webp'});
      if(url.pathname==='/images/fusion-fortune/premium-chapters-v1.webp')return route.fulfill({body:await readFile('public'+url.pathname),contentType:'image/webp'});
      const font = fontFiles[url.pathname.slice(1)];
      if (font && mode !== 'font-failure') return route.fulfill({ body: font, contentType: 'font/ttf', headers: { 'access-control-allow-origin': '*' } });
      if (url.href === 'http://127.0.0.1/pdf-test') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="ko"><body></body></html>' });
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1/pdf-test');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(({ result, mode }) => {
      const el = document.createElement('article');
      el.id = 'report';
      el.style.cssText = 'width:680px;font:18px/1.9 Malgun Gothic,sans-serif;color:#222;background:#fff;padding:24px;';
      const title = document.createElement('h1'); title.textContent = '초융합 상담 결과'; el.appendChild(title);
      for (let i=0;i<70;i++) {
        const p = document.createElement('p');
        p.textContent = '문단 ' + (i+1) + ' — 먼저 업무 조건과 생활 리듬을 확인해 보세요. 오늘 제안할 일을 한 가지 정하고, 반응에 따라 다음 행동을 조정합니다. '.repeat(3);
        el.appendChild(p);
      }
      const table = document.createElement('table');
      for (let i=0;i<16;i++) { const tr=table.insertRow(); tr.insertCell().textContent='선택 '+i;tr.insertCell().textContent='이득과 부담을 확인하고 다음 행동을 정합니다.'; }
      el.appendChild(table);
      const art = document.createElement('img'); art.src='/images/service-introductions/new-year-ai-960.webp'; art.width=680; art.height=453; art.loading='lazy';
      el.appendChild(art); document.body.appendChild(el);
      window.mockResult = mode === 'long-cover' ? { ...result, title: '선택을 앞둔 당신의 현재 흐름과 구체적인 실행 기준 '.repeat(8) } : result;
    }, { result, mode });
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
    await page.evaluate(async mode => {
      if (mode.startsWith('themed-')) await window.pdfExports.exportResultPdf({ captureTargets: ['#report'], fileName: mode + '.pdf', backgroundColor: '#ffffff', cover: { theme: mode === 'themed-love' ? 'love' : 'newYear', title: mode === 'themed-love' ? '연이와 서한비의 관계 상담 편지' : '네오의 한 해 작전 기록', subtitle: '가상 프로필을 사용한 PDF 디자인 검수 자료' } });
      else if (mode !== 'font-failure') await window.pdfExports.exportFusionReportPdf({ result: window.mockResult, fileName: mode + '.pdf', topic: '상담 주제와 확인할 조건 '.repeat(mode === 'long-cover' ? 8 : 1) });
      else await window.pdfExports.exportResultPdf({ captureTargets: ['#report'], fileName: mode + '.pdf', backgroundColor: '#ffffff', cover: { title: '한글 글꼴 실패에도 읽을 수 있는 초융합 상담', subtitle: '기존 결과를 안전하게 저장합니다.' } });
    }, mode);
    await (await downloadPromise).saveAs(output + '/' + mode + '.pdf');
    console.log('[PDF]', mode, 'saved');
    await context.close();
  }
} finally { await browser.close(); }
