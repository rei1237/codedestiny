export const REVIEW_REWARD_IMAGE = "/images/reviews/yeoni-yeongnyangi-moonstone-gift-v2.webp";
export const REVIEW_WRITE_URL = "/reviews/?write=1";
export const PAID_REVIEW_CHARACTERS = {
  ggulggul: { name: '연이', image: REVIEW_REWARD_IMAGE },
  yeongnyangi: { name: '영냥이', image: REVIEW_REWARD_IMAGE },
};
export const reviewRewardCopy = {
  title: "후기는 나중에 남겨도 괜찮아요",
  description: "도움이 된 점도 아쉬웠던 점도, 솔직한 경험을 들려주세요. SNS에 공유한 후기도 함께 제출할 수 있어요.",
  fallbackReward: "공개 승인 후 월정석 지급",
  detail: "작성 시점과 참여 횟수 제한 없이, 매번 관리자 승인 후 지급해요.",
  action: "후기 남기기",
  imageAlt: "후기 편지와 월정석을 함께 건네는 꽃돼지 연이와 영냥이",
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
    detail: 'Moonstones are awarded after publication approval, for each separately approved submission, with no participation cap or review deadline. Use them within 30 days of issue; they cannot be exchanged for cash.',
  };
  return {
    title: brand === 'yeongnyangi' ? '다 읽었다면, 어떤 이야기가 남았는지 들려줘.' : '상담을 읽고 난 마음, 연이에게 들려주세요.',
    description: brand === 'yeongnyangi' ? '도움이 된 부분도, 아쉬웠던 부분도 좋아. 네 후기가 다음 상담을 다듬는 데 힘이 돼.' : '마음에 남은 문장이나 아쉬웠던 점을 솔직하게 남겨주세요. 다음 상담을 더 다정하게 준비하는 데 도움이 돼요.',
    action: '상담 후기 남기기', name: character.name, image: character.image,
    detail: '후기는 나중에 써도 괜찮아요. 횟수 제한 없이 매번 관리자 승인 후 지급돼요. 지급일부터 30일 동안 사용하며, 현금으로 바꿀 수는 없어요.',
  };
}

export function reviewRewardWorthLabel(policy, krwPerStone, locale = 'ko') {
  if (policy?.currency !== 'moonstone' || policy?.trigger !== 'approved' || !Number.isSafeInteger(policy?.amount) || policy.amount <= 0) return '';
  const worth = Number.isSafeInteger(policy.valueKRW) && policy.valueKRW > 0 ? policy.valueKRW : policy.amount * krwPerStone;
  return Number.isFinite(worth) && worth > 0 ? locale === 'ko' ? `${worth.toLocaleString('ko-KR')}원 상당` : `KRW ${worth.toLocaleString('en-US')} value` : '';
}

export function shouldInvitePaidReview(row) {
  return row?.state === 'COMPLETED' && row?.paid === true
    && !['ACCOUNT_FREE_TRIAL', 'free_trial'].includes(row?.accessMethod);
}
