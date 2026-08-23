import { createDestinyFlowerEngine, registerDestinyFlowerEngineGlobals } from '../services/destiny-flower-engine.js?v=20260625-df-i18n';
import { registerFlowerArtGlobals } from '../services/destiny-flower-art.js?v=20260823-df-art';

export function bootstrapDestinyFlower(globalObject = window) {
  // Preserve existing global API surface for legacy inline-runtime callers.
  const engine = createDestinyFlowerEngine();
  registerDestinyFlowerEngineGlobals(globalObject, engine);
  // 결과 화면의 꽃 그림. 인라인 런타임의 _dfBuildFlowerSvgMarkup 이 window.CDFlowerArt 를 찾는다.
  // 여기서 함께 올리는 이유는 셸에 <script> 를 추가하지 않기 위해서다(로케일 미러 6본을 안 건드린다).
  registerFlowerArtGlobals(globalObject);
}
