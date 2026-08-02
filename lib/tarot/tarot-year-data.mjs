import { buildImageCandidates, TAROT_CARDS } from "./tarot-cards.mjs";

const ZODIAC_YEAR_PROFILES = Object.freeze([
  { animal: "쥐", symbol: "기회 포착과 정보력", annualTheme: "작은 신호를 먼저 알아보고 선택지를 현실의 기회로 바꾸는 해", strength: "사람과 상황의 변화를 빠르게 감지하는 생존 감각", caution: "가능성을 너무 빨리 좇아 중요한 조건을 놓치는 조급함", moneyPattern: "분산된 작은 수익을 연결하고 새는 지출을 먼저 막을 때 돈이 남습니다.", careerPattern: "정보 수집, 기획, 영업, 협상처럼 흐름을 읽는 일에서 존재감이 커집니다.", relationshipPattern: "가벼운 대화 속에서도 진심을 감지하지만, 확인 전까지 결론을 늦추는 지혜가 필요합니다.", luckyAction: "결정 전 정보원을 두 곳으로 나누어 확인하고, 가장 작은 실행부터 시작하세요." },
  { animal: "소", symbol: "축적과 신뢰", annualTheme: "느리더라도 오래 가져갈 기반을 만들며 신뢰를 결과로 바꾸는 해", strength: "한 번 정한 일을 꾸준히 반복해 현실의 무게로 만드는 인내", caution: "익숙한 방식이 안전하다는 이유로 변화의 신호를 늦게 받아들이는 경직성", moneyPattern: "고정비를 정리하고 매달 같은 금액을 쌓는 방식이 큰 변동보다 잘 맞습니다.", careerPattern: "운영, 관리, 생산, 장기 프로젝트처럼 성실함이 누적되는 분야에서 강합니다.", relationshipPattern: "말보다 약속을 지키는 행동으로 신뢰를 만들며, 속도보다 지속성을 중요하게 봅니다.", luckyAction: "일정·예산·체력을 한 표에 기록하고 매주 같은 시간에 점검하세요." },
  { animal: "호랑이", symbol: "돌파와 용기", annualTheme: "막힌 판을 정면으로 돌파하되 힘을 쓸 곳을 고르는 해", strength: "경쟁 상황에서 물러서지 않고 판세를 바꾸는 결단력", caution: "승부를 서두르며 협력자와 회복 시간을 함께 소모하는 과열", moneyPattern: "확장 기회가 보이지만 큰 베팅보다 목표와 손실 한도를 먼저 정할수록 유리합니다.", careerPattern: "리더십, 창업, 경쟁 프로젝트, 명예가 걸린 역할에서 추진력이 빛납니다.", relationshipPattern: "진심이 빠르고 강하게 드러나지만 상대의 속도와 선택권을 존중해야 오래 갑니다.", luckyAction: "올해의 승부수 하나만 정하고, 나머지 일은 순서를 늦춰 체력을 보존하세요." },
  { animal: "토끼", symbol: "관계와 섬세한 조율", annualTheme: "관계의 온도와 말의 결을 읽으며 부드러운 연결을 현실에 남기는 해", strength: "분위기와 감정의 미세한 변화를 읽어 갈등을 줄이는 감수성", caution: "상대의 기분을 먼저 살피느라 자신의 기준과 피로를 뒤로 미루는 습관", moneyPattern: "혼자 크게 벌리기보다 신뢰할 수 있는 협업과 재방문 구조에서 안정이 생깁니다.", careerPattern: "상담, 디자인, 조정, 콘텐츠, 고객 경험처럼 섬세한 감각이 필요한 일과 맞습니다.", relationshipPattern: "배려가 깊은 만큼 양보와 자기삭제를 구분해야 관계의 온도가 건강하게 유지됩니다.", luckyAction: "배려와 양보를 구분하는 짧은 문장을 준비해 필요한 경계를 먼저 말하세요." },
  { animal: "용", symbol: "상승과 비전", annualTheme: "큰 그림을 현실의 무대에 올리고 방향을 넓히는 해", strength: "아직 없는 가능성을 그려 사람과 자원을 한 방향으로 모으는 비전", caution: "계획의 크기가 실행 속도를 앞서며 책임과 비용이 뒤늦게 따라오는 과장", moneyPattern: "수익의 크기보다 확장에 필요한 비용과 책임자를 먼저 정할 때 기회가 살아납니다.", careerPattern: "브랜딩, 리더 역할, 큰 프로젝트, 공개적인 무대에서 영향력이 커집니다.", relationshipPattern: "관계에도 큰 기대를 걸기 쉬우므로 상대가 실제로 감당할 수 있는 약속을 확인해야 합니다.", luckyAction: "큰 목표를 이번 달에 확인할 수 있는 한 가지 증거로 줄여 실행하세요." },
  { animal: "뱀", symbol: "직감과 전략", annualTheme: "겉으로 드러난 흐름보다 숨은 기회를 읽고 집중하는 해", strength: "사람과 상황의 속내를 읽고 타이밍을 고르는 깊은 직관", caution: "확신이 생길 때까지 관망하거나 의심을 키워 움직일 시기를 놓치는 태도", moneyPattern: "조용히 쌓이는 전문 수익과 장기 계약처럼 변동이 적은 흐름에 강합니다.", careerPattern: "전략, 분석, 연구, 기획, 전문성처럼 깊이 파고드는 일에서 성과가 납니다.", relationshipPattern: "깊은 관계에는 충실하지만 마음을 시험하기보다 사실과 감정을 분리해 말해야 합니다.", luckyAction: "혼자 품은 의심을 사실·추측·바람으로 나누어 적고, 확인된 조건부터 움직이세요." },
  { animal: "말", symbol: "이동과 확장", annualTheme: "움직임을 넓히되 속도보다 목적지를 분명히 하는 해", strength: "새로운 장소와 사람을 두려워하지 않고 경험을 확장하는 추진력", caution: "속도가 방향보다 앞서 계획이 흩어지고 약속이 과해지는 흐름", moneyPattern: "외부 활동과 이동에서 기회가 생기지만 교통·도구·변동비를 관리해야 합니다.", careerPattern: "영업, 여행, 교육, 마케팅, 프리랜스처럼 이동과 확장이 있는 일에 활기가 생깁니다.", relationshipPattern: "자유로운 만남을 즐기지만 꾸준히 지킬 약속을 하나 남겨야 관계가 안정됩니다.", luckyAction: "이동할 때마다 목적과 돌아올 기준을 한 줄로 적고 불필요한 약속을 덜어내세요." },
  { animal: "양", symbol: "조화와 회복", annualTheme: "갈등을 부드럽게 풀고 나와 타인의 회복 공간을 함께 만드는 해", strength: "사람의 상처와 생활의 균열을 알아차리고 돌보는 공감력", caution: "갈등을 피하려고 필요한 말을 삼키다가 피로와 서운함을 쌓는 습관", moneyPattern: "돌봄·예술·생활 개선처럼 사람의 필요를 채우는 일에서 지속적인 기회가 생깁니다.", careerPattern: "협업, 교육, 예술, 상담, 서비스처럼 조화와 감각을 쓰는 환경에서 빛납니다.", relationshipPattern: "따뜻한 관계를 만들지만 모두를 구하려는 책임을 내려놓고 선을 정해야 합니다.", luckyAction: "감정적으로 끌리는 선택과 실제로 감당 가능한 선택을 따로 적어 비교하세요." },
  { animal: "원숭이", symbol: "지혜와 순발력", annualTheme: "기술과 변칙을 활용해 막힌 문제의 새로운 출구를 찾는 해", strength: "복잡한 문제를 빠르게 구조화하고 도구를 바꾸어 해결하는 재치", caution: "새 방법을 찾는 재미에 빠져 하나를 끝내지 못하는 분산", moneyPattern: "기술, 자동화, 사이드 프로젝트처럼 효율을 높이는 방식에서 수익이 납니다.", careerPattern: "개발, 마케팅, 협상, 문제 해결, 변화가 빠른 프로젝트에서 능력이 드러납니다.", relationshipPattern: "유머와 기지로 가까워지지만 진지한 약속 앞에서는 장난을 멈추고 명료하게 말해야 합니다.", luckyAction: "새 도구는 하나만 고르고 기존 작업을 끝낸 뒤 다음 방법으로 넘어가세요." },
  { animal: "닭", symbol: "표현과 완성도", annualTheme: "흐릿한 것을 정리해 세상 앞에 보여 주고 결과의 품질을 높이는 해", strength: "세부를 다듬고 핵심을 분명히 표현하는 관찰력과 완성도", caution: "검토를 반복하다 공개 시기를 놓치거나 타인의 실수를 지나치게 지적하는 태도", moneyPattern: "정리된 포트폴리오와 신뢰도 높은 결과물이 가격과 수익을 끌어올립니다.", careerPattern: "편집, 품질 관리, 발표, 디자인, 분석처럼 기준을 세우는 일에서 강합니다.", relationshipPattern: "진심을 정확히 전하려다 말이 날카로워질 수 있어 인정과 요청을 함께 전하는 것이 좋습니다.", luckyAction: "검토 기준을 세 가지로 제한하고 기준을 넘은 결과는 먼저 공유하세요." },
  { animal: "개", symbol: "신뢰와 보호", annualTheme: "남을 지키는 책임과 나를 지키는 경계를 함께 세우는 해", strength: "약속과 사람을 오래 지키며 관계의 진짜 신뢰도를 판별하는 책임감", caution: "모든 책임을 혼자 떠안아 관계의 균형과 자신의 체력을 잃는 모습", moneyPattern: "장기 고객, 반복 계약, 믿을 만한 동료와의 공동 수익에서 안정이 커집니다.", careerPattern: "관리, 보안, 운영, 상담, 조직의 기준을 지키는 역할에서 인정받습니다.", relationshipPattern: "충성도가 높지만 상대의 말보다 실제 책임 분담을 확인해야 건강한 관계가 됩니다.", luckyAction: "약속은 날짜·역할·답변 기한으로 기록하고 혼자 맡은 일을 한 가지 내려놓으세요." },
  { animal: "돼지", symbol: "풍요와 감각", annualTheme: "이미 가진 풍요를 누리면서 마무리와 다음 준비를 함께 하는 해", strength: "삶의 감각을 회복하고 사람에게 넉넉한 에너지를 나누는 포용력", caution: "편안함을 지키느라 필요한 정리와 결정을 다음으로 미루는 흐름", moneyPattern: "생활의 질을 높이는 소비와 수익을 구분하면 풍요가 오래 남습니다.", careerPattern: "음식, 예술, 서비스, 복지, 자원 관리처럼 감각과 실용을 함께 쓰는 일에 강합니다.", relationshipPattern: "따뜻하고 넉넉한 관계를 만들지만 기대와 의무를 구분해야 감정이 무거워지지 않습니다.", luckyAction: "마무리할 일·나눌 것·다음 달로 넘길 일을 세 칸으로 정리하세요." },
]);

