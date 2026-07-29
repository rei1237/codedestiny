// Next.js 는 확장자 없는 상대 임포트(`./articles`)를 해석하지만 순수 node ESM 은 못 한다.
// 빌드 스크립트가 app/ 하위 모듈을 소스 그대로 import 할 수 있게 확장자를 보완한다.
//
// 왜 필요한가: 사이트맵 생성기가 글 목록을 정규식으로 긁으면 페이지 생성 조건
// (app/insights/[slug]/page.js 의 uniqueArticles — 본문 유무 검사)을 재현할 수 없어
// 사이트맵에만 있고 실제로는 404 인 URL 이 생긴다. 실제 모듈을 import 해서
// 같은 판정을 쓰는 것이 유일하게 어긋나지 않는 방법이다.
const CANDIDATE_SUFFIXES = [".js", ".mjs", ".jsx", "/index.js"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(specifier);
    if (!isRelative || hasExtension) throw error;

    for (const suffix of CANDIDATE_SUFFIXES) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        // 다음 후보 확장자로 계속
      }
    }
    throw error;
  }
}
