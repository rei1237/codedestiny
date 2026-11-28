// 인생 보정 P4 — LLM 프롬프트용 "직접 적은 지난 경험" 블록과 모순 가드. 설계: docs/context/life-calibration.md (P4)
// 순수 모듈: 입력은 computeLifeCalibration 결과(서버 캐시)뿐이다. 메모 원문은 결과에 없으므로 블록에도 들어갈 수 없다.
// - 블록은 사용자 자기 보고 경험과 그 해 엔진 흐름의 일치·불일치 집계를 "약한 가중치"로만 알린다.
//   정확도·적중·운명 확정 표현을 쓰지 않는다. 건강 분야는 받지 않는다(분야 목록에 없고, 들어와도 버린다).
// - 가드는 생성문이 사용자가 확실하다고 적은 경험의 반대를 단정한 문장을 고정 중립 문장으로 바꾼다. 재생성하지 않고 던지지 않는다.
// 프롬프트를 보낼 때만 계산하고 해시·다이제스트·캐시 키 접미에는 넣지 않는다(shinsal-facts-block 과 같은 계약).

export const LIFE_HISTORY_BLOCK_VERSION = 'life-history-block-v1';
export const LIFE_HISTORY_BLOCK_MAX_TOKENS = 600;
const MAX_EVENT_LINES = 12;

const DOMAIN_KO = Object.freeze({
  career: '직업', business: '사업', money: '재정', relationship: '관계', study: '학업',
  family: '가족', relocation: '이사·이동', social: '사람들·모임', other: '그 밖의 일',
});
const ENGINE_KO = Object.freeze({ saju: '사주', ziwei: '자미두수', western: '서양 점성', vedic: '베다 점성', sukuyo: '숙요' });
const OUTCOME_KO = Object.freeze({ good: '좋았다고 적음', bad: '힘들었다고 적음' });
const BLOCKED_DOMAINS = new Set(['health']);

// 보수적 토큰 추정(fortune.js estimateSajuAIPromptTokens 와 같은 식): 비ASCII·숫자는 한 글자 한 토큰, 나머지 ASCII 는 두 글자 한 토큰.
export function estimateLifeHistoryTokens(text) {
  let tokens = 0;
  let ascii = 0;
  for (const ch of String(text || '')) {
    const code = ch.codePointAt(0);
    if (code >= 0x80 || (code >= 0x30 && code <= 0x39)) tokens += 1;
    else ascii += 1;
  }
  return tokens + Math.ceil(ascii / 2);
}

const domainOk = (d) => typeof d === 'string' && d in DOMAIN_KO && !BLOCKED_DOMAINS.has(d);

// 엔진들이 받은(used) 사건을 (연도, 분야)로 모은다. 같은 칸에 좋음·힘듦이 섞이면 버린다(가드·블록 모두 단정하지 않는다).
function reportedFacts(calibration) {
  const cells = new Map();
  for (const engine of Object.values(calibration?.engines || {})) {
    for (const row of Array.isArray(engine?.used) ? engine.used : []) {
      if (!Number.isInteger(row?.year) || !domainOk(row.domain) || !OUTCOME_KO[row.outcome]) continue;
      const key = `${row.year}:${row.domain}`;
      const prev = cells.get(key);
      cells.set(key, prev && prev.outcome !== row.outcome ? { ...prev, outcome: 'conflict' } : { year: row.year, domain: row.domain, outcome: row.outcome });
    }
  }
  return [...cells.values()].filter((c) => c.outcome !== 'conflict').sort((a, b) => a.year - b.year || a.domain.localeCompare(b.domain));
}

