import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";

const seo = publicSeoPages.faq;

export const dynamic = "force-static";

const faqs = [
  {
    question: "Code Destiny의 기본 운세 기능은 무료인가요?",
    answer: "사주, 타로, 오늘의 운세 등 주요 기능은 무료로 시작할 수 있습니다. 일부 심층 리포트나 PDF 상품은 별도 이용권 또는 결제가 필요할 수 있습니다.",
  },
  {
    question: "운세 결과는 확정된 미래를 의미하나요?",
    answer: "아닙니다. 모든 해석은 오락과 자기성찰을 위한 참고 자료이며, 법률, 의료, 투자, 금융 판단을 대신하지 않습니다.",
  },
  {
    question: "생년월일과 개인정보는 어떻게 다루나요?",
    answer: "운세 계산에 필요한 입력값은 기능 제공 목적에 맞춰 처리됩니다. 자세한 내용은 개인정보처리방침에서 확인할 수 있습니다.",
  },
  {
    question: "로그인이나 결제 페이지가 검색에 노출되나요?",
    answer: "로그인, 결제, 프로필, 개인화 결과 페이지는 검색 색인 대상이 아니며 noindex 정책을 적용합니다.",
  },
  {
    question: "사주와 타로 결과가 다르게 나오면 어떻게 보나요?",
    answer: "서로 다른 해석 체계를 사용하므로 결과를 하나의 정답으로 합치기보다 현재 상황을 여러 관점에서 점검하는 참고 자료로 보는 것이 좋습니다.",
  },
  {
    question: "운세 결과를 바꾸나요?",
    answer: "운세는 선택을 대신하거나 미래를 고정하지 않습니다. 지금 드러난 흐름을 참고해 말과 행동, 관계의 거리, 준비의 순서를 조금 더 섬세하게 조정하는 데 도움을 주는 안내로 보시면 좋습니다.",
  },
  {
    question: "어떤 순서로 들으면 좋나요?",
    answer: "처음에는 무료 사주나 오늘의 운세로 전체 흐름을 가볍게 살피고, 관계가 궁금할 때는 궁합과 타로를 함께 참고해 보세요. 더 깊은 정리가 필요할 때 자미두수, 신년운세, 프리미엄 리포트 순서로 이어가면 부담이 적습니다.",
  },
  {
    question: "이용권과 단건 결제는 어떻게 취소하거나 환불받나요?",
    answer: "30일 이용권과 상품별 원화 단건 결제는 결제일 또는 계약내용을 받은 날부터 7일 이내 청약철회를 요청할 수 있습니다. 콘텐츠 생성, PDF 렌더링, 유료 리딩 열람, 이용권 혜택 사용처럼 제공이 시작된 부분은 환불이 제한될 수 있으며, 표시·광고 또는 계약내용과 다르게 이행된 경우에는 공급일로부터 3개월 이내, 그 사실을 안 날부터 30일 이내 요청할 수 있습니다. 월정석은 구매·충전 상품이 아닌 보너스 혜택이므로 현금 환불 대상 결제 상품이 아닙니다. 또한 월정석은 각 지급분이 지급된 날로부터 30일간만 유효하며, 그 기간 내에 사용하지 않은 지급분은 자동으로 소멸합니다(먼저 만료되는 지급분부터 차감).",
  },
];

export const metadata = buildSeoMetadata(seo);

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "자주 묻는 질문", path: "/faq" },
    ]),
    buildFaqPageJsonLd(faqs),
  ],
});

export default function FaqPage() {
  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">Code Destiny 자주 묻는 질문</h1>
        <p className="cd-main-intro">
          무료 사주, 만세력, 타로, 오늘의 운세, 궁합, 결제와 개인정보 처리에 관해 자주 묻는 질문을 정리했습니다.
        </p>
      </header>

      <section className="cd-card-grid">
        {faqs.map((item) => (
          <article key={item.question} className="cd-card">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>

      <nav className="cd-chip-wrap" aria-label="FAQ 관련 문서">
        <Link href="/about" className="cd-chip">서비스 소개</Link>
        <Link href="/methodology" className="cd-chip">운세 콘텐츠 방법론</Link>
        <Link href="/privacy" className="cd-chip">개인정보처리방침</Link>
        <Link href="/terms" className="cd-chip">이용약관</Link>
      </nav>
    </main>
  );
}