const YEAR_PHASES = Object.freeze([
  { month: 1, phase: "문을 여는 달", keyword: "시작과 기준", flow: "새로운 흐름은 거창한 선언보다 첫 번째로 지키는 기준에서 시작됩니다. 올해 무엇을 늘리고 무엇을 줄일지 선명하게 정하면 이후의 선택이 흔들리지 않습니다.", money: "금전은 큰 지출보다 올해 반복될 고정비와 작은 수익을 먼저 확인할 때 흐름이 보입니다.", work: "일에서는 준비해 둔 능력을 한 가지 결과물로 꺼내 보이며 올해의 방향을 시험하게 됩니다.", relationship: "관계에서는 먼저 말을 꺼내되, 상대의 답을 대신 정하지 않는 여백이 필요합니다.", health: "새 계획을 한꺼번에 늘리기보다 수면과 식사 중 하나를 먼저 고정해야 몸이 따라옵니다.", caution: "시작의 설렘이 모든 약속을 지금 당장 해야 한다는 압박으로 바뀌지 않게 하세요.", action: "올해 끝까지 가져갈 기준을 한 문장으로 적고 이번 달에 확인할 증거 하나를 정하세요." },
  { month: 2, phase: "기반을 고르는 달", keyword: "정리와 축적", flow: "1월에 세운 기준을 실제 생활에 맞게 조정하는 시기입니다. 빠른 확장보다 반복해도 지치지 않는 방식이 올해의 운을 받쳐 줍니다.", money: "수입을 늘리는 일과 새는 돈을 막는 일을 따로 적으면 재정의 우선순위가 선명해집니다.", work: "업무는 속도보다 순서를 정리할수록 실수가 줄고 주변의 신뢰가 쌓입니다.", relationship: "가까운 사람에게도 내가 감당할 수 있는 시간과 마음의 범위를 솔직히 알려야 합니다.", health: "몸이 보내는 작은 피로 신호를 무시하지 말고 일정 사이에 회복 시간을 예약하세요.", caution: "익숙한 방식이 편하다는 이유만으로 더 나은 선택을 검토하지 않는 태도를 경계하세요.", action: "매주 같은 시간에 예산·일정·컨디션을 10분씩 기록하세요." },
  { month: 3, phase: "첫 번째 상승의 달", keyword: "노출과 실행", flow: "준비한 것이 바깥의 반응을 만나는 첫 상승 구간입니다. 완벽하게 다듬기보다 실제 반응을 받아 다음 개선으로 연결하는 편이 좋습니다.", money: "작은 판매·제안·협업을 시험해 보고, 반응이 확인된 부분에만 비용을 더하세요.", work: "일에서는 실력을 숨기기보다 결과와 기여 범위를 숫자나 사례로 보여 주는 것이 유리합니다.", relationship: "관계는 호감의 크기보다 서로 약속을 지키는 방식에서 깊어집니다.", health: "활동량이 늘어나는 만큼 회복을 뒤로 미루지 말고 몸을 식히는 루틴을 함께 두세요.", caution: "좋은 반응 하나를 전체 성공으로 확대해석하면 과한 약속을 만들 수 있습니다.", action: "이번 달에는 결과를 확인할 수 있는 작은 공개나 제안 하나를 실행하세요." },
  { month: 4, phase: "관계를 조율하는 달", keyword: "대화와 협력", flow: "혼자 밀어붙이던 흐름이 사람과의 합의 속에서 방향을 다듬습니다. 누가 옳은지보다 함께 지킬 수 있는 기준을 찾는 일이 중요합니다.", money: "공동 지출과 역할 분담을 문서로 남기면 금전 문제로 관계가 흔들리는 일을 줄일 수 있습니다.", work: "협업에서는 담당자와 완료 기준을 명확히 할수록 좋은 의도가 실제 성과로 이어집니다.", relationship: "상대의 마음을 추측하기보다 확인할 약속 하나를 짧게 묻는 대화가 관계를 살립니다.", health: "사람을 많이 만난 뒤 혼자 회복할 시간을 확보해야 감정 피로가 쌓이지 않습니다.", caution: "배려를 이유로 중요한 불편을 계속 미루면 하반기에 더 큰 조율이 필요해집니다.", action: "지금 가장 중요한 관계 하나에 지킬 약속과 지키기 어려운 약속을 나누어 말하세요." },
  { month: 5, phase: "속도를 조절하는 달", keyword: "선택과 집중", flow: "가능성이 동시에 보이면서 무엇을 포기할지 결정해야 하는 시기입니다. 모든 문을 열어 두기보다 가장 오래 가져갈 선택에 에너지를 모으세요.", money: "충동적인 확장보다 수익성이 확인된 항목과 실험 비용의 한도를 먼저 정하는 편이 낫습니다.", work: "업무를 많이 벌이는 사람보다 우선순위 세 가지를 끝내는 사람이 더 선명한 성과를 남깁니다.", relationship: "관계에서도 모든 요청에 즉답하지 말고 감당 가능한 약속만 선택해야 마음이 편해집니다.", health: "집중이 길어질수록 눈·목·수면의 신호를 의도적으로 끊어 주어야 합니다.", caution: "아쉬움을 피하려고 선택지를 늘리면 정작 중요한 흐름이 희미해질 수 있습니다.", action: "삭제·보류·실행 세 칸으로 이번 달의 선택지를 정리하세요." },
  { month: 6, phase: "중간 전환의 달", keyword: "방향 재설정", flow: "상반기의 결과가 무엇을 이어가고 무엇을 바꿀지 알려 주는 전환점입니다. 실패 여부보다 실제로 확인된 조건을 기준으로 방향을 조정하세요.", money: "상반기 지출과 수익을 결산하면 하반기에 투자할 곳과 줄일 곳이 구분됩니다.", work: "역할이나 프로젝트를 바꿀 가능성이 생기며, 새 선택의 책임과 자원을 함께 계산해야 합니다.", relationship: "오래된 관계의 이름과 거리를 다시 정리할 수 있는 달입니다.", health: "상반기 피로가 드러날 수 있으니 의지보다 수면과 회복의 구조를 먼저 손보세요.", caution: "감정이 크게 움직이는 순간에 인생 전체를 뒤집는 결론을 내리지 마세요.", action: "상반기 결과를 사실·배운 점·다음 실험으로 나누어 하반기 계획을 다시 쓰세요." },
  { month: 7, phase: "무대가 넓어지는 달", keyword: "확장과 이동", flow: "중간 전환 뒤 새로운 사람과 환경이 들어오며 활동 반경이 넓어집니다. 다만 방향이 맞는지 확인하면서 움직일 때 확장이 기회로 남습니다.", money: "외부 활동에서 수익 기회가 생기지만 이동비와 도구 비용을 포함해 실제 이익을 계산하세요.", work: "발표, 영업, 지원, 협업처럼 바깥에 자신을 보여 주는 행동이 다음 문을 엽니다.", relationship: "새로운 만남이 늘어도 오래 남을 사람과 순간의 호기심을 구분하는 감각이 필요합니다.", health: "일정이 많아질수록 이동 사이에 물과 휴식 시간을 넣어 체력의 균형을 맞추세요.", caution: "속도와 화제성이 커졌다는 이유로 모든 제안을 수락하지 마세요.", action: "이번 달에 넓힐 영역 하나와 반드시 지킬 경계 하나를 함께 정하세요." },
  { month: 8, phase: "내실을 다지는 달", keyword: "점검과 집중", flow: "외부 활동을 잠시 안쪽으로 가져와 결과의 질과 생활의 균형을 확인합니다. 눈에 띄는 성장보다 오래 유지할 수 있는 구조가 힘을 얻습니다.", money: "수익보다 현금 흐름과 고정비를 다시 확인하면 가을의 선택이 가벼워집니다.", work: "자료, 계약, 일정, 품질 기준을 정리하는 일이 이후의 속도를 결정합니다.", relationship: "말이 줄어드는 시기일수록 침묵을 단정하지 말고 필요한 확인만 차분히 건네세요.", health: "컨디션이 떨어진다면 더 밀어붙이기보다 약속 수를 줄이고 회복의 질을 높이세요.", caution: "조용한 시기를 성과가 없는 시기로 오해하지 마세요.", action: "반복해서 시간을 빼앗는 일 하나를 찾아 절차를 줄이거나 위임하세요." },
  { month: 9, phase: "결과를 가려내는 달", keyword: "판단과 정리", flow: "올해의 여러 시도 중 실제로 남길 것을 고르는 달입니다. 감정적인 아쉬움보다 수익·성장·관계의 질을 기준으로 정리해야 합니다.", money: "작은 누수가 반복되는 영역을 정리하면 연말 수확이 숫자로 남습니다.", work: "성과를 포트폴리오와 기록으로 묶고, 다음 단계에 필요한 역량의 빈틈을 확인하세요.", relationship: "많이 만나는 것보다 신뢰가 확인된 사람에게 시간과 마음을 배분하는 흐름입니다.", health: "집중력이 좋아져도 과로를 성취로 착각하지 않도록 하루의 끝을 정해 두세요.", caution: "한 번의 실수나 거절을 올해 전체의 실패로 확대하지 마세요.", action: "계속할 일·줄일 일·완전히 끝낼 일을 각각 하나씩 결정하세요." },
  { month: 10, phase: "현실의 문을 여는 달", keyword: "책임과 수확", flow: "앞서 쌓아 온 것이 실제 제안과 결과의 형태로 나타나는 시기입니다. 좋은 기회를 받을수록 책임 범위와 마감 조건을 꼼꼼히 확인하세요.", money: "수익이 커질 가능성만큼 세금·고정비·재투자 비율을 분리해야 돈이 남습니다.", work: "승진, 계약, 완성, 공개처럼 이름 붙일 수 있는 결과를 현실에 고정하기 좋습니다.", relationship: "관계에서도 말뿐인 기대보다 함께 책임질 수 있는 약속이 남습니다.", health: "일의 밀도가 높아지는 만큼 식사와 수면을 성과의 일부로 취급하세요.", caution: "결과가 보인다고 모든 책임을 혼자 떠안지 마세요.", action: "완료 기준과 책임자를 문서로 남겨 올해의 수확을 보호하세요." },
  { month: 11, pha…4353 tokens truncated… 거리를 다시 정하며 남길 인연을 선별합니다.", health: "생활 습관을 바꾸는 결단이 필요하지만 급격한 변화보다 단계적 전환이 좋습니다.", advice: "끝내야 할 것 하나를 정하고 그 자리를 대신할 건강한 루틴을 준비하세요.", avoid: "종결을 실패로 해석해 이미 끝난 문을 계속 두드리지 마세요." },
  M14: { nameKo: "절제", nameEn: "Temperance", keywords: ["조율", "균형", "회복"], theme: "서로 다른 속도와 자원을 섞어 오래 지속할 리듬을 만드는 해", light: "극단을 피하고 작은 조율을 반복하면 관계·일·몸이 함께 안정됩니다.", shadow: "갈등을 줄이려다 자신의 필요와 분노를 뒤로 미루는 타협이 될 수 있습니다.", money: "수입과 지출, 소비와 저축의 비율을 조정할수록 풍요가 오래 갑니다.", career: "협업과 조정 능력이 성과를 만들며 한쪽에 몰린 업무를 분산할 필요가 있습니다.", love: "감정의 온도와 현실의 속도를 맞출 때 관계가 편안하게 깊어집니다.", relationship: "서로 다른 사람을 연결하는 역할을 맡되 중재자의 책임을 혼자 지지 마세요.", health: "수면·식사·운동을 극단적으로 바꾸기보다 매일 가능한 수준으로 조정하세요.", advice: "지금 과한 것 하나와 부족한 것 하나를 정해 비율을 바꾸세요.", avoid: "모두를 만족시키기 위한 무기한 타협은 피하세요." },
  M15: { nameKo: "악마", nameEn: "The Devil", keywords: ["집착", "유혹", "소유"], theme: "나를 묶는 욕망과 계약을 알아보고 선택권을 되찾는 해", light: "강한 욕망을 솔직히 인정하면 현실적인 목표와 힘으로 전환할 수 있습니다.", shadow: "불안과 결핍을 달래기 위한 소비·관계·일의 반복이 자유를 좁힐 수 있습니다.", money: "높은 수익 약속보다 빚·구독·충동 지출처럼 반복되는 묶임을 먼저 정리해야 합니다.", career: "성과 욕구가 강해지지만 지나친 경쟁과 소진의 대가를 함께 계산해야 합니다.", love: "강한 끌림이 있어도 소유와 애정을 구분하고 경계선을 합의해야 합니다.", relationship: "서로의 약점을 이용하는 관계와 힘을 나누는 관계를 구별하게 됩니다.", health: "중독적 습관과 과로를 의지로만 해결하지 말고 환경부터 바꾸세요.", advice: "내 선택이 아니라 습관처럼 반복되는 행동 하나를 찾아 구조를 바꾸세요.", avoid: "불안한 상태에서 결제·계약·관계 확정을 하지 마세요." },
  M16: { nameKo: "탑", nameEn: "The Tower", keywords: ["각성", "재편", "진실"], theme: "취약한 구조를 드러내고 더 현실적인 기반으로 다시 세우는 해", light: "충격처럼 보이는 변화가 오히려 오래된 문제를 정직하게 고칠 기회를 줍니다.", shadow: "변화를 재난으로만 해석해 필요한 수습과 새로운 설계를 늦출 수 있습니다.", money: "예상 밖의 비용에 대비해 비상 자금과 계약의 취약 지점을 점검해야 합니다.", career: "역할·조직·계획이 재편되며 숨겨진 문제를 해결하는 사람이 신뢰를 얻습니다.", love: "감춰 둔 사실이 드러날 수 있지만, 진실을 본 뒤의 선택은 더 건강한 방향을 열 수 있습니다.", relationship: "무너진 기대를 붙들기보다 실제로 남은 신뢰를 기준으로 관계를 재정립합니다.", health: "긴장이 한꺼번에 드러날 수 있으니 무리한 버티기보다 빠른 회복 조치를 취하세요.", advice: "무너질 경우를 상상하는 대신 지금 보이는 취약한 부분부터 보강하세요.", avoid: "불편한 진실을 덮기 위해 더 큰 약속을 추가하지 마세요." },
  M17: { nameKo: "별", nameEn: "The Star", keywords: ["희망", "회복", "신뢰"], theme: "상처 이후의 방향을 다시 믿고 작지만 지속적인 빛을 키우는 해", light: "회복의 감각과 진솔한 공유가 관계와 목표에 다시 생기를 줍니다.", shadow: "희망을 품는 일이 현실 행동을 대신하는 기다림으로 변할 수 있습니다.", money: "장기적인 가치와 꾸준한 콘텐츠가 수익으로 이어지며 즉시성보다 신뢰가 중요합니다.", career: "자신의 이야기를 세상에 보여 주고 미래 지향적인 프로젝트를 시작하기 좋습니다.", love: "완전히 닫힌 흐름은 아니지만 속도보다 안전한 온도 회복이 먼저입니다.", relationship: "좋은 사람의 도움과 응원이 들어오며 받은 신뢰를 행동으로 돌려주는 것이 중요합니다.", health: "무리한 회복보다 수면·물·빛·호흡처럼 기본적인 회복을 꾸준히 쌓으세요.", advice: "바라는 미래를 말로만 두지 말고 이번 주에 확인 가능한 행동으로 옮기세요.", avoid: "작은 침묵을 희망의 부재로 확대하거나 반대로 보장으로 착각하지 마세요." },
  M18: { nameKo: "달", nameEn: "The Moon", keywords: ["불안", "직감", "분별"], theme: "불안과 직감을 구분하며 보이지 않는 감정의 결을 현실에 번역하는 해", light: "상징과 감정에 민감해져 남들이 놓치는 위험과 가능성을 감지합니다.", shadow: "확인되지 않은 추측이 사실처럼 커져 관계와 선택을 흔들 수 있습니다.", money: "모호한 제안과 감정적 소비를 피하고 계약·수익 근거를 문서로 확인해야 합니다.", career: "창작과 탐색에는 영감이 있지만 모호한 목표는 작은 실험으로 검증해야 합니다.", love: "감정이 깊어지는 만큼 상대의 마음을 단정하지 말고 실제 행동과 대화를 보세요.", relationship: "말하지 않은 감정이 쌓이기 쉬워 오해를 줄이는 짧고 정확한 질문이 필요합니다.", health: "수면과 불안의 리듬이 민감해질 수 있으니 밤의 정보와 자극을 줄이세요.", advice: "불안한 생각을 사실·가능성·두려움 세 칸으로 분리해 현실 기준을 세우세요.", avoid: "확인 전 결론, 밤에 내린 관계 판단, 근거 없는 투자를 피하세요." },
  M19: { nameKo: "태양", nameEn: "The Sun", keywords: ["명료", "활력", "기쁨"], theme: "숨기지 않고 드러낼수록 성과와 기쁨이 선명해지는 해", light: "자신감과 개방성이 사람의 도움을 모으고 결과를 쉽게 확인하게 합니다.", shadow: "밝은 분위기를 유지하려다 피로와 불편한 사실을 무시할 수 있습니다.", money: "성과가 보이는 분야에 집중하면 수익이 커지지만 과시성 지출은 구분해야 합니다.", career: "발표·홍보·리더십·성과 공개에서 인정받으며 자신을 보여 줄 기회가 큽니다.", love: "관계의 온도가 따뜻해지고 솔직한 표현이 오해를 줄여 줍니다.", relationship: "함께 기뻐할 수 있는 사람과의 연결이 커지며 숨은 경쟁은 정리할 필요가 있습니다.", health: "활력이 살아나지만 회복을 생략하지 않고 과열을 조절해야 합니다.", advice: "잘한 일을 숨기지 말고 결과와 감사의 말을 함께 공개하세요.", avoid: "항상 밝아야 한다는 압박으로 힘든 감정을 부정하지 마세요." },
  M20: { nameKo: "심판", nameEn: "Judgement", keywords: ["재평가", "호출", "재기회"], theme: "과거의 경험을 다시 불러 현재의 선택과 다음 역할로 연결하는 해", light: "이미 지나온 경험이 새로운 기회와 소명으로 재해석됩니다.", shadow: "과거의 후회와 타인의 평가에 묶여 지금의 호출을 늦출 수 있습니다.", money: "예전에 쌓은 기술과 인맥을 다시 활용하면 새로운 수익 루트가 열립니다.", career: "재도전·전환·평가·복귀의 흐름이 강하며 과거 성과를 구조화해야 합니다.", love: "재회나 관계 재평가의 가능성이 있지만 달라진 행동이 있는지 확인해야 합니다.", relationship: "오래된 인연을 다시 보되 과거의 역할을 그대로 반복하지 않는 것이 중요합니다.", health: "몸과 마음이 보내는 경고를 미루지 않고 생활을 재정비해야 합니다.", advice: "다시 부르고 싶은 기회 하나와 더는 반복하지 않을 패턴 하나를 적으세요.", avoid: "후회만 반복하며 현재의 행동을 미루는 태도를 피하세요." },
  M21: { nameKo: "세계", nameEn: "The World", keywords: ["완성", "통합", "성숙"], theme: "흩어진 경험을 하나의 결과로 통합하고 다음 주기로 넘어가는 해", light: "그동안의 노력이 연결되어 성숙한 결론과 더 넓은 무대를 만듭니다.", shadow: "완성을 확인하기도 전에 다음 목표로 달려가거나 끝난 일을 놓지 못할 수 있습니다.", money: "장기 프로젝트와 누적된 자산이 결실을 만들며 수익 구조를 정리하기 좋습니다.", career: "완성도 높은 결과를 공개하고 더 큰 범위의 역할로 이동할 가능성이 있습니다.", love: "관계가 안정되거나 성숙한 결론에 이르며 함께 갈 방식이 선명해집니다.", relationship: "남은 관계와 끝난 관계를 구분하고 서로의 성장을 축하하는 흐름입니다.", health: "리듬을 회복한 뒤에도 과도한 성취 욕심보다 지속 가능한 페이스를 선택하세요.", advice: "완성한 결과를 기록하고 다음 주기에 가져갈 핵심 하나만 남기세요.", avoid: "마무리를 미루거나 새 목표로 현재의 성취를 지우지 마세요." },
});

const REVERSED_ADJUSTMENTS = Object.freeze({
  M00: ["출발 전 조건을 다시 확인하는 해", "가벼운 도약이 아니라 안전한 첫걸음으로 방향을 바꾸세요.", "준비 부족과 회피가 새로운 시작을 늦출 수 있습니다."],
  M01: ["흩어진 재능을 다시 한곳에 모으는 해", "도구를 줄이고 실제 결과 하나에 집중하세요.", "말과 능력의 과시가 실행을 대신할 수 있습니다."],
  M02: ["침묵 속 신호를 사실로 검증하는 해", "직관을 존중하되 확인 가능한 질문을 남기세요.", "의심과 관망이 기회를 닫을 수 있습니다."],
  M03: ["돌봄의 경계를 다시 세우는 해", "나를 회복시키는 자원부터 배분하세요.", "과잉 돌봄과 편안함이 정리를 늦출 수 있습니다."],
  M04: ["통제와 책임의 균형을 다시 배우는 해", "혼자 결정하지 말고 역할을 나누세요.", "완고한 통제가 협력과 회복을 막을 수 있습니다."],
  M05: ["내 상황에 맞는 원칙을 다시 고르는 해", "배운 것을 그대로 따르기보다 현실에 맞게 번역하세요.", "권위와 관습이 자신의 판단을 대신할 수 있습니다."],
  M06: ["선택을 미루게 한 두려움을 정리하는 해", "상대의 마음보다 내가 감당할 현실을 먼저 보세요.", "우유부단과 의존이 관계와 목표를 늦출 수 있습니다."],
  M07: ["속도를 낮춰 방향을 복구하는 해", "멈춤과 점검을 전진의 일부로 인정하세요.", "과속과 통제 욕구가 충돌을 만들 수 있습니다."],
  M08: ["참아 온 감정과 체력을 회복하는 해", "도움 요청과 휴식을 약함으로 보지 마세요.", "억눌린 감정이 갑작스러운 소진으로 나타날 수 있습니다."],
  M09: ["고립과 성찰을 구분하는 해", "신뢰할 사람 한 명에게 현재 상태를 공유하세요.", "혼자 만든 결론이 자기 의심을 키울 수 있습니다."],
  M10: ["변화를 통제하려는 마음을 내려놓는 해", "확률을 나누고 손실 한도를 정한 뒤 움직이세요.", "예측 집착과 충동적인 베팅을 경계하세요."],
  M11: ["나에게도 공정한 기준을 적용하는 해", "사과보다 사실과 책임의 범위를 먼저 확인하세요.", "자기비판이 균형 잡힌 판단을 대신할 수 있습니다."],
  M12: ["멈춤을 행동으로 전환할 시점을 찾는 해", "기다릴 기한과 다음 행동을 함께 정하세요.", "무기한 유예와 희생이 변화를 막을 수 있습니다."],
  M13: ["끝난 것을 인정하고 회복하는 해", "정리한 자리에 새로운 루틴을 천천히 심으세요.", "과거 고착과 변화 회피가 힘을 묶을 수 있습니다."],
  M14: ["무너진 균형을 작은 습관으로 복구하는 해", "과한 것 하나를 덜어내고 부족한 것을 채우세요.", "갈등 회피가 피로와 감정 폭발로 이어질 수 있습니다."],
  M15: ["집착의 고리를 끊고 선택권을 되찾는 해", "반복을 만드는 환경과 계약부터 바꾸세요.", "의존과 합리화가 같은 패턴을 재현할 수 있습니다."],
  M16: ["무너진 뒤 무엇을 다시 세울지 결정하는 해", "손실을 인정하고 취약한 구조부터 보강하세요.", "충격을 재난으로만 해석하면 회복이 늦어질 수 있습니다."],
  M17: ["희망을 현실 행동으로 되돌리는 해", "기다림 대신 확인 가능한 작은 접점을 만드세요.", "기대가 행동 미루기의 핑계가 될 수 있습니다."],
  M18: ["불안을 현실 검증으로 가라앉히는 해", "밤의 결론을 낮의 기준으로 옮기지 마세요.", "환상과 의심이 사실보다 앞설 수 있습니다."],
  M19: ["빛과 그늘을 함께 인정하는 해", "잘되는 일과 힘든 일을 동시에 기록하세요.", "밝은 척하는 태도가 피로를 숨길 수 있습니다."],
  M20: ["과거의 평가에서 벗어나 현재를 선택하는 해", "후회보다 지금 바꿀 행동 하나에 집중하세요.", "죄책감과 자기심판이 재기회를 늦출 수 있습니다."],
  M21: ["미완의 결말을 정리하고 다음 주기를 준비하는 해", "완성 기준을 낮추지 말되 마무리 날짜를 정하세요.", "끝내지 못한 일과 다음 목표가 서로를 흐릴 수 있습니다."],
});

function clone(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === "object") return { ...value };
  return value;
}

