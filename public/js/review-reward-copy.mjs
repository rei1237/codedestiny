export const REVIEW_REWARD_IMAGE = "/images/reviews/yeoni-moonstone-gift-v1.webp";
export const REVIEW_WRITE_URL = "/reviews/?write=1";
export const PAID_REVIEW_CHARACTERS = {
  ggulggul: { name: '연이', image: REVIEW_REWARD_IMAGE },
  yeongnyangi: { name: '영냥이', image: '/assets/yeongnyangi/original/hero-480.webp' },
};
export const reviewRewardCopy = {
  title: "후기는 나중에 남겨도 괜찮아요",
  description: "이용한 상담과 리포트의 경험을 들려주세요.",
  fallbackReward: "공개 승인 후 월정석 지급",
  detail: "꿀꿀 사주에서 사용할 수 있어요. 상품별 1회 지급됩니다.",
  action: "후기 남기기",
  imageAlt: "후기 편지와 월정석을 건네는 꽃돼지 연이",
};

export function reviewRewardLabel(policy) {
  return policy?.currency === "moonstone" && policy?.trigger === "approved"
    && Number.isSafeInteger(policy?.amount) && policy.amount > 0
    ? `후기 공개 승인 후 월정석 ${policy.amount.toLocaleString("ko-KR")}개`
    : reviewRewardCopy.fallbackReward;
}

export function paidReviewCopy(brand = 'ggulggul', locale = 'ko') {
  const character = PAID_REVIEW_CHARACTERS[brand] || PAID_REVIEW_CHARACTERS.ggulggul;
  if (locale !== 'ko') return {
    title: brand === 'yeongnyangi' ? 'Tell Yeongnyangi how your reading felt' : 'Leave Yeoni a note about your reading',
    description: 'What helped, and what could be better? Share your honest experience after reading your consultation.',
    action: 'Write a review', name: character.name, image: character.image,
    detail: 'Moonstones are awarded after publication approval, once per product. Use them within 30 days of issue; they cannot be exchanged for cash.' + (brand === 'yeongnyangi' ? ' The displayed value uses Ggulggul rates; Yeongnyangi applies its partner rate.' : ''),
  };
  return {
    title: brand === 'yeongnyangi' ? '다 읽었다면, 어떤 이야기가 남았는지 들려줘.' : '상담을 읽고 난 마음, 연이에게 들려주세요.',
    description: brand === 'yeongnyangi' ? '도움이 된 부분도, 아쉬웠던 부분도 좋아. 네 후기가 다음 상담을 다듬는 데 힘이 돼.' : '마음에 남은 문장이나 아쉬웠던 점을 솔직하게 남겨주세요. 다음 상담을 더 다정하게 준비하는 데 도움이 돼요.',
    action: '상담 후기 남기기', name: character.name, image: character.image,
    detail: '후기 공개 승인 후 상품별 1회 지급돼요. 지급일부터 30일 동안 사용하며, 현금으로 바꿀 수는 없어요.' + (brand === 'yeongnyangi' ? ' 상당 금액은 꿀꿀 사주 기준이에요. 영냥이에서는 제휴 적용 가치가 달라요.' : ''),
  };
}

export function reviewRewardWorthLabel(policy, krwPerStone, locale = 'ko') {
  if (policy?.currency !== 'moonstone' || policy?.trigger !== 'approved' || !Number.isSafeInteger(policy?.amount) || policy.amount <= 0) return '';
  const worth = policy.amount * krwPerStone;
  return Number.isFinite(worth) && worth > 0 ? locale === 'ko' ? `${worth.toLocaleString('ko-KR')}원 상당` : `KRW ${worth.toLocaleString('en-US')} value` : '';
}

export function shouldInvitePaidReview(row) {
  return row?.state === 'COMPLETED' && row?.paid === true
    && !['ACCOUNT_FREE_TRIAL', 'free_trial'].includes(row?.accessMethod);
}
