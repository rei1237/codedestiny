import type { Metadata } from "next";
import SukuyoCalendarRouteClient from "./SukuyoCalendarRouteClient";

const SUKUYO_CALENDAR_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "27숙 달력 | Code Destiny",
    description:
      "양력 날짜를 음력으로 옮겨 그날 달이 머무는 27숙을 찾고, 활용·주의·연애·일과 돈 조언과 본명숙 기준 개인 길흉까지 한 화면에서 봅니다.",
    keywords: ["27숙 달력", "숙요 달력", "숙요점", "27수", "오늘의 숙요"],
  },
  en: {
    title: "27 Lunar Mansion Calendar | Code Destiny",
    description:
      "Converts a solar date to its lunar date, finds the 27 lunar mansion the Moon occupies, and shows daily use, caution, love and money guidance plus personal fortune from your birth mansion.",
    keywords: ["27 lunar mansion calendar", "Sukuyo calendar", "Sukuyo astrology", "daily Sukuyo"],
  },
  ja: {
    title: "二十七宿カレンダー | Code Destiny",
    description:
      "新暦の日付を旧暦に換算してその日の二十七宿を割り出し、活用・注意・恋愛・仕事とお金の助言に加え、本命宿を基準にした個人の吉凶まで一画面で確認できます。",
    keywords: ["二十七宿カレンダー", "宿曜カレンダー", "宿曜占星術", "今日の宿曜"],
  },
} as const;

const sukuyoCalendarPageCopy = SUKUYO_CALENDAR_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: sukuyoCalendarPageCopy.title,
  description: sukuyoCalendarPageCopy.description,
  keywords: [...sukuyoCalendarPageCopy.keywords],
  alternates: {
    canonical: "/sukuyo/calendar",
  },
  openGraph: {
    title: sukuyoCalendarPageCopy.title,
    description: sukuyoCalendarPageCopy.description,
    url: "https://code-destiny.com/sukuyo/calendar",
    images: ["https://code-destiny.com/fuctionassets/sukyo.webp"],
  },
};

