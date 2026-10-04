// 9 케미 유형 + 선착순 판정 규칙. 규칙을 바꾸면 CHEMI_RULES_VERSION 을 올린다(결과 재현성 계약).
// 유형 판정에는 일주 신호만 쓴다. 연·월지 신호는 signalStrength 에만 반영된다.
import { hasSignal } from "./signals.js";

export const CHEMI_RULES_VERSION = "chemi-rules-1.0.0";

export const CHEMI_TYPES = Object.freeze([
  Object.freeze({ id: "telepathy", order: 1, nameKo: "말 안 해도 통하는 웃음 버튼", shortKo: "텔레파시", ruleKo: "일간 천간합" }),
  Object.freeze({ id: "same-wave", order: 2, nameKo: "취향 같아서 밤샘 각", shortKo: "같은 파장", ruleKo: "일간 같은 오행" }),
  Object.freeze({ id: "accel-brake", order: 3, nameKo: "한 명은 직진, 한 명은 브레이크", shortKo: "액셀·브레이크", ruleKo: "일지 충 또는 일간 충" }),
  Object.freeze({ id: "locked-in", order: 4, nameKo: "눈빛만 봐도 합 맞는 팀플", shortKo: "합 맞는 팀플", ruleKo: "일지 육합 또는 삼합" }),
  Object.freeze({ id: "quiet-care", order: 5, nameKo: "조용히 챙겨주는 든든함", shortKo: "조용한 챙김", ruleKo: "일간 상생 + 부족한 오행 보완" }),
  Object.freeze({ id: "hype-charger", order: 6, nameKo: "응원 텐션 자동 충전", shortKo: "텐션 충전", ruleKo: "일간 상생 + 음양 반대(또는 도화·홍염)" }),
  Object.freeze({ id: "push-pull", order: 7, nameKo: "티격태격인데 또 보고 싶은", shortKo: "티키타카", ruleKo: "일지 형·파·해·원진" }),
  Object.freeze({ id: "cross-learn", order: 8, nameKo: "다른 결이라 서로 배우는", shortKo: "다른 결", ruleKo: "일간 상극" }),
  Object.freeze({ id: "slow-burn", order: 9, nameKo: "천천히 스며드는 잔잔함", shortKo: "슬로우 번", ruleKo: "뚜렷한 일주 신호 없음" }),
]);

export const CHEMI_TYPE_IDS = Object.freeze(CHEMI_TYPES.map((t) => t.id));
export const CHEMI_TYPE_BY_ID = Object.freeze(Object.fromEntries(CHEMI_TYPES.map((t) => [t.id, t])));

/**
 * 선착순 규칙. 위에서부터 처음 맞는 유형이 결과다.
 * @param {readonly {key:string}[]} signals deriveSignals 결과
 * @returns {{typeId:string, matchedSignalKeys:string[]}}
 */
export function resolveChemiType(signals) {
  const has = (key) => hasSignal(signals, key);
  const pick = (typeId, keys) => ({ typeId, matchedSignalKeys: keys.filter((k) => has(k)) });

  if (has("dayStem.hap")) return pick("telepathy", ["dayStem.hap"]);
  if (has("dayStem.same")) return pick("same-wave", ["dayStem.same"]);
  if (has("dayBranch.chung") || has("dayStem.chung")) return pick("accel-brake", ["dayBranch.chung", "dayStem.chung"]);
  if (has("dayBranch.yukhap") || has("dayBranch.samhap")) return pick("locked-in", ["dayBranch.yukhap", "dayBranch.samhap"]);
  if (has("dayStem.generate") && has("element.complement")) return pick("quiet-care", ["dayStem.generate", "element.complement"]);
  if (has("dayStem.generate") && (has("sinsal.dohwa") || has("sinsal.hongyeom") || has("yinYang.opposite"))) {
    return pick("hype-charger", ["dayStem.generate", "sinsal.dohwa", "sinsal.hongyeom", "yinYang.opposite"]);
  }
  if (has("dayBranch.hyeong") || has("dayBranch.pa") || has("dayBranch.hae") || has("dayBranch.wonjin")) {
    return pick("push-pull", ["dayBranch.hyeong", "dayBranch.pa", "dayBranch.hae", "dayBranch.wonjin"]);
  }
  if (has("dayStem.control")) return pick("cross-learn", ["dayStem.control"]);
  return { typeId: "slow-burn", matchedSignalKeys: [] };
}
