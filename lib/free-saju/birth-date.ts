// `/saju/free` 생년월일 텍스트 입력 정규화(달력 피커 금지 가드: __tests__/ui/typed-birth-input.test.js).
import { normalizeBirthDateInput } from "@/lib/birthDateInput";

export type FreeBirthCalendar = "solar" | "lunar";

/**
 * 타이핑한 생년월일을 YYYY-MM-DD 로. 양력은 공용 정규화(실재 날짜만)를 쓰고,
 * 음력은 양력 달력에 없는 2월 29·30일 같은 날도 있어 월 1~12 · 일 1~30 만 본다(실재 여부는 엔진이 가린다).
 */
export function normalizeFreeBirthDate(value: string, kind: FreeBirthCalendar): string {
  const solar = normalizeBirthDateInput(value);
  if (solar || kind === "solar") return solar;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (month < 1 || month > 12 || day < 1 || day > 30) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}
