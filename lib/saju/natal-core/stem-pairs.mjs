// 십간 짝 규칙(STEM-PAIR-01). 같은 오행 생극이라도 십간 짝에 따라 힘과 성질이 다르다.
// 표에는 적천수·궁통보감 계열에서 널리 받아들이는 규칙만 둔다. 학파마다 갈리는 규칙(예: 丁→辛 치명 판정)은 넣지 않는다.
// 표에 없는 쌍은 오행 생극 규칙으로 돌아간다. 원국 판정(natal-core)의 글자 수·오행은 바꾸지 않는다.
import { STEM_ORDER, STEM_EL, STEM_HAP, STEM_CHUNG, GENERATES, CONTROLS, EL_KO } from './tables.mjs';

export const STEM_PAIRS_VERSION = 'stem-pairs-v1';

// 키는 "작용하는 글자 + 받는 글자"다. strength: strong | normal | weak | harmful-reverse.
// harmful-reverse: 오행으로는 극(제어)이지만 실제로는 제어하지 못하고 흐리게·가리게 하는 해로운 작용.
// effect: 받는 글자 입장에서 helps | hurts | neutral.
export const STEM_PAIR_RULES = Object.freeze({
  庚甲: { strength: 'strong', effect: 'hurts', note: '庚金은 甲木을 쪼갤 만큼 강하게 극한다(庚劈甲)', source: '궁통보감 甲木: 庚金劈甲' },
  辛甲: { strength: 'weak', effect: 'hurts', note: '辛金은 甲木을 쪼개지 못하고 가지를 다듬는 정도다', source: '궁통보감 甲木 통설: 辛不能劈甲' },
  辛乙: { strength: 'strong', effect: 'hurts', note: '乙木은 庚과는 합하지만 辛을 만나면 직접 상한다', source: '적천수·궁통보감 乙木 통설: 乙木畏辛' },
  戊壬: { strength: 'strong', effect: 'hurts', note: '戊土는 壬水의 제방이 되어 강하게 막는다(戊土制壬)', source: '궁통보감 壬水: 戊土為堤' },
  己壬: { strength: 'harmful-reverse', effect: 'hurts', note: '己土는 壬水를 막지 못하고 오히려 흐리게 만든다(己土濁壬)', source: '궁통보감 壬水: 己土濁壬' },
  丁庚: { strength: 'normal', effect: 'helps', note: '丁火는 庚金을 단련해 쓸모 있는 그릇으로 만든다(丁火煉庚)', source: '궁통보감 庚金: 用丁煉金' },
  癸丙: { strength: 'harmful-reverse', effect: 'hurts', note: '癸水는 丙火를 조절하지 못하고 햇빛을 가린다(癸水晦丙)', source: '궁통보감 丙火: 癸水晦光' },
  壬丙: { strength: 'normal', effect: 'helps', note: '壬水는 丙火를 비춰 더 빛나게 한다(江湖輔映)', source: '궁통보감 丙火: 專用壬水, 水輔陽光' },
  甲戊: { strength: 'normal', effect: 'helps', note: '甲木은 굳은 戊土를 뚫어 소통시킨다(甲木疏土)', source: '궁통보감 戊土: 甲木疏土' },
  癸丁: { strength: 'strong', effect: 'hurts', note: '癸水는 丁火를 꺼뜨릴 만큼 직접 상하게 한다', source: '적천수 丁火 통설: 丁癸相沖' },
  甲丁: { strength: 'strong', effect: 'helps', note: '甲木은 丁火를 오래 살리는 땔감이다(甲木引丁)', source: '적천수 丁火: 如有嫡母' },
  乙丁: { strength: 'weak', effect: 'helps', note: '젖은 乙木은 丁火를 잘 살리지 못한다(濕乙傷丁)', source: '궁통보감 丁火: 濕乙傷丁' },
});

function elementRelation(a, b) {
  const ea = STEM_EL[a], eb = STEM_EL[b];
  if (STEM_HAP[a]?.[0] === b) return { relation: 'combine', direction: 'mutual', effect: 'neutral', note: `${a}${b} 천간합(${EL_KO[STEM_HAP[a][1]]})` };
  if (STEM_CHUNG[a] === b) {
    const forward = CONTROLS[ea] === eb;
    return { relation: 'clash', direction: forward ? 'forward' : 'reverse', effect: forward ? 'hurts' : 'neutral', note: `${a}${b} 천간충` };
  }
  if (ea === eb) return { relation: 'same', direction: 'mutual', effect: 'neutral', note: `${a}·${b} 같은 ${EL_KO[ea]}` };
  if (GENERATES[ea] === eb) return { relation: 'generate', direction: 'forward', effect: 'helps', note: `${a}가 ${b}를 생함` };
  if (GENERATES[eb] === ea) return { relation: 'generate', direction: 'reverse', effect: 'neutral', note: `${b}가 ${a}를 생함` };
  if (CONTROLS[ea] === eb) return { relation: 'control', direction: 'forward', effect: 'hurts', note: `${a}가 ${b}를 극함` };
  return { relation: 'control', direction: 'reverse', effect: 'neutral', note: `${b}가 ${a}를 극함` };
}

function build(a, b) {
  const base = elementRelation(a, b);
  const forwardRule = STEM_PAIR_RULES[a + b];
  const reverseRule = !forwardRule && STEM_PAIR_RULES[b + a];
  if (forwardRule) return { ...base, direction: base.direction === 'mutual' ? 'mutual' : 'forward', strength: forwardRule.strength, effect: forwardRule.effect, note: forwardRule.note, source: forwardRule.source, rule: a + b };
  // 역방향은 받는 쪽(a)에서 본 같은 규칙이다. effect는 b 입장이므로 a의 effect로 옮기지 않는다.
  if (reverseRule) return { ...base, direction: 'reverse', strength: reverseRule.strength, effect: 'neutral', note: reverseRule.note, source: reverseRule.source, rule: b + a };
  return { ...base, strength: 'normal', source: '오행 생극 기본 규칙', rule: null };
}

export const STEM_PAIR_TABLE = Object.freeze(Object.fromEntries(
  STEM_ORDER.flatMap((a) => STEM_ORDER.map((b) => [a + b, Object.freeze(build(a, b))])),
));

// a가 b에게 하는 작용. direction이 reverse면 b가 a에게 작용하는 관계다.
export function stemPairRelation(a, b) {
  return STEM_PAIR_TABLE[String(a) + String(b)] || null;
}
