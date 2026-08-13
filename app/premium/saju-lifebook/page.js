// metadata 까지 함께 내보내야 원본의 noindex + /life-book-ai canonical 이 따라온다.
// 기본 export 만 넘기면 app/layout.js 기본값(홈 canonical + index,follow)이 그대로 붙는다.
export { default, metadata } from "../../saju/lifebook/page";