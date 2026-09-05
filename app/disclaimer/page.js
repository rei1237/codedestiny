import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";

const DISCLAIMER_METADATA_COPY = {
  ko: {
    title: "면책 고지 | Code Destiny",
    description:
      "Code Destiny 운세, 상담형 콘텐츠, 건강·재물·관계 해석의 한계와 전문가 상담 필요성을 안내하는 면책 고지입니다.",
    keywords: ["면책 고지", "운세 면책", "건강 고지", "재물운 고지", "전문가 상담"],
  },
  en: {
    title: "Disclaimer | Code Destiny",
    description:
      "Code Destiny's disclaimer explains the limits of fortune, consultation-style content, and health, money, and relationship readings, including when to seek professional advice.",
    keywords: ["disclaimer", "fortune disclaimer", "health notice", "financial reading notice", "professional advice"],
  },
  ja: {
    title: "免責事項 | Code Destiny",
    description:
      "Code Destinyの占い・相談型コンテンツ、健康・金運・人間関係の解釈に関する限界と、専門家への相談が必要な場合を案内する免責事項です。",
    keywords: ["免責事項", "占い免責", "健康に関する注意", "金運の注意", "専門家相談"],
  },
  zh: {
    title: "免责声明 | Code Destiny",
    description:
      "Code Destiny 免责声明说明运势、咨询式内容以及健康、财富、关系解读的限制，并提示需要专业咨询的情形。",
    keywords: ["免责声明", "运势免责声明", "健康提示", "财富解读提示", "专业咨询"],
  },
};

export function generateMetadata() {
  const copy = DISCLAIMER_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/disclaimer",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

export default function DisclaimerPage() {
  return (
    <main className="policy-doc">
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">면책 고지</h1>
        <p className="policy-doc__meta">시행일: 2026-06-21 / Effective Date: 2026-06-21</p>
      </header>

      <div className="policy-doc__single">
        <div className="policy-doc__body">
          <div className="policy-embed-body">
            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">1. 고지의 목적</h2>
              <p>
                이 문서는 Code Destiny에서 제공하는 사주, 자미두수, 숙요점, 점성술, 베다점, 타로, 마야 달력, 명리 헬스 리포트, 운세 다이어리, 명상 음악, 캐릭터 콘텐츠의 성격과 한계를 분명히 안내합니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">2. 콘텐츠의 성격</h2>
              <p>
                Code Destiny의 해석은 전통 상징 체계와 현대적 상담 언어를 바탕으로 한 엔터테인먼트 및 자기 성찰용 참고 정보입니다. 결과 문구는 미래의 확정된 사실이나 특정 사건의 보장을 뜻하지 않으며, 개인의 현실 조건에 따라 다르게 받아들여질 수 있습니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">3. 전문가 조언을 대체하지 않음</h2>
              <p>
                본 서비스는 의료, 법률, 투자, 세무, 심리 치료, 진로 상담, 결혼·이혼·소송 관련 전문가의 조언을 대체하지 않습니다. 건강 이상, 법적 분쟁, 투자 결정, 계약 체결, 관계와 생계에 큰 영향을 주는 선택은 반드시 자격 있는 전문가와 상의하십시오.
              </p>
              <p>
                This service does not replace professional medical, legal, financial, tax, relationship, career, or mental health advice.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">4. 결과 보장 없음</h2>
              <p>
                Code Destiny는 질병의 진단·치료, 법적 절차의 결과, 투자 수익, 자금 보전, 시험 합격, 취업, 승진, 결혼, 이혼, 재회, 특정 시기의 사건 발생을 보장하지 않습니다. &ldquo;반드시&rdquo;, &ldquo;무조건&rdquo;, &ldquo;확정&rdquo;처럼 현실 판단을 흐릴 수 있는 단정 표현을 피하고, 가능한 흐름과 참고 관점으로 안내합니다.
              </p>
              <p>
                Code Destiny does not guarantee medical outcomes, legal results, investment returns, or specific life-event outcomes.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">5. 건강·재물·관계 해석</h2>
              <p>
                명리 헬스 리포트는 의료 진단이 아니며, 재물운·사업운·투자운은 금융 조언이 아닙니다. 결혼운, 이혼운, 소송운, 진로 상담 역시 법률·심리·의료·재무 전문가 상담의 대체물이 아닙니다. 해석은 현실적 정보와 전문가 조언을 함께 놓고 참고해 주십시오.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">6. 불안 조장과 강제 결제 금지</h2>
              <p>
                Code Destiny는 공포를 키우거나 결제를 강요하는 표현을 지양합니다. 결제하지 않으면 운이 나빠진다는 식의 문구, 불안을 이용한 구매 유도, 특정 선택을 강제하는 상담 표현은 서비스 운영 기준에 맞지 않습니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">7. 외부 링크와 제3자 서비스</h2>
              <p>
                서비스에는 결제사, 광고 네트워크, 분석 도구, 외부 참고 자료로 이어지는 링크가 포함될 수 있습니다. 외부 서비스의 콘텐츠와 개인정보 처리 방식은 각 제공자의 약관과 정책이 적용됩니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">8. 긴급 상황</h2>
              <p>
                생명·신체의 위험, 자해나 타해 우려, 즉각적인 의료 처치가 필요한 상황, 범죄 피해나 안전 위협이 있는 경우에는 본 서비스를 이용해 판단하지 말고 지역 응급기관 또는 자격 있는 전문가에게 즉시 연락하십시오.
              </p>
              <p>
                In emergencies involving health or safety risks, contact emergency services or qualified professionals immediately.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">9. 문의</h2>
              <p>
                면책 고지 또는 콘텐츠 표현 관련 문의: <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
                <br />
                Disclaimer inquiries: <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
