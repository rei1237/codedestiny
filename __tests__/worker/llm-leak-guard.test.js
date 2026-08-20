/**
 * worker/lib/llm-leak-guard.js — 내부 키 경로 탐지·치환 단위 테스트.
 *
 * 계산 요약 객체를 그대로 프롬프트에 실으면 모델이 "sanFangSiZheng.lifePalace.mainStars"
 * 같은 키를 상담문에 인용한다. 탐지는 오탐이 없어야 하고, 처리는 폐기가 아니라 치환이어야 한다
 * (유료 상담문에서 키 하나 때문에 문단을 버리면 안 된다).
 */
import {
  findInternalKeyPaths,
  resolveForbiddenPatterns,
  scrubInternalKeyPaths,
} from "../../worker/lib/llm-leak-guard.js";

describe("resolveForbiddenPatterns — 2026-08-20 에 열린 7개 언어", () => {
  const KO_PATTERN = /프롬프트|시스템/;

  test("ko 는 호출자가 넘긴 패턴을 그대로 돌려준다 (한국어 판정 무변경)", () => {
    expect(resolveForbiddenPatterns(KO_PATTERN, "ko")).toEqual([KO_PATTERN]);
  });

  // 🔴 이 목록이 비면 그 언어에서는 "프롬프트를 그대로 읊는" 응답이 통과한다.
  const LEAKS = {
    vi: "Với tư cách là AI, tôi chỉ làm theo lời nhắc hệ thống ở trên.",
    hi: "एआई के रूप में मैं ऊपर दिए गए आंतरिक निर्देश का पालन करता हूँ।",
    es: "Como IA, solo sigo el prompt del sistema y las instrucciones internas.",
    fr: "En tant qu'IA, je suis le prompt système et les instructions internes.",
    de: "Als eine KI folge ich dem System-Prompt und den internen Anweisungen.",
    nl: "Als een AI volg ik de systeemprompt en de interne instructies.",
    ms: "Sebagai AI, saya hanya mengikut prompt sistem dan arahan dalaman.",
  };

  // 정상 상담문. 여기 걸리면 그 언어 사용자는 매번 폐기·재생성을 겪는다.
  const ORDINARY = {
    vi: "Ai cũng có lúc gặp khó khăn, nhưng công việc của bạn sẽ ổn định.",
    hi: "इस वर्ष आपका करियर मजबूत होगा और काम में प्रगति दिखाई देगी।",
    es: "Tu casa profesional se fortalece y el trabajo avanza con calma.",
    fr: "J'ai confiance en votre chemin, et le travail avance doucement.",
    de: "Dein Job stabilisiert sich und die Verantwortung waechst langsam.",
    nl: "Je werk wordt rustiger en er komt stap voor stap vooruitgang.",
    ms: "Kerjaya anda menjadi lebih stabil dan rezeki datang perlahan.",
  };

  for (const locale of Object.keys(LEAKS)) {
    test(`${locale}: 누출은 잡고 평범한 상담문은 통과시킨다`, () => {
      const patterns = resolveForbiddenPatterns(KO_PATTERN, locale);
      expect(patterns).not.toContain(KO_PATTERN); // ko 패턴은 비-ko 에서 쓰이지 않는다
      expect(patterns.some((pattern) => pattern.test(LEAKS[locale]))).toBe(true);
      expect(patterns.some((pattern) => pattern.test(ORDINARY[locale]))).toBe(false);
    });
  }
});

describe("findInternalKeyPaths", () => {
  test("실제 보고된 누출 경로를 잡는다", () => {
    const text = "명궁의 힘은 sanFangSiZheng.lifePalace.mainStars 에서 확인된다.";
    expect(findInternalKeyPaths(text)).toEqual(["sanFangSiZheng.lifePalace.mainStars"]);
  });

  test("두 단계 경로와 중복도 처리한다", () => {
    const found = findInternalKeyPaths("keyFeatures.keyStars 와 keyFeatures.keyStars 를 본다.");
    expect(found).toEqual(["keyFeatures.keyStars"]);
  });

  test("도메인·파일명·버전·소수점은 오탐하지 않는다", () => {
    const safe = [
      "code-destiny.com 에서 확인",
      "www.google.com 참고",
      "index.html 과 package.json",
      "README.md 를 읽어라",
      "작년 대비 3.5배, 버전 1.2.3",
      "문장이 끝났다.Then 이어졌다",
    ].join("\n");
    expect(findInternalKeyPaths(safe)).toEqual([]);
  });

  test("낙타 등이 없는 경로는 여기서 안 잡힌다(호출부가 키 목록으로 넘겨야 한다)", () => {
    expect(findInternalKeyPaths("chart.lagna 를 본다")).toEqual([]);
  });

  test("빈 입력에 throw 하지 않는다", () => {
    expect(findInternalKeyPaths("")).toEqual([]);
    expect(findInternalKeyPaths(null)).toEqual([]);
  });
});

describe("scrubInternalKeyPaths", () => {
  test("라벨이 있으면 한글로 치환한다", () => {
    const out = scrubInternalKeyPaths(
      "명궁의 힘은 sanFangSiZheng.lifePalace.mainStars 에서 확인된다.",
      { "sanFangSiZheng.lifePalace.mainStars": "삼방사정 명궁 주성" },
    );
    expect(out).toBe("명궁의 힘은 삼방사정 명궁 주성 에서 확인된다.");
    expect(findInternalKeyPaths(out)).toEqual([]);
  });

  test("마지막 세그먼트 라벨로도 치환된다", () => {
    const out = scrubInternalKeyPaths("keyFeatures.keyStars 가 강하다.", { keyStars: "핵심 별" });
    expect(out).toBe("핵심 별 가 강하다.");
  });

  test("라벨이 없으면 토큰만 지우고 빈 괄호·중복 공백을 정리한다", () => {
    const out = scrubInternalKeyPaths("명궁(sanFangSiZheng.lifePalace)의 주성이 강하다.");
    expect(out).toBe("명궁의 주성이 강하다.");
  });

  test("호출부가 넘긴 키 목록이면 낙타 등 없는 경로도 지운다", () => {
    const out = scrubInternalKeyPaths("라그나는 chart.lagna 이다.", { "chart.lagna": "라그나" });
    expect(out).toBe("라그나는 라그나 이다.");
  });

  test("긴 경로를 먼저 치환해 부분 경로가 남지 않는다", () => {
    const out = scrubInternalKeyPaths("값은 aBc.dEf.gHi 이다.", { "aBc.dEf.gHi": "전체", "aBc.dEf": "부분" });
    expect(out).toBe("값은 전체 이다.");
  });

  test("치환할 것이 없으면 원문을 그대로(정리 없이) 돌려준다", () => {
    const text = "명궁의  주성이 강하다.";
    expect(scrubInternalKeyPaths(text)).toBe(text);
  });

  test("🔴 치환 결과가 통째로 비면 원문을 살린다 — 유료 콘텐츠 손실 금지", () => {
    const text = "sanFangSiZheng.lifePalace";
    expect(scrubInternalKeyPaths(text)).toBe(text);
  });

  test("빈 입력·null 에 throw 하지 않는다", () => {
    expect(scrubInternalKeyPaths("")).toBe("");
    expect(scrubInternalKeyPaths(null)).toBe("");
  });
});
