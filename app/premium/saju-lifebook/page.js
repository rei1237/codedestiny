// metadata 까지 함께 내보내야 원본의 noindex + /life-book-ai canonical 이 따라온다.
// 기본 export 만 넘기면 app/layout.js 기본값(홈 canonical + index,follow)이 그대로 붙는다.
// 🔴 title·description 만 이 주소용으로 덮는다 — 원본과 바이트 동일한 제목·설명을 내보내면
//    두 URL 이 네이버 「동일 제목 / 동일 설명문」 집계에 함께 들어간다(2026-08-28 실측).
import { metadata as sourceMetadata } from "../../saju/lifebook/page";

export { default } from "../../saju/lifebook/page";

export const metadata = {
  ...sourceMetadata,
  title: "프리미엄 사주 라이프북 — 인생 총운으로 이동",
  description:
    "프리미엄 사주 라이프북 주소는 /life-book-ai 로 옮겨졌습니다. 이 주소는 이동 안내만 합니다.",
};