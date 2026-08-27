import type { Metadata } from "next";
import Link from "next/link";
import PromptHubRouteClient from "./PromptHubRouteClient";
import { siteSeo } from "../../../lib/seo/siteSeo";

const PAGE_PATH = "/fortune/prompt-hub/";
const PAGE_TITLE = "운세 프롬프트 허브 · 사주·타로 질문 설계 | Code Destiny";
const PAGE_DESCRIPTION =
  "사주·타로·점성술·자미두수·숙요점 상담 질문을 한곳에서 다듬는 무료 프롬프트 허브입니다. 질문의 목적을 정리하고 도구별 상담 프롬프트를 만들어 보세요.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["운세 프롬프트", "사주 질문", "타로 질문 만들기", "상담 프롬프트", "전문가 운세 상담"],
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
};

export default function PromptHubPage() {
  return (
    <div className="min-h-[100svh] bg-[#fff8ef] px-4 py-8 text-slate-900 dark:bg-[#24081a] dark:text-[#fff1f7] sm:px-5 sm:py-10">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .ph-hero__moon { animation: phMoonBreath 7s ease-in-out infinite; }
          @keyframes phMoonBreath {
            0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: 0.9; }
            50% { transform: translate3d(-6px,6px,0) scale(1.06); opacity: 1; }
          }
        }
      `}</style>
      <section className="ph-hero relative z-10 mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-[#f4bed1]/70 bg-[linear-gradient(152deg,#fffaf7_0%,#fff3f8_50%,#ffe7f0_100%)] p-6 shadow-[0_20px_60px_-26px_rgba(179,25,85,0.42),0_0_44px_-14px_rgba(234,208,137,0.4)] dark:border-[rgba(244,190,209,0.38)] dark:bg-[linear-gradient(152deg,#3a0e28_0%,#2e0a20_55%,#24081a_100%)] dark:shadow-[0_24px_72px_-30px_rgba(0,0,0,0.65),0_0_52px_-18px_rgba(234,208,137,0.24)] sm:p-8">
        {/* 달빛 글로우 — 장식(Glow-Not-Shadow), 스크린리더 제외 */}
        <div aria-hidden className="ph-hero__moon pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(255,248,220,0.9),rgba(244,190,209,0.34)_46%,transparent_72%)] blur-[6px] dark:bg-[radial-gradient(closest-side,rgba(232,213,163,0.42),rgba(196,181,253,0.18)_46%,transparent_72%)]" />
        <span className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(234,208,137,0.85),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(232,213,163,0.6),transparent)]" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ead089]/75 bg-[#fff8dc] px-3.5 py-1.5 text-xs font-black tracking-wide text-[#8a5a1e] dark:border-[#ead089]/55 dark:bg-[#ead089]/15 dark:text-[#ead089]">
            <span aria-hidden className="text-[#c99a2e] dark:text-[#ead089]">✦</span>
            1회 무료 체험 · 가입하면 무제한
          </span>
          <h1
            className="mt-4 text-balance text-[clamp(1.9rem,5.6vw,2.85rem)] font-bold leading-[1.14] tracking-[-0.02em] text-[#3c1830] [font-family:var(--font-display)] dark:text-[#fff1f7]"
          >
            종합 운세 프롬프트,<br className="hidden sm:block" /> 지금 바로 만들어보세요
          </h1>
          <p className="mt-3 max-w-[46ch] text-[15px] font-semibold leading-7 text-[#70445c] dark:text-[rgba(255,214,232,0.86)]">
            사주·타로·점성술 등 16가지 도구로 나만의 상담 프롬프트를 만들어 보세요. 생년월일·태어난 시간만 넣으면 바로 시작합니다.
            첫 프롬프트는 로그인 없이 만들어 볼 수 있고, 이어서 사용하려면 무료 회원가입만 하면 됩니다.
          </p>
          <p className="mt-2 max-w-[46ch] text-[13px] font-semibold leading-6 text-[#8a5a1e] dark:text-[#ead089]">
            {/* 전역 번역 레이어가 짧고 고립된 한글 텍스트 노드를 사전 매칭해 바꾼다. 이 문장을
                인라인 태그로 쪼개면 en 로케일에서 그 조각만 영어가 되어 반쪽 번역된다. */}
            여기서 만드는 건 여러 운세에 두루 쓰는 범용 질문입니다. 기능마다 전용으로 설계된 해석은 전문가 상담에서
            만나보세요.
          </p>
        </div>
      </section>

      <PromptHubRouteClient />

      <section className="relative z-10 mx-auto mt-5 max-w-3xl rounded-3xl border border-rose-100 bg-white/80 p-5 shadow-sm dark:border-[rgba(244,190,209,0.38)] dark:bg-[#3a0e28]/85 sm:mt-6 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-[#ffc4de]">Fortune Prompt Hub</p>
        <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-[#fff1f7]">운세 상담 프롬프트 허브</h2>
        <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          사주, 당사주, 구성학, 매화역수, 타로, 점성술, 베다 점성술, 자미두수, 숙요점, 수비학, 꿈 상징, 호라리와
          같은 여러 흐름을 한곳에서 정리해 상담용 프롬프트로 다듬습니다. 각 도구는 사용자가 입력한 생년월일, 질문,
          상황의 결을 바탕으로 지금 필요한 해석 방향을 더 선명하게 잡아 주는 데에 머무릅니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          이 허브는 결과를 대신 단정하기보다 좋은 상담을 시작하기 위한 질문의 뼈대를 세웁니다. 같은 생년월일이라도
          질문이 사랑인지, 일인지, 돈인지, 가족인지에 따라 읽어야 할 상징의 무게가 달라집니다. 그래서 먼저 질문의
          목적을 차분히 적고, 필요한 도구를 고른 뒤, 생성된 문장을 자신의 상황에 맞게 조율하는 편이 좋습니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          무료 기본 프롬프트는 빠르게 방향을 잡을 때 유용하고, 세부 도구는 더 촘촘한 상담 문맥을 만들 때 도움이 됩니다.
          육효의 동전값, 매화역수의 수리, 구성학의 방위감, 타로의 질문 구조처럼 서로 다른 언어가 한 질문 안에서
          겹칠 때, 사용자는 막연한 불안보다 무엇을 물어야 하는지부터 더 분명히 알 수 있습니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          프롬프트는 운명을 고정하는 문장이 아니라 상담의 문을 여는 열쇠입니다. 너무 넓은 질문은 답을 흐리게 만들고,
          지나치게 결론을 정해 둔 질문은 상징의 숨을 좁힙니다. 오늘 가장 알고 싶은 감정, 선택, 관계, 시기를 한 문장으로
          좁히면 더 자연스럽고 따뜻한 해석이 열립니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          생성된 문장을 사용할 때는 그대로 붙여 넣기보다, 자신의 실제 상황과 말투에 맞춰 한 번 더 다듬어 주세요. 중요한
          건강, 법률, 재정, 관계 결정은 프롬프트나 운세 해석 하나로 단정하지 말고 현실의 정보와 전문가의 도움을 함께
          확인하는 편이 안전합니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          마음이 급한 날일수록 질문은 짧고 선명한 쪽이 좋습니다. “앞으로 어떻게 될까요”보다 “이 관계에서 지금 확인해야
          할 감정의 핵심은 무엇일까요”처럼 묻는다면, 상징은 더 섬세하게 반응합니다. 도구의 목적은 사용자를 불안하게
          만드는 데 있지 않고, 흩어진 마음을 상담 가능한 언어로 정돈하는 데 있습니다.
        </p>
      </section>

      <section className="relative z-10 mx-auto mt-5 max-w-3xl rounded-3xl border border-rose-100 bg-white/80 p-5 shadow-sm dark:border-[rgba(244,190,209,0.38)] dark:bg-[#3a0e28]/85 sm:mt-6 sm:p-6">
        <h2 className="text-xl font-black text-slate-950 dark:text-[#fff1f7]">이 허브에서 다룰 수 있는 도구</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">사주·당사주</strong> — 생년월일시를 바탕으로 성향, 시기, 관계의 흐름을
            묻는 질문을 다듬습니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">타로</strong> — 오늘의 선택이나 관계의 갈림길처럼 구체적인 장면을 카드로
            풀어낼 질문을 세웁니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">점성술·베다 점성술</strong> — 행성의 배치를 근거로 시기, 궁합, 진로의
            방향을 좁혀 묻는 프롬프트를 만듭니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">자미두수</strong> — 명궁, 재백궁, 관록궁 등 각 궁의 흐름 중 어떤 부분을
            먼저 확인할지 정리합니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">숙요점</strong> — 두 사람의 궁합과 갈등 패턴을 27숙 기준으로 묻는 질문을
            구성합니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">수비학</strong> — 이름과 생년월일의 숫자에서 반복되는 성향을 확인하는
            질문을 만듭니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">구성학·매화역수</strong> — 방위와 수리 감각을 바탕으로 이동, 이사, 선택의
            시점을 묻는 프롬프트를 다듬습니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">꿈 상징·호라리</strong> — 최근 꾼 꿈이나 지금 이 순간의 질문 자체를
            상징으로 풀어낼 문장을 세웁니다.
          </li>
        </ul>
      </section>

      <section className="relative z-10 mx-auto mt-5 max-w-3xl rounded-3xl border border-rose-100 bg-white/80 p-5 shadow-sm dark:border-[rgba(244,190,209,0.38)] dark:bg-[#3a0e28]/85 sm:mt-6 sm:p-6">
        <h2 className="text-xl font-black text-slate-950 dark:text-[#fff1f7]">
          무료 프롬프트 허브와 유료 전문가 상담은 무엇이 다른가요
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          이 허브는 여러분이 AI에게 던질 질문을 다듬는 데까지만 하는 도구입니다. 같은 화면 안에서 해석까지 만들어
          주는 유료 전문가 상담과는 하는 일 자체가 다릅니다. 아래 네 가지가 실제 차이입니다.
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">설계</strong> — 무료 허브는 여러 운세를 하나의
            공통 틀에 담아 범용 질문을 만듭니다. 전문가 상담은 기능마다 전용 엔진과 상담 설계를 갖추고 있어, 그
            운세에서만 의미 있는 항목까지 파고듭니다. 그만큼 해석이 세밀하고 정확해집니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">해석하는 쪽</strong> — 무료 허브가 만든 문장은
            사용자가 ChatGPT 같은 범용 AI에 직접 붙여 넣어 답을 받습니다. 전문가 상담은 해석까지 저희가 직접 만들어
            드리므로, 다른 서비스를 오갈 필요가 없습니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">결과 보관</strong> — 무료 허브는 입력도 결과도
            저희 서버에 저장하지 않습니다. 로그인하시면 만든 프롬프트를 이 기기 브라우저 안의 보관함에 최근 20개까지
            남겨 두고 다시 불러올 수 있지만, 브라우저 데이터를 지우면 함께 사라집니다. 유료 상담은 결과가 계정에 남아
            어느 기기에서나 나중에 다시 열어볼 수 있습니다.
          </li>
          <li>
            <strong className="text-rose-600 dark:text-[#ffc4de]">이용 조건</strong> — 무료 허브는 결제가 필요 없고,
            로그인 없이 한 번 체험해 보실 수 있습니다. 이어서 사용하시려면 무료 회원가입만 하면 되며 카드 등록이나
            결제 단계는 없습니다. 유료 상담은 이용권·월정석·단건 결제 가운데 하나로 이용합니다.
          </li>
        </ul>
        <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          그래서 무료 허브는 “무엇을 물어야 할지 모르겠을 때” 가장 쓸모가 있고, 그 운세에 맞춰 조율된 해석이
          필요할 때는 전용으로 설계된 전문가 상담이 맞습니다. 아래 상담들은 각자 다른 전통을 다루니 지금 궁금한
          결에 맞춰 고르세요. 가격과 결제 방법은 각 상담 화면에서 확인할 수 있습니다.
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          <li>
            <Link href="/life-book-ai" className="font-bold text-rose-600 underline underline-offset-4 dark:text-[#ffc4de]">
              인생의 책 전문가 상담
            </Link>{" "}
            — 사주 명식을 세워 성향·시기·관계를 한 권으로 정리합니다.
          </li>
          <li>
            <Link href="/ziwei-ai" className="font-bold text-rose-600 underline underline-offset-4 dark:text-[#ffc4de]">
              자미두수 전문가 상담
            </Link>{" "}
            — 12궁 명반을 배치해 궁별 흐름을 문답으로 풀어냅니다.
          </li>
          <li>
            <Link href="/astrology-ai" className="font-bold text-rose-600 underline underline-offset-4 dark:text-[#ffc4de]">
              점성술 전문가 상담
            </Link>{" "}
            — 천체력으로 네이탈 차트를 계산해 행성 배치를 해석합니다.
          </li>
          <li>
            <Link href="/vedic-ai" className="font-bold text-rose-600 underline underline-offset-4 dark:text-[#ffc4de]">
              베다점 전문가 상담
            </Link>{" "}
            — 라시와 나크샤트라를 산출해 전통 베다 관점으로 읽습니다.
          </li>
          <li>
            <Link
              href="/sukuyo-compatibility-ai"
              className="font-bold text-rose-600 underline underline-offset-4 dark:text-[#ffc4de]"
            >
              숙요점 궁합 전문가 상담
            </Link>{" "}
            — 두 사람의 27숙을 계산해 관계의 격각과 흐름을 짚습니다.
          </li>
          <li>
            <Link href="/karma-destiny-ai" className="font-bold text-rose-600 underline underline-offset-4 dark:text-[#ffc4de]">
              운명의 업 전문가 상담
            </Link>{" "}
            — 명식 위에서 카르마와 전생의 결을 함께 읽습니다.
          </li>
        </ul>
      </section>

      <section className="relative z-10 mx-auto mt-5 max-w-3xl rounded-3xl border border-rose-100 bg-white/80 p-5 shadow-sm dark:border-[rgba(244,190,209,0.38)] dark:bg-[#3a0e28]/85 sm:mt-6 sm:p-6">
        <h2 className="text-xl font-black text-slate-950 dark:text-[#fff1f7]">자주 묻는 질문</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700 dark:text-[rgba(255,214,232,0.86)]">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-[#fff1f7]">생성된 프롬프트를 그대로 다른 서비스에 써도 되나요?</h3>
            <p className="mt-1">
              네, 가능합니다. 다만 그대로 붙여 넣기보다 자신의 상황과 말투에 맞게 한 번 다듬으면 더 자연스러운 상담
              결과를 얻을 수 있습니다.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-950 dark:text-[#fff1f7]">입력한 내용이나 결과가 서버에 저장되나요?</h3>
            <p className="mt-1">
              이 허브는 질문을 다듬는 도구로, 입력한 생년월일이나 질문 문구를 별도 계정 정보로 보관하지 않습니다.
              결과는 화면에서 바로 확인하고 필요할 때 복사해 사용하세요. 로그인 후 보관함에 저장한 프롬프트와, 로그인
              화면을 다녀오는 동안 잠시 보관되는 입력값은 모두 사용자의 브라우저 안에만 남고 저희 서버로 전송되지
              않습니다.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-950 dark:text-[#fff1f7]">여러 도구를 한 번에 써야 하나요?</h3>
            <p className="mt-1">
              아니요, 지금 궁금한 주제 하나만 골라 사용해도 충분합니다. 사랑, 일, 돈, 관계처럼 질문의 결이 다르면
              그때그때 필요한 도구만 다시 선택하면 됩니다.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-950 dark:text-[#fff1f7]">무료 프롬프트 허브가 유료 상담보다 부정확한가요?</h3>
            <p className="mt-1">
              하는 일이 다릅니다. 무료 허브는 여러 운세를 하나의 공통 틀에 담아 어디에나 쓸 수 있는 범용 질문을
              만듭니다. 전문가 상담은 기능마다 전용으로 설계·조율되어 있어 그 운세에서만 의미 있는 항목까지 다루고,
              그만큼 훨씬 세밀하고 정확합니다. 더 깊은 해석이 필요하다면{" "}
              <Link href="/life-book-ai" className="font-bold text-rose-600 underline underline-offset-4 dark:text-[#ffc4de]">
                전문가 상담
              </Link>
              을 이용해 주세요.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-950 dark:text-[#fff1f7]">왜 두 번째부터 로그인이 필요한가요?</h3>
            <p className="mt-1">
              첫 프롬프트는 로그인 없이 만들어 보실 수 있습니다. 품질을 직접 확인하신 뒤 이어서 사용하실 때만 무료
              회원가입이 필요하며, 결제나 카드 등록 단계는 없습니다. 가입하시면 프롬프트를 제한 없이 만들 수 있고,
              만든 프롬프트를 보관함에 저장해 다시 불러올 수 있습니다. 로그인하러 이동해도 작성하시던 입력은 그대로
              남아 있다가 돌아오면 이어서 생성됩니다.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-950 dark:text-[#fff1f7]">프롬프트만 보고 중요한 결정을 내려도 될까요?</h3>
            <p className="mt-1">
              프롬프트와 해석은 상담의 출발점일 뿐입니다. 건강, 법률, 재정처럼 중요한 결정은 현실의 정보와 전문가의
              조언을 함께 확인한 뒤 신중하게 판단하시길 권합니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
