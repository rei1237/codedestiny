import fs from 'fs';
import vm from 'vm';

function extractTarotData(src) {
  const startToken = 'var TAROT_DATA = [';
  const start = src.indexOf(startToken);
  if (start < 0) throw new Error('TAROT_DATA start not found');

  let i = start + 'var TAROT_DATA = '.length;
  let depth = 0;
  let inStr = false;
  let quote = '';
  let escaped = false;

  for (; i < src.length; i += 1) {
    const ch = src[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        inStr = false;
        quote = '';
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = true;
      quote = ch;
      continue;
    }

    if (ch === '[') {
      depth += 1;
      continue;
    }

    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        const arrExpr = src.slice(start + 'var TAROT_DATA = '.length, i + 1);
        return vm.runInNewContext(arrExpr, {});
      }
    }
  }

  throw new Error('TAROT_DATA end not found');
}

function mdEscape(text) {
  return String(text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const tarotSource = fs.readFileSync('js/saju-engine-tarot-sukuyo-quantum.js', 'utf8');
const tarotData = extractTarotData(tarotSource);

const sandbox = {
  window: { TAROT_DATA: tarotData },
  console,
  Math,
  Date,
  JSON,
  String,
  Number,
  Boolean,
  Array,
  Object,
  RegExp,
  Error,
  setTimeout,
  clearTimeout
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

const aiSource = fs.readFileSync('lib/ai-engine.js', 'utf8');
vm.runInContext(aiSource, sandbox);

const sampleDreams = [
  '누군가에게 쫓겨서 어두운 골목을 계속 도망쳤고 너무 불안하고 숨이 막혔어.',
  '회사에서 상사가 내 보고서를 무시해서 화가 폭발했고 동료랑 크게 다퉜어.',
  '헤어진 연인을 꿈에서 다시 만나 손을 잡았는데 설레고 눈물이 났어.',
  '시험장에 늦을까봐 초조했지만 문제를 다 풀고 합격 소식을 듣고 기뻤어.',
  '지갑을 잃어버려 허무하고 막막했는데 집 문 앞에서 다시 찾았어.',
  '가족과 식탁에 앉아 웃으며 밥을 먹었고 마음이 편안하고 감사했어.',
  '낯선 도시 공항에서 비행기를 놓쳐 당황했고 길을 잃어 헤맸어.',
  '병원 복도에서 혼자 울다가 친구가 와서 안아줘서 안도했어.',
  '바다 위 다리를 건너다가 무서웠지만 끝까지 건너고 자신감이 생겼어.',
  '돈다발과 계약서를 받는 꿈을 꾸고 기대감과 동시에 긴장이 들었어.'
];

const rows = sampleDreams.map((text, idx) => {
  const reading = sandbox.window.DreamLedgerAI.interpretDream(text, { goldenTone: 'coaching' });
  const trace = reading?.json?.analysis?.tarot_hint_trace || {};
  return {
    no: idx + 1,
    dream: text,
    subject: reading?.classifiedInput?.subject || '',
    action: reading?.classifiedInput?.action || '',
    emotion: reading?.classifiedInput?.emotion || '',
    root: reading?.cards?.[0]?.card_name || '',
    message: reading?.cards?.[1]?.card_name || '',
    guidance: reading?.cards?.[2]?.card_name || '',
    scenarios: (trace?.scenario_tags || []).join(', '),
    guidanceHints: (trace?.guidance_hints || []).slice(0, 5).join(', ')
  };
});

const md = [];
md.push('| No | 꿈 문장 | 분류(주체/행동/감정) | 카드(근원/전언/지침) | 시나리오 태그 | 지침 힌트 상위 |');
md.push('|---:|---|---|---|---|---|');
for (const r of rows) {
  md.push(
    `| ${r.no} | ${mdEscape(r.dream)} | ${mdEscape(`${r.subject} / ${r.action} / ${r.emotion}`)} | ${mdEscape(`${r.root} / ${r.message} / ${r.guidance}`)} | ${mdEscape(r.scenarios)} | ${mdEscape(r.guidanceHints)} |`
  );
}

fs.writeFileSync('scripts/dream-tarot-calibration-results.json', JSON.stringify(rows, null, 2));
fs.writeFileSync('scripts/dream-tarot-calibration-results.md', md.join('\n') + '\n');

console.log('[done] wrote scripts/dream-tarot-calibration-results.json');
console.log('[done] wrote scripts/dream-tarot-calibration-results.md');
