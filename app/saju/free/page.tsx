import Link from "next/link";
import { generatePageMetadata } from "@/lib/generate-page-metadata";
import FreeSajuClient from "./FreeSajuClient";

/**
 * `/saju/free` 초간단 만세력 랜딩(설계 docs/superpowers/specs/2026-11-08-free-viral-funnel-design.md §4).
 * H1·소개·안내 본문은 서버에서 렌더한다 — 본문이 클라이언트 JS 안에만 있으면 얇은 페이지로 잡힌다
 * (scripts/generate-sitemap.mjs 의 2026-08-24 주석 참고). 옛 `/saju-free` 는 `/saju/` 로 301 이라 겹치지 않는다.
 * 🔴 "무료"와 "사주"를 붙여 쓰지 않는다 — 사주 항목은 묶음 전용 판매(__tests__/ui/saju-bundle-copy.static.test.js).
 */
const META = {
  path: "/saju/free",
  title: "초간단 무료 만세력 · 올해 키워드와 타고난 무기 | 꿀꿀 운세",
  description:
    "생년월일만 넣으면 올해 키워드, 타고난 무기, 오행 밸런스, 12운성 한 줄을 바로 보여 드려요. 로그인 없이 볼 수 있고, 입력한 생일은 기기 안에서만 계산해 저장하지 않아요.",
  keywords: ["초간단 만세력", "무료 만세력", "올해 키워드", "오행 밸런스", "12운성", "일간 성향", "만세력 보기"],
  isAccessibleForFree: true,
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const GUIDE = [
  {
    title: "올해 키워드는 이렇게 정해요",
    body: "태어난 날의 천간(일간)을 나로 두고, 올해의 천간이 나에게 어떤 관계인지 열 가지 중 하나로 읽어요. 나를 돕는 해, 나를 시험하는 해, 내가 무언가를 키우는 해처럼 관계가 달라지면 같은 한 해도 다른 얼굴로 다가와요. 올해 천간은 입춘을 기준으로 바뀌기 때문에 1월생은 지난해 기준으로 계산될 수 있어요.",
  },
  {
    title: "타고난 무기는 일간에서 나와요",
    body: "일간은 여덟 글자 가운데 나 자신을 가리키는 한 글자예요. 큰 나무, 촛불, 큰 산, 보석, 봄비처럼 열 가지 이미지로 나누고, 그 이미지가 일상에서 어떤 강점으로 드러나는지 한 줄로 정리했어요. 강점의 뒷면도 함께 적어서, 칭찬만 늘어놓는 풀이가 되지 않게 했어요.",
  },
  {
    title: "오행 밸런스는 겉으로 드러난 글자를 세요",
    body: "연·월·일·시 네 기둥의 여덟 글자를 나무·불·흙·쇠·물 다섯 기운으로 나눠 개수를 막대로 보여 줘요. 태어난 시간을 모르면 시주를 빼고 여섯 글자로 셉니다. 지지 속에 숨은 기운이나 계절의 세기까지 따지는 정밀 분석은 아니라서, 많고 적음을 가볍게 감 잡는 용도로 봐 주세요.",
  },
  {
    title: "12운성 한 줄은 일간과 일지의 관계예요",
    body: "12운성은 기운이 태어나고 자라고 쉬는 흐름을 열두 단계로 나눈 말이에요. 여기서는 일간이 태어난 날의 지지(일지)에서 어떤 단계에 있는지만 보고, 그 단계를 기질로 바꿔 읽었어요. 이름이 무거운 단계도 있지만 좋고 나쁨이 아니라 힘을 쓰는 방식의 차이로 풀어요.",
  },
] as const;

const FAQ = [
  {
    q: "생일을 넣으면 어디에 저장되나요?",
    a: "저장하지 않아요. 계산은 지금 보고 있는 브라우저 안에서 끝나고, 공유 링크에도 생일이 들어가지 않아요.",
  },
  {
    q: "태어난 시간을 몰라도 되나요?",
    a: "괜찮아요. '모름'을 고르면 시주를 비워 두고 여섯 글자로 읽어요. 올해 키워드와 타고난 무기는 시간과 상관없이 같아요.",
  },
  {
    q: "음력 생일도 되나요?",
    a: "됩니다. 음력을 고르고, 윤달에 태어났다면 윤달도 함께 눌러 주세요. 1900년부터 2100년까지 계산할 수 있어요.",
  },
  {
    q: "더 깊은 풀이는 어디서 보나요?",
    a: "재물 흐름의 달별 시기는 신년운세 상담에서, 대운과 십성까지 펼친 전체 풀이는 사주 전체 풀이 묶음에서 볼 수 있어요. 최애 케미와 운명의 꽃은 결과 카드까지 무료예요.",
  },
] as const;

export default function FreeSajuPage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">생일만 넣으면 바로 보는 초간단 만세력</h1>
        <p className="cd-main-intro">
          생년월일 하나로 올해 나를 움직일 키워드, 타고난 무기, 오행 밸런스, 12운성 한 줄을 바로 펼쳐 드려요. 어려운 용어 대신
          오늘 바로 써먹을 수 있는 말로 풀었고, 로그인도 결제도 필요 없어요.
        </p>
      </header>

      <FreeSajuClient />

      <section aria-labelledby="free-saju-guide-title" style={{ marginTop: 32 }}>
        <h2 id="free-saju-guide-title">결과는 이렇게 읽어요</h2>
        {GUIDE.map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="free-saju-faq-title" style={{ marginTop: 24 }}>
        <h2 id="free-saju-faq-title">자주 묻는 질문</h2>
        {FAQ.map((item) => (
          <article key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </article>
        ))}
      </section>

      <nav aria-label="함께 보면 좋은 페이지" style={{ marginTop: 24 }}>
        <h2>함께 보면 좋은 페이지</h2>
        <ul>
          <li><Link href="/manse/">만세력 — 명식과 절기·음력 날짜 확인</Link></li>
          <li><Link href="/saju/five-elements/">오행 알아보기 — 목·화·토·금·수의 균형</Link></li>
          <li><Link href="/saju/ten-gods/">십신(십성) 알아보기 — 열 가지 관계 언어</Link></li>
          <li><Link href="/saju/">사주 전체 풀이 둘러보기</Link></li>
        </ul>
      </nav>
    </main>
  );
}
