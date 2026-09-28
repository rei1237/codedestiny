export const REVIEW_REWARD_IMAGE = "/images/reviews/yeoni-moonstone-gift-v1.webp";
export const REVIEW_WRITE_URL = "/reviews/?write=1";
export const reviewRewardCopy = {
  title: "후기는 나중에 남겨도 괜찮아요",
  description: "이용한 상담과 리포트의 경험을 들려주세요.",
  fallbackReward: "공개 승인 후 월정석 지급",
  detail: "꿀꿀운세에서 사용할 수 있어요. 상품별 1회 지급됩니다.",
  action: "후기 남기기",
  imageAlt: "후기 편지와 월정석을 건네는 꽃돼지 연이",
};

export function reviewRewardLabel(policy) {
  return policy?.currency === "moonstone" && policy?.trigger === "approved"
    && Number.isSafeInteger(policy?.amount) && policy.amount > 0
    ? `후기 공개 승인 후 월정석 ${policy.amount.toLocaleString("ko-KR")}개`
    : reviewRewardCopy.fallbackReward;
}
