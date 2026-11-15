// 첫 화면 신뢰 띠 문구(2026-11-15 사용자 결정). 근거는 trust-stories.mjs 의 공개일이 찍힌 원문이다.
// 시점만 말한다. 방식 일치·유일성·결과 보장은 공개 기록 페이지가 스스로 부정하므로 쓰지 않는다.
import { PRESIDENTIAL_RECORDS } from '../brand/trust-stories.mjs';
import { PUBLIC_RECORD_PATH } from '../seo/public-record-copy.mjs';

// 문구의 "2024년 공개 글", "두 사람", "2025년"을 뒷받침하는 원문(테스트가 대조한다).
export const TRUST_RECORD_SOURCES = PRESIDENTIAL_RECORDS.filter((record) => record.date.startsWith('2024-'));

export const trustRecordCopy = {
  full: '2024년 공개 글에서 두 대통령의 2025년을 미리 짚은 명리학자 박병하(네오)가 만든 운세',
  short: '2024년 공개 글로 두 대통령의 2025년을 미리 짚은 명리학자가 만든 상담',
  link: '원문 날짜 확인하기',
  href: PUBLIC_RECORD_PATH,
};
