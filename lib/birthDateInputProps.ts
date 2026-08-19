// 생년월일 텍스트 입력의 공통 props. 화면마다 className·style·라벨이 제각각이라
// 공용 컴포넌트가 아니라 props 헬퍼로 둔다 — 호출부 JSX 구조를 건드리지 않는다.
//
// 🔴 onBlur 정규화가 이 헬퍼의 핵심이다.
//    예전 type="date" 는 미완성 입력을 브라우저가 항상 "" 으로 줬고, 각 화면의 제출 검사는
//    `if (!birthDate)` 하나로 그걸 믿고 있었다. 텍스트로 바꾸면 "1991-0" 같은 값이 그 검사를
//    통과해 유료 AI 호출까지 나간다. 필드를 떠날 때 정규화해 못 읽는 값은 "" 으로 되돌려
//    그 계약을 그대로 유지한다.
import type { ChangeEvent, FocusEvent } from "react";
import { maskBirthDateInput, normalizeBirthDateInput } from "./birthDateInput";

export function birthDateTextInputProps(value: string, onValue: (next: string) => void) {
  return {
    type: "text" as const,
    inputMode: "numeric" as const,
    maxLength: 10,
    placeholder: "YYYY-MM-DD",
    // 달력 피커를 쓰지 않는 생년월일 입력의 표식. CSS 선택자와 전수 가드가 이걸 본다.
    "data-cd-birth-date": "",
    value: maskBirthDateInput(value),
    onChange: (event: ChangeEvent<HTMLInputElement>) => onValue(maskBirthDateInput(event.target.value)),
    onBlur: (event: FocusEvent<HTMLInputElement>) => onValue(normalizeBirthDateInput(event.target.value)),
  };
}