function buildCardProfile(code, orientation = "upright") {
  const seed = MAJOR_ANNUAL_SEEDS[code];
  if (!seed) return null;
  const isReversed = orientation === "reversed";
  const profile = { ...seed, keywords: clone(seed.keywords), orientation: isReversed ? "reversed" : "upright" };
  if (!isReversed) {
    profile.annualTheme = seed.theme;
    profile.annualAdvice = seed.advice;
    profile.premiumText = `${seed.nameKo} 카드는 올해의 흐름을 한 번에 확정하는 표식이 아니라, ${seed.theme}이라는 흐름을 현실에서 연습하게 하는 기준입니다. ${seed.light} ${seed.shadow} ${seed.advice}`;
  } else {
    const [theme, advice, shadow] = REVERSED_ADJUSTMENTS[code] || [];
    profile.annualTheme = theme || `${seed.theme}의 조건을 다시 점검하는 해`;
    profile.light = advice || seed.advice;
    profile.shadow = shadow || seed.shadow;
    profile.annualAdvice = advice || seed.advice;
    profile.money = `금전에서는 ${seed.money.replace(/[.。]$/, "")} 다만 새로운 확장보다 이미 열린 지출과 계약을 줄이는 편이 안전합니다.`;
    profile.career = `일에서는 ${seed.career.replace(/[.。]$/, "")} 다만 역할과 마감의 누수를 먼저 정리해야 다음 기회를 받을 수 있습니다.`;
    profile.love = `연애에서는 ${seed.love.replace(/[.。]$/, "")} 다만 기대와 확인된 행동을 분리해 속도를 조절하세요.`;
    profile.relationship = `관계에서는 ${seed.relationship.replace(/[.。]$/, "")} 다만 책임을 혼자 떠안지 않는 경계가 필요합니다.`;
    profile.health = `건강에서는 ${seed.health.replace(/[.。]$/, "")} 다만 회복을 미루게 만드는 생활 습관부터 줄이세요.`;
    profile.premiumText = `${seed.nameKo} 역방향은 ${theme || "기존 흐름의 재점검"}을 보여 줍니다. ${seed.shadow} ${shadow || "확인 가능한 조건을 나누어 보면 회복의 순서가 보입니다."} ${advice || seed.advice}`;
  }
  profile.theme = profile.annualTheme;
  profile.basicMeaning = `${profile.nameKo} 카드는 ${profile.annualTheme}을 상징합니다.`;
  profile.brightSide = profile.light;
  profile.shadowSide = profile.shadow;
  profile.moneyMeaning = profile.money;
  profile.careerMeaning = profile.career;
  profile.relationshipMeaning = `${profile.love} ${profile.relationship}`;
  profile.healthMeaning = profile.health;
  profile.bestUse = profile.annualAdvice;
  profile.avoidAttitude = profile.avoid;
  return profile;
}

