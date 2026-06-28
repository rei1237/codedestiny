import type { Metadata } from "next";
import FortuneTeaHousePage from "@/src/features/fortune-tea-house/FortuneTeaHousePage";
import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";

export const metadata: Metadata = {
  title: "운명의 찻집 | Code Destiny",
  description:
    "달빛이 머무는 숨겨진 찻집에서 꽃돼지?를 만나고, 연이가 당신의 이야기를 조용히 맞이하는 감성형 운명의 찻집입니다.",
  alternates: {
    canonical: "https://code-destiny.com/fortune-tea-house",
  },
  openGraph: {
    title: "운명의 찻집 | Code Destiny",
    description: "보라빛 밤의 찻집에서 꽃돼지?가 손님을 맞이하고, 연이가 오래 말하지 못한 마음을 한 잔의 온기로 조용히 비춥니다.",
    url: "https://code-destiny.com/fortune-tea-house",
    siteName: "Code Destiny",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: fortuneTeaHouseAssets.pig.transform,
        width: 1200,
        height: 630,
        alt: "달빛 아래 운명의 찻집에서 연이가 손님을 맞이하는 장면",
      },
    ],
  },
};

export default function Page() {
  return (
    <>
      <FortuneTeaHousePage />
      <section className="sr-only">
        <h2>달빛 골목 끝에서 열리는 운명의 찻집</h2>
        <p>
          운명의 찻집은 달빛이 비치는 골목 끝에서 시작됩니다. 손님은 먼저 연꽃을 머리에 단 꽃돼지?를 만나고,
          찻집 안쪽에서 마음의 향을 읽는 짧은 대화를 따라갑니다. 꽃돼지?는 장난스럽고 다정하지만, 오래
          말하지 못한 질문을 가볍게 넘기지 않습니다. 말보다 먼저 찻잔 위에 도착한 마음을 알아보고, 손님이
          스스로도 놓치고 있던 감정의 온도를 조용히 짚어 줍니다.
        </p>
        <p>
          첫 화면은 긴 설명보다 달빛이 고인 찻집 외관과 짧은 초대의 문장에 집중합니다. 문을 열고 안쪽으로
          들어가면 내부 배경, 컷아웃 캐릭터, 하단 대화창이 한 장면처럼 이어지고, 꽃돼지?가 먼저 손님의 마음을
          다정하게 맞이합니다.
        </p>
        <p>
          데스크탑에서는 찻집 외관의 달과 연꽃, 문 앞의 빛을 넓게 살리고, 모바일에서는 같은 장면을 세로 화면에
          맞춰 더 가까운 입구처럼 보여 줍니다. 오버레이 장식은 찻잔과 대화창 주변에 은은하게 머물러, 배경과
          캐릭터가 따로 놓이지 않고 한 장의 달빛 상담실처럼 느껴지도록 정돈됩니다.
        </p>
      </section>
    </>
  );
}
