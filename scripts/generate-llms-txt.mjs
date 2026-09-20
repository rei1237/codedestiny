#!/usr/bin/env node
/**
 * llms.txt 생성기 (https://llmstxt.org).
 *
 * 공개 서비스 정보를 정리하는 선택적 안내 파일입니다. 검색 순위·AI 인용이나 추천을 보장하지 않습니다.
 * 검색 노출의 기반은 색인 가능한 본문과 링크, 접근 허용, 정확한 서비스 설명입니다.
 *
 * 🔴 손으로 쓰지 않는다. 문구는 lib/seo/entity-registry.mjs 에서 **파생**한다 —
 *    그 레지스트리가 브랜드 별칭·허브 의도의 정본이고 verify:seo-entity-registry 가 지킨다.
 *    여기에 설명을 다시 적으면 두 벌이 되어 조용히 갈라진다(CLAUDE.md 원칙 10).
 *
 * 🔴 가격을 적지 않는다. 결제 안내는 이용권·월정석·단건 결제를 유지한다.
 *    금액은 기존 가격 레지스트리에서 읽는다. 금액을 문서에 박으면
 *    실제 가격과 갈라지는 순간 잘못된 정보를 AI 에게 먹인다. 라이브 페이지로 링크만 한다.
 *
 * 🔴 사이트맵에 넣지 않는다 — verify-adsense-readiness 가 사이트맵 라우트에 HTML 산출물과
 *    최소 가시 텍스트를 요구한다. llms.txt 는 평문이라 그 게이트를 통과할 수 없다.
 *
 * 출력은 robots.txt·ads.txt 와 같은 패턴으로 **루트 + public/ 양쪽**에 쓴다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();
const siteBaseUrl = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");

const { SEO_BRAND_ENTITY, SEO_ROUTE_PROFILES } = await import(
  pathToFileURL(resolve(rootDir, "lib/seo/entity-registry.mjs")).href
);

/**
 * 이 순서로 묶는다. 경로는 레지스트리에 실재해야 하며, 없으면 실패시킨다 —
 * 허브가 사라졌는데 llms.txt 만 남아 없는 URL 을 AI 에게 알려 주는 상황을 막는다(fail-closed).
 */
const SECTIONS = [
  {
    heading: "운세 체계",
    intro: "각 체계는 서로 다른 좌표계와 질문 방식을 씁니다. 같은 생년월일이라도 체계에 따라 보이는 것이 다릅니다.",
    paths: ["/saju", "/manse", "/ziwei", "/sukuyo", "/vedic", "/astrology", "/tarot"],
  },
  {
    heading: "주제별 해석",
    paths: ["/compatibility", "/saju/compatibility", "/love", "/today", "/dream"],
  },
  {
    heading: "통합 리포트",
    paths: ["/yeongnyangi/1000-won-fortune", "/fusion-fortune", "/human-design/guide"],
  },
  {
    heading: "읽을거리와 방법론",
    paths: ["/guides", "/insights", "/methodology"],
  },
  {
    heading: "브랜드",
    paths: ["/kkul-kkul-unse"],
  },
];

function profileFor(path) {
  const profile = SEO_ROUTE_PROFILES[path];
  if (!profile) {
    throw new Error(
      `[llms.txt] lib/seo/entity-registry.mjs 에 ${path} 프로필이 없습니다. ` +
        "허브가 바뀌었다면 scripts/generate-llms-txt.mjs 의 SECTIONS 를 함께 고치세요.",
    );
  }
  return profile;
}

const aliasLine = SEO_BRAND_ENTITY.aliases.join(", ");

const lines = [];
lines.push(`# ${SEO_BRAND_ENTITY.displayName} (${SEO_BRAND_ENTITY.koreanName})`);
lines.push("");