function getAnnualCardProfile(cardCode, orientation = "upright") {
  const code = String(cardCode || "").toUpperCase();
  return buildCardProfile(code, orientation) || {
    nameKo: "타로 카드", nameEn: code, keywords: ["현실 점검", "선택", "흐름"], orientation,
    annualTheme: "일상의 선택이 한 해의 방향을 만드는 흐름", light: "작은 신호를 현실 행동으로 옮길 여지가 있습니다.", shadow: "확인 전 결론을 서두르면 선택의 질이 낮아질 수 있습니다.",
    money: "지출과 수익의 조건을 기록할수록 금전 흐름이 선명해집니다.", career: "작은 결과를 반복 가능한 방식으로 정리하면 일의 방향이 보입니다.", love: "감정과 사실을 나누어 볼 때 관계의 속도를 조절할 수 있습니다.", relationship: "약속과 경계를 말로 확인해야 신뢰가 쌓입니다.", health: "생활 리듬을 일정하게 유지하는 것이 회복의 바탕입니다.", advice: "이번 달에 확인할 행동 하나를 정하세요.", avoid: "불안에 휩쓸린 큰 결정을 피하세요.", annualAdvice: "확인 가능한 행동 하나로 흐름을 현실에 고정하세요.", premiumText: "카드의 상징을 현실 조건과 함께 읽어 보세요.",
  };
}

