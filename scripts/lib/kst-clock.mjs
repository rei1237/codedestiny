/**
 * 러너 타임존 핀 — 검증기가 "머신마다 다른 것을 재고도 초록"이 되는 것을 막는다.
 *
 * 왜 필요한가:
 *   레포에 TZ 설정이 0건이라 **개발 머신은 KST, CI 러너는 UTC** 로 돌았다. 셸의 간지 경로는
 *   KST 벽시계 부품으로 로컬 `Date` 를 조립하므로 러너 TZ 가 결과를 바꾼다. 그래서 같은
 *   가드가 두 곳에서 서로 다른 것을 재고 있었고, 정본인 `Asia/Seoul` 축은 CI 에서 한 번도
 *   안 돌았다(docs/handoff/ganji-wallclock-parts-migration.md §1-(3)).
 *
 * 정본 선례: scripts/verify-solar-term-frame-kasi.mjs 의 ⓪ 검사(PR #1225).
 * 그쪽은 `process.env.TZ = "UTC"` 를 파일 상단에 박고 `getTimezoneOffset()` 으로 자기검사한다.
 * 이 모듈은 그 두 줄을 쓸 수 있게 꺼낸 것이다 — **핀과 자기검사는 한 몸이어야 한다.**
 * 핀만 걸고 자기검사를 빼면 런타임이 `process.env.TZ` 를 안 읽어도 조용히 통과한다.
 *
 * 🔴 반드시 **다른 import 보다 먼저** 부를 것. Node 는 `Date` 의 존 데이터를 처음 쓸 때
 * 캐시하므로, 모듈 초기화 중에 로컬 `Date` 를 만드는 import 가 앞서면 핀이 늦는다.
 */

/** IANA 존 → 자기검사에 쓸 (기준시각, 기대 오프셋 분). 오프셋은 `getTimezoneOffset()` 부호다(UTC−로컬). */
const EXPECTED_OFFSET_MINUTES = {
  // 한국은 1988 서울올림픽 서머타임 이후 UTC+9 고정이다. 1988 이전 표본을 쓰는 검증기가 있으므로
  // 자기검사 기준시각은 고정 이후(2020)로 둔다.
  "Asia/Seoul": -540,
  UTC: 0,
};

/**
 * 러너 타임존을 고정하고, 그 핀이 이 런타임에서 실제로 먹었는지 확인한다.
 *
 * @param {string} tz IANA 타임존 이름. 기본값은 이 레포의 정본 축인 Asia/Seoul.
 * @returns {{tz: string, offsetMinutes: number}} 핀이 먹은 뒤 실측한 오프셋.
 * @throws {Error} 핀이 안 먹었을 때. **조용히 넘기지 않는다** — 그게 이 모듈의 존재 이유다.
 */
export function pinTimezone(tz = "Asia/Seoul") {
  process.env.TZ = tz;
  const offsetMinutes = new Date(2020, 0, 1).getTimezoneOffset();

  // ① 오프셋을 아는 존은 숫자로 확인한다 — 가장 강한 증거다.
  const expected = EXPECTED_OFFSET_MINUTES[tz];
  if (expected !== undefined && offsetMinutes !== expected) {
    throw new Error(
      `[kst-clock] TZ 핀이 안 먹었다: TZ=${tz} 인데 offset=${offsetMinutes} (기대 ${expected}). `
      + "이 런타임은 process.env.TZ 재할당을 반영하지 않는다 — 셸 로컬 Date 경로를 재는 검사는 "
      + "여기서 멈춰야 한다(초록으로 넘어가면 머신마다 다른 것을 잰다).",
    );
  }

  // ② 오프셋을 모르는 존(서머타임 매트릭스의 나머지)은 런타임이 그 존으로 해석했는지로 확인한다.
  //    🔴 Node 는 알 수 없는 TZ 이름을 조용히 UTC 로 떨어뜨린다. 그 경우 이 검사가 없으면
  //    "Pacific/Apia 로 쟀다"고 적힌 초록불이 실제로는 UTC 를 잰 것이 된다.
  if (expected === undefined) {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved !== tz) {
      throw new Error(
        `[kst-clock] TZ 핀이 안 먹었다: TZ=${tz} 를 걸었는데 런타임은 ${resolved} 로 해석했다. `
        + "존 이름 오타이거나 이 런타임에 그 존 데이터가 없다.",
      );
    }
  }

  return { tz, offsetMinutes };
}

/**
 * 자식 프로세스로 넘길 env 를 만든다. `pinTimezone` 이 부모에서 이미 돌았어도
 * 자식은 자기 프로세스에서 다시 핀을 걸어야 하므로 TZ 를 명시적으로 실어 보낸다.
 */
export function childEnvWithTimezone(tz, extra = {}) {
  return { ...process.env, ...extra, TZ: tz };
}

/** 자기검사에 쓰는 기대 오프셋 표를 읽기 전용으로 노출한다(가드의 음성 테스트용). */
export const KNOWN_OFFSETS = Object.freeze({ ...EXPECTED_OFFSET_MINUTES });
