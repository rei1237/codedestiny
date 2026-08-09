// 서버 가격표(worker/lib/paid-feature-registry.js) 조회만 담는 최소 모듈.
//
// serviceFeatureRegistry.ts 에 같이 있었는데, 그 파일은 12로케일 카피 표까지 안고 있어
// 9,504줄(388KB)이다. 타로 클라이언트 4곳이 가격 조회 하나 때문에 그걸 통째로 끌어와
// 285KB 청크가 /tarot/{crystal-soul,mindscan,numerology,prompt-maker} 초기 로드에 실렸다.
// 그래서 조회 함수만 떼어냈다. serviceFeatureRegistry 는 이 모듈을 다시 export 하므로
// 기존 import 경로도 그대로 동작한다.
import { FEATURE_KEY_PRICE_TABLE, normalizePaidFeatureKey } from "../../worker/lib/paid-feature-registry.js";

type PriceSpec = { cost?: number };

export function lookupServerCoinPrice(featureKey?: string): number | undefined {
  if (!featureKey) return undefined;
  const normalized = normalizePaidFeatureKey(featureKey);
  const direct = (FEATURE_KEY_PRICE_TABLE as Record<string, PriceSpec>)[normalized] || (FEATURE_KEY_PRICE_TABLE as Record<string, PriceSpec>)[featureKey];
  const value = Number(direct?.cost);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}
