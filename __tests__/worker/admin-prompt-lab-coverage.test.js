/**
 * @jest-environment node
 */

// 프롬프트 랩은 "각 운세의 프롬프트를 결제 없이 뽑는다"가 존재 이유다.
// 레지스트리에 선언만 해 두고 조립기가 없거나 빈 문자열을 돌려주면 화면에서 조용히 실패하고,
// 운영자는 그 운세만 안 되는 이유를 알 수 없다. 그래서 선언된 전 항목을 실제로 호출해 본다.
//
// 🔴 이 테스트는 LLM 을 부르지 않는다. 각 조립기는 프롬프트 문자열만 만든다(과금 0).

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

import {
  ADMIN_PROMPT_LAB_SERVICES,
  ADMIN_PROMPT_LAB_EXCLUSIONS,
  getAdminPromptLabService,
  groupedAdminPromptLabServices,
} from "../../lib/admin/prompt-lab-registry.mjs";
import {
  buildPromptLabResult,
  hasPromptLabLoader,
  listPromptLabLoaderKeys,
} from "../../worker/lib/admin-prompt-lab-loaders.js";

const PROFILE = {
  name: "홍길동",
  gender: "M",
  birthDate: "1990-03-15",
  birthTime: "09:30",
  calendarType: "solar",
  birthPlace: { name: "서울", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
  timezone: "Asia/Seoul",
};

// 기능 고유 입력이 필요한 운세만 추가 값을 준다(레지스트리 inputs 선언과 짝이 맞아야 한다).
const EXTRA_BODY = {
  "new-year": { targetYear: 2027, focusArea: "overall" },
  "karma-destiny": { focusArea: "overall" },
  dream: { dreamText: "높은 계단을 끝없이 오르다가 문 앞에서 멈춰 서는 꿈을 꿨습니다." },
  "pet-saju": {
    date: "2026-08-13",
    pet: { name: "보리", species: "dog", birthDate: "2020-05-01", gender: "M" },
  },
};

const LOADER_SERVICES = ADMIN_PROMPT_LAB_SERVICES.filter((service) => !service.builtIn);

describe("프롬프트 랩 레지스트리", () => {
  test("서비스 키가 중복되지 않는다", () => {
    const keys = ADMIN_PROMPT_LAB_SERVICES.map((service) => service.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("모든 서비스가 선언된 그룹에 속한다", () => {
    const grouped = groupedAdminPromptLabServices();
    const placed = grouped.flatMap((entry) => entry.services.map((service) => service.key));
    expect(placed.sort()).toEqual(ADMIN_PROMPT_LAB_SERVICES.map((s) => s.key).sort());
  });

  test("모든 서비스가 입력 요구사항을 선언한다", () => {
    for (const service of ADMIN_PROMPT_LAB_SERVICES) {
      expect(Array.isArray(service.inputs)).toBe(true);
      expect(service.inputs.length).toBeGreaterThan(0);
    }
  });

  // 로더만 있고 레지스트리에 없으면 화면 셀렉트에 안 뜬다 — 만들어 놓고 못 쓰는 상태가 된다.
  test("로더 키가 전부 레지스트리에 선언돼 있다", () => {
    for (const key of listPromptLabLoaderKeys()) {
      expect(getAdminPromptLabService(key)).not.toBeNull();
    }
  });

  test("내장 6종을 뺀 모든 서비스에 로더가 있다", () => {
    for (const service of LOADER_SERVICES) {
      expect(hasPromptLabLoader(service.key)).toBe(true);
    }
  });
});

// 조립기마다 엔진 계산이 붙어 있어 기본 5초로는 모자란다(ESM 모드라 jest 전역이 없어 인자로 준다).
const BUILD_TIMEOUT_MS = 120000;

describe("프롬프트 랩 조립기", () => {
  test.each(LOADER_SERVICES.map((service) => [service.key, service.label]))(
    "%s(%s) 는 보여 줄 프롬프트를 만든다",
    async (key) => {
      const result = await buildPromptLabResult(
        key,
        { ...PROFILE, ...(EXTRA_BODY[key] || {}) },
        { env: {} },
      );

      // 시스템 프롬프트·사용자 프롬프트·변형 목록 중 최소 하나는 있어야 화면에 쓸 것이 생긴다.
      const hasSomething = Boolean(
        result.systemPrompt.trim() || result.prompt.trim() || result.variants.length,
      );
      expect(hasSomething).toBe(true);

      // partial 은 "사용자 프롬프트를 못 만들었다"는 뜻이므로 이유를 반드시 남겨야 한다.
      if (result.partial) {
        expect(result.partialReason.trim().length).toBeGreaterThan(0);
      } else {
        expect(result.prompt.trim().length).toBeGreaterThan(0);
      }
    },
    BUILD_TIMEOUT_MS,
  );

  test("등록되지 않은 키는 INVALID_PROMPT_SERVICE 로 거절한다", async () => {
    await expect(buildPromptLabResult("not-a-real-service", {}, { env: {} })).rejects.toMatchObject({
      code: "INVALID_PROMPT_SERVICE",
    });
  });
});

/* 랩이 다시 뒤처지는 것을 막는 커버리지 검사.
   새 운세를 추가할 때 랩 등록을 잊기는 아주 쉽고, 잊어도 아무 데서도 티가 나지 않는다 —
   그 운세만 조용히 못 뽑을 뿐이다. 실제로 이 기능은 오래 6종만 지원한 채 방치돼 있었다.
   그래서 반대 방향으로 검사한다: LLM 을 쓰는 워커 라우트를 전부 찾아, 레지스트리가 담당을
   선언했거나 사유와 함께 제외됐는지 본다. (소스만 읽는다 — LLM 호출 없음) */
describe("프롬프트 랩 커버리지", () => {
  const routesDir = join(process.cwd(), "worker", "routes");

  // `systemPrompt` 만 보면 남의 프롬프트를 전달만 하는 파일까지 걸리고, `callGemini` 만 보면
  // 시스템 프롬프트를 lib 로 뺀 라우트를 놓친다. 둘 다 본다.
  const LLM_MARKERS = [/\bcallGemini\w*\s*\(/, /\bsystemPrompt\b/];
  // 랩 그 자체라 커버리지 대상이 아니다.
  const NOT_A_FORTUNE_ROUTE = new Set(["admin.js"]);

  const normalize = (value) => {
    const name = basename(String(value || "").trim());
    return name.endsWith(".js") ? name : `${name}.js`;
  };

  const routeFiles = readdirSync(routesDir).filter((name) => name.endsWith(".js"));
  const declaredRoutes = new Set(
    ADMIN_PROMPT_LAB_SERVICES.flatMap((service) => (service.routes || []).map(normalize)),
  );
  const excludedRoutes = new Set(ADMIN_PROMPT_LAB_EXCLUSIONS.map((entry) => normalize(entry.route)));

  const llmRoutes = routeFiles.filter((name) => {
    if (NOT_A_FORTUNE_ROUTE.has(name)) return false;
    const source = readFileSync(join(routesDir, name), "utf8");
    return LLM_MARKERS.some((marker) => marker.test(source));
  });

  test("LLM 을 쓰는 모든 라우트가 랩에 등록됐거나 사유와 함께 제외됐다", () => {
    const uncovered = llmRoutes.filter((name) => !declaredRoutes.has(name) && !excludedRoutes.has(name));
    // 실패 메시지에 파일명이 그대로 보이도록 배열로 비교한다.
    expect(uncovered).toEqual([]);
  });

  test("레지스트리와 제외 목록이 실재하는 라우트만 가리킨다", () => {
    const routeFileSet = new Set(routeFiles);
    const dangling = [...declaredRoutes, ...excludedRoutes].filter((name) => !routeFileSet.has(name));
    expect(dangling).toEqual([]);
  });

  // 사유 없는 제외는 "일단 빼 두자"가 되어 목록 자체를 무력화한다.
  test("모든 제외 항목에 사유가 있다", () => {
    const withoutReason = ADMIN_PROMPT_LAB_EXCLUSIONS
      .filter((entry) => !String(entry.reason || "").trim())
      .map((entry) => entry.route);
    expect(withoutReason).toEqual([]);
  });
});
