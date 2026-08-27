import type { Metadata } from "next";
import ReviewsRouteClient from "./ReviewsRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";
import ServiceIntroSection from "../components/ServiceIntroSection";
import ImmersiveRelatedLinks from "../components/ImmersiveRelatedLinks";

const PAGE_PATH = "/reviews/";
const PAGE_TITLE = "실시간 사용자 리뷰 | 구매 인증 후기 모음 — Code Destiny";
const PAGE_DESCRIPTION =
  "코드데스티니를 실제로 이용한 분들이 남긴 후기입니다. 사주·타로·자미두수·점성술 상품별 평점과 구매 인증 리뷰를 확인하고 직접 후기를 남길 수 있습니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["운세 후기", "사주 리뷰", "타로 후기", "자미두수 후기", "구매 인증 리뷰", "코드데스티니 후기"],
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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "실시간 사용자 리뷰" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
};

const reviewsFaqItems = [
  {
    question: "리뷰는 누구나 쓸 수 있나요?",
    answer:
      "아닙니다. 해당 상품을 실제로 결제했거나 이용권으로 이용한 기록이 확인된 분만 후기를 작성할 수 있습니다. 리뷰를 등록할 때 서버가 결제·이용 기록을 다시 조회해 확인하므로, 이용 기록이 없으면 작성 화면에 상품이 나타나지 않습니다.",
  },
  {
    question: "'구매 인증' 배지는 무슨 뜻인가요?",
    answer:
      "결제 기록이나 이용권 이용 기록이 확인된 후기에만 붙는 표시입니다. 배지가 없는 후기는 구매 기록을 확인할 수 없는 경우이며, 실제 구매 여부에 대한 사실을 그대로 반영하기 위해 임의로 붙이지 않습니다.",
  },
  {
    question: "리뷰를 쓰면 바로 올라가나요?",
    answer:
      "아니요. 작성한 후기는 먼저 검수 대기 상태로 저장되고, 운영진 확인을 거친 뒤 공개됩니다. 욕설·광고·개인정보·도배로 판단되는 내용은 공개되지 않습니다. 검수는 보통 영업일 기준 1~2일 안에 마무리됩니다.",
  },
  {
    question: "평균 평점은 어떻게 계산되나요?",
    answer:
      "공개 승인된 후기만 계산에 포함합니다. 검수 대기 중이거나 반려된 후기는 평균과 총 개수 어디에도 반영되지 않습니다.",
  },
  {
    question: "한 상품에 후기를 여러 번 쓸 수 있나요?",
    answer:
      "한 상품당 한 번만 작성할 수 있습니다. 이미 작성한 상품은 목록에 '작성 완료'로 표시되며, 내용을 고치고 싶다면 고객센터로 문의해 주세요.",
  },
  {
    question: "작성한 후기를 삭제할 수 있나요?",
    answer:
      "네, 고객센터로 요청하시면 삭제해 드립니다. 삭제된 후기는 평균 평점 계산에서도 함께 제외됩니다.",
  },
];

const reviewsJsonLd = [
  buildFaqPageJsonLd(reviewsFaqItems),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "실시간 사용자 리뷰", path: PAGE_PATH },
  ]),
];

