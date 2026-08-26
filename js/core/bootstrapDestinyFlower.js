import { registerFlowerArtGlobals } from '../services/destiny-flower-art.js?v=build-f29c3ac71258';

/**
 * 🔴 매칭 엔진은 여기서 올리지 않는다. 2026-08-24 에 `worker/lib/destiny-flower-engine.js` 로
 * 옮겼다 — 결제는 서버가 차감하는데 결과를 브라우저가 만들고 있어서 콘솔로 우회가 됐다.
 * 정적 호스팅에서는 `js/**` 아래 파일이 URL 로 그냥 열리므로 import 를 끊는 것만으로는
 * 부족했고, 파일 자체를 워커로 옮겨야 했다. 매칭 결과는 `POST /api/destiny-flower/match` 만
 * 준다. 브라우저에 남는 것은 결과를 그리는 꽃 아트뿐이다.
 */
export function bootstrapDestinyFlower(globalObject = window) {
  // 결과 화면의 꽃 그림. 인라인 런타임의 _dfBuildFlowerSvgMarkup 이 window.CDFlowerArt 를 찾는다.
  // 여기서 올리는 이유는 셸에 <script> 를 추가하지 않기 위해서다(로케일 미러 6본을 안 건드린다).
  registerFlowerArtGlobals(globalObject);
}
