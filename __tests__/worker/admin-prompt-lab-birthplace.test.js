/**
 * @jest-environment node
 *
 * 관리자 프롬프트 랩이 "출생지 이름만" 받아도 좌표가 필요한 운세를 뽑을 수 있는지 지킨다.
 *
 * 이 가드가 존재하는 이유: 랩 화면에는 좌표 입력 칸이 없는데 서버는 body.latitude 만 읽었다.
 * 그래서 기본 폼(사주 · 서울)조차 400 BIRTH_COORDINATES_REQUIRED 로 죽어 사주·점성술·베딕
 * 프롬프트를 아예 검수할 수 없었다.
 *
 * 🔴 대상 목록을 손으로 적지 않는다 — 레지스트리의 needsCoordinates 에서 전수 발견하고,
 *    대상이 0개면 실패한다(대상 없는 가드는 가드가 아니다).
 * 🔴 실네트워크를 타지 않는다. Nominatim 경로는 전부 fetchImpl 주입으로 시험한다.
 */

import { ADMIN_PROMPT_LAB_SERVICES } from "../../lib/admin/prompt-lab-registry.mjs";
import { ADMIN_GEOCODE_PRESETS } from "../../lib/admin/geocode-presets.mjs";
import { resolveAdminBirthCoordinates } from "../../worker/lib/admin-geocode.js";

let admin;
let lab;

const BASE_BODY = {
  name: "관리자 대상",
  gender: "F",
  birthDate: "1990-03-15",
  birthTime: "09:30",
  birthTimeUnknown: false,
  calendarType: "solar",
  birthPlace: "서울",
};

/** 네트워크를 타면 즉시 터지는 fetch. "프리셋은 조회를 안 한다"를 증명하는 데 쓴다. */
function explodingFetch() {
  throw new Error("프리셋 경로가 네트워크를 탔다");
}

function stubFetch(rows, { ok = true } = {}) {
  const calls = [];
  const impl = async (url) => {
    calls.push(String(url));
    return { ok, json: async () => rows };
  };
  impl.calls = calls;
  return impl;
}

const COORDINATE_SERVICES = ADMIN_PROMPT_LAB_SERVICES.filter((entry) => entry.needsCoordinates);

beforeAll(async () => {
  admin = await import("../../worker/routes/admin.js");
  lab = admin.__adminPromptLabTestUtils;
});

describe("좌표를 요구하는 운세 선언", () => {
  test("레지스트리에 needsCoordinates 서비스가 하나 이상 있다", () => {
    expect(COORDINATE_SERVICES.length).toBeGreaterThan(0);
  });

  test.each(COORDINATE_SERVICES.map((entry) => [entry.key]))(
    "%s: 출생지 이름만 있어도 좌표가 채워지고 검사를 통과한다",
    async (key) => {
      const { body, note } = await lab.resolveAdminPromptLabBody({ ...BASE_BODY }, key);
      const profile = admin.buildAdminPromptProfile(body);

      expect(Number.isFinite(profile.latitude)).toBe(true);
      expect(Number.isFinite(profile.longitude)).toBe(true);
      expect(profile.timezone).toBe("Asia/Seoul");
      expect(note).toContain("출생지 좌표");
      expect(() => lab.assertAdminPromptProfileReady(key, profile, {})).not.toThrow();
    },
  );

  test("좌표를 요구하지 않는 운세의 바디는 그대로다(seed 불변)", async () => {
    const others = ADMIN_PROMPT_LAB_SERVICES.filter((entry) => !entry.needsCoordinates);
    expect(others.length).toBeGreaterThan(0);

    for (const entry of others) {
      const { body, note } = await lab.resolveAdminPromptLabBody({ ...BASE_BODY }, entry.key);
      expect(body.latitude).toBeUndefined();
      expect(note).toBe("");
      expect(admin.buildAdminPromptProfile(body).seed)
        .toBe(admin.buildAdminPromptProfile({ ...BASE_BODY }).seed);
    }
  });

  test("사용자가 좌표를 직접 보냈으면 덮어쓰지 않는다", async () => {
    const key = COORDINATE_SERVICES[0].key;
    const { body, note } = await lab.resolveAdminPromptLabBody(
      { ...BASE_BODY, birthPlace: "도쿄", latitude: 1.23, longitude: 4.56 },
      key,
    );
    expect(body.latitude).toBe(1.23);
    expect(note).toBe("");
  });

  test("출생지를 못 찾으면 400 BIRTH_COORDINATES_REQUIRED 로 안내한다", async () => {
    const key = COORDINATE_SERVICES[0].key;
    const { body } = await lab.resolveAdminPromptLabBody({ ...BASE_BODY, birthPlace: "" }, key);
    const profile = admin.buildAdminPromptProfile(body);
    expect(() => lab.assertAdminPromptProfileReady(key, profile, {}))
      .toThrow(/출생지 좌표를 찾지 못했습니다/);
  });
});

