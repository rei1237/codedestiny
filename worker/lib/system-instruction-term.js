// 본문에 새면 안 되는 것은 "시스템 메시지·지시" 같은 내부 지시 표현뿐이다. 맨 단어 /시스템/g 는
// "면역 시스템"·"보상 시스템" 같은 정상 문장을 깨뜨렸다(new-year-ai.js FORBIDDEN_RESULT_PATTERN 과 같은 기준,
// R6·R7·R8 실호출 2026-10-10).
export const SYSTEM_INSTRUCTION_TERM_PATTERN = /시스템\s*(?:메시지|지시)/g;