function getZodiacProfile(animal) {
  return ZODIAC_YEAR_PROFILES.find((profile) => profile.animal === animal) || ZODIAC_YEAR_PROFILES[0];
}

function hashSeed(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822519);
    state = Math.imul(state ^ (state >>> 13), 3266489917);
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296;
  };
}

function drawPremiumYearCards({ seed = "", year } = {}) {
  const random = seededRandom(`${seed}|${year || ""}|tarot-year-fortune`);
  const majorCards = TAROT_CARDS.filter((card) => card.arcana === "major").slice();
  for (let index = majorCards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [majorCards[index], majorCards[swapIndex]] = [majorCards[swapIndex], majorCards[index]];
  }
  return majorCards.slice(0, 12).map((card, index) => {
    const orientation = random() < 0.22 ? "reversed" : "upright";
    const images = buildImageCandidates(card.code);
    return {
      cardId: card.code,
      id: card.id,
      name: card.nameEn,
      nameEn: card.nameEn,
      nameKr: card.nameKo,
      nameKo: card.nameKo,
      position: `month_${index + 1}`,
      positionKey: `month_${index + 1}`,
      orientation,
      imageKey: card.imageKey || card.code.toLowerCase(),
      imageUrl: images[0],
      imageCandidates: images,
      proxyImageUrl: "",
      localImageUrl: images[0],
      keywords: card.keywords.slice(0, 5),
    };
  });
}

export { ZODIAC_YEAR_PROFILES, YEAR_PHASES, MAJOR_ANNUAL_SEEDS, getAnnualCardProfile, getZodiacProfile, drawPremiumYearCards, hashSeed };

