// 획수(설계서 §6.1). 원획·필획 값은 Phase 2 데이터가 이미 계산해 두었다 — 여기서는 프리셋에 맞게 고르고 성씨를 푼다.
// 숫자 一~十: won 은 수의 획수(四=4…十=10), pil 은 실획.

import type { StrokeMethod } from "./config/school-presets";
import type { HanjaEntry, NamingData } from "./data";
import { NamingEngineError } from "./types";

export function charStrokes(entry: Pick<HanjaEntry, "won" | "pil">, method: StrokeMethod): number {
  return method === "pil" ? entry.pil : entry.won;
}

export interface ResolvedSurname {
  hangul: string;
  hanja: string[];
  strokes: number[];
  compound: boolean;
  /** kosis = 2015 인구총조사 성씨표, pool = 표 밖 희귀성 → 인명용 한자 풀의 같은 글자 획수 */
  source: "kosis" | "pool";
}

function syllables(text: string): string[] {
  return Array.from(String(text || "").trim());
}

/**
 * 성씨 한자·획수를 푼다. 성 한자 선택은 필수다(같은 소리 성이 여러 한자를 가진다).
 * 표에 없는 성은 인명용 풀의 같은 글자 획수로 받는다(KOSIS 표는 5인 이상 성만 싣는다).
 */
export function resolveSurname(
  input: { hangul: string; hanja: string[] },
  method: StrokeMethod,
  data: NamingData,
): ResolvedSurname {
  const hangul = syllables(input.hangul);
  // NFC: 한글 IME·KS X 1001 은 金(김)·李(리)를 CJK 호환 한자(U+F90A·U+F9E1)로 내기도 한다 — 풀 키는 통합 한자다.
  const hanja = (input.hanja || []).map((ch) => String(ch || "").trim().normalize("NFC")).filter(Boolean);
  if (hanja.length < 1 || hanja.length > 2 || hangul.length !== hanja.length) {
    throw new NamingEngineError("surname-invalid", "성은 한글·한자 같은 글자 수(1~2자)로 받는다");
  }
  if (hangul.some((ch) => ch < "가" || ch > "힣")) throw new NamingEngineError("surname-invalid", "성 한글은 완성형 음절만");

  const joined = hanja.join("");
  const row = data.surnames.find((s) => s.hanja === joined && s.hangul === hangul.join(""))
    || data.surnames.find((s) => s.hanja === joined);
  if (row) {
    return {
      hangul: hangul.join(""),
      hanja,
      strokes: method === "pil" ? [...row.pil] : [...row.won],
      compound: hanja.length === 2,
      source: "kosis",
    };
  }
  const entries = hanja.map((ch) => data.poolByChar.get(ch));
  if (entries.some((entry) => !entry)) throw new NamingEngineError("surname-unknown", joined);
  return {
    hangul: hangul.join(""),
    hanja,
    strokes: entries.map((entry) => charStrokes(entry as HanjaEntry, method)),
    compound: hanja.length === 2,
    source: "pool",
  };
}
