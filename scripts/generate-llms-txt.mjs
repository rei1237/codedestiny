#!/usr/bin/env node
import { publicRecordCopy, PUBLIC_RECORD_PATH } from '../lib/seo/public-record-copy.mjs';
import { FEATURE_INTRODUCTIONS } from '../lib/i18n/feature-introductions.mjs';
/**
 * llms.txt 생성기 (https://llmstxt.org).
 *
 * 공개 서비스 정보를 정리하는 선택적 안내 파일입니다. 검색 순위·AI 인용이나 추천을 보장하지 않습니다.
 * 검색 노출의 기반은 색인 가능한 본문과 링크, 접근 허용, 정확한 서비스 설명입니다.
 *
 * 🔴 손으로 쓰지 않는다. 서비스명·운영자·공식 주소·이름 이력은 lib/brand/brand-facts.mjs 에서,
 *    허브 문구는 lib/seo/entity-registry.mjs 에서 **파생**한다 —
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
const { BRAND_FACTS } = await import(pathToFileURL(resolve(rootDir, "lib/brand/brand-facts.mjs")).href);

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
    paths: ["/compatibility", "/saju/compatibility", "/love", "/today", "/fortune/2027", "/dream", "/psychotest", "/animal/mbti"],
  },
  {
    heading: "통합 리포트",
    paths: ["/yeongnyangi", "/yeongnyangi/1000-won-fortune", "/fusion-fortune", "/human-design/guide"],
  },
  {
    heading: "읽을거리와 방법론",
    paths: ["/guides", "/insights", "/methodology", "/compare/fortune-apps"],
  },
  {
    heading: "브랜드",
    paths: ["/"],
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

const { service, operator } = BRAND_FACTS;
const aliasLine = SEO_BRAND_ENTITY.aliases.map((name) => `"${name}"`).join(", ");

const lines = [];
lines.push(`# ${service.name}`);
lines.push("");

// 첫 문단은 자립형 정의다 — AI 는 페이지가 아니라 구절을 뽑아 간다.
lines.push(
  `> ${service.name}는 ${service.summary}입니다. ` +
    "생년월일과 태어난 시각을 입력하면 사주·자미두수·숙요점·베다 점성술·서양 점성술·타로 여섯 체계로 " +
    "운세를 읽어 주는 한국어 웹 서비스입니다. 각 체계를 그 체계의 기준으로 해석하고, 무료 기본 결과와 선택형 유료 AI 상담의 범위는 각 안내 페이지에서 구분합니다.",
);
lines.push("");
lines.push(`- 공식 홈페이지: ${service.homeUrl}`);
lines.push(`- 상담 앱 입구(꽃돼지 연이·네오): ${siteBaseUrl}${service.appEntryPath}`);
const yeongnyangi = BRAND_FACTS.characters.find((character) => character.key === "yeongnyangi");
lines.push(`- ${yeongnyangi.serviceName}(영냥이 상담) 입구: ${siteBaseUrl}${yeongnyangi.path}`);
lines.push(`- 표기: 공식 서비스명은 "${service.name}"이고, 붙여 쓴 ${aliasLine}도 같은 서비스입니다.`);
lines.push(`- 운영자: ${operator.name}(${operator.nameKo}). 대표 박병하(활동명 네오). 소개: ${siteBaseUrl}/about/#author`);
lines.push(`- 공식 외부 채널: ${BRAND_FACTS.sameAs.map((profile) => profile.url).join(" · ")}`);
lines.push(`- 캐릭터: ${BRAND_FACTS.characters.map((character) => `${character.serviceName ?? character.name}(${character.role})`).join(", ")}`);
lines.push(`- 언어: 한국어(기본), 일본어 \`/ja/\`, 중국어 간체 \`/zh/\`, 중국어 번체 \`/zh-tw/\`, 영어 \`/en/\``);
lines.push("");

// 과거 이름은 이 절에만 쓴다. 다른 줄에 나오면 brand-search-identity 테스트가 실패한다.
lines.push("## 이름 이력");
lines.push("");
lines.push(BRAND_FACTS.historyKo);
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
    lines.push(`- [${profile.title}](${siteBaseUrl}${path === "/" ? "/" : `${path}/`}): ${profile.topicSummary}`);
  }
  lines.push("");
}

lines.push("## 운영자와 공개 분석 기록");
lines.push(publicRecordCopy.ko.author);
lines.push('- 기록 정본: ' + siteBaseUrl + PUBLIC_RECORD_PATH);
lines.push(publicRecordCopy.ko.provenance);
lines.push(publicRecordCopy.ko.interval);
lines.push(publicRecordCopy.ko.faqs[0].answer);
lines.push("");
lines.push("## 직접 공개하는 1차 자료와 인용 기준");
lines.push("- 현재 계산 기준과 가상 입력의 실제 어댑터 결과: " + siteBaseUrl + "/insights/how-we-calculate-saju/");
lines.push("- 23시·자정 경계의 입력과 네 기둥 비교: " + siteBaseUrl + "/insights/midnight-birth-day-pillar/");
lines.push("- 같은 출생정보의 두 체계 비교: " + siteBaseUrl + "/compare/saju-vs-ziwei/");
lines.push("- 분석 원문은 해당 공개자의 기록이며 실제 사건의 근거는 연결된 헌법재판소·선거관리위원회 자료입니다. 사이트의 회고 비교와 원문 분석을 구분해 인용하세요.");
lines.push("인용에는 문서 제목·정본 URL·확인일을 함께 표시해 주세요. 계산 예시는 문화적 해석의 적중률을 검증한 자료가 아닙니다. 데이터 수정 시 본문과 변경일을 함께 고치며, 계산 예시의 값은 어댑터 검증으로 대조합니다. 날짜 운세는 해당 URL의 기준일을, 개인 상담 범위와 가격은 현재 서비스 안내를 확인하세요.");
lines.push("");
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

// Use the same reviewed, visible locale copy as the entry pages, not a second
// promotional description. Only existing translated hubs are listed here.
// 🔴 로케일 lead 는 운영사명(Code Destiny)을 주어로 쓴다. 서비스 엔티티가 운영사명으로 갈라지지 않게
//    공식 서비스명과 운영사를 먼저 밝힌다(2026-10-29 감사 G-L1). 로마자 표기는 소유자가 정하기 전까지 쓰지 않는다.
const SERVICE_NAME_LINE = {
  ja: `公式サービス名は「${service.name}」で、運営会社は ${operator.name} です。`,
  en: `The official service name is "${service.name}"; ${operator.name} is the operating company.`,
  zh: `官方服务名称为「${service.name}」，运营公司为 ${operator.name}。`,
  'zh-tw': `官方服務名稱為「${service.name}」，營運公司為 ${operator.name}。`,
};
for (const [locale, dictionaryName] of Object.entries({ ja: 'ja', en: 'en', zh: 'zh-cn', 'zh-tw': 'zh-tw' })) {
  const dictionary = JSON.parse(readFileSync(resolve(rootDir, 'public/i18n', `${dictionaryName}.json`), 'utf8'));
  lines.push(`## ${dictionary.shell.CODEDESTINY}`);
  lines.push(SERVICE_NAME_LINE[locale]);
  lines.push(dictionary.home.homeGuide.lead);
  lines.push(`- [${dictionary.shell.CODEDESTINY}](${siteBaseUrl}/${locale}/)`);
  for (const topic of ['saju', 'ziwei', 'sukuyo']) {
    const label = FEATURE_INTRODUCTIONS[topic]?.[locale]?.heading || dictionary.home.nav[topic];
    lines.push(`- [${label}](${siteBaseUrl}/${locale}/${topic}/)`);
  }
  lines.push('');
}

const body = `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;

/**
 * llms-full.txt — llms.txt 본문 뒤에 레지스트리 전체 목록·계산 기준·공개 기록 원문·차별점 Q&A 를 붙인다.
 * 🔴 새 문장을 만들지 않는다. 전부 화면에 이미 공개된 정본(brand·entity·public-record 레지스트리)에서 파생한다.
 */