function engineLine(engine, f) {
  const name = ENGINE_KO[engine] || engine;
  if (!f || !f.n) return '';
  if (f.status !== 'applied') return `- ${name}: 대조할 경험이 아직 적어(${f.n}건) 반영하지 않음`;
  const lean = f.direction === 'agree' ? '같은 방향 해석에 조금 더 무게' : f.direction === 'disagree' ? '이 체계의 시기 단정을 줄임' : '어느 쪽으로도 무게를 두지 않음';
  return `- ${name}: 같은 방향 ${f.agree}건·다른 방향 ${f.disagree}건(서로 다른 해 ${f.years}개) → ${lean}`;
}

/**
 * 서버 보정 결과로 만든 프롬프트 블록. 결정적이고 maxTokens(기본 600) 안이다. 쓸 사건이 없으면 ''.
 * @param {object} calibration computeLifeCalibration 결과(또는 캐시된 result)
 */
export function buildPersonalHistoryBlock(calibration, { maxTokens = LIFE_HISTORY_BLOCK_MAX_TOKENS } = {}) {
  try {
    const facts = reportedFacts(calibration);
    if (!facts.length) return '';
    const head = [
      '[사용자가 직접 적은 지난 경험 — 약한 참고 가중치]',
      '- 아래는 사용자가 스스로 기억해 적은 경험과, 그해 각 체계의 흐름 판단을 나란히 놓은 집계입니다. 확인된 기록이 아니라 본인의 기억입니다.',
      '- 해석을 확정하는 근거로 쓰지 말고, 같은 방향이면 조금 더 무게를 두고 어긋나면 단정을 줄이는 정도로만 반영하세요.',
      '- 사용자가 좋았다고 적은 해를 힘들었다고, 힘들었다고 적은 해를 좋았다고 단정하지 마세요. 어긋난 해도 결과를 평가하지 말고 그대로 받아들이세요.',
      '- 이 집계나 대조 건수를 사용자에게 수치로 보여 주지 마세요.',
      '경험한 해:',
    ];
    const eventLines = facts.slice(0, MAX_EVENT_LINES).map((f) => `- ${f.year}년 ${DOMAIN_KO[f.domain]}: ${OUTCOME_KO[f.outcome]}`);
    const engineLines = Object.keys(ENGINE_KO)
      .map((engine) => engineLine(engine, calibration?.engines?.[engine]?.status === 'available' ? calibration.engines[engine].overall : null))
      .filter(Boolean);
    const tail = engineLines.length ? ['체계별 대조:', ...engineLines] : [];
    // 상한을 넘으면 오래된 사건 줄부터 뺀다(머리말과 대조 줄은 유지). 그래도 넘으면 블록을 내지 않는다.
    const lines = [...eventLines];
    let text = [...head, ...lines, ...tail].join('\n');
    while (estimateLifeHistoryTokens(text) > maxTokens && lines.length > 1) {
      lines.shift();
      text = [...head, ...lines, ...tail].join('\n');
    }
    return estimateLifeHistoryTokens(text) <= maxTokens ? text : '';
  } catch {
    return '';
  }
}

/** 가드가 지킬 사실: 확실하다고 적고 엔진 대조에 쓰인 (연도, 분야, 좋음|힘듦). 메모는 없다. */
export function lifeHistoryGuardFacts(calibration) {
  try {
    return Object.freeze(reportedFacts(calibration).map((f) => Object.freeze({ ...f })));
  } catch {
    return Object.freeze([]);
  }
}

