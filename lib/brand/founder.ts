// Career supplied by the founder; prediction dates link to the public originals.
// This describes the service creator, not a human review of each AI result.
export const founder = {
  credential: '10년 경력 운세 상담사·명리학자가 만든 서비스',
  headline: '대통령의 변화가 오기 전, 2025년을 짚은 기록.',
  description: '명리학자 네오는 2022년과 2024년 공개 글에서 윤석열의 운세 변화와 이재명의 대통령 가능성을 다뤘습니다. 어떤 시기를 어떻게 읽었는지, 게시일과 원문으로 확인해 보세요.',
  // 근거: 네오 1:1 상담의 실제 판매가(1회 30만원). 1:1 상담과 천원 상담(계산 엔진+AI 해설)은 다른 상품이라 노출처마다 고지를 함께 둔다.
  offerHeadline: (price: string) => `1회 30만원 1:1 상담으로 풀던 사주를, 이제 ${price}에`,
  method: '현장 상담 경험을 서비스에 담았습니다. 각 체계의 계산 결과를 바탕으로 AI가 해설하며, 상담사가 결과마다 직접 답하는 방식은 아닙니다.',
} as const;
