/**
 * 운명의 섬 측정용 시드 — 네트워크 없이 맵 화면까지 도달시키기 위한 localStorage 값을 만든다.
 *
 * 왜 필요한가 — `/destiny-island.html` 은 게이트 → (명반 입력) → 로딩 → 인트로 시네마틱 → 맵
 * 순서로 진행한다. 재려는 것은 **맵 화면의 탭·팬**인데, 그 앞의 3단계는 재는 대상이 아니면서
 * 네트워크(`/api/ziwei-island/blueprint`)와 12초짜리 시네마틱을 끌고 온다.
 *
 * 두 키를 미리 심으면 둘 다 건너뛴다(destiny-island.html 실측):
 *   - `cdIsland:v1`.hasSeenIntro=true  → boot() 이 startIntro 대신 enterIsland 로 간다(:2233)
 *   - `cdIsland:blueprint:v2`          → fetchBlueprint 이 캐시로 즉시 resolve 한다(:795~798)
 *
 * 🔴 청사진은 서버 라우트를 부르지 않고 **순수 계산 모듈을 Node 에서 직접** 돌려 만든다.
 *    worker/routes/ziwei-island.js 가 하는 일과 같은 두 호출이며, DB·인증·과금 LLM 과 무관하다.
 * 🔴 캐시는 `date === kstToday()` 를 요구한다(:791). 자정 근처에 재면 날짜가 갈리므로
 *    페이지 안에서 계산한 것과 같은 식(UTC+9)을 여기서도 쓴다.
 */

import { calculateZiweiAiChart } from "../../worker/lib/ziwei-ai-chart.js";
import { buildIslandBlueprint } from "../../worker/lib/island/island-blueprint.js";
import { normalizeIslandBirthInput } from "../../worker/lib/island/island-input.js";

/** destiny-island.html:789 kstToday() 와 동일 */
export function kstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** destiny-island.html:784 profileKeyOf() 와 동일 */
function profileKeyOf(p) {
  return [p.birthDate, p.birthTimeUnknown ? "unknown" : p.birthTime, p.gender, p.calendarType, p.isLeapMonth ? 1 : 0].join("|");
}

/**
 * 고정 픽스처. 🔴 회차마다 다른 명반을 쓰면 궁 등급·날씨·바이옴이 바뀌어 렌더 부하가 달라진다.
 * 이 값의 실측 산출물: biome=forest, 12궁, edges 38(그중 flow 대상 17 → 상위 14만 렌더), weather=rain.
 */
export const FIXTURE = {
  birthDate: "1990-05-14",
  birthTime: "09:30",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
  gender: "female",
  name: "측정",
};

/** 페이지에 심을 localStorage 항목 전체를 만든다. */
export async function buildIslandSeed() {
  const normalized = normalizeIslandBirthInput({
    birthDate: FIXTURE.birthDate,
    birthTime: FIXTURE.birthTime,
    birthTimeUnknown: FIXTURE.birthTimeUnknown,
    calendarType: FIXTURE.calendarType,
    isLeapMonth: FIXTURE.isLeapMonth,
    gender: FIXTURE.gender,
  });
  const chart = await calculateZiweiAiChart(normalized.chartInput);
  const blueprint = buildIslandBlueprint(chart, { date: normalized.date, birthYear: normalized.birthYear });

  return {
    /* 게이트 피커가 읽는 목록. 🔴 스코프 접미사 `::guest` 가 없으면 readAllProfiles 가 무시한다(:2251). */
    profileListKey: "FORTUNE_APP_USER_PROFILES.list::guest",
    profileList: [
      {
        birthDate: FIXTURE.birthDate,
        birthTime: FIXTURE.birthTime,
        calType: FIXTURE.calendarType,
        gender: FIXTURE.gender,
        name: FIXTURE.name,
      },
    ],
    gameKey: "cdIsland:v1",
    /* hasSeenIntro 로 시네마틱을 건너뛴다. bgm=false 로 원격 mp3 요청을 막는다(측정 노이즈). */
    game: { hasSeenIntro: true, bgm: false, name: "측정섬", exp: 0, quests: {}, streak: { last: "", count: 0 } },
    blueprintKey: "cdIsland:blueprint:v2",
    blueprintEntry: { profileKey: profileKeyOf(FIXTURE), date: kstToday(), blueprint },
    /* 보고서에 남길 픽스처 요약 — 값이 바뀌면 이전 회차와 비교하면 안 된다는 신호가 된다. */
    summary: {
      biome: blueprint?.biome?.id || "?",
      weather: blueprint?.weather?.id || "?",
      palaces: (blueprint?.palaces || []).length,
      edges: (blueprint?.edges || []).length,
      flowEdges: (blueprint?.edges || []).filter((e) => e.weight > 0).length,
    },
  };
}
