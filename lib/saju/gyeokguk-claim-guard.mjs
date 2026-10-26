// 격국 주장 가드. LLM 문장이 엔진이 판정한 최종 격국과 다른 격국을 단정하면 고정 템플릿 문장으로 바꾸거나 지운다.
// 격국은 원국으로만 판정한다(lib/saju/natal-core). 이 가드는 재생성하지 않고 문장 단위로만 고친다.
// - 기각 후보를 설명하는 문장, fact와 같은 방향의 부정문("가색격은 아니야"), 조건·정의 설명은 둔다.
// - fact가 없거나 '미정'이면 격국 이름을 쓴 문장을 모두 지운다(fail-closed).
// - 정격(일반격)과 특수격 사이의 위아래, 가종을 부정적 성격으로 그리는 문장은 fact와 무관하게 지운다.

export const GYEOKGUK_GUARD_VERSION = 'gyeokguk-guard-v1';

// 이름 → 정규 이름. 긴 이름이 먼저 맞도록 정렬해서 쓴다.
const GENERAL = {
  정관격: '정관격', 편관격: '편관격', 칠살격: '편관격', 정재격: '정재격', 편재격: '편재격', 식신격: '식신격', 상관격: '상관격',
  정인격: '정인격', 인수격: '정인격', 편인격: '편인격', 건록격: '건록격', 양인격: '양인격', 월겁격: '월겁격', 월비격: '월겁격',
};
const SPECIAL = {
  가종재격: '가종재격', 가종살격: '가종살격', 종재격: '종재격', 종살격: '종살격', 종관격: '종살격', 종아격: '종아격',
  종강격: '종강격', 종왕격: '종왕격', 가색격: '가색격', 곡직격: '곡직격', 염상격: '염상격', 종혁격: '종혁격', 윤하격: '윤하격',
  화토격: '화토격', 화금격: '화금격', 화수격: '화수격', 화목격: '화목격', 화화격: '화화격',
};
// 계열 이름은 fact가 그 계열이면 맞는 말이다.
const GROUP = {
  가종격: 'ga', 가종: 'ga', 진종격: 'trueFollow', 진종: 'trueFollow', 종격: 'follow', 화기격: 'transform', 전왕격: 'vigorous',
  일반격: 'general', 내격: 'general', 정격: 'general', 정팔격: 'general', 특수격: 'special', 외격: 'special', 변격: 'special',
};
const HANJA = {
  正官格: '정관격', 偏官格: '편관격', 七殺格: '편관격', 七煞格: '편관격', 正財格: '정재격', 偏財格: '편재격', 食神格: '식신격', 傷官格: '상관격',
  正印格: '정인격', 印綬格: '정인격', 偏印格: '편인격', 建祿格: '건록격', 建禄格: '건록격', 羊刃格: '양인격', 陽刃格: '양인격', 月劫格: '월겁격',
  假從財格: '가종재격', 假從殺格: '가종살격', 從財格: '종재격', 從殺格: '종살격', 從煞格: '종살격', 從兒格: '종아격', 從强格: '종강격', 從強格: '종강격',
  從旺格: '종왕격', 稼穡格: '가색격', 曲直格: '곡직격', 炎上格: '염상격', 從革格: '종혁격', 潤下格: '윤하격', 化氣格: '화기격', 從格: '종격',
};
const NAMES = [...Object.keys(GENERAL), ...Object.keys(SPECIAL), ...Object.keys(GROUP), ...Object.keys(HANJA)].sort((a, b) => b.length - a.length);
// 앞에 한글이 붙으면 다른 낱말이다(부정격·규정격). '가종격' 안의 '종격'도 이렇게 걸러진다.
const NAME_RX = () => new RegExp(`(?<![가-힣一-龥])(${NAMES.join('|')})(?:\\s*\\([^()]{1,12}\\))?`, 'gu');

