/**
 * 꿀꿀 운세 브랜드 사실 정본. 2026-10-15 사용자 결정으로 공식 서비스명은 "꿀꿀 운세"다.
 *
 * 서비스 이름·운영자·캐릭터·공식 채널·과거 이름은 여기서만 정한다. 구조화 데이터
 * (lib/seo/siteSeo.ts, lib/structured-data.ts), 검색 엔티티(lib/seo/entity-registry.mjs),
 * 정적 셸 생성기(scripts/sync-legacy-static-to-public.mjs), llms.txt 생성기가 이 값을 읽는다.
 *
 * - "꿀꿀운세"는 붙여 쓴 별칭이다. 공식명 자리(title 접미사, og:site_name, WebSite.name 등)에 쓰지 않는다.
 * - 운영자 CODE DESTINY 는 서비스가 아니다. Organization 에만 쓰고 WebSite 별칭에 섞지 않는다.
 * - 과거 이름은 이력 설명에만 쓴다. 검색 신호(제목·사이트명·구조화 데이터 이름)에 다시 나오면 테스트가 실패한다.
 * - 등록 상호(legalName)는 lib/site-policy-config.js 의 BUSINESS_IDENTITY 가 정본이다. 여기서 복제하지 않는다.
 *
 * 값을 바꾸면 version 을 올리고 reviewedAt 을 갱신한다. 절차는 docs/seo/brand-facts.md.
 * 브라우저·Next·Node 스크립트·API worker 가 모두 읽으므로 의존성 없는 ESM 으로 둔다.
 */

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const BRAND_FACTS = deepFreeze({
  version: 3,
  reviewedAt: "2026-10-31",
  service: {
    name: "꿀꿀 운세",
    alternateNames: ["꿀꿀운세"],
    siteUrl: "https://code-destiny.com",
    homeUrl: "https://code-destiny.com/",
    appEntryPath: "/ggulggul/",
    summary: "CODE DESTINY가 운영하는 사주·명리학·자미두수·숙요점·베다점·서양 점성술·타로 운세 상담 서비스",
  },
  operator: {
    name: "CODE DESTINY",
    nameKo: "코드 데스티니",
    alternateNames: ["코드 데스티니", "Code Destiny", "코드데스티니", "CodeDestiny"],
  },
  characters: [
    { key: "yeoni", name: "꽃돼지 연이", role: "꿀꿀 운세의 안내 캐릭터" },
    { key: "neo", name: "네오", role: "대표 명리학자 박병하의 활동명" },
    // 2026-10-16 사용자 결정: 영냥이 상담 서비스의 대표 공개 이름은 "운세보는 영냥이"다.
    // 꿀꿀 운세 안의 상담 서비스 이름이다. 사이트 별칭(service.alternateNames)에 넣지 않는다.
    {
      key: "yeongnyangi",
      name: "영냥이",
      serviceName: "운세보는 영냥이",
      alternateNames: ["사주보는 고양이 영냥이", "운세 보는 영냥이"],
      role: "꿀꿀 운세의 사주보는 고양이 상담 서비스",
      path: "/yeongnyangi/",
    },
  ],
  // 운영자가 소유를 확인한 외부 프로필(2026-10-15). 순서는 푸터 렌더 순서다.
  sameAs: [
    { key: "youtube", url: "https://www.youtube.com/@CodeDestiny_Official" },
    { key: "threads", url: "https://www.threads.com/@codedestiny_official" },
    { key: "instagram", url: "https://www.instagram.com/codedestiny_official/" },
    { key: "naverBlog", url: "https://blog.naver.com/neosaju" },
    // 2026-10-31 공개 글과 기존 관리자 접근 권한으로 공식 운영을 확인했다.
    { key: "wordpress", url: "https://ggulggulinsights.wordpress.com/" },
    { key: "x", url: "https://x.com/sajuseongj97497" },
  ],
  formerNames: ["사주 달빛 정원", "사주 달빛정원", "꿀꿀 사주", "꿀꿀사주"],
  // 과거 이름과 글자가 겹치지만 현재 기능 이름이라 과거 이름으로 세지 않는다.
  protectedNames: ["나의 달빛 정원"],
  historyKo:
    "꿀꿀 운세는 이전에 ‘사주 달빛 정원’과 ‘꿀꿀 사주’라는 이름을 쓴 적이 있습니다. 지금 공식 서비스명은 ‘꿀꿀 운세’이고, 붙여 쓴 ‘꿀꿀운세’도 같은 서비스입니다.",
  // 운영자 확인 전에는 공개 사실로 쓰지 않는다.
  pendingConfirmation: [
    "카카오톡 채널을 공식 외부 프로필(sameAs)로 선언할지",
    "네오가 1:1 상담을 새로 받는지",
    "콘텐츠 검수에서 사람이 확인하는 범위",
  ],
});

/** 과거 이름이 들어 있으면 그 이름들을 돌려준다. 보호된 현재 기능 이름은 먼저 지운다. */
export function findFormerBrandNames(text) {
  let value = String(text || "");
  for (const name of BRAND_FACTS.protectedNames) value = value.split(name).join("");
  return BRAND_FACTS.formerNames.filter((name) => value.includes(name));
}
