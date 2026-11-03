/**
 * robots.txt 를 User-agent 그룹 단위로 파싱한다 — 가드가 공유하는 단일 정의.
 *
 * 🔴 왜 공용으로 뺐나 (2026-08-16): 두 가드가 각자 robots.txt 를 **평문으로** 훑고 있었고
 * **둘 다 같은 방식으로 틀렸다.** robots.txt 에서 특정 User-agent 그룹의 규칙은 그 봇에만
 * 적용되는데, 두 가드 모두 파일 어딘가의 `Disallow:` 를 전역 규칙처럼 취급했다.
 *
 * 실제 증상: 학습 전용 크롤러 하나를 막으려고 `User-agent: CCBot` + `Disallow: /` 를 넣자
 *   - verify-sitemap-integrity → 홈(`/`)이 "사이트맵에 있는 비공개 경로"로 잡힘
 *   - verify-adsense-readiness → "blocks the entire site" 로 빌드 중단,
 *     그리고 `user-agent: mediapartners-google[\s\S]*?disallow: /` 가 파일을 가로질러
 *     CCBot 의 줄에 매치돼 "blocks Mediapartners-Google" 오탐까지 났다
 *
 * 세 번째 사본이 생기지 않도록 여기 한 곳에서만 파싱한다. 경로별 허용 판정(robotsAllows)도 같은 파싱을 쓴다
 * (2026-11-02, scripts/seo/health-policy.mjs 에 있던 두 번째 파서를 합쳤다).
 *
 * 그룹 경계는 Google robots.txt 파서와 같다: `#` 뒤는 줄 중간이라도 주석이고, Allow·Disallow 만
 * User-agent 목록을 끝낸다. Sitemap·Crawl-delay·Host 같은 다른 줄은 그룹을 나누지 않는다.
 */

/** robots.txt 텍스트 → [{ agents: string[], allow: string[], disallow: string[] }] */
export function parseRobotsGroups(robotsText) {
  const groups = [];
  let current = null;

  for (const raw of String(robotsText || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;

    const agent = /^User-agent:\s*(.+)$/i.exec(line);
    if (agent) {
      // 규칙 줄이 하나라도 나온 뒤의 User-agent 는 새 그룹의 시작이다.
      // 연속된 User-agent 줄은 같은 그룹을 공유한다.
      if (!current || current.hasRules) {
        current = { agents: [], allow: [], disallow: [], hasRules: false };
        groups.push(current);
      }
      current.agents.push(agent[1].trim());
      continue;
    }

    if (!current) continue;

    const disallow = /^Disallow:\s*(.*)$/i.exec(line);
    if (disallow) {
      current.hasRules = true;
      if (disallow[1].trim()) current.disallow.push(disallow[1].trim());
      continue;
    }

    const allow = /^Allow:\s*(.*)$/i.exec(line);
    if (allow) {
      current.hasRules = true;
      if (allow[1].trim()) current.allow.push(allow[1].trim());
      continue;
    }
  }

  return groups.map(({ agents, allow, disallow }) => ({ agents, allow, disallow }));
}

/**
 * 그 봇이 그 경로를 긁어도 되는가. 이름이 정확히 맞는 그룹(대소문자 무시)을 모두 합치고, 없으면 `*` 그룹을 쓴다.
 * 가장 긴 규칙이 이기고 길이가 같으면 Allow 가 이긴다. `*` 는 아무 글자, 끝의 `$` 는 경로 끝.
 */
export function robotsAllows(robotsText, pathname, agent = "googlebot") {
  const name = agent.toLowerCase();
  const groups = parseRobotsGroups(robotsText);
  const named = (target) => groups.filter((group) => group.agents.some((value) => value.toLowerCase() === target));
  const selected = named(name).length ? named(name) : named("*");
  const rules = selected
    .flatMap((group) => [
      ...group.allow.map((value) => ({ allow: true, value })),
      ...group.disallow.map((value) => ({ allow: false, value })),
    ])
    .filter((rule) => {
      const pattern = rule.value.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      return new RegExp(`^${pattern}`).test(pathname);
    })
    .sort((a, b) => b.value.replace(/[*$]/g, "").length - a.value.replace(/[*$]/g, "").length || Number(b.allow) - Number(a.allow));
  return rules[0]?.allow ?? true;
}

/**
 * 두 robots.txt 의 판정을 비교할 표본. 주어진 기본 UA·경로에 각 텍스트의 User-agent 이름과
 * Allow·Disallow 경로(`*` 는 x 로, 끝 `$` 는 떼어)를 더한다 — 파일에 적힌 봇과 규칙은 빠짐없이 밟는다.
 */
export function robotsSamples(texts, { agents = [], paths = [] } = {}) {
  const agentSet = new Set(agents);
  const pathSet = new Set(paths);
  for (const text of texts) {
    for (const group of parseRobotsGroups(text)) {
      for (const agent of group.agents) agentSet.add(agent);
      for (const path of [...group.allow, ...group.disallow]) pathSet.add(path.replace(/\*/g, "x").replace(/\$$/, ""));
    }
  }
  return { agents: [...agentSet], paths: [...pathSet] };
}

/** 이름이 색인 크롤러(= 사이트맵·광고 계약의 대상)에 해당하는가. */
export function isIndexerAgent(agent) {
  const name = String(agent || "").trim().toLowerCase();
  return name === "*" || /^googlebot(-|$)/.test(name) || name === "mediapartners-google";
}

/** 색인 크롤러에 적용되는 그룹만. */
export function indexerGroups(robotsText) {
  return parseRobotsGroups(robotsText).filter((group) => group.agents.some(isIndexerAgent));
}

/** 그 이름의 봇이 사이트 전체를 차단당하는가. */
export function blocksEntireSite(robotsText, agentPredicate = isIndexerAgent) {
  return parseRobotsGroups(robotsText)
    .filter((group) => group.agents.some(agentPredicate))
    .some((group) => group.disallow.includes("/"));
}