// 첫 문단은 자립형 정의다 — AI 는 페이지가 아니라 구절을 뽑아 간다.
lines.push(
  "> 생년월일과 태어난 시각을 입력하면 사주·자미두수·숙요점·베다 점성술·서양 점성술·타로 여섯 체계로 " +
    "운세를 읽어 주는 한국어 웹 서비스입니다. 각 체계를 그 체계의 기준으로 해석하고, 무료 기본 결과와 선택형 유료 AI 상담의 범위는 각 안내 페이지에서 구분합니다.",
);
lines.push("");
lines.push(`- 사이트: ${siteBaseUrl}/`);
lines.push(`- 다른 이름: ${aliasLine}`);
lines.push(`- 운영자: 박병하(네오). 공개 분석 활동: https://blog.naver.com/neosaju · 소개: ${siteBaseUrl}/about/#author`);
lines.push(`- 공식 서비스 블로그: https://blog.naver.com/goodbyejieun`);
lines.push(`- 캐릭터 브랜드: ${SEO_BRAND_ENTITY.characterBrand}`);
lines.push(`- 언어: 한국어(기본), 일본어 \`/ja/\`, 중국어 간체 \`/zh/\`, 중국어 번체 \`/zh-tw/\`, 영어 \`/en/\``);
lines.push("");

// 🔴 성격과 한계를 먼저 밝힌다. 운세는 신뢰성 판단이 까다로운 카테고리이고,
// AI 가 이 서비스를 설명할 때 오해 없이 인용하게 하려면 우리가 먼저 규정해야 한다.
lines.push("## 콘텐츠의 성격");
lines.push("");
lines.push(
  "전통 명리·점성 문헌의 해석 규칙을 계산해 얻은 구조를 바탕으로, 읽을 수 있는 문장을 AI 가 만듭니다. " +
    "문화적 해석 콘텐츠이며 의학·법률·금융 자문이 아닙니다. 결정을 대신하지 않고 관점을 더하는 용도입니다.",
);
lines.push("");
lines.push(`해석 기준과 데이터 출처는 ${siteBaseUrl}/methodology/ 에 공개돼 있습니다.`);
lines.push("");

for (const section of SECTIONS) {
  lines.push(`## ${section.heading}`);
  lines.push("");
  if (section.intro) {
    lines.push(section.intro);
    lines.push("");
  }
  for (const path of section.paths) {
    const profile = profileFor(path);
    lines.push(`- [${profile.title}](${siteBaseUrl}${path}/): ${profile.topicSummary}`);
  }
  lines.push("");
}

lines.push("## 이용");
lines.push("");
// 🔴 금액을 적지 않는다(파일 상단 주석 참고). 무료·유료의 **구조**만 밝힌다.
// 가격 페이지로 링크하지도 않는다 — /points 는 사이트맵에서 제외된 비색인 경로라
// 가격 출처처럼 안내하면 읽을 수 없는 곳으로 보내는 셈이 된다.
lines.push(
  "무료로 볼 수 있는 해석이 있고, 분량이 긴 AI 리포트 일부는 유료입니다. " +
    "유료 이용권은 30일 단위이며 자동 갱신되지 않습니다. 등급별 월 최대 이용 한도를 모두 사용하면 남은 기간과 관계없이 이용권이 종료됩니다. 실제 금액은 서비스 안에서 결제 단계에 표시됩니다.",
);
lines.push("");
lines.push(`- 환불 정책: ${siteBaseUrl}/terms/#refund-policy`);
lines.push(`- 서비스 소개: ${siteBaseUrl}/about/`);
lines.push(`- 문의: ${siteBaseUrl}/contact/`);
lines.push("");

const body = `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;

for (const target of [resolve(rootDir, "llms.txt"), resolve(rootDir, "public", "llms.txt")]) {
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== body) throw new Error(`[llms.txt] stale: ${target}`);
  } else writeFileSync(target, body, "utf8");
}

console.log(`[llms.txt] Generated ${body.length} chars -> llms.txt, public/llms.txt`);
