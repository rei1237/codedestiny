// 메모 민감정보 확인 창(경고만, 저장을 막지 않는다)에 쓰는 낱말 목록. 번역 사전과 따로 둔다.
// 질병·종교·정치 성향·범죄 관련 낱말. 화면은 일치 여부만 보고 메모 원문을 어디에도 기록하지 않는다.
export const NOTE_SENSITIVE_KEYWORDS = Object.freeze([
  // 건강·질병
  '병원', '입원', '수술', '진단', '암 투병', '우울증', '공황', '치료', '질병', '투병',
  'hospital', 'surgery', 'cancer', 'diagnos', 'depress', 'illness', 'disease',
  // 종교
  '교회', '성당', '절에', '신앙', '종교', 'church', 'religio',
  // 정치 성향
  '정당', '지지 정당', '선거운동', '정치', 'politic',
  // 범죄
  '범죄', '체포', '구속', '재판', '전과', '고소', '수감', 'arrest', 'crime', 'prison',
]);
