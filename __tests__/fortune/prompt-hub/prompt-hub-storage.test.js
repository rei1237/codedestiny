/**
 * @jest-environment node
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const esbuild = require("esbuild");

let storage;
let bundledPath;

// jest-environment-jsdom 이 설치돼 있지 않아 node 환경으로 돌린다. 모듈이 쓰는 건
// window.localStorage / window.sessionStorage 둘뿐이라 그만 흉내 낸다.
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
  };
}

beforeAll(() => {
  global.window = {
    localStorage: createMemoryStorage(),
    sessionStorage: createMemoryStorage(),
  };
  const sourcePath = path.join(process.cwd(), "app", "fortune", "prompt-hub", "prompt-hub-storage.ts");
  bundledPath = path.join(os.tmpdir(), `prompt-hub-storage-${Date.now()}.cjs`);
  esbuild.buildSync({
    entryPoints: [sourcePath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundledPath,
  });
  storage = require(bundledPath);
});

afterAll(() => {
  if (bundledPath && fs.existsSync(bundledPath)) fs.unlinkSync(bundledPath);
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("무료 체험 카운터", () => {
  test("첫 생성은 허용하고 한 번 쓰면 잠긴다", () => {
    expect(storage.hasFreeGenerationLeft()).toBe(true);
    storage.recordFreeGeneration();
    expect(storage.hasFreeGenerationLeft()).toBe(false);
    expect(storage.readFreeUsage().count).toBe(1);
  });

  test("값이 깨져 있으면 소진이 아니라 미사용으로 읽는다", () => {
    window.localStorage.setItem("cd:promptHub:freeUses:v1", "{not json");
    expect(storage.readFreeUsage().count).toBe(0);
    expect(storage.hasFreeGenerationLeft()).toBe(true);
  });

  test("firstUsedAt 은 최초 1회만 찍힌다", () => {
    storage.recordFreeGeneration();
    const first = storage.readFreeUsage().firstUsedAt;
    expect(first).toBeGreaterThan(0);
    storage.recordFreeGeneration();
    expect(storage.readFreeUsage().firstUsedAt).toBe(first);
  });
});

describe("로그인 재개 스냅샷", () => {
  test("저장한 입력을 그대로 돌려주고 읽는 즉시 사라진다", () => {
    storage.saveResumeSnapshot("comprehensive", { birthDate: "1994-08-17", question: "올해 흐름" });
    const snapshot = storage.consumeResumeSnapshot();
    expect(snapshot.toolId).toBe("comprehensive");
    expect(snapshot.draft.birthDate).toBe("1994-08-17");
    expect(storage.consumeResumeSnapshot()).toBeNull();
  });

  test("TTL 이 지난 스냅샷은 복원하지 않는다", () => {
    const stale = Date.now() - storage.PROMPT_HUB_RESUME_TTL_MS - 1000;
    window.sessionStorage.setItem(
      "cd:promptHub:resume:v1",
      JSON.stringify({ v: 1, toolId: "saju", draft: { birthDate: "1990-01-01" }, savedAt: stale }),
    );
    expect(storage.consumeResumeSnapshot()).toBeNull();
  });

  test("버전이 다른 스냅샷은 무시한다", () => {
    window.sessionStorage.setItem(
      "cd:promptHub:resume:v1",
      JSON.stringify({ v: 99, toolId: "saju", draft: {}, savedAt: Date.now() }),
    );
    expect(storage.consumeResumeSnapshot()).toBeNull();
  });
});

describe("보관함", () => {
  const item = { toolId: "comprehensive", toolLabel: "종합", prompt: "프롬프트 본문", generatedAt: "2026-07-31" };

  test("게스트는 저장도 조회도 되지 않는다", () => {
    expect(storage.resolveLibraryOwnerKey(null)).toBe("");
    expect(storage.saveToLibrary("", item)).toEqual([]);
    expect(storage.readLibrary("")).toEqual([]);
  });

  test("계정이 다르면 서로의 보관함이 보이지 않는다", () => {
    const a = storage.resolveLibraryOwnerKey({ id: "userA" });
    const b = storage.resolveLibraryOwnerKey({ id: "userB" });
    storage.saveToLibrary(a, item);
    expect(storage.readLibrary(a)).toHaveLength(1);
    expect(storage.readLibrary(b)).toHaveLength(0);
  });

  test("같은 도구의 같은 문장은 쌓이지 않고 맨 앞으로만 올라간다", () => {
    const owner = storage.resolveLibraryOwnerKey({ id: "userA" });
    storage.saveToLibrary(owner, item);
    storage.saveToLibrary(owner, { ...item, toolId: "saju", toolLabel: "사주" });
    const saved = storage.saveToLibrary(owner, item);
    expect(saved).toHaveLength(2);
    expect(saved[0].toolId).toBe("comprehensive");
  });

  test("상한을 넘기면 오래된 항목부터 잘린다", () => {
    const owner = storage.resolveLibraryOwnerKey({ email: "User@Example.com" });
    for (let index = 0; index < storage.PROMPT_HUB_LIBRARY_MAX_ITEMS + 5; index += 1) {
      storage.saveToLibrary(owner, { ...item, prompt: `프롬프트 ${index}` });
    }
    const saved = storage.readLibrary(owner);
    expect(saved).toHaveLength(storage.PROMPT_HUB_LIBRARY_MAX_ITEMS);
    expect(saved[0].prompt).toBe(`프롬프트 ${storage.PROMPT_HUB_LIBRARY_MAX_ITEMS + 4}`);
  });

  test("삭제는 해당 항목만 지운다", () => {
    const owner = storage.resolveLibraryOwnerKey({ id: "userA" });
    storage.saveToLibrary(owner, item);
    const saved = storage.saveToLibrary(owner, { ...item, toolId: "saju", toolLabel: "사주" });
    const remaining = storage.removeFromLibrary(owner, saved[0].id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].toolId).toBe("comprehensive");
  });

  test("이메일 소유자 키는 소문자로 정규화된다", () => {
    expect(storage.resolveLibraryOwnerKey({ email: "User@Example.com" })).toBe("user@example.com");
  });
});
