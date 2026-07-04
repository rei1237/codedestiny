import type { Metadata } from "next";
import PromptHubRouteClient from "./PromptHubRouteClient";
import { siteSeo } from "../../../lib/seo/siteSeo";

const PAGE_PATH = "/fortune/prompt-hub/";
const PAGE_TITLE = "운세 상담 프롬프트 허브 | 사주·타로·점성술 질문 설계 — Code Destiny";
const PAGE_DESCRIPTION =
  "사주, 타로, 점성술, 자미두수, 숙요점, 수비학 등 여러 점술의 상담 질문을 한곳에서 다듬는 무료 프롬프트 허브. 질문의 목적을 정리하고 도구별 상담 프롬프트를 만들어 보세요.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["운세 프롬프트", "사주 질문", "타로 질문 만들기", "상담 프롬프트", "AI 운세 상담"],
  alternates: {
    canonical: `${siteSeo.siteUrl}${PAGE_PATH}`,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${siteSeo.siteUrl}${PAGE_PATH}`,
    siteName: siteSeo.siteName,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "운세 상담 프롬프트 허브" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PromptHubPage() {
  return (
    <div className="min-h-screen bg-[#080b18] px-5 py-10 text-slate-100">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Fortune Prompt Hub</p>
        <h1 className="mt-3 text-3xl font-black text-white">운세 상담 프롬프트 허브</h1>
        <p className="mt-4 text-sm leading-7 text-slate-200">
          사주, 당사주, 구성학, 매화역수, 타로, 점성술, 베다 점성술, 자미두수, 숙요점, 수비학, 꿈 상징, 호라리와
          같은 여러 흐름을 한곳에서 정리해 상담용 프롬프트로 다듬습니다. 각 도구는 사용자가 입력한 생년월일, 질문,
          상황의 결을 바탕으로 지금 필요한 해석 방향을 더 선명하게 잡아 주는 데에 머무릅니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          이 허브는 결과를 대신 단정하기보다 좋은 상담을 시작하기 위한 질문의 뼈대를 세웁니다. 같은 생년월일이라도
          질문이 사랑인지, 일인지, 돈인지, 가족인지에 따라 읽어야 할 상징의 무게가 달라집니다. 그래서 먼저 질문의
          목적을 차분히 적고, 필요한 도구를 고른 뒤, 생성된 문장을 자신의 상황에 맞게 조율하는 편이 좋습니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          무료 기본 프롬프트는 빠르게 방향을 잡을 때 유용하고, 세부 도구는 더 촘촘한 상담 문맥을 만들 때 도움이 됩니다.
          육효의 동전값, 매화역수의 수리, 구성학의 방위감, 타로의 질문 구조처럼 서로 다른 언어가 한 질문 안에서
          겹칠 때, 사용자는 막연한 불안보다 무엇을 물어야 하는지부터 더 분명히 알 수 있습니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          프롬프트는 운명을 고정하는 문장이 아니라 상담의 문을 여는 열쇠입니다. 너무 넓은 질문은 답을 흐리게 만들고,
          지나치게 결론을 정해 둔 질문은 상징의 숨을 좁힙니다. 오늘 가장 알고 싶은 감정, 선택, 관계, 시기를 한 문장으로
          좁히면 더 자연스럽고 따뜻한 해석이 열립니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          생성된 문장을 사용할 때는 그대로 붙여 넣기보다, 자신의 실제 상황과 말투에 맞춰 한 번 더 다듬어 주세요. 중요한
          건강, 법률, 재정, 관계 결정은 프롬프트나 운세 해석 하나로 단정하지 말고 현실의 정보와 전문가의 도움을 함께
          확인하는 편이 안전합니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          마음이 급한 날일수록 질문은 짧고 선명한 쪽이 좋습니다. “앞으로 어떻게 될까요”보다 “이 관계에서 지금 확인해야
          할 감정의 핵심은 무엇일까요”처럼 묻는다면, 상징은 더 섬세하게 반응합니다. 도구의 목적은 사용자를 불안하게
          만드는 데 있지 않고, 흩어진 마음을 상담 가능한 언어로 정돈하는 데 있습니다.
        </p>
      </section>

      <section className="mx-auto mt-6 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-sm">
        <h2 className="text-xl font-black text-white">이 허브에서 다룰 수 있는 도구</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
          <li>
            <strong className="text-cyan-100">사주·당사주</strong> — 생년월일시를 바탕으로 성향, 시기, 관계의 흐름을
            묻는 질문을 다듬습니다.
          </li>
          <li>
            <strong className="text-cyan-100">타로</strong> — 오늘의 선택이나 관계의 갈림길처럼 구체적인 장면을 카드로
            풀어낼 질문을 세웁니다.
          </li>
          <li>
            <strong className="text-cyan-100">점성술·베다 점성술</strong> — 행성의 배치를 근거로 시기, 궁합, 진로의
            방향을 좁혀 묻는 프롬프트를 만듭니다.
          </li>
          <li>
            <strong className="text-cyan-100">자미두수</strong> — 명궁, 재백궁, 관록궁 등 각 궁의 흐름 중 어떤 부분을
            먼저 확인할지 정리합니다.
          </li>
          <li>
            <strong className="text-cyan-100">숙요점</strong> — 두 사람의 궁합과 갈등 패턴을 27숙 기준으로 묻는 질문을
            구성합니다.
          </li>
          <li>
            <strong className="text-cyan-100">수비학</strong> — 이름과 생년월일의 숫자에서 반복되는 성향을 확인하는
            질문을 만듭니다.
          </li>
          <li>
            <strong className="text-cyan-100">구성학·매화역수</strong> — 방위와 수리 감각을 바탕으로 이동, 이사, 선택의
            시점을 묻는 프롬프트를 다듬습니다.
          </li>
          <li>
            <strong className="text-cyan-100">꿈 상징·호라리</strong> — 최근 꾼 꿈이나 지금 이 순간의 질문 자체를
            상징으로 풀어낼 문장을 세웁니다.
          </li>
        </ul>
      </section>

      <section className="mx-auto mt-6 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-sm">
        <h2 className="text-xl font-black text-white">자주 묻는 질문</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-200">
          <div>
            <h3 className="font-bold text-white">생성된 프롬프트를 그대로 다른 서비스에 써도 되나요?</h3>
            <p className="mt-1">
              네, 가능합니다. 다만 그대로 붙여 넣기보다 자신의 상황과 말투에 맞게 한 번 다듬으면 더 자연스러운 상담
              결과를 얻을 수 있습니다.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white">입력한 내용이나 결과가 서버에 저장되나요?</h3>
            <p className="mt-1">
              이 허브는 질문을 다듬는 도구로, 입력한 생년월일이나 질문 문구를 별도 계정 정보로 보관하지 않습니다.
              결과는 화면에서 바로 확인하고 필요할 때 복사해 사용하세요.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white">여러 도구를 한 번에 써야 하나요?</h3>
            <p className="mt-1">
              아니요, 지금 궁금한 주제 하나만 골라 사용해도 충분합니다. 사랑, 일, 돈, 관계처럼 질문의 결이 다르면
              그때그때 필요한 도구만 다시 선택하면 됩니다.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white">프롬프트만 보고 중요한 결정을 내려도 될까요?</h3>
            <p className="mt-1">
              프롬프트와 해석은 상담의 출발점일 뿐입니다. 건강, 법률, 재정처럼 중요한 결정은 현실의 정보와 전문가의
              조언을 함께 확인한 뒤 신중하게 판단하시길 권합니다.
            </p>
          </div>
        </div>
      </section>

      <PromptHubRouteClient />
    </div>
  );
}
