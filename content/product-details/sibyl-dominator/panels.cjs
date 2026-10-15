const { getBillingFeaturePricing } = require('../../../worker/lib/billing-feature-registry.js');
const pricing = getBillingFeaturePricing({ featureKey: 'premium-sibyl-dominator' });
if (!pricing.ok) throw new Error('Missing Sibyl price');
const priceLabel = pricing.pricing.amountKRW.toLocaleString('ko-KR') + '원';
module.exports={
  "id": "sibyl-dominator",
  "featureKey": "premium-sibyl-dominator",
  "title": "시빌라 연간 대비 리포트",
  "notice": "기본 결과는 규칙 기반이며, 유료 결과는 저장된 출생정보의 서버 계산을 근거로 AI가 상담문을 작성합니다. 선택 연도의 금전·연애·인간관계·직장과 일, 타고난 장단점과 월별 대비·개운 행동을 살핍니다. 분석 연도는 입춘부터 다음 입춘까지이며 월운은 절입 시각을 기준으로 합니다. 주의 신호는 사건·질환·손실의 확률이 아닙니다. 생시 미상 등 입력 조건에 따라 해석 범위가 달라집니다. 출생정보 단위 잠금 해제로 같은 출생정보의 다른 연도도 재결제 없이 열 수 있습니다. 완성된 원본은 보관함에서 로그인 후 추가 결제·생성 없이 다시 읽을 수 있습니다. 기존 구매 권한을 유지합니다. 이용권·월정석·단건 결제의 적용과 현재 가격은 결제창에서 확인하세요. 콘셉트 이미지와 가상 편집 예시는 실제 개인 결과나 후기가 아닙니다.",
  "panels": [
    {
      "id": "01-read-your-own-pattern",
      "title": "다가올 흐름을 읽고, 나의 선택을 준비하는 시간.",
      "html": "<h2>다가올 흐름을 읽고, 나의 선택을 준비하는 시간.</h2><img class=\"hero\" src=\"/images/feature-details/saju-sibyl-observatory.webp\" alt=\"사주의 네 기둥과 시간 궤도를 관측하는 분석실\"><p>사주에 담긴 기질과<br>선택 연도의 흐름을 살피는<br>시빌라 연간 대비 리포트.</p><p class=\"note\">서비스 콘셉트 이미지 · 개인 결과 아님</p>"
    },
    {
      "id": "02-basic-and-deep",
      "title": "무료로 흐름을 보고, 깊이 있는 대비로 이어가세요.",
      "html": "<h2>무료로 흐름을 보고, 깊이 있는 대비로 이어가세요.</h2><section><h3>무료 기본 분석</h3><p>핵심 기질 · 연간 주의 분야<br>먼저 실천할 대비 행동</p></section><section><h3>유료 심층 리포트</h3><p>서버 계산에 근거한 AI 상담<br>네 분야 상세 · 월별 계획 · 개운 행동</p></section><p class=\"note\">금액과 적용 수단은 결제창에서 확인하세요.</p>"
    },
    {
      "id": "03-chapters-one-to-five",
      "title": "마음에 걸리는 분야부터, 근거와 함께 읽어요.",
      "html": "<h2>마음에 걸리는 분야부터, 근거와 함께 읽어요.</h2><section><h3>금전</h3><p>수입 기대와 지출의 간격,<br>계약과 소비에서 확인할 조건.</p></section><section><h3>연애</h3><p>관계의 속도와 기대 차이,<br>마음을 추측하기 전 나눌 대화.</p></section>"
    },
    {
      "id": "04-chapters-six-to-ten",
      "title": "사람과 일 사이, 내가 지킬 기준을 찾으세요.",
      "html": "<h2>사람과 일 사이, 내가 지킬 기준을 찾으세요.</h2><section><h3>인간관계</h3><p>역할과 부탁이 겹치는 순간,<br>어디까지 돕고 무엇을 나눌지.</p></section><section><h3>직장과 일</h3><p>업무·사업·협업의 요구와 여력,<br>일정과 책임을 조율하는 방법.</p></section>"
    },
    {
      "id": "05-reading-the-indicators",
      "title": "숫자로 겁주지 않고, 작용한 근거를 보여드려요.",
      "html": "<h2>숫자로 겁주지 않고, 작용한 근거를 보여드려요.</h2><section><h3>서버에서 계산하는 근거</h3><p>명식 · 오행 · 십성<br>대운 · 세운 · 월운 · 합충형파해</p></section><section><h3>생활 언어로 읽는 상담</h3><p>주의 신호 → 확인할 징후<br>대비 행동 → 판단을 바꿀 조건</p></section><p class=\"note\">주의 우선순위는 사건 발생률이 아닙니다.</p>"
    },
    {
      "id": "06-year-and-month",
      "title": "선택한 한 해, 준비가 필요한 시기를 펼쳐보세요.",
      "html": "<h2>선택한 한 해, 준비가 필요한 시기를 펼쳐보세요.</h2><section><h3>연도를 직접 선택</h3><p>현재부터 앞으로의 흐름을 살피고<br>나의 실제 계획과 대조해요.</p></section><section><h3>절입 기준 월별 흐름</h3><p>입춘부터 다음 입춘까지,<br>주의 구간과 겹치는 신호를 확인해요.</p></section><p class=\"note\">생시를 모르면 시주와 대운 등<br>계산 가능한 범위를 명확히 안내합니다.</p>"
    },
    {
      "id": "07-an-example-of-a-choice",
      "title": "타고난 힘은 살리고, 과해지는 순간은 조절해요.",
      "html": "<h2>타고난 힘은 살리고, 과해지는 순간은 조절해요.</h2><p class=\"label\">이해를 위한 가상 편집 예시</p><blockquote>“시작하는 힘이 앞선다면,<br>새 약속을 더하기 전에<br>지금 맡은 일의 마감과 범위를<br>먼저 확인해 보세요.”</blockquote><p>소비·대화·업무·생활 리듬에서<br>실천할 수 있는 개운 행동으로<br>선택의 여유를 만들어가세요.</p><p class=\"note\">실제 개인 결과나 후기가 아닙니다.</p>"
    },
    {
      "id": "08-profile-and-reading",
      "title": "한 번 연 출생정보는, 연도가 달라도 다시 결제하지 않아요.",
      "html": "<h2>한 번 연 출생정보는, 연도가 달라도 다시 결제하지 않아요.</h2><section><h3>저장한 내 프로필 기준</h3><p>서버에 저장된 출생정보로<br>분석과 구매 권한을 확인해요.</p></section><section><h3>완성된 원본은 보관함에</h3><p>다른 기기에서도 로그인 후<br>추가 결제·생성 없이 다시 읽어요.</p></section><p class=\"note\">다른 출생정보에는 별도 권한이 필요합니다.<br>기존 구매 권한은 유지됩니다.</p>"
    },
    {
      "id": "09-use-it-as-a-reference",
      "title": "미래를 단정하는 대신, 준비할 선택을 남깁니다.",
      "html": "<h2>미래를 단정하는 대신, 준비할 선택을 남깁니다.</h2><section><h3>내 경험과 함께 읽기</h3><p>실제 일정과 상황을 먼저 두고<br>필요한 대비 행동을 골라보세요.</p></section><section><h3>다시 시도할 수 있어요</h3><p>생성이 지연되거나 실패해도<br>구매 권한을 확인해 이어갑니다.</p></section><p class=\"note\">결과는 사고·손실·성공의 보장이 아닙니다.<br>이용권·월정석·단건 결제는<br>현재 결제창의 안내를 확인하세요.</p>"
    }
  ]
};

module.exports.panels[1].html = module.exports.panels[1].html.replace('금액과 적용 수단은 결제창에서 확인하세요.', '단건 결제 ' + priceLabel + ' · 이용권·월정석 적용은 결제창에서 확인하세요.');
