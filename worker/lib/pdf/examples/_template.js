export function createPremiumExampleResult({ reportType, tone, chapterHint = [] }) {
  return {
    reportType,
    tone,
    minimumQuality: {
      avoid: [
        "데이터가 부족합니다",
        "자동 복구 생성",
        "Chapter 1",
        "핵심 진단 반복",
        "똑같은 문장 반복",
        "일반적인 해석입니다",
      ],
      require: [
        "개인 생년월일 기반 상담문",
        "챕터별 서로 다른 주제",
        "실전 조언",
        "심리적 통찰",
        "인생 흐름 해석",
      ],
    },
    chapterWritingExample: chapterHint,
  };
}
