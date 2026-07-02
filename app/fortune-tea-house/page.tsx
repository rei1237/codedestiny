import type { Metadata } from "next";
import FortuneTeaHouseClient from "./FortuneTeaHouseClient";
import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";

export const metadata: Metadata = {
  title: "운명의 찻집 | Code Destiny",
  description:
    "달빛이 머무는 숨겨진 찻집에서 꽃돼지 연이를 만나고, 연이가 당신의 이야기를 조용히 맞이하는 감성형 운명의 찻집입니다.",
  alternates: {
    canonical: "https://code-destiny.com/fortune-tea-house",
  },
  openGraph: {
    title: "운명의 찻집 | Code Destiny",
    description: "보라빛 밤의 찻집에서 꽃돼지 연이가 손님을 맞이하고, 연이가 오래 말하지 못한 마음을 한 잔의 온기로 조용히 비춥니다.",
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
      <FortuneTeaHouseClient />
      <section
        className="relative overflow-hidden bg-[linear-gradient(180deg,#140b24_0%,#211135_48%,#090514_100%)] px-5 py-12 text-[#fff8f0] sm:px-8"
        aria-label="운명의 찻집 달빛 안내"
      >
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e9c46a]">Moonlight Reading Room</p>
            <h2 className="mt-3 font-premium text-3xl font-black leading-tight text-[#fff6fa] sm:text-4xl">
              달빛 찻잔이 마음의 결을 천천히 비춥니다
            </h2>
            <div className="mt-5 space-y-4 text-[15px] font-semibold leading-8 text-[#f7e7ee]/86 sm:text-base">
              <p>
                문 앞에 닿으면 먼저 숨이 조금 느려집니다. 연이는 손님이 급히 답을 붙잡기보다, 오래 품고 온
                질문이 어느 마음에서 시작되었는지 조용히 바라봅니다. 말끝에 남은 떨림, 아직 정리되지 않은
                기대, 다시 꺼내기 어려웠던 고백이 찻잔 가장자리의 빛처럼 하나씩 떠오릅니다.
              </p>
              <p>
                타로를 고르는 순간에는 카드보다 손님의 마음이 먼저 움직입니다. 어떤 장면은 가까운 인연의
                온도를 비추고, 어떤 장면은 선택 뒤에 따라올 작은 변화를 가리킵니다. 연이는 빛을 크게 부풀리지
                않고, 오늘 밤 붙잡아도 좋은 조언과 내일 아침 가볍게 내려놓아도 되는 걱정을 나누어 줍니다.
              </p>
              <p>
                사주의 흐름을 함께 여는 날에는 태어난 때와 지금의 질문이 한 잔의 향처럼 겹쳐집니다. 지나온
                계절이 남긴 무늬, 관계 안에서 반복되는 망설임, 앞으로 조금씩 달라질 선택의 결을 차분히
                살피며 손님이 자기 목소리를 더 선명하게 들을 수 있도록 곁에 머뭅니다.
              </p>
              <p>
                숙요의 인연을 물을 때에는 두 사람 사이에 흐르는 거리감과 온도를 먼저 살핍니다. 가까워질수록
                편해지는 마음인지, 잠시 떨어져 있을 때 더 잘 보이는 약속인지, 아직 말하지 못한 바람이 어느
                쪽에서 먼저 흔들리는지 낮은 목소리로 짚어 줍니다.
              </p>
              <p>
                찻집의 시간은 빠른 결론보다 마음의 회복을 더 소중히 여깁니다. 손님이 이미 지나온 길을 탓하지
                않고, 지금 남아 있는 감정이 어디로 흐르면 덜 아플지 살핍니다. 그래서 연이의 말은 운명을
                단정하기보다, 손님이 스스로 선택할 수 있는 작은 등불을 곁에 놓는 쪽으로 머뭅니다.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[#e9c46a]/25 bg-white/[0.06] p-5 shadow-[0_28px_72px_rgba(5,2,14,0.34)] backdrop-blur-md sm:p-6">
            <p className="text-sm font-black text-[#f5d98d]">찻잔이 건네는 세 가지 온기</p>
            <div className="mt-4 space-y-4 text-sm font-semibold leading-7 text-[#fff8f0]/82">
              <p>
                첫째, 질문을 판단하지 않습니다. 아직 이름 붙이지 못한 감정도 그대로 놓아두고, 마음이 먼저
                알아차린 방향을 부드럽게 비춥니다.
              </p>
              <p>
                둘째, 확신을 억지로 밀어 넣지 않습니다. 카드와 사주의 상징은 손님이 이미 느끼고 있던 작은
                예감을 다시 믿을 수 있도록 낮은 불빛으로 머뭅니다.
              </p>
              <p>
                셋째, 끝을 재촉하지 않습니다. 오늘 정해야 할 마음과 조금 더 지켜봐도 되는 흐름을 나누어,
                손님이 자기 속도 안에서 다음 걸음을 고를 수 있게 돕습니다.
              </p>
              <p>
                찻잔을 내려놓은 뒤에도 마음에 남는 것은 거창한 예언보다 조용한 정리입니다. 흔들리던 질문의
                이름을 알아차리고, 관계의 온도를 다시 느끼고, 내일의 선택 앞에서 조금 덜 외롭게 설 수 있도록
                연이는 마지막 향을 오래 남깁니다.
              </p>
              <p>
                이미 답을 알고 있었지만 말로 꺼내기 어려웠던 마음, 아직 기다려도 되는 흐름, 이제는 부드럽게
                접어야 할 기대가 서로 다른 빛으로 드러납니다. 그 빛은 손님을 몰아세우지 않고, 다시 숨을 고를
                수 있는 다음 자리를 천천히 열어 줍니다.
              </p>
              <p>
                연이는 손님의 마음이 단단해질 때까지 곁의 불빛을 낮추지 않습니다. 작은 선택 하나가 삶의
                리듬을 바꾸는 밤이라면, 찻집은 그 선택이 두려움이 아니라 자신을 지키는 감각에서 나오도록
                조용히 기다립니다.
              </p>
              <p>
                문을 나설 때 손님에게 남는 것은 누군가 대신 정해 준 운명이 아니라, 자기 안에서 이미 움직이고
                있던 빛을 알아본 감각입니다. 그 감각이 다음 하루의 말투와 선택을 조금 더 다정하게 바꿉니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