// 과거 단정 어휘. 같은 문장에 반대쪽 어휘도 있으면(좋고 나쁨을 함께 말함) 건드리지 않는다.
const NEGATIVE = /힘들었|힘든\s*(?:해|시기|때|한\s*해)|어려웠|어려운\s*(?:해|시기|때)|고비|시련|손실|손해를|실패|좌절|막혔|꼬였|나빴|불리했|흉한\s*(?:해|시기)|침체|정체기/u;
const POSITIVE = /좋았|순조로웠|순조로운\s*(?:해|시기)|풀렸|잘\s*풀린|상승기|성공|성취|도약|번창|유리했|호황|기회가\s*(?:열렸|많았)/u;
const DOMAIN_WORDS = Object.freeze({
  career: /직업|일|직장|커리어|업무|진로|승진|이직/u, business: /사업|창업|가게|거래/u, money: /재정|재물|돈|금전|수입|투자|재산/u,
  relationship: /관계|연애|인연|사랑|결혼|배우자|연인/u, study: /학업|공부|시험|합격|학교|진학/u, family: /가족|가정|부모|자녀|집안/u,
  relocation: /이사|이동|거처|이주|해외/u, social: /사람들|모임|인간관계|동료|친구/u, other: /(?!)/u,
});
// 🔴 짧게 둔다: 유료 품질 검사(hasRepeatedReportPassage)는 공백 뺀 24자 이상 문장이 챕터 사이에 되풀이되면 결과를 버린다.
//    챕터마다 같은 해를 고치면 이 문장이 여러 번 나오므로, 가장 긴 분야 이름에서도 24자 미만이어야 한다(테스트가 잰다).
const neutralSentence = (year, domain) => `${year}년 ${DOMAIN_KO[domain]} 흐름은 겪은 대로 보세요.`;

/**
 * 생성문 모순 가드. 문장이 (사용자가 적은 해)를 언급하면서 적은 결과의 반대를 단정하면 그 문장을 고정 중립 문장으로 바꾼다.
 * 같은 해의 두 번째 이후 위반 문장은 지운다(중립 문장 반복 방지). 그 해에 분야가 여럿이면 분야 낱말이 있어야 맞춘다.
 * 제목 줄(#)은 건드리지 않는다. 어떤 실패도 원문을 돌려준다(결과가 안 나오는 일은 없다).
 * @returns {{text: string, replaced: number, dropped: number}}
 */
export function guardLifeHistoryContradiction(text, facts) {
  const original = String(text ?? '');
  try {
    const list = Array.isArray(facts) ? facts.filter((f) => Number.isInteger(f?.year) && domainOk(f.domain) && OUTCOME_KO[f.outcome]) : [];
    if (!list.length || !original) return { text: original, replaced: 0, dropped: 0 };
    const byYear = new Map();
    for (const f of list) (byYear.get(f.year) || byYear.set(f.year, []).get(f.year)).push(f);
    const used = new Set();
    let replaced = 0;
    let dropped = 0;
    const fixLine = (line) => {
      if (/^\s*#/u.test(line)) return line;
      const parts = line.split(/(?<=[.!?。])(\s+)/u);
      const out = [];
      for (let i = 0; i < parts.length; i += 1) {
        const sentence = parts[i];
        if (i % 2 === 1) { out.push(sentence); continue; }
        const hit = findContradiction(sentence, byYear);
        if (!hit) { out.push(sentence); continue; }
        if (used.has(hit.year)) {
          dropped += 1;
          if (out.length && /^\s+$/u.test(out[out.length - 1])) out.pop();
          continue;
        }
        used.add(hit.year);
        replaced += 1;
        out.push(neutralSentence(hit.year, hit.domain));
      }
      return out.join('');
    };
    const next = original.split('\n').map(fixLine).join('\n');
    return { text: next, replaced, dropped };
  } catch {
    return { text: original, replaced: 0, dropped: 0 };
  }
}

function findContradiction(sentence, byYear) {
  for (const [year, facts] of byYear) {
    if (!new RegExp(`(?<!\\d)${year}\\s*년`, 'u').test(sentence)) continue;
    const neg = NEGATIVE.test(sentence);
    const pos = POSITIVE.test(sentence);
    if (neg === pos) continue;
    const candidates = facts.length === 1 ? facts : facts.filter((f) => DOMAIN_WORDS[f.domain].test(sentence));
    const opposite = candidates.find((f) => (f.outcome === 'good' && neg) || (f.outcome === 'bad' && pos));
    if (opposite) return opposite;
  }
  return null;
}
