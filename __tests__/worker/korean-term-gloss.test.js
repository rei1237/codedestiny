import { describe, expect, it } from "@jest/globals";
import { koreanizeExpertTerms, nakshatraKo } from "../../worker/lib/korean-term-gloss.js";

// R7·R8 live re-call 2026-10-11: astrology wrote 15 English glosses, vedic 92 plus "Ashwini" 7 times.
describe("koreanizeExpertTerms", () => {
  it("drops an English gloss after a Korean term, keeping bold markers", () => {
    expect(koreanizeExpertTerms("당신의 차트 지배성(Chart Ruler)이 **화성**입니다.")).toBe("당신의 차트 지배성이 **화성**입니다.");
    expect(koreanizeExpertTerms("**사데 사티(Sade Sati)**의 마지막")).toBe("**사데 사티**의 마지막");
    expect(koreanizeExpertTerms("**금성**(Venus)과 토성 (Saturn)이 자기 라시(own sign)인 염소자리")).toBe("**금성**과 토성이 자기 라시인 염소자리");
  });

  it("drops a leading English phrase inside a Korean parenthesis", () => {
    expect(koreanizeExpertTerms("정확하게 대립(Jupiter opposition Saturn, 오브 1.2도)합니다.")).toBe("정확하게 대립(오브 1.2도)합니다.");
    expect(koreanizeExpertTerms("**달 스퀘어 목성(orb 0.50°)**, 고양된 금성이 1바바(House 1)에")).toBe("**달 스퀘어 목성(오브 0.50°)**, 고양된 금성이 1바바에");
  });

  it("writes nakshatra names in Korean", () => {
    expect(koreanizeExpertTerms("달은 Ashwini 나크샤트라와 Purva Phalguni에 있습니다.")).toBe("달은 아슈위니 나크샤트라와 푸르바 팔구니에 있습니다.");
    expect(nakshatraKo("Uttara Bhadrapada")).toBe("웃타라 바드라파다");
    expect(nakshatraKo("Unknown")).toBe("Unknown");
  });

  it("leaves English that is not a gloss, and JSON keys, untouched", () => {
    const text = '{"title":"IT 업무(정보기술)","body":"MC 축과 나바암샤(D9)는 그대로 둡니다."}';
    expect(koreanizeExpertTerms(text)).toBe(text);
  });
});
