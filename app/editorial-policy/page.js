import Link from "next/link";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";

const EDITORIAL_POLICY_TEXT_TRANSLATIONS = {
  ko: {
    metadataTitle: "콘텐츠 제작 및 AI 활용 고지 | Code Destiny",
    metadataDescription: "Code Destiny의 운세 콘텐츠 제작 원칙, AI 활용 범위, 검수 기준, 광고와 편집 독립성, 정정 요청 절차를 안내합니다.",
    metadataKeywords: ["콘텐츠 제작 원칙", "AI 활용 고지", "운세 콘텐츠", "편집 정책", "Code Destiny"],
    creationIntro: "다음은 공개 문서를 작성·검토할 때 적용하는 기준입니다. 이 절차를 안내하는 것만으로 모든 문서의 개별 검수가 완료되었다는 뜻은 아닙니다. 원고별 완료 여부는 해당 글의 제작·검수 안내를 확인해 주세요.",
    draftStep: "③ 초안 — 계산 근거와 참고 자료를 읽기 쉬운 문장으로 옮길 때 생성형 AI의 도움을 받을 수 있습니다. 초안은 검토 대상이며, 생성되었다는 사실만으로 발행·검수 완료를 뜻하지 않습니다.",
    publicationStep: "⑤ 발행과 갱신 — 확인 가능한 발행·수정 이력을 표시하고, 정책이나 기능이 바뀌면 관련 문서와 내부 링크를 점검합니다. 기록이 없는 날짜를 검수일로 만들어 표시하지 않습니다.",
    reviewScope: "현재 사람의 검수는 주로 유료 상담 결과를 대상으로 합니다. 이를 모든 유료 결과의 개별 검수 완료나 공개 원고·공통 템플릿 전체의 검수 완료로 안내하지 않습니다. 개별 검수 여부는 실제 확인 기록을 기준으로 구분합니다.",
    automation: "규칙으로 조립되는 페이지와 개별 원고는 제작 방식이 다릅니다. 공통 문안이나 템플릿의 검토와 개별 페이지의 검수 완료도 구분합니다. 검수자·검수일은 실제 확인 기록이 있는 경우에만 표시하며, 검색에 공개된 페이지라는 사실만으로 사람의 개별 검수를 보장하지 않습니다.",
    privacy: "개인정보처리방침",
    disclaimer: "면책 고지",
    advertising: "광고 운영정책",
  },
  en: {
    metadataTitle: "Content Creation and AI Use Notice | Code Destiny",
    metadataDescription: "Learn how Code Destiny creates fortune content, uses AI support, reviews quality, separates ads from editorial decisions, and handles correction requests.",
    metadataKeywords: ["content creation standards", "AI use notice", "fortune content", "editorial policy", "Code Destiny"],
    privacy: "Privacy Policy",
    disclaimer: "Disclaimer",
    advertising: "Advertising Policy",
  },
  ja: {
    metadataTitle: "コンテンツ制作とAI活用に関する告知 | Code Destiny",
    metadataDescription: "Code Destinyの運勢コンテンツ制作原則、AI活用範囲、検収基準、広告と編集の独立性、訂正依頼手順をご案内します。",
    metadataKeywords: ["コンテンツ制作基準", "AI活用告知", "運勢コンテンツ", "編集方針", "Code Destiny"],
    privacy: "プライバシーポリシー",
    disclaimer: "免責事項",
    advertising: "広告運用ポリシー",
  },
};

const editorialPolicyCopy = EDITORIAL_POLICY_TEXT_TRANSLATIONS.ko;

export function generateMetadata() {
  return generatePageMetadata({
    path: "/editorial-policy",
    title: editorialPolicyCopy.metadataTitle,
    description: editorialPolicyCopy.metadataDescription,
    keywords: editorialPolicyCopy.metadataKeywords,
  });
}

/* 항목 머리표(①②③)가 본문 텍스트에 직접 쓰여 있으므로 CSS 불릿을 끈다.
   `.policy-embed-body ul`(globals.css:1023)의 `list-style: disc` 를 그대로 두면
   "• ① 주제 선정" 처럼 마커가 두 번 찍힌다. 들여쓰기는 같은 규칙의 padding-left 가 준다. */
const textMarkedListStyle = { listStyle: "none" };

