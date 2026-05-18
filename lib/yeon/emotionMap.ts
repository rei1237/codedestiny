import type { YeonMood } from "./types";

export const moodLabelMap: Record<YeonMood, string> = {
  happy: "좋았어",
  tired: "지쳤어",
  anxious: "불안해",
  lonely: "외로워",
  angry: "화났어",
  blank: "멍해",
  hopeful: "기대돼",
};

export const moodOpeningMap: Record<YeonMood, string> = {
  happy: "오늘은 네 안의 작은 별이 평소보다 조금 더 반짝였던 날일지도 몰라.",
  tired: "요즘 조금 무리하고 있지 않았어?",
  anxious: "요즘 마음이 자꾸 먼저 뛰어가고 있지 않았어?",
  lonely: "요즘 사람들 사이에 있어도 혼자인 것처럼 느껴진 순간이 있었을지도 몰라.",
  angry: "요즘 참느라 마음 안쪽이 뜨거워진 날이 있었지?",
  blank: "요즘 아무렇지 않은 척했지만, 사실 마음이 조금 멍했던 건 아닐까?",
  hopeful: "요즘 아주 작지만 다시 해보고 싶은 마음이 고개를 들고 있지 않아?",
};

export const yeonEmotionPoseMap: Record<
  YeonMood,
  { pose: string; expression: string; sparkle: string }
> = {
  happy: {
    pose: "작은 꽃잎을 들고 통통 뛰는 연이",
    expression: "눈웃음, 볼 발그레",
    sparkle: "살구빛 별가루",
  },
  tired: {
    pose: "작은 담요를 들고 사용자를 덮어주려는 연이",
    expression: "걱정스럽지만 따뜻한 표정",
    sparkle: "우유빛 별먼지",
  },
  anxious: {
    pose: "작은 별 쿠션을 안고 옆에 앉아주는 연이",
    expression: "차분하고 다정한 표정",
    sparkle: "하늘빛 잔광",
  },
  lonely: {
    pose: "사용자 옆에 조용히 붙어 앉은 연이",
    expression: "부드러운 미소",
    sparkle: "달빛 은점",
  },
  angry: {
    pose: "작은 불꽃을 후후 불어 식혀주는 연이",
    expression: "진지하지만 귀여운 표정",
    sparkle: "따뜻한 금빛 입자",
  },
  blank: {
    pose: "구름 위에서 멍하니 같이 쉬는 연이",
    expression: "편안하고 느긋한 표정",
    sparkle: "흰 구름 입자",
  },
  hopeful: {
    pose: "작은 씨앗 화분을 들고 있는 연이",
    expression: "기대하는 눈빛",
    sparkle: "연두빛 별조각",
  },
};