const { EXPERTISE_FACTS } = await import(pathToFileURL(resolve(rootDir, "lib/brand/expertise-facts.mjs")).href);
const { DIFFERENTIATION_FAQS } = await import(pathToFileURL(resolve(rootDir, "lib/brand/differentiation-faqs.mjs")).href);
const { NEW_YEAR_SEASON, NEW_YEAR_SIGNS } = await import(
  pathToFileURL(resolve(rootDir, "lib/fortune/new-year-registry.mjs")).href
);
const full = [body.trimEnd(), ""];
full.push("## 공개 페이지 전체 목록", "");
for (const profile of Object.values(SEO_ROUTE_PROFILES)) {
  full.push(`- [${profile.title}](${siteBaseUrl}${profile.path === "/" ? "/" : `${profile.path}/`}): ${profile.topicSummary}`);
}
full.push("", `## ${NEW_YEAR_SEASON.year}년 띠별 운세`, "");
for (const sign of NEW_YEAR_SIGNS) {
  full.push(`- [${NEW_YEAR_SEASON.year}년 ${sign.name} 운세](${siteBaseUrl}${NEW_YEAR_SEASON.path}/${sign.id}/)`);
}
full.push("", "## 계산 기준", "");
for (const fact of EXPERTISE_FACTS) full.push(`- ${fact.ko}`);
full.push("", "## 공개 분석 기록 원문", "");
for (const row of publicRecordCopy.ko.rows) {
  full.push(`- ${row.date} [${row.title}](${row.url}): ${row.summary} 이후 사건: ${row.event} 출처: ${row.source}`);
}
full.push("", "## 다른 운세 서비스와 다른 점", "");
for (const faq of DIFFERENTIATION_FAQS) full.push(`### ${faq.question}`, "", faq.answer, "");
const fullBody = `${full.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;

for (const [name, content] of [["llms.txt", body], ["llms-full.txt", fullBody]]) {
  for (const target of [resolve(rootDir, name), resolve(rootDir, "public", name)]) {
    if (process.argv.includes("--check")) {
      if (readFileSync(target, "utf8") !== content) throw new Error(`[llms.txt] stale: ${target}`);
    } else writeFileSync(target, content, "utf8");
  }
}

console.log(`[llms.txt] Generated ${body.length} chars -> llms.txt, public/llms.txt; ${fullBody.length} chars -> llms-full.txt, public/llms-full.txt`);