export default function EditorialPolicyPage() {
  return (
    <main className="policy-doc">
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">콘텐츠 제작 및 AI 활용 고지</h1>
        <p className="policy-doc__meta">시행일: 2026-06-21 / Effective Date: 2026-06-21</p>
      </header>

      <div className="policy-doc__single">
        <div className="policy-doc__body">
          <div className="policy-embed-body">
            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">1. 제작 원칙</h2>
              <p>
                Code Destiny는 사주, 자미두수, 숙요점, 점성술, 베다점, 타로, 마야 달력, 명상 음악과 관련된 콘텐츠를 사용자가 스스로의 흐름을 차분히 이해하도록 돕는 참고 자료로 제작합니다. 각 글은 단순 키워드 나열이 아니라 해석 기준, 사용 상황, 주의할 점, 관련 기능으로 이어지는 안내를 함께 담는 것을 원칙으로 합니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">2. AI 활용 범위</h2>
              <p>
                AI 도구는 초안 정리, 문장 다듬기, 구조화, 번역 보조, 반복 표현 점검에 사용될 수 있습니다. 다만 게시 전에는 Code Destiny의 콘텐츠 기준에 맞춰 과장 표현, 불안 조장, 확정적 예언, 의료·법률·금융 조언처럼 오해될 수 있는 문장을 검토합니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">3. 고유성과 품질 기준</h2>
              <p>
                얇은 자동 생성 문서, 문장만 바꾼 중복 페이지, 외부 자료의 단순 요약은 게시 기준에 맞지 않습니다. 외부 자료나 전통 체계를 참고하는 경우에도 Code Destiny의 해석 기준, 비교 설명, 예시, 한계 고지를 더해 독립적인 정보 가치를 갖도록 관리합니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">3-1. 제작 절차</h2>
              <p>
                {editorialPolicyCopy.creationIntro}
              </p>
              <ul style={textMarkedListStyle}>
                <li>① 주제 선정 — 실제로 들어오는 질문과 각 체계의 기초 개념 중 설명이 비어 있는 지점을 고릅니다.</li>
                <li>② 근거 정리 — 사주의 천간지지·오행, 자미두수의 12궁과 사화, 점성술의 행성·하우스, 숙요점의 27수처럼 해당 체계 안에서 검증 가능한 규칙만 근거로 씁니다. 출처가 불분명한 속설은 쓰지 않거나 속설임을 밝힙니다.</li>
                <li>{editorialPolicyCopy.draftStep}</li>
                <li>④ 검수 — 과장·불안 조장 표현, 의료·법률·금융 조언으로 오해될 문장, 단정적 예언, 내부 작업 문구 노출을 점검합니다.</li>
                <li>{editorialPolicyCopy.publicationStep}</li>
              </ul>
              <p>{editorialPolicyCopy.reviewScope}</p>
              <p>
                {editorialPolicyCopy.automation}
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">3-2. 편집 책임</h2>
              <p>
                공개 문서에 저자로 적히는 &ldquo;Code Destiny 편집팀&rdquo;은 개인 필명이 아니라 운영사의 콘텐츠 제작·검수 기능을 가리키는 표기입니다. 실재하지 않는 사람에게 경력이나 자격을 붙이지 않기 위해 개인 저자 대신 조직 이름으로 귀속합니다.
              </p>
              <p>
                위 절차의 최종 검수 책임은 대표 박병하에게 있습니다. 이는 모든 공개 글을 이미 개별 검수했다는 뜻이 아닙니다. 실제 원고 확인과 검수 기록이 있는 글에만 검수자·검수일을 표시하며, 미확인 글은 검수 완료로 안내하지 않습니다. 운영 주체와 사업자 정보는 모든 페이지 하단에 표시하며, 편집팀이 무엇을 가리키는지와 정정 요청 경로는{" "}
                <Link href="/about">서비스 소개</Link>에서도 함께 안내합니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">4. 운세 표현 안전 기준</h2>
              <p>
                운세 문장은 &ldquo;반드시 성공한다&rdquo;, &ldquo;무조건 이혼한다&rdquo;, &ldquo;특정 달에 병이 생긴다&rdquo;, &ldquo;투자하면 돈을 번다&rdquo;처럼 현실 판단을 대신하는 단정으로 쓰지 않습니다. &ldquo;이런 흐름으로 해석할 수 있다&rdquo;, &ldquo;현실적 판단과 함께 참고하라&rdquo;처럼 조언형 문장을 우선합니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">5. 광고와 편집 독립성</h2>
              <p>
                광고, 제휴 링크, 결제 상품의 존재가 운세 해석의 결론이나 콘텐츠 순위를 결정하지 않습니다. 광고는 충분한 본문이 있는 공개 정보 페이지에 한해 사용자를 방해하지 않는 방식으로 배치하며, 로그인, 결제, 개인 결과, 로딩, 오류, 관리자 화면에는 광고를 배치하지 않는 것을 원칙으로 합니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">6. 정정과 문의</h2>
              <p>
                부정확한 설명, 깨진 문장, 과장 표현, 출처가 불명확한 내용, 개인에게 불안을 줄 수 있는 문구를 발견하면 문의해 주십시오. 검토 후 필요한 경우 내용을 수정하거나 보강합니다.
              </p>
              <p>
                콘텐츠 문의: <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">7. 관련 정책</h2>
              <p>
                개인정보와 쿠키는 <Link href="/privacy">{editorialPolicyCopy.privacy}</Link>, 운세와 상담형 콘텐츠의 한계는{" "}
                <Link href="/disclaimer">{editorialPolicyCopy.disclaimer}</Link>, 광고 운영 원칙은{" "}
                <Link href="/advertising-policy">{editorialPolicyCopy.advertising}</Link>에서 함께 확인할 수 있습니다.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