export default function ReviewsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd) }}
      />
      <ReviewsRouteClient />
      <ServiceIntroSection label="사용자 리뷰 정책 안내">
        <h1>실시간 사용자 리뷰 — 구매 인증 후기 모음</h1>
        <p>
          이 페이지는 코드데스티니에서 실제로 상담이나 리포트를 이용한 분들이 남긴 후기를 모아 둔
          곳입니다. 운세 서비스는 결과를 받아 보기 전까지 무엇이 나올지 알기 어렵기 때문에, 먼저
          이용한 사람이 무엇을 받았고 어떤 점이 도움이 되었는지가 가장 현실적인 판단 근거가 됩니다.
          그래서 후기를 단순히 모아 두는 대신, 누가 어떤 상품을 실제로 이용했는지 확인된 경우에만
          작성할 수 있도록 했습니다.
        </p>
        <p>
          후기는 상품 그룹 단위로 모입니다. 같은 사주 상담이라도 세부 기능이 여럿으로 나뉘어 있는데,
          그대로 쪼개면 상품마다 후기가 한두 개씩만 남아 평점이 아무 의미를 갖지 못합니다. 그래서
          이용자가 실제로 인식하는 단위 — AI 사주 분석, 타로 상담, 자미두수 분석, 운명의 섬,
          AI 연애 코치, 점성술 전문가 상담, 베다 점성술, 나크샤트라 리딩, 숙요점 상담, 관상 분석,
          손금 분석, 인생의 책, 운명 찻집 등 — 로 묶어 평점과 후기를 함께 봅니다.
        </p>

        <h2>후기 작성 자격은 이렇게 확인합니다</h2>
        <p>
          코드데스티니는 결제 방식이 여러 가지입니다. 단건 결제로 바로 구매하는 경우도 있고,
          이용권으로 추가 결제 없이 이용하는 경우도 있으며, 월정석으로 이용하는 경우도
          있습니다. 어떤 방식으로 이용했든 실제로 결과를 받아 본 기록이 있으면 후기를 남길 수
          있도록 네 가지 기록을 모두 확인합니다.
        </p>
        <ul>
          <li>회당 결제로 실행이 완료된 상담·리포트 기록</li>
          <li>카드·간편결제 등 단건 결제가 정상 승인된 결제 기록</li>
          <li>월정석 차감 기록과 이용권으로 무료 이용한 기록</li>
          <li>영구 해금형 콘텐츠의 해금 기록</li>
        </ul>
        <p>
          이용권을 가지고 있다는 사실만으로는 후기를 쓸 수 없습니다. 실제로 그 상품을 이용한 기록이
          남아 있어야 합니다. 아직 이용해 보지 않은 상품은 작성 화면에 나타나지 않으며, 후기를
          등록하는 순간에도 서버가 기록을 다시 확인합니다.
        </p>

        <h2>후기가 공개되기까지</h2>
        <ol>
          <li>상품을 결제하거나 이용권으로 이용해 결과를 확인합니다.</li>
          <li>이 페이지의 &quot;리뷰 쓰기&quot;에서 이용한 상품을 고르고 별점과 후기를 남깁니다.</li>
          <li>작성한 후기는 곧바로 공개되지 않고 검수 대기 상태로 저장됩니다.</li>
          <li>운영진이 내용을 확인한 뒤 승인하면 목록에 노출됩니다.</li>
        </ol>
        <p>
          욕설이나 비속어, 외부 링크·연락처가 담긴 홍보성 내용, 전화번호나 이메일 같은 개인정보,
          같은 문장을 반복한 도배성 글은 공개되지 않습니다. 별점이 낮다는 이유로 반려하지는
          않습니다. 아쉬웠던 점도 다른 이용자에게는 중요한 정보이기 때문에, 내용이 구체적이면
          낮은 평점의 후기도 그대로 공개합니다.
        </p>

        <h2>평점을 읽는 법</h2>
        <p>
          평균 평점은 공개 승인된 후기만으로 계산합니다. 검수 대기 중이거나 반려된 후기는 평균에도,
          총 개수에도 반영되지 않습니다. 상품별 평점을 볼 때는 평균값과 함께 후기 개수를 같이 보시길
          권합니다. 후기가 서너 개뿐인 상품의 5.0과 수십 개가 쌓인 상품의 4.6은 신뢰도가 다릅니다.
        </p>
        <p>
          정렬은 최신순, 높은 평점순, 낮은 평점순 중에서 고를 수 있고, 구매 인증이 확인된 후기만
          따로 볼 수도 있습니다. 상품을 고민 중이라면 낮은 평점순으로 먼저 훑어보는 방법을
          추천합니다. 어떤 점이 기대와 달랐는지가 가장 먼저 보이기 때문입니다.
        </p>

        <h2>자주 묻는 질문</h2>
        {reviewsFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/reviews" />
    </>
  );
}
