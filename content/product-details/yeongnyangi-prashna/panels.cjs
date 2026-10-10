module.exports={
  "id": "yeongnyangi-prashna",
  "featureKey": "yeongnyangi-saju-flounder",
  "title": "영냥 신점 · 질문 순간의 프라슈나",
  "notice": "현재 영냥 신점은 질문 순간의 시각과 질문자의 지역을 바탕으로 프라슈나를 계산하고 AI가 상징적으로 해석하는 상담입니다. 출생 사주나 실제 접신으로 상대의 마음·위치를 확인하는 서비스가 아닙니다. 첫 답을 읽은 뒤 사용자가 심화 질문을 보내는 2단계 구성이며, 심화 질문은 해당 상담의 이용 가능 상태에서 한 번 요청합니다. 사주 광어의 출생 명식·궁합 리포트와는 다른 상품 구성입니다. 무료 호라리도 별도 흐름입니다. 안내 속 대화와 예시는 실제 고객 결과가 아닙니다. 가격과 이용 조건은 현재 준비 화면에서 확인해 주세요.",
  "evidence": [
    "app/yeongnyangi/_components/Experience.tsx",
    "app/yeongnyangi/_components/QuestionSkyConsultation.tsx",
    "app/yeongnyangi/_components/SpiritResult.tsx",
    "worker/yeongnyangi/fortune/question-sky.ts",
    "worker/yeongnyangi/fortune/question-sky-reading.ts",
    "worker/yeongnyangi/service.ts",
    "worker/yeongnyangi/repository.js"
  ],
  "panels": [
    {
      "id": "01-a-question-at-this-moment",
      "title": "지금 마음에 걸린 일, 한 질문으로 놓아보세요.",
      "alt": "보랏빛동양복식의공식영냥이와질문순간을읽는신점표지.",
      "html": "<h1>지금 마음에 걸린 일,<br>한 질문으로 적어봐요.</h1><div class=\"oracle\"><img src=\"/assets/yeongnyangi/spirit/eastern-oracle.webp\" alt=\"\"></div><p>태어난 때가 아니라,<br>질문이 떠오른 순간에서 시작합니다.</p><p class=\"sign\">영냥 신점 · 질문 순간의 프라슈나</p>"
    },
    {
      "id": "02-a-moment-not-a-birth-chart",
      "title": "“무엇이 궁금한가요?” 다음에는, 언제 어디서.",
      "alt": "질문시각과질문자위치기반계산을출생차트및상대추적과구분.",
      "html": "<h2>“무엇이 궁금한가요?”<br>다음에는, 언제 어디서.</h2><dl><div><dt>한 가지 질문</dt><dd>지금 판단하고 싶은 일을<br>질문 하나로 적어 주세요.</dd></div><div><dt>질문이 떠오른 시각</dt><dd>입력한 현지 시각을 시간대에 맞춰<br>하나의 질문 순간으로 확인해요.</dd></div><div><dt>질문자의 지역</dt><dd>도시를 고르거나 확인한 현재 위치.<br>상대의 위치를 찾는 입력이 아닙니다.</dd></div></dl><p class=\"note\">프라슈나는 질문 순간을 읽는 전통 체계예요.<br>출생 사주나 두 사람 출생 궁합과 다릅니다.</p>"
    },
    {
      "id": "03-the-first-answer",
      "title": "처음에는, 답과 근거와 한 가지 행동.",
      "alt": "현재2단계계약중첫답의실제핵심답근거지금할행동세항목.",
      "html": "<h2>첫 답에는 근거와<br>한 가지 행동을.</h2><p class=\"label\">1단계 · 영냥이의 첫 답</p><div class=\"first\"><section><h3>핵심 답</h3><p>질문에 대한 판단을 먼저 읽어요.</p></section><section><h3>근거</h3><p>계산된 상징을 쉬운 말로 연결해요.</p></section><section><h3>지금 할 행동</h3><p>한계와 조건을 함께 확인하고,<br>내가 할 수 있는 일 하나를 남겨요.</p></section></div><p class=\"note\">상대의 실제 감정이나 생각을<br>관찰한 사실처럼 설명하지 않습니다.</p>"
    },
    {
      "id": "04-choose-the-deeper-question",
      "title": "첫 답을 읽고 나서, 더 묻고 싶은 한 가지.",
      "alt": "추천질문선택은입력창채우기이며이용가능상태에서한번심화전송하는흐름.",
      "html": "<h2>첫 답을 읽고 나서,<br>더 묻고 싶은 한 가지.</h2><div class=\"conversation\"><p>“기다린다면, 무엇을 기준으로<br>제 마음을 정리하면 좋을까요?”</p><p>“기다림의 기준을 함께 살펴보자.”</p></div><p>추천 질문을 고르면 입력창에 담겨요.<br>내 상황에 맞게 고친 뒤 전송하세요.</p><div class=\"boundary\"><h3>심화 상담은 내가 요청할 때</h3><p>첫 답 이후 이용 가능한 상태에서<br>한 번 더 깊게 물어보는 구성입니다.</p></div><p class=\"note\">위 대화는 가상 예시예요.<br>추천 질문 선택은 자동 전송이 아닙니다.</p>"
    },
    {
      "id": "05-the-second-reading",
      "title": "같은 답을 늘이기보다, 선택의 조건을 더 깊게.",
      "alt": "실제심화상담네항목을선택비교와실행의과정으로설명.",
      "html": "<h2>같은 답을 늘이기보다,<br>선택의 조건을 더 깊게.</h2><p class=\"label\">2단계 · 심화 상담</p><div class=\"deep\"><section><h3>심화 판단</h3><p>새로 보낸 질문에 대한 해석.</p></section><section><h3>근거</h3><p>새 근거 또는 앞 근거의 다른 연결.</p></section><section><h3>선택지와 조건</h3><p>지금 움직일 때와 기다릴 때의 차이.</p></section><section><h3>실행 계획</h3><p>내가 할 일과 지켜볼 기준.</p></section></div><p class=\"note\">첫 답과 심화로 이어지는 2단계 상담입니다.</p>"
    },
    {
      "id": "06-read-a-symbol-keep-a-boundary",
      "title": "흐름을 읽어도, 상대의 경계는 남아 있어요.",
      "alt": "연락거부상황에서상대경계존중과사용자선택을제시하는가상예시.",
      "html": "<h2>흐름을 읽어도,<br>상대의 선을 지켜요.</h2><p class=\"label\">이해를 돕기 위한 편집 예시</p><blockquote>다시 이야기하고 싶은 마음과<br>지금 연락해도 되는지는 달라.<br>상대가 연락을 원하지 않는다면,<br>그 선을 먼저 지켜야 해.<br><br>오늘은 보낼 말 대신,<br>내가 정리하고 싶은 마음을<br>나를 위한 글로 남겨 보자.</blockquote><p class=\"note\">실제 고객의 질문·계산·결과가 아닙니다.<br>경계를 존중하는 설명 방식의 예시예요.</p>"
    },
    {
      "id": "07-what-the-answer-cannot-know",
      "title": "신점이라는 이름이, 모든 답을 뜻하진 않아요.",
      "alt": "AI상징해설·위치생각관측불가·사건날짜한계·상황입력안내.",
      "html": "<h2>신점이라는 이름이<br>모든 답은 아니에요.</h2><div class=\"limits\"><section><h3>실제 마음과 소재지</h3><p>상대의 생각이나 어디에 있는지<br>확인하는 서비스가 아닙니다.</p></section><section><h3>사건이 일어날 날짜</h3><p>질문 순간의 흐름을 특정 날짜나<br>재회·합격 보장으로 바꾸지 않아요.</p></section><section><h3>내가 알려준 상황</h3><p>현재 관계와 실제 있었던 일을 적고,<br>거절·차단 등 경계도 알려 주세요.</p></section></div><p class=\"note\">전통 계산을 AI가 해설합니다.<br>실제 접신이나 사람의 답변은 아닙니다.</p>"
    },
    {
      "id": "08-return-to-your-choice",
      "title": "첫 답에서 다음 질문까지, 내 선택을 위한 이야기.",
      "alt": "공식영냥이와현재가격·저장결과·무료호라리별도구성안내.",
      "html": "<h2>첫 답에서 다음 질문까지,<br>내 선택을 위한 이야기.</h2><div class=\"closing-oracle\"><img src=\"/assets/yeongnyangi/spirit/eastern-oracle.webp\" alt=\"\"></div><p>가격과 이용 조건을 확인하고,<br>지금의 질문으로 시작해 보세요.</p><p class=\"note\">저장된 결과는 같은 계정의 내 상담에서<br>다시 확인할 수 있어요.</p><p class=\"note\">무료 호라리는 별도 흐름이며,<br>사주 광어의 출생·궁합 리포트가<br>이 상담에 함께 포함되지는 않습니다.</p>"
    }
  ]
};
