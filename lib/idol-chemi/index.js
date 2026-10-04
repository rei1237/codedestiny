// 최애 케미 공개 진입점: 파트너 해석 → 결정론 엔진 → 결정론 카피. 워커와 Next 가 같은 코드를 쓴다.
import { resolvePartner } from "./data/partners.js";
import { computeChemi } from "./engine/index.js";
import { assembleChemiCopy, COPY_VERSION } from "./copy/index.js";

export * from "./data/partners.js";
export * from "./engine/index.js";
export { assembleChemiCopy, COPY_VERSION, ENTERTAINMENT_NOTICE, LABELS } from "./copy/index.js";

/**
 * @param {{user:object, partner:{kind:string,id:string}, referenceDate:string}} input
 * @returns {{result:object, copy:object}}
 */
export function runChemi(input) {
  const partner = resolvePartner(input && input.partner);
  if (!partner) throw new Error("IDOL_CHEMI_PARTNER_UNKNOWN");
  const result = computeChemi({ user: input.user, partner, referenceDate: input.referenceDate });
  const copy = assembleChemiCopy(result);
  return { result, copy };
}