describe("좌표 해석", () => {
  test("내장 도시표는 네트워크를 타지 않는다", async () => {
    for (const preset of ADMIN_GEOCODE_PRESETS) {
      for (const key of preset.keys) {
        const resolved = await resolveAdminBirthCoordinates(key, { fetchImpl: explodingFetch });
        expect(resolved).not.toBeNull();
        expect(resolved.source).toBe("admin-preset");
        expect(resolved.latitude).toBe(preset.latitude);
        expect(resolved.timezone).toBe(preset.timezone);
      }
    }
  });

  test("도시표 밖은 지도 검색으로 내려가고 시간대를 국가 코드로 정한다", async () => {
    const fetchImpl = stubFetch([{ lat: "52.52", lon: "13.405", display_name: "Berlin", address: { country_code: "de" } }]);
    const resolved = await resolveAdminBirthCoordinates("프랑크푸르트 어딘가", { fetchImpl });

    expect(resolved.source).toBe("nominatim");
    expect(resolved.latitude).toBeCloseTo(52.52, 3);
    // 🔴 예전에는 여기가 무조건 Asia/Seoul 이었다 — 좌표만 맞고 시각이 통째로 어긋났다.
    expect(resolved.timezone).toBe("Europe/Berlin");
    expect(fetchImpl.calls[0]).toContain("addressdetails=1");
  });

  test("조회가 실패하거나 비면 던지지 않고 null 을 준다", async () => {
    await expect(resolveAdminBirthCoordinates("없는곳", { fetchImpl: stubFetch([]) })).resolves.toBeNull();
    await expect(resolveAdminBirthCoordinates("없는곳", { fetchImpl: stubFetch([], { ok: false }) })).resolves.toBeNull();
    await expect(resolveAdminBirthCoordinates("없는곳", {
      fetchImpl: async () => { throw new Error("network down"); },
    })).resolves.toBeNull();
  });
});

describe("시간대 오프셋", () => {
  test("프리셋이 쓰는 시간대는 기존 값 그대로다", () => {
    const expected = {
      "Asia/Seoul": 9,
      "Asia/Tokyo": 9,
      "Asia/Shanghai": 8,
      "Asia/Taipei": 8,
      "Asia/Hong_Kong": 8,
      "Asia/Singapore": 8,
      "Europe/London": 0,
      "Europe/Paris": 1,
      "America/New_York": -5,
      "America/Los_Angeles": -8,
      "Australia/Sydney": 10,
    };
    const used = [...new Set(ADMIN_GEOCODE_PRESETS.map((preset) => preset.timezone))];
    expect(used.length).toBeGreaterThan(0);
    for (const zone of used) {
      expect(expected[zone]).toBeDefined();
      expect(lab.adminTimezoneOffsetHours(zone)).toBe(expected[zone]);
    }
  });

  test("손 map 밖의 시간대는 더 이상 서울(9)로 떨어지지 않는다", () => {
    const wallClock = { year: 1990, month: 3, day: 15, hour: 9, minute: 30 };
    expect(lab.adminTimezoneOffsetHours("Europe/Berlin", wallClock)).toBe(1);
    expect(lab.adminTimezoneOffsetHours("America/Sao_Paulo", wallClock)).toBe(-3);
    // 알 수 없는 이름은 예전처럼 기본값으로 간다.
    expect(lab.adminTimezoneOffsetHours("Not/AZone", wallClock)).toBe(9);
  });
});