export default function SukuyoCalendarPage() {
  return (
    <>
      <SukuyoCalendarRouteClient />
      {/* 달력 본체는 ssr:false 클라이언트라 서버 HTML 이 비어 있었다 — 그래서 이 라우트는
          _headers 의 X-Robots-Tag 로 색인에서 빼 두었다(2026-08-30 실측: 서버 h1 0개).
          아래 해설은 서버에서 렌더해 색인 대상으로 되돌리기 위한 본문이다.
          🔴 클라이언트는 h1 을 갖지 않는다 — 여기가 이 라우트의 유일한 h1 이다.
          SukuyoCalendarClient 에 h1 을 추가하면 verify:seo-heading-integrity 가 실패한다.
          내용은 lib/sukuyo-calendar.ts 와 worker/lib/sukuyo-relation-core.js 의 실제 동작을
          따랐다 — 문구를 고칠 때 그쪽 값이 바뀌지 않았는지 먼저 볼 것. */}
      <section className="bg-[#fbf7ef] px-4 pb-14 text-[#3b2a1f]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <h1 className="text-2xl font-bold sm:text-3xl">27숙 달력 — 날짜마다 바뀌는 달의 자리를 읽는 법</h1>
          <p className="leading-8">
            숙요점은 태양이 아니라 달을 기준으로 삼는 별자리 체계입니다. 달이 하늘을 한 바퀴 도는 동안 스물일곱 개의
            자리를 차례로 지나가고, 그날 달이 머무는 자리가 그 하루의 결을 정한다고 봅니다. 이 달력은 날짜를 고르면
            그날의 숙과 함께 어울리는 일, 조심할 일, 관계와 일에서의 조언을 한 화면에 펼쳐 놓습니다.
          </p>

          <h2 className="mt-2 text-xl font-semibold">이 달력은 날짜에서 숙을 어떻게 뽑나</h2>
          <p className="leading-8">
            먼저 입력한 양력 날짜를 한국 음양력 코어로 음력으로 옮깁니다. 숙요점의 자리는 음력 월과 음력 일이 함께
            정하는 값이라, 양력에서 곧바로 계산하면 매년 며칠씩 어긋납니다. 윤달도 그대로 반영해 윤달의 하루와 평달의
            같은 날짜가 서로 다른 숙을 받도록 했습니다.
          </p>
          <p className="leading-8">
            날짜 경계는 한국 표준시를 기준으로 삼습니다. 자정을 넘긴 새벽에 보아도 달력이 말하는 오늘은 한국 시간의
            오늘입니다. 지원 범위는 1900년부터 2100년까지이며, 이 범위를 벗어난 해는 음양력 변환이 답하지 못해 조회가
            막힙니다.
          </p>

          <h2 className="mt-2 text-xl font-semibold">하루 해설이 담는 여섯 갈래</h2>
          <p className="leading-8">
            날짜를 고르면 그날 숙의 이름과 한자, 상징어 넉 자와 함께 아래 여섯 갈래의 해설이 열립니다. 좋은 날과 나쁜
            날을 가르는 대신, 같은 기운을 어디에 쓰면 도움이 되고 어디에서 어긋나기 쉬운지를 나누어 적었습니다.
          </p>
          <ul className="ml-5 list-disc space-y-2 leading-8">
            <li>본질 — 그 숙이 어떤 기운을 여는 자리인지, 하루 전체의 방향을 한 문단으로 짚습니다.</li>
            <li>오늘의 활용 — 그 기운이 실제로 힘을 받는 행동을 적습니다. 첫 연락, 계약 조건 정리처럼 구체적인 장면입니다.</li>
            <li>주의 — 같은 기운이 지나치면 어디에서 탈이 나는지를 적습니다. 대개 강점의 뒷면이 그대로 약점이 됩니다.</li>
            <li>연애와 관계 — 마음을 먼저 건넬 날인지, 거리와 속도를 다시 말할 날인지를 나눕니다.</li>
            <li>일과 돈 — 착수에 어울리는 날인지 정산과 마무리에 어울리는 날인지를 갈라 둡니다.</li>
            <li>조언 — 그날 하루를 한 문장으로 요약해 실제로 무엇을 할지 정할 수 있게 합니다.</li>
          </ul>

          <h2 className="mt-2 text-xl font-semibold">로그인하면 열리는 나만의 길흉</h2>
          <p className="leading-8">
            여기까지는 모두에게 같은 하루의 결입니다. 프로필에 생년월일을 저장해 본명숙이 정해지면, 달력은 그 위에 내
            자리와 그날 자리 사이의 거리를 얹어 나에게만 해당하는 길흉을 계산합니다. 같은 날이라도 사람마다 다른 답이
            나오는 것은 이 거리가 사람마다 다르기 때문입니다.
          </p>
          <p className="leading-8">
            거리는 여섯 가지 관계로 정리됩니다. 명(命)은 같은 리듬을 비추는 거울의 자리이고, 업태(業胎)와 영친(榮親),
            우쇠(友衰)와 안괴(安壞), 성위(成危)가 각각 짝을 이루어 서로 반대 방향의 역할을 맡습니다. 여기에 특별한 날,
            대길일, 길일, 주의일, 흉일의 다섯 등급이 붙어 그날의 무게를 알려 줍니다.
          </p>

          <h2 className="mt-2 text-xl font-semibold">달력을 읽는 순서</h2>
          <ol className="ml-5 list-decimal space-y-2 leading-8">
            <li>먼저 이번 달 전체를 훑어 대길일과 흉일이 어디에 몰려 있는지 눈으로 확인합니다.</li>
            <li>중요한 약속이나 계약이 잡힌 날을 눌러 그날 숙의 본질과 주의 항목을 함께 읽습니다.</li>
            <li>어긋나는 기운이면 날짜를 옮기기보다 그날의 활용 항목에 맞게 일의 성격을 바꿔 봅니다.</li>
            <li>한 달을 지내고 나서 실제로 잘 풀린 날과 숙을 맞춰 보면 나에게 맞는 리듬이 보입니다.</li>
          </ol>

          <h2 className="mt-2 text-xl font-semibold">함께 보면 좋은 글</h2>
          <ul className="ml-5 list-disc space-y-2 leading-8">
            <li>
              <a className="underline" href="/insights/sukuyo-what-is/">숙요점이란?</a>
              {" — 달의 별자리로 운명을 읽는 체계가 어디에서 왔고 사주와 무엇이 다른지 정리한 입문 글입니다."}
            </li>
            <li>
              <a className="underline" href="/insights/sukuyo-27-mansions/">27숙 완전 정리</a>
              {" — 스물일곱 개 숙의 성격과 기질을 하나씩 풀어 두었습니다. 달력에서 만난 숙을 더 깊이 볼 때 씁니다."}
            </li>
            <li>
              <a className="underline" href="/insights/sukuyo-bonmyeongsuk-how-to-find/">본명숙 찾는 법</a>
              {" — 생년월일에서 내 자리를 정하는 방법입니다. 달력의 개인화 길흉이 이 값을 기준으로 계산됩니다."}
            </li>
            <li>
              <a className="underline" href="/sukuyo/compatibility/">숙요 궁합</a>
              {" — 두 사람의 본명숙 사이 거리를 관계 유형으로 풀어 줍니다. 달력의 여섯 관계와 같은 계산을 씁니다."}
            </li>
            <li>
              <a className="underline" href="/insights/sukuyo-day-by-day-rhythm-usage/">일상 리듬 활용법</a>
              {" — 하루치 조언을 습관으로 옮기는 방법입니다. 달력을 매일 여는 사람에게 도움이 되는 글입니다."}
            </li>
            <li>
              <a className="underline" href="/sukuyo/">숙요점 홈</a>
              {" — 본명숙 조회부터 궁합, 오늘의 흐름까지 숙요점 기능을 한자리에서 볼 수 있는 시작 지점입니다."}
            </li>
          </ul>

          <p className="text-sm leading-7 text-[#6b5545]">
            숙요점은 전통 상징 체계를 바탕으로 한 참고용 콘텐츠입니다. 의료·법률·투자 판단을 대신하지 않으며, 달력이
            말하는 길흉은 그날의 결을 읽는 하나의 관점으로만 사용해 주세요.
          </p>
        </div>
      </section>
    </>
  );
}