const OTHER_PERSON = /상대|그 사람|그분|파트너|두 사람|둘 다|연인|배우자|아이|부모/u;
// 조건·정의·일반론. 기각 후보 설명도 여기서 허용한다.
const EXPLANATION = /라면|이면|으면|더라도|흔히|일반적으로|보통은|대개|이란|란\s|이라는\s*(?:이름|말|뜻)|을\s*말해|를\s*말해|을\s*말합|를\s*말합|뜻해|뜻합|가리켜|가리킵|이라고\s*(?:해|부르|불러|합)|라고\s*(?:해|부르|불러|합)/u;
const CANDIDATE = /후보|기각|대신|보다는|이\s*아니라|가\s*아니라|탈락|검토|따져\s*봤|따져\s*보|가능성|성립\s*조건|조건을|조건이/u;
const NEGATED_AFTER = /^\s*(?:이|가|은|는|으로|로|에)?\s*(?:아니|아닌|않|안\s|해당하지|성립하지|성립되지|보지\s*않|볼\s*수\s*없|들지\s*않|속하지)/u;
// 정격·특수격 위계와 가종 비하. fact와 무관하게 지운다.
const CLASS = '(?:정격|일반격|내격|정팔격|특수격|외격|변격|종격)';
const HIERARCHY = new RegExp(`${CLASS}[^.!?。]{0,24}(?:보다|에\\s*비해)[^.!?。]{0,16}(?:높|낮|귀하|귀한|좋|나아|나은|우월|열등|위|아래|특별|급|격이)|${CLASS}[^.!?。]{0,16}(?:귀격|천격|상격|하격|격이\\s*(?:높|낮|떨어)|급이\\s*(?:높|낮|다르)|선택받|비범한\\s*(?:사람|사주|팔자)|평범한\\s*(?:사람|사주|팔자))`, 'u');
const GA_NEGATIVE = /(?:가종|假從)[^.!?。]{0,24}(?:가짜|거짓|위선|허세|허상|열등|하급|모자라|결함|흠이|약점이\s*많|불완전한\s*(?:사람|성격)|성격이\s*(?:불안정|나쁘|약하)|믿을\s*수\s*없|흉격|나쁜\s*격)|가짜\s*종격/u;

const baseName = (name) => String(name || '').replace(/\s*\([^()]*\)\s*$/u, '').trim();
const canonical = (word) => HANJA[word] || GENERAL[word] || SPECIAL[word] || word;

/** 저장된 격국 분석(finalGyeokguk·finalType·candidates)을 가드 fact로 바꾼다. 미정·판정 보류면 null. */
export function gyeokgukClaimFact(gyeokguk) {
  const name = baseName(gyeokguk?.finalGyeokguk);
  const type = String(gyeokguk?.finalType || '');
  if (!name || name === '미정' || !(name in GENERAL || name in SPECIAL) || !['일반격', '특수격'].includes(type)) return null;
  const reason = typeof gyeokguk?.judgmentReason === 'string' ? gyeokguk.judgmentReason.trim() : '';
  return { name: canonical(name), type, isGa: name.startsWith('가종'), reason };
}

const groupOf = (name) => name in GENERAL ? 'general'
  : /^가종/u.test(name) ? 'ga' : /^종[재살]/u.test(name) ? 'trueFollow' : /^종[아강왕]/u.test(name) ? 'followOther'
    : /^화.격$/u.test(name) ? 'transform' : 'vigorous';
function consistent(word, fact) {
  if (word in GROUP) {
    const group = GROUP[word], own = groupOf(fact.name);
    if (group === 'general') return fact.type === '일반격';
    if (group === 'special') return fact.type === '특수격';
    if (group === 'follow') return ['ga', 'trueFollow', 'followOther'].includes(own);
    return group === own;
  }
  return canonical(word) === fact.name;
}

