#!/usr/bin/env node
/**
 * PostToolUse 훅 — SEO 관련 편집을 감지하면 "검색 의도(Search Intent) 최우선" 체크리스트를
 * additionalContext 로 주입한다. 차단하지 않는다(항상 exit 0) — 리마인드일 뿐이다.
 *
 * 감지 기준을 파일명이 아니라 "편집된 내용"에 우선 두는 이유: app/**\/page.tsx 처럼 UI 와
 * 메타데이터가 한 파일에 섞여 있는 경우, 파일명만으로 걸면 무관한 UI 수정마다 매번 뜬다.
 * 대신 실제로 건드린 텍스트(Write 는 content, Edit/MultiEdit 은 new_string)에서
 * 메타데이터/구조화데이터/사이트맵 신호를 찾는다. 다만 파일 경로 자체가 "SEO 전용 파일"로
 * 뻔한 경우(sitemap, robots.txt, seo-*, structured-data 등)는 내용 매칭 없이도 바로 켠다.
 */

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

const STRONG_PATH_PATTERNS = [
  /sitemap/i,
  /robots\.txt/i,
  /structured-data/i,
  /schema[-_.]?org/i,
  /opengraph|og-image/i,
  /(^|[\\/])seo[-_.]/i,
  /seo-and-adsense\.md$/i,
];

/**
 * 🔴 `/<title[ >]/` 와 `/\balt=["']/` 를 여기 되살리지 말 것 (2026-08-26 실측으로 뺐다).
 * `git grep -l '<title[ >]'` = 68개 파일, `git grep -c 'alt="'` = 74개 파일이라
 * SVG 접근성 <title> 과 순수 UI 목적의 alt 수정에서 매번 발동했다 — 위 주석이 피하겠다고
 * 적은 바로 그 실패다. 리마인더가 무관하게 자주 뜨면 읽히지 않고, 그러면 훅이 무용지물이 된다.
 * 진짜 SEO 편집에서 그 둘만 단독으로 바뀌는 경우는 드물고, 그런 편집은 STRONG_PATH_PATTERNS
 * 나 name="description"·og:title 로 이미 잡힌다. 회귀 케이스는 콜로케이트 테스트에 있다.
 */
const CONTENT_PATTERNS = [
  /generateMetadata/,
  /export\s+const\s+metadata\b/,
  /name=["']description["']/i,
  /name=["']keywords["']/i,
  /property=["']og:(title|description|type|image)["']/i,
  /name=["']twitter:(title|description|card)["']/i,
  /application\/ld\+json/i,
  /schema\.org/i,
  /rel=["']canonical["']/i,
  /^\s*Disallow:/im,
  /^\s*Sitemap:/im,
  /메타\s*디스크립션|메타\s*태그|검색\s*엔진\s*최적화|구조화\s*데이터/,
];

function extractTouchedText(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return '';
  if (toolName === 'Write') return String(toolInput.content || '');
  if (toolName === 'Edit') {
    return `${toolInput.old_string || ''}\n${toolInput.new_string || ''}`;
  }
  if (toolName === 'MultiEdit' && Array.isArray(toolInput.edits)) {
    return toolInput.edits
      .map((e) => `${e.old_string || ''}\n${e.new_string || ''}`)
      .join('\n');
  }
  return '';
}

const REMINDER = `🔎 SEO 관련 편집 감지 — 검색 의도(Search Intent)를 최우선 기준으로 재검토하세요 (최고의 SEO 전문가 관점).
1. 이 title·description·H1·본문이 타겟하는 쿼리의 의도를 먼저 규정한다 — 정보성 / 탐색성 / 상업적 조사 / 거래성 중 무엇인가.
2. title·meta description·H1·리드 문단이 그 의도의 답을 즉시 주는가 — 사용자가 검색창에 쳤을 질문에 첫 문장에서 답하는지 확인한다.
3. 키워드는 밀도가 아니라 "질문-답 매칭"으로 판단한다 — 부자연스러운 반복·스터핑 금지.
4. 실제 상위 노출 페이지들이 그 쿼리에서 어떤 의도를 만족시키고 있는지 확인 없이 문구를 임의로 정하지 않는다(확인 못 했으면 "추정"이라고 표시).
5. FAQ·표·리스트·CTA 같은 구조는 그 의도의 사용자가 검색 직후 할 행동과 일치해야 한다.
6. 신규 페이지·라우트·sitemap·AdSense 관련이면 docs/context/seo-and-adsense.md 를 먼저 확인했는지 재확인한다.`;

async function main() {
  let raw = '';
  try {
    raw = await readStdin();
  } catch {
    process.exit(0);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const toolName = event?.tool_name;
  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) process.exit(0);

  const toolInput = event?.tool_input || {};
  const filePath = String(toolInput.file_path || '');

  const pathMatches = STRONG_PATH_PATTERNS.some((re) => re.test(filePath));
  const touchedText = extractTouchedText(toolName, toolInput);
  const contentMatches = CONTENT_PATTERNS.some((re) => re.test(touchedText));

  if (!pathMatches && !contentMatches) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: REMINDER,
      },
    })
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
