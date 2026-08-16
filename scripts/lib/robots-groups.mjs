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
 * 세 번째 사본이 생기지 않도록 여기 한 곳에서만 파싱한다.
 */

/** robots.txt 텍스트 → [{ agents: string[], allow: string[], disallow: string[] }] */
export function parseRobotsGroups(robotsText) {
  const groups = [];
  let current = null;

  for (const raw of String(robotsText || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

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

    if (/^(Crawl-delay|Sitemap|Host):/i.test(line)) current.hasRules = true;
  }

  return groups.map(({ agents, allow, disallow }) => ({ agents, allow, disallow }));
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