/** 프롬프트에 그대로 싣는 고정 격국 문장. */
export function gyeokgukTemplateLine(fact, style = 'plain') {
  if (!fact) return '';
  const verb = style === 'formal' ? '봅니다' : style === 'polite' ? '봐요' : '봐';
  return `격국은 ${fact.name}(${fact.type})으로 ${verb}.`;
}
/** 영냥이·본 화면 프롬프트가 함께 쓰는 격국 규칙 문장. */
export function gyeokgukPromptRules(fact, style = 'plain') {
  const shared = [
    '일반격(정격)과 특수격 사이에 높고 낮음·귀천·급을 말하지 않는다. 둘은 구조를 읽는 방식이 다를 뿐이다.',
    '가종(假從)은 성립 조건의 이름이며 사람의 성격이나 결함이 아니다. 가짜·불완전·불안정한 성격처럼 묘사하지 않는다.',
  ];
  if (!fact) return ['이 명식에는 확정된 격국 판정값이 없다(출생시간 미상 또는 판정 보류). 격국·종격·가종 이름을 쓰지 않는다.', ...shared];
  return [
    `격국 고정 문장: "${gyeokgukTemplateLine(fact, style)}" 격국 이름과 분류는 이 문장과 같은 뜻으로만 쓴다.${fact.reason ? ` 판단 근거: ${fact.reason}` : ''}`,
    '격국 후보는 월령에서 검토했지만 채택하지 않은 후보로만 말한다. 다른 격국·종격·가종·화기격을 새로 판정하거나 과거 경험으로 바꾸지 않는다.',
    ...shared,
  ];
}
const styleOf =(sentence) => /니다[.!?…~\s]*$/u.test(sentence) ? 'formal' : /요[.!?…~\s]*$/u.test(sentence) ? 'polite' : 'plain';

/**
 * 한 문장을 검사한다. keep(그대로) · replace(템플릿 문장) · drop(삭제).
 * fact는 gyeokgukClaimFact 결과(null이면 fail-closed).
 */
export function checkGyeokgukSentence(sentence, fact) {
  const text = String(sentence || '');
  if (HIERARCHY.test(text) || GA_NEGATIVE.test(text)) return { action: 'drop' };
  const mentions = [...text.matchAll(NAME_RX())];
  if (!mentions.length || OTHER_PERSON.test(text)) return { action: 'keep' };
  if (!fact) return { action: 'drop' };
  const explained = EXPLANATION.test(text), candidate = CANDIDATE.test(text);
  const wrong = mentions.some((m) => {
    const ok = consistent(m[1], fact), negated = NEGATED_AFTER.test(text.slice(m.index + m[0].length));
    if (ok) return negated && !candidate;
    return !negated && !explained && !candidate;
  });
  return wrong ? { action: 'replace', text: gyeokgukTemplateLine(fact, styleOf(text)) } : { action: 'keep' };
}

/**
 * 줄·문장 단위로 텍스트 전체를 고친다. 템플릿 문장은 한 텍스트에 한 번만 넣고, 이후 어긋난 문장은 지운다.
 * 제목 줄(#)은 템플릿으로 바꾸지 않고 지운다. 결과가 비면 원문을 돌려준다(빈 칸으로 통과시키지 않는다).
 */
export function correctGyeokgukText(text, fact) {
  if (typeof text !== 'string' || !text) return { text, replaced: 0, dropped: 0 };
  let replaced = 0, dropped = 0, templated = false;
  const lines = text.split('\n').map((line) => {
    const heading = /^\s*#/u.test(line);
    const parts = heading ? [line] : line.split(/(?<=[.!?。？！])(?=\s)/u);
    const kept = parts.map((part) => {
      const verdict = checkGyeokgukSentence(part, fact);
      if (verdict.action === 'keep') return part;
      if (verdict.action === 'replace' && !heading && !templated) {
        templated = true; replaced++;
        return (part.match(/^\s*(?:[-*•]\s+|\d+[.)]\s+)?/u)?.[0] || '') + verdict.text;
      }
      dropped++;
      return '';
    });
    const joined = kept.join('');
    // 첫 문장이 빠져도 줄의 원래 들여쓰기만 남긴다.
    return joined === line ? line : (line.match(/^[^\S\n]*/u)?.[0] || '') + joined.replace(/^[^\S\n]+/u, '');
  });
  const next = lines.join('\n').replace(/\n{3,}/gu, '\n\n').trim();
  if (!next) return { text, replaced: 0, dropped: 0 };
  return replaced || dropped ? { text: next, replaced, dropped } : { text, replaced: 0, dropped: 0 };
}
