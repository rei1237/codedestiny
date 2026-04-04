/**
 * LoveSecretService — 연애 비책: 운명의 설계도
 * 사주팔자 기반 10대분류 맞춤형 연애 전략 엔진
 * Cost: 200코인 (영구 해금)
 * (C) CODE:DESTINY
 */
(function (global) {
  'use strict';

  /* =====================================================================
     0. 공통 데이터 테이블
     ===================================================================== */

  var GAN_KO = { '甲': '갑(甲)', '乙': '을(乙)', '丙': '병(丙)', '丁': '정(丁)',
    '戊': '무(戊)', '己': '기(己)', '庚': '경(庚)', '辛': '신(辛)',
    '壬': '임(壬)', '癸': '계(癸)' };
  var GAN_EL = { '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water' };
  var ZHI_EL = {
    '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
    '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
    '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water'
  };
  var ZHI_ANIMAL = {
    '子': '쥐', '丑': '소', '寅': '호랑이', '卯': '토끼',
    '辰': '용', '巳': '뱀', '午': '말', '未': '양',
    '申': '원숭이', '酉': '닭', '戌': '개', '亥': '돼지'
  };
  var EL_KO = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
  var EL_COLOR = { wood: '#22c55e', fire: '#ef4444', earth: '#d97706', metal: '#94a3b8', water: '#3b82f6' };

  /* =====================================================================
     1. 일간별 연애 본능 & 십성 연애 스타일 DB
     ===================================================================== */

  var ILGAN_LOVE = {
    '甲': {
      title: '갑목(甲木) — 개척하는 사랑꾼',
      instinct: '연애의 주도권을 자연스럽게 쥐고 싶어합니다. 목표를 향해 일직선으로 나아가는 것처럼 좋아하는 사람에게 직진하는 스타일이지만, 직진 후 관리는 잘 안 되는 것이 약점입니다.',
      unconscious: '무의식 깊은 곳에 "내가 지켜야 할 존재"를 찾고 있습니다. 연약하거나 도움이 필요한 상대에게 보호본능이 폭발하며, 이것이 첫사랑의 구조가 됩니다.',
      selfEsteem: '칭찬과 인정에 연애 에너지가 즉시 충전됩니다. 반면 무시나 배신을 당하면 잘 회복하지 못하며, 조용히 마음의 문을 닫아버리는 경향이 있습니다.',
      mbti: { type: 'ENTJ/ENFJ형', desc: '목표지향적이고 리더십 있는 연애를 추구합니다. 관계에서도 방향을 제시하고 끌어가는 역할을 자처합니다.' },
      flirt: ['자랑스러운 성과를 자연스럽게 어필하면 효과적', '눈 맞추기: 당신의 눈에는 목표가 있어 보여 매력적', '관심사를 묻고 함께 도전하는 제안'],
      weakness: '관계가 안정되면 긴장감과 관심이 급격히 줄어 상대가 외로움을 느낍니다. 감정 표현보다 행동으로 사랑을 표현하는 타입.'
    },
    '乙': {
      title: '을목(乙木) — 덩굴 같은 사랑',
      instinct: '먼저 다가가기보다 분위기를 읽고 상대방이 다가오게 만드는 수동형 플러팅을 구사합니다. 상대의 에너지를 흡수하고 방향을 부드럽게 바꾸는 능력이 탁월합니다.',
      unconscious: '"나를 지켜줄 강한 사람"을 무의식적으로 갈망합니다. 표면적으로는 독립적으로 보이지만 사실 누군가의 든든한 울타리 안에서 바람처럼 자유롭고 싶은 욕구가 있습니다.',
      selfEsteem: '외모나 감각적인 부분에 칭찬받을 때 자존감이 올라갑니다. 반면 냉담한 반응이나 무관심은 깊은 상처로 남습니다.',
      mbti: { type: 'INFP/ISFP형', desc: '감성적이고 유연한 연애를 합니다. 상대방의 기분에 민감하게 반응하며 관계의 분위기를 중요시합니다.' },
      flirt: ['섬세한 관찰 후 "그때 이런 거 좋아했잖아요"류 기억 어필', '공감과 경청으로 상대가 먼저 더 많이 말하게 유도', '부드럽고 따뜻한 스킨십 어필'],
      weakness: '우유부단함과 의존성이 관계를 무겁게 만들 수 있습니다. 의사결정을 자꾸 미루거나 상대방에게 미루다 갈등이 쌓입니다.'
    },
    '丙': {
      title: '병화(丙火) — 태양 같은 사랑',
      instinct: '눈에 안 보이면 곧 사라집니다. 좋아하면 온 에너지를 다 쏟아붓는 형이라, 연락 빈도와 관심이 폭발적으로 올라갑니다. "나는 괜찮다면서 사실 제일 좋아하는 스타일"입니다.',
      unconscious: '무의식적으로 모두의 주목을 받고 싶어합니다. 연인이 자신을 가장 우선시해 주고, 세상에서 제일 빛나는 존재라고 느끼게 해줄 때 진짜 행복해집니다.',
      selfEsteem: '자기 자신에 대한 자신감이 높지만, 연인이 다른 사람에게 관심을 주면 즉각 질투심이 발동합니다. 자존심이 셔서 먼저 사과하는 것이 어렵습니다.',
      mbti: { type: 'ESFP/ENFP형', desc: '열정적이고 즉흥적인 연애를 추구합니다. 지금 이 순간의 감정과 즐거움을 최우선시하는 현재형 연애인입니다.' },
      flirt: ['당신 곁에 있을 때 유독 눈이 빛나는 모습을 의도적으로 표현', '크고 밝은 반응으로 상대가 주인공이 된 기분을 주기', '불꽃 같은 에너지로 잊지 못할 경험 선사'],
      weakness: '에너지 소모가 빠릅니다. 감정의 기복이 크고 도달하기 힘든 기대치를 상대방에게 품어 실망과 충격이 주기적으로 옵니다.'
    },
    '丁': {
      title: '정화(丁火) — 촛불 같은 사랑',
      instinct: '한 사람을 작은 불꽃처럼 오랫동안 은은하게 사랑합니다. 화려하지 않지만 깊고 섬세합니다. 상대방의 작은 변화까지 포착하는 예민한 안테나가 있습니다.',
      unconscious: '"나만 알아주는 사람"을 찾습니다. 외면보다 내면을 봐주고, 다른 사람들이 모르는 자신의 진짜 모습을 이해해 주는 파트너를 갈망합니다.',
      selfEsteem: '내면의 기준이 높아서 상대방이 진심인지 아닌지를 민감하게 감별합니다. 한 번 신뢰가 깨지면 회복이 매우 어렵습니다.',
      mbti: { type: 'INFJ/INTJ형', desc: '깊이 있고 신중한 연애를 합니다. 관계의 의미와 방향을 중시하며 가벼운 연애에는 흥미를 잘 느끼지 못합니다.' },
      flirt: ['진지하고 깊이 있는 대화로 지적 매력 발산', '기억력을 발휘해 상대의 소소한 것을 챙기기', '진심이 담긴 글이나 손편지 한 통의 파괴력'],
      weakness: '감정을 표현하는 것에 서툴러 상대방이 답답해합니다. 본인은 최선을 다하는데 표현이 부족해 "관심 없는 사람"으로 오해받습니다.'
    },
    '戊': {
      title: '무토(戊土) — 대산 같은 사랑',
      instinct: '확신이 생기기까지 오랜 시간이 걸리지만, 한번 마음을 주면 흔들리지 않습니다. 연애에서도 든든한 지지자 역할을 자처하며 상대방의 뒷배가 되는 것에 보람을 느낍니다.',
      unconscious: '"나를 전적으로 믿고 의지할 수 있는 관계"를 원합니다. 서로 배신하지 않고 오래가는 안정적인 사랑을 무의식적으로 갈구합니다.',
      selfEsteem: '자존감이 높고 자기 가치를 알지만, 자신의 헌신이 가치를 인정받지 못하면 조용히 그 관계를 정리합니다.',
      mbti: { type: 'ISTJ/ESTJ형', desc: '책임감 있고 안정적인 연애를 추구합니다. 즉흥적인 변화보다는 계획하고 약속을 지키는 관계를 선호합니다.' },
      flirt: ['신뢰감을 주는 안정적인 행동과 약속 이행으로 점수 쌓기', '상대방의 걱정거리를 실질적으로 해결해 주는 능력 어필', '큰 산 같은 묵직한 존재감과 여유 있는 미소'],
      weakness: '변화에 저항하고 고집이 셉니다. 관계가 단조로워지기 쉬우며 상대가 요구하는 감성적 자극이나 설렘을 충족시키는 데 어려움이 있습니다.'
    },
    '己': {
      title: '기토(己土) — 옥토 같은 사랑',
      instinct: '상대방이 성장하고 꽃을 피울 수 있도록 묵묵히 뒷받침해 주는 "성장 지원형" 연애를 합니다. 티 내지 않는 헌신과 세심한 배려가 트레이드마크입니다.',
      unconscious: '"내가 돌볼 수 있는 사람"을 찾습니다. 완벽하거나 강한 사람보다는 어딘가 빈틈이 있어 자신이 채워줄 수 있는 상대에게 깊이 끌립니다.',
      selfEsteem: '자기 자신을 과소평가하는 경향이 있습니다. 상대가 자신을 얼마나 필요로 하는지에 따라 자존감이 오르내리는 구조를 가지고 있어 건강하지 않은 관계에 빠지기 쉽습니다.',
      mbti: { type: 'ISFJ/ESFJ형', desc: '헌신적이고 현실적인 연애자입니다. 상대방의 필요를 미리 파악하고 채워주는 것에 큰 보람을 느낍니다.' },
      flirt: ['상대방이 미처 신경 쓰지 못한 부분을 챙겨주기', '음식 대접, 생활 소품 선물 등 실생활 밀착형 배려 어필', '흔들리지 않는 한결같음으로 신뢰 쌓기'],
      weakness: '희생 과도, 경계선 없는 배려가 자신을 소진시키고 결국 번아웃으로 이어집니다. 주는 것에만 익숙해 받는 것을 불편해합니다.'
    },
    '庚': {
      title: '경금(庚金) — 날선 사랑',
      instinct: '솔직하고 직선적인 표현으로 연애합니다. "좋으면 좋다, 싫으면 싫다"를 분명히 하는 스타일입니다. 연애에서도 게임 없는 정직함을 추구합니다.',
      unconscious: '"나를 그대로 받아들여 줄 수 있는 배짱 있는 사람"을 원합니다. 자신의 솔직함과 날카로움을 겁내지 않고 당당히 대응하는 상대에게 오히려 깊이 끌립니다.',
      selfEsteem: '자존심이 매우 강하고 굽히는 것을 힘들어합니다. 모욕적인 상황에서 관계를 극단적으로 끊어내는 경향이 있습니다.',
      mbti: { type: 'ENTJ/ISTP형', desc: '합리적이고 명확한 연애를 추구합니다. 감정에 치우치기보다는 실용적이고 논리적인 관계를 선호합니다.' },
      flirt: ['자신의 능력과 성과로 당당하게 어필하기', '먼저 명확하게 의도를 전달하는 직진형 고백', '강단 있는 모습과 날카로운 유머로 존재감 각인'],
      weakness: '차갑게 보이기 쉽습니다. 상대방의 감정을 충분히 공감하거나 위로하는 능력이 부족해 정서적 교류가 단절되는 경우가 잦습니다.'
    },
    '辛': {
      title: '신금(辛金) — 보석 같은 사랑',
      instinct: '감각적이고 세련된 연애를 추구합니다. 자신도 아름답고 싶고 상대방도 멋있기를 바랍니다. 첫인상과 분위기를 매우 중시하며 로맨틱한 스테이지 연출을 좋아합니다.',
      unconscious: '"나의 가치를 알아보는 사람"을 갈망합니다. 평범한 칭찬이 아닌, 자신의 섬세함과 독특한 매력을 정확히 알아보고 인정해 주는 사람에게 마음이 열립니다.',
      selfEsteem: '비판에 매우 예민하며 자신의 외모나 감각에 상처를 주는 말은 오래 기억합니다. 완벽주의적 경향으로 스스로를 끊임없이 채찍질하기도 합니다.',
      mbti: { type: 'INFJ/ISFJ형', desc: '세련되고 깊이 있는 연애를 합니다. 피상적인 관계보다는 취향이 맞고 심미적으로 통하는 파트너를 선호합니다.' },
      flirt: ['섬세하게 준비한 서프라이즈나 디테일로 감동 주기', '상대방의 아름다움을 구체적으로, 진심으로 표현하기', '독특하고 감각적인 장소나 콘텐츠로 데이트 연출'],
      weakness: '완벽주의와 예민함이 상대방을 지치게 합니다. 사소한 것에도 상처받고, 그 상처를 말로 표현하지 못하고 혼자 끙끙 앓는 경향이 있습니다.'
    },
    '壬': {
      title: '임수(壬水) — 대해 같은 사랑',
      instinct: '자유롭고 지적인 연애를 추구합니다. 상대방의 지적 능력이나 세계관에 먼저 매력을 느끼며, 끊임없이 대화가 가능한 상대를 원합니다.',
      unconscious: '"나를 지루하지 않게 만들 수 있는 사람"을 무의식적으로 찾습니다. 호기심을 자극하고 새로운 세계를 보여주는 상대에게 강하게 끌립니다.',
      selfEsteem: '자유를 구속받으면 즉각 반발합니다. 연애 중에도 나만의 공간과 시간을 확보하지 못하면 심리적 질식감을 느낍니다.',
      mbti: { type: 'ENTP/INTP형', desc: '지적이고 자유로운 연애를 합니다. 틀에 박힌 연애 방식을 거부하며 끊임없이 새로운 자극과 변화를 원합니다.' },
      flirt: ['예상치 못한 시각과 심오한 대화로 지적 호기심 자극', '자유로운 분위기 속에서 압박 없이 천천히 다가가기', '넓고 깊은 지식과 경험담으로 탐험의 설렘 선사'],
      weakness: '책임감 없는 자유 추구, 관심이 분산되어 상대방이 자신을 우선순위에 두지 않는다고 느낍니다. 시작은 강하지만 지속성이 부족합니다.'
    },
    '癸': {
      title: '계수(癸水) — 이슬 같은 사랑',
      instinct: '감성이 풍부하고 예민하여 상대방의 미세한 감정 변화까지 감지합니다. 상대의 아픔을 자신의 아픔처럼 느끼는 공감 능력이 탁월하여 최고의 위로자가 됩니다.',
      unconscious: '"나의 감성을 이해하고 함께 느낄 수 있는 사람"을 찾습니다. 논리보다 감성으로 교류하고, 말하지 않아도 통하는 교감을 갈망합니다.',
      selfEsteem: '우울감과 감상에 빠지기 쉽습니다. 이별의 상처가 매우 깊고 오래 남으며, 혼자 감정을 소화하는 데 상당한 시간이 필요합니다.',
      mbti: { type: 'INFP/ISFP형', desc: '감성적이고 깊이 있는 연애자입니다. 상대방과의 감정적 연결을 가장 중요시하며 관계의 진정성에 집착합니다.' },
      flirt: ['세심한 감수성으로 상대의 감정을 먼저 알아채 주기', '감동적인 이야기나 음악, 영화 등 감성 콘텐츠로 교감', '꾸준하고 따뜻한 메시지로 존재를 각인시키기'],
      weakness: '감정의 파고가 크고 우유부단합니다. 자신의 감정을 직접 말하지 못하고 간접적으로만 표현하다 오해와 엇갈림이 생깁니다.'
    }
  };

  /* =====================================================================
     2. 오행 & 지지별 이상형 / 배우자궁 분석
     ===================================================================== */

  var ILJI_PARTNER = {
    '甲子': { exterior: '차갑고 독특한 밤의 분위기, 지적이고 신비로운 첫인상', personality: '해박한 지식과 독립적인 사고를 가진 그 누구에게도 의존하지 않는 사람', challenge: '감정 표현에 서툴 수 있어 소통이 어려울 수 있음' },
    '甲午': { exterior: '화려하고 당당한 존재감, 눈에 띄는 열정적 아우라', personality: '강한 카리스마와 추진력을 가진 리더형, 두 사람 모두 강해 갈등도 강렬함', challenge: '두 강한 기운의 충돌 — 서로 존중과 양보가 성공의 열쇠' },
    '甲寅': { exterior: '당당하고 자신감 넘치는 대범한 인상', personality: '갑목과 인목이 겹쳐 더욱 강한 추진력과 독립심, 경쟁심도 강함', challenge: '고집 대 고집 — 유연성을 의도적으로 키워야 함' },
    '甲辰': { exterior: '안정적이고 든든한 호인 분위기', personality: '현실적이고 포용력 있는 대지 같은 상대, 갑목의 성장을 뒷받침해 주는 파트너', challenge: '지루함의 함정 — 새로운 자극으로 설렘 유지 필요' },
    '乙丑': { exterior: '차분하고 성실한 인상, 실용적인 매력', personality: '을목이 기댈 수 있는 묵직한 보호자 기운을 가진 사람', challenge: '변화에 대한 저항으로 을목의 자유로움이 억눌릴 수 있음' },
    '乙未': { exterior: '부드럽고 섬세한 인상, 따뜻한 눈빛', personality: '공감 능력이 뛰어나고 감수성 높은, 함께 있으면 편안한 사람', challenge: '우유부단한 두 기운이 만나 결정장애 커플이 될 수 있음' },
    '乙卯': { exterior: '자연스럽고 편안한 청순한 매력', personality: '순수하고 따뜻한 마음씨, 경쟁보다 협력을 선호하는 스타일', challenge: '너무 비슷해 서로의 약점을 그대로 공유하는 구조' },
    '乙酉': { exterior: '세련되고 깔끔한 도시적인 미모', personality: '완벽주의적이고 감각적인 그, 을목의 감성에 예리한 피드백을 줌', challenge: '금극목(金剋木) — 비판하는 상대에게 상처받기 쉬움' },
    '丙子': { exterior: '시크하고 지적인 반전 매력의 소유자', personality: '병화의 열정을 차갑게 식혀주는 수기의 상대, 의외의 균형을 이룸', challenge: '수극화(水剋火) 에너지 — 자신의 빛이 꺼진 것 같은 억눌림 주의' },
    '丙午': { exterior: '눈부신 존재감, 쉽게 잊히지 않는 강렬한 첫인상', personality: '쌍방이 모두 태양 같은 에너지 — 사랑의 온도가 폭발적', challenge: '간여지동(干與支同) — 비슷한 기운의 충돌과 경쟁' },
    '丙寅': { exterior: '당당하고 매력적인 존재감', personality: '따뜻하고 추진력 있는 리더형 상대, 함께할수록 더 빛나는 관계', challenge: '서로 주인공이 되려 하면 무대가 비좁아짐' },
    '丙申': { exterior: '시원하고 도시적인 매력', personality: '이성적이고 실용적인 상대로 병화의 충동에 브레이크 역할', challenge: '화극금(火剋金)처럼 서로 불편한 긴장감이 형성될 수 있음' },
    '丁亥': { exterior: '깊고 신비로운 눈빛, 조용한 카리스마', personality: '지혜롭고 깊은 상대로 정화의 내면을 탐구해 주는 파트너', challenge: '수극화(水剋火) 에너지 — 오래 있으면 소진감 주의' },
    '丁卯': { exterior: '부드럽고 감성적인 따뜻한 인상', personality: '섬세하고 예술적 감성의 소유자, 정화의 촛불을 함께 지켜주는 동반자', challenge: '비슷한 감성끼리 만나 공감 과잉, 현실적 조언이 빠져 표류할 수 있음' },
    '丁酉': { exterior: '정돈되고 세련된 완벽주의 아우라', personality: '날카롭고 정확한 눈으로 나의 진짜 가치를 알아봐 주는 상대', challenge: '신금(辛金)의 차가운 평가가 정화의 예민함을 건드릴 수 있음' },
    '丁丑': { exterior: '안정적이고 신뢰감 있는 든든한 인상', personality: '기토(己土)의 실질적인 배려와 현실감각이 정화의 이상주의를 보완', challenge: '너무 안정적이어서 설렘과 긴장감이 부족해질 수 있음' },
    '戊午': { exterior: '태양같이 빛나고 밝은 에너지', personality: '적극적이고 따뜻한 화기(火氣)의 상대로 무토에게 활력을 불어넣음', challenge: '화생토(火生土) — 의존적 관계로 변할 수 있음' },
    '戊子': { exterior: '차분하고 지적인 분위기', personality: '무토의 안정감과 수기의 지혜가 결합한 강력한 팀워크 케미', challenge: '토극수(土剋水) — 통제와 자유의 줄다리기' },
    '戊戌': { exterior: '무게감 있고 카리스마 넘치는 인상', personality: '간여지동처럼 비슷한 무토 기운, 강한 팀이지만 고집 충돌', challenge: '상하 관계가 형성되지 않으면 평행선을 달림' },
    '戊申': { exterior: '깔끔하고 단정한 신뢰감 있는 외모', personality: '경금(庚金)의 추진력이 무토에게 방향성을 부여, 실용적인 커플', challenge: '토생금(土生金) — 주기만 하는 관계가 될 수 있음' },
    '己巳': { exterior: '따뜻한 눈빛, 부드럽고 사람 끌리는 분위기', personality: '화생토(火生土) — 기토를 지지해 주는 활력 있는 파트너', challenge: '바쁜 상대에게 지치는 기토의 희생 패턴 주의' },
    '己未': { exterior: '자연스럽고 다정한 인상', personality: '간여지동 기운 — 비슷한 가치관과 생활 패턴', challenge: '너무 비슷해 발전적 자극이 부족' },
    '己卯': { exterior: '순수하고 따뜻한 청춘 분위기', personality: '목생화로 이어지는 성장 에너지, 꿈을 응원하고 같이 성장하는 관계', challenge: '목극토(木剋土) — 강압적이거나 지배적인 구도 주의' },
    '己酉': { exterior: '차분하고 안정감 있는 완숙미', personality: '기토가 생해 주는 신금의 매력, 헌신과 인정의 교환 구도', challenge: '기토가 지나치게 희생하는 구조 주의' },
    '庚寅': { exterior: '야성적이고 자유로운 분위기', personality: '인목(寅木)의 활기와 경금의 결단력이 만나는 역동적 관계', challenge: '금극목(金剋木) — 강압이 아닌 방향 제시로 가야 함' },
    '庚辰': { exterior: '든든하고 믿음직한 안정감', personality: '토생금(土生金) — 경금을 지지하는 실용적인 파트너', challenge: '변화를 싫어하는 두 기운이 만나 정체될 수 있음' },
    '庚申': { exterior: '시원하고 날카로운 인상', personality: '간여지동 — 목표 지향적인 두 강자의 만남', challenge: '경쟁 심리 과잉으로 협력보다 대립 구도 주의' },
    '庚午': { exterior: '당당하고 열정적인 이성적 매력', personality: '화기(火氣)의 정열이 경금을 녹여 온도를 높이는 관계', challenge: '화극금(火剋金) — 감정과 이성의 충돌' },
    '辛亥': { exterior: '지적이고 신비로운 눈빛', personality: '임수(壬水)의 자유로운 정신이 신금의 감각을 자극하는 파트너', challenge: '금생수(金生水) — 주기만 하다 소진될 수 있음' },
    '辛丑': { exterior: '단정하고 우아한 완숙미', personality: '믿음직하고 현실적인 기토의 지원이 신금의 완벽주의를 보완', challenge: '지나친 현실론이 신금의 감수성을 억누를 수 있음' },
    '辛卯': { exterior: '자연스럽고 청순한 아름다움', personality: '을목(乙木)의 부드러운 감성이 신금의 예민함을 감싸 안는 관계', challenge: '금극목(金剋木) — 무의식적 지배 구도가 형성될 수 있음' },
    '辛酉': { exterior: '세련되고 완벽한 도시적 미감', personality: '간여지동 완벽주의 커플 — 두 사람의 기준이 높아 진입 장벽도 높음', challenge: '완벽주의끼리의 충돌, 비판과 상처의 교환' },
    '壬申': { exterior: '세련되고 분석적인 도시적 매력', personality: '금생수(金生水) — 경금이 임수에게 구조와 방향을 제시', challenge: '임수의 자유로움이 경금의 틀에 갇힌 느낌' },
    '壬子': { exterior: '깊고 차가운 지적 아우라', personality: '간여지동 — 지적 시너지 폭발, 두 사람이 서로를 가장 잘 이해', challenge: '현실 감각 부족, 둘 다 감정 표현이 서툴러 소통 부재' },
    '壬寅': { exterior: '도전적이고 진취적인 매력', personality: '수생목(水生木) — 임수가 인목을 성장시키는 지원자 관계', challenge: '임수가 일방적으로 주는 구도 주의' },
    '壬午': { exterior: '압도적인 카리스마와 밝은 에너지', personality: '정반대의 매력이 서로를 끌어당기는 수화기제(水火旣濟) 케미', challenge: '수극화(水剋火) — 임수의 이성이 병화의 열정을 억누를 수 있음' },
    '癸巳': { exterior: '따뜻하고 매력적인 에너지', personality: '화기가 계수에게 따뜻함과 용기를 주는 관계', challenge: '수극화(水剋火) — 두 에너지의 갈등, 계수는 소진될 수 있음' },
    '癸未': { exterior: '부드럽고 자연스럽게 스며드는 매력', personality: '기토가 계수를 포용하는 온화한 보호 관계', challenge: '토극수(土剋水) — 계수의 감성이 억눌리는 구도 주의' },
    '癸亥': { exterior: '깊고 신비로운 눈빛', personality: '간여지동 — 감성과 직관의 완벽한 공명', challenge: '현실 감각이 양쪽 다 부족해 삶이 표류할 수 있음' },
    '癸酉': { exterior: '정갈하고 세련된 순수미', personality: '금생수(金生水) — 신금이 계수에게 구조와 원칙을 선물', challenge: '신금의 비판이 계수의 예민한 감성을 상처 입힐 수 있음' }
  };

  /* =====================================================================
     3. 오행별 이상형 특징
     ===================================================================== */

  var YONGSHIN_PARTNER = {
    wood: {
      element: '목(木)',
      exterior: '생기 넘치고 활동적인 인상. 건강하고 자연스러운 매력을 가진 사람.',
      personality: '성장을 같이 도모하고 서로를 응원하는 파트너십 스타일. 꿈과 목표가 있는 사람.',
      job: '교육계, 스타트업, 창작 분야, 의료·복지',
      style: '청록 계열 컬러를 즐기고 자연스러운 분위기를 선호하는 사람',
      avoidType: '지나치게 억제적이거나 금기를 강조하는 완고한 타입(금 과다)'
    },
    fire: {
      element: '화(火)',
      exterior: '존재감 있고 밝으며 분위기를 주도하는 인상. 에너지가 넘치는 사람.',
      personality: '열정적이고 낙천적이며 어디서나 빛나는 사람. 리더십과 표현력이 강함.',
      job: '미디어, 연예계, 마케팅, 리더십 직군',
      style: '붉고 따뜻한 컬러를 선호하며 활동적인 라이프스타일',
      avoidType: '차갑고 감정을 억압하는 냉정한 타입(수 과다)'
    },
    earth: {
      element: '토(土)',
      exterior: '안정적이고 듬직한 인상. 신뢰감이 가는 외모와 차분한 분위기.',
      personality: '현실적이고 포용력 있으며 변함없이 곁을 지켜주는 사람.',
      job: '금융, 부동산, 공무원, 농업·요식업',
      style: '황토색·베이지 컬러를 선호하며 실용적인 스타일',
      avoidType: '끊임없이 변화와 자극을 요구하는 불안정한 타입(목 과다)'
    },
    metal: {
      element: '금(金)',
      exterior: '세련되고 날카로운 인상. 정확하고 원칙적인 자태.',
      personality: '신뢰할 수 있고 원칙이 있으며 결단력 있는 실용주의 파트너.',
      job: '법률, 금융, IT, 의공학, 군경',
      style: '화이트·실버 컬러를 선호하며 정돈된 미니멀 스타일',
      avoidType: '충동적이고 감정 기복이 심한 타입(화 과다)'
    },
    water: {
      element: '수(水)',
      exterior: '지적이고 깊은 눈빛. 베일에 싸인 신비로운 인상.',
      personality: '통찰력과 지혜를 갖춘 사람. 대화가 깊고 감성이 풍부한 파트너.',
      job: '학문, 연구, 철학, 심리상담, 예술 분야',
      style: '네이비·딥블루 계열을 선호하며 사색적인 분위기',
      avoidType: '통제적이고 억압적인 타입(토 과다)'
    }
  };

  /* =====================================================================
     4. 신살 & 연애 리스크 DB
     ===================================================================== */

  var LOVE_RISK = {
    high_tao: {
      title: '도화살(桃花殺) 과잉 리스크',
      risk: '매력이 넘쳐 여러 사람에게 관심을 분산시키고, 상대방에게 불안감("나 외에 다른 사람에게도 이럴것 같다")을 심어줄 수 있습니다.',
      solution: '특정 상대에게 유독 더 집중하는 시그널을 의도적으로 발신해야 합니다. "당신만 특별합니다"라는 메시지를 행동으로 반복하세요.',
      karma: '과거 생에서 사랑을 무기처럼 사용한 업보. 이번 생애 진정한 한 사람에게 헌신하는 것이 해소의 길입니다.'
    },
    high_yeokma: {
      title: '역마살(驛馬殺) 연애 리스크',
      risk: '정착하지 못하는 기운 때문에 관계가 무르익을 타이밍에 떠나거나, 상대방이 먼저 떠나는 이별 패턴이 반복됩니다.',
      solution: '한 사람과 충분히 깊어지는 경험을 의도적으로 선택하세요. 물리적 이동보다 한 공간에서 감정적 모험을 하는 것이 진정한 역마의 승화입니다.',
      karma: '전생의 방랑자. 이번 생애 "뿌리를 내리는 사랑"이 최고의 과제입니다.'
    },
    high_hwa: {
      title: '화개살(華蓋殺) 고독 리스크',
      risk: '이상향이 높고 현실 연애가 그것에 미치지 못한다고 느껴 자발적 고독을 선택하는 경향이 있습니다. 상대방과 진짜 깊이 연결되기 전에 스스로 차단벽을 세웁니다.',
      solution: '완벽한 상대를 기다리는 것을 멈추고 "충분히 좋은 사람"을 받아들이는 연습이 필요합니다. 묵상이나 명상으로 이상과 현실의 갭을 좁히세요.',
      karma: '전생의 수도자. 이번 생에 세상과 깊이 연결되는 것이 당신의 영적 과제입니다.'
    },
    gwimunkwan: {
      title: '귀문관살(鬼門關殺) 집착 리스크',
      risk: '귀문관살의 영향으로 연애에서 강박적인 생각과 집착이 발생할 수 있습니다. 상대방의 행동에 과도한 의미를 부여하거나, 관계에서 비합리적인 공포와 불안을 느낍니다.',
      solution: '명상, 일기 쓰기, 심리 상담을 통해 자신의 내면 목소리를 객관화하는 훈련이 필수입니다. 영적 수련이 귀문관살 에너지를 순화시키는 데 효과적입니다.',
      karma: '전생의 집착 패턴이 이번 생에 이어지는 것. 자유를 주는 사랑을 연습하세요.'
    },
    gasraito: {
      title: '가스라이팅 취약성',
      risk: '관성(官星)이 매우 강하거나 일간이 신약한 경우, 상대방의 권위나 통제에 순응하는 경향이 강해 가스라이팅에 취약합니다. 본인이 틀렸다는 말에 쉽게 흔들립니다.',
      solution: '자신의 감정과 판단을 신뢰하는 연습이 필요합니다. "내 느낌이 틀리지 않았다"는 확언을 매일 반복하고, 경계를 세우는 단호한 표현을 연습하세요.',
      karma: '자신의 빛을 타인에게 양도한 패턴의 반복. 이번 생에 자신의 주권을 되찾는 것이 핵심 과제입니다.'
    }
  };

  /* =====================================================================
     5. 대운 연애 타이밍 DB
     ===================================================================== */

  var DAEWUN_LOVE_FLOW = {
    wood: '목운(木運) 대운 — 새로운 시작과 만남의 에너지. 이 대운에 처음 보는 사람과 인연이 맺어질 가능성이 가장 높습니다. 특히 봄(3~5월)에 인연이 시작됩니다.',
    fire: '화운(火運) 대운 — 연애 에너지가 최고조에 달하는 시기. 열정적인 만남이 많고 관계가 빠르게 발전합니다. 단, 충동적 결정 주의.',
    earth: '토운(土運) 대운 — 안정과 결실의 에너지. 이 대운에 만난 사람이 장기적 파트너가 될 가능성이 높습니다. 결혼을 고려할 시기.',
    metal: '금운(金運) 대운 — 관계를 정리하고 기준을 높이는 시기. 결단이 필요한 관계가 정리되거나 완성됩니다.',
    water: '수운(水運) 대운 — 내면 탐구와 감성 성장의 시기. 감성적으로 깊어지며 진정 원하는 사람이 무엇인지 명확해집니다.'
  };

  /* =====================================================================
     6. 월별 연애 운 DB (천간 기반)
     ===================================================================== */

  var MONTHLY_LOVE_SCORE = {
    '甲': [60, 70, 85, 55, 75, 90, 65, 80, 70, 55, 75, 85],
    '乙': [65, 80, 70, 90, 60, 75, 85, 55, 70, 80, 60, 75],
    '丙': [70, 60, 90, 80, 55, 85, 75, 90, 60, 70, 80, 55],
    '丁': [75, 85, 65, 70, 90, 55, 80, 70, 85, 60, 75, 80],
    '戊': [80, 65, 75, 85, 70, 60, 90, 75, 55, 85, 65, 70],
    '己': [55, 75, 80, 65, 85, 70, 60, 90, 75, 70, 80, 65],
    '庚': [85, 60, 70, 80, 65, 75, 55, 65, 90, 75, 60, 80],
    '辛': [70, 80, 55, 75, 80, 65, 75, 60, 80, 90, 70, 65],
    '壬': [60, 75, 80, 60, 75, 80, 65, 75, 70, 65, 90, 75],
    '癸': [75, 65, 60, 75, 60, 85, 80, 65, 75, 80, 65, 90]
  };
  var MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  /* =====================================================================
     7. 섹슈얼 에너지 DB
     ===================================================================== */

  var SEXUAL_DB = {
    highFire: {
      energy: '사주에 화기(火氣)가 강합니다. 성적 에너지가 매우 활발하고 열정적입니다.',
      style: '주도적이고 즉흥적인 스타일을 선호합니다. 불꽃 같은 짧은 순간의 강렬함에 쾌락을 느낍니다.',
      hidden: '표면적으로는 개방적으로 보이지만 실제로는 마음이 움직이지 않으면 문을 열지 않습니다. 마음의 연결이 우선입니다.',
      enhance: '향초, 붉은 계열 조명, 열정적인 음악이 분위기를 고조시킵니다.'
    },
    highWater: {
      energy: '사주에 수기(水氣)가 강합니다. 감각이 매우 발달해 있으며 깊이 있는 관능미가 있습니다.',
      style: '서두르지 않고 느린 탐구를 즐깁니다. 감각적인 전희와 분위기가 클라이맥스보다 중요할 수 있습니다.',
      hidden: '수면 아래의 깊은 욕망을 가지고 있습니다. 신뢰하는 상대에게만 진짜 자신을 보여줍니다.',
      enhance: '물소리, 어둡고 신비로운 분위기, 향기 좋은 오일 마사지가 감각을 열어줍니다.'
    },
    highWood: {
      energy: '목기(木氣)가 강합니다. 자연스럽고 활기찬 에너지로 건강한 성적 활력이 있습니다.',
      style: '솔직하고 자연스러운 표현을 선호합니다. 자유로운 분위기에서 가장 빛납니다.',
      hidden: '보호받고 싶은 욕구와 지켜주고 싶은 욕구가 공존합니다.',
      enhance: '자연 속 공간, 야외 분위기, 싱그럽고 허브향 나는 아로마가 에너지를 끌어올립니다.'
    },
    highMetal: {
      energy: '금기(金氣)가 강합니다. 절제된 매력과 정밀한 접근으로 강한 섹슈얼 텐션을 만듭니다.',
      style: '완벽한 세팅과 분위기를 선호합니다. 즉흥보다 준비된 상황에서 최고의 퍼포먼스가 나옵니다.',
      hidden: '겉으로는 차갑지만 내면에 강한 강도의 욕망이 있습니다. 신뢰하는 상대에게 완전히 다른 모습을 보여줍니다.',
      enhance: '세련된 공간, 재즈나 클래식 음악, 실버·화이트 계열 침구가 감각을 자극합니다.'
    },
    highEarth: {
      energy: '토기(土氣)가 강합니다. 안정적이고 포용적인 성적 에너지로 상대방을 편안하게 만드는 능력이 있습니다.',
      style: '서두르지 않고 천천히 신뢰를 쌓으며 깊어지는 스타일입니다.',
      hidden: '겉보기와 달리 내면에 묵직하고 강렬한 감각적 욕구가 잠재되어 있습니다.',
      enhance: '따뜻하고 편안한 공간, 흙 내음 같은 우디 계열 향수, 황금색·베이지 톤이 분위기를 만듭니다.'
    }
  };

  /* =====================================================================
     8. 개운 처방전 DB
     ===================================================================== */

  var GAEUN_LOVE = {
    wood: {
      bedDir: '동쪽 또는 동남쪽', livingColor: '초록·민트 계열 인테리어 포인트',
      perfume: '포레스트·베르가못·녹차 계열 향수', gem: '에메랄드·모스마노이트·비취',
      food: '신맛 음식 (레몬, 식초, 사과 등), 새싹 채소, 봄나물',
      meditation: '새벽 5~7시 동쪽 창 앞에서 태양광을 받으며 "나는 매일 성장하며 더 나은 사랑을 받을 자격이 있다"를 21회 반복',
      affirmation: '나는 상대방을 위해 자랄 준비가 되어 있고 상대방도 나를 위해 성장할 것이다'
    },
    fire: {
      bedDir: '남쪽', livingColor: '산호·따뜻한 레드·오렌지 포인트 소품',
      perfume: '스파이시·앰버·삼나무 계열 향수', gem: '루비·가넷·레드스피넬',
      food: '쓴맛 음식 (커피, 다크초콜릿, 쑥), 붉은 음식 (체리, 토마토)',
      meditation: '촛불을 켜고 화기의 따뜻함을 느끼며 "나의 열정은 최고의 사랑을 끌어당기는 자석이다"를 11회 반복',
      affirmation: '나는 나의 열정과 빛으로 내 삶의 완벽한 동반자를 끌어당긴다'
    },
    earth: {
      bedDir: '북동쪽 또는 남서쪽', livingColor: '황토·베이지·카멜 톤 인테리어',
      perfume: '우디·패출리·샌달우드 계열 향수', gem: '황수정·호안석·황금색 토파즈',
      food: '단맛 음식 (대추, 호박, 고구마), 뿌리채소',
      meditation: '정오에 땅의 안정감을 느끼며 "나는 흔들리지 않는 사랑의 기반이다"를 9회 반복',
      affirmation: '내 삶의 든든한 기반은 나누면 나눌수록 더 커지는 현재진행형 사랑이다'
    },
    metal: {
      bedDir: '서쪽', livingColor: '화이트·실버·라이트그레이 미니멀 인테리어',
      perfume: '클린·머스크·아이리스 계열 향수', gem: '다이아몬드·수정·백문석',
      food: '매운맛 음식 (생강, 고추), 흰색 음식 (백합, 도라지, 배)',
      meditation: '일몰 시간에 "나는 나의 기준에 완전히 부합하는 사랑을 받을 자격이 있다"를 7회 반복',
      affirmation: '나의 높은 기준은 나에게 어울리는 최고의 파트너를 부르는 신호다'
    },
    water: {
      bedDir: '북쪽', livingColor: '딥블루·네이비·청회색 포인트',
      perfume: '수중·아쿠아·오션·세이지 계열 향수', gem: '아쿠아마린·라피스라줄리·사파이어',
      food: '짠맛 음식 (미역, 다시마, 굴), 검은 음식 (흑임자, 블랙빈, 오징어먹물)',
      meditation: '밤에 흐르는 물 소리를 들으며 "내 감성의 깊이가 곧 나의 가장 강한 연애적 무기다"를 6회 반복',
      affirmation: '나는 깊은 연결과 진정한 상호 이해를 이루는 사랑을 이미 끌어당기고 있다'
    }
  };

  /* =====================================================================
     9. 메인 분석 엔진 — 사주 데이터 → 연애 비책 생성
     ===================================================================== */

  function LoveSecretService(p, natal, johu, G_POWER, G_JONG) {
    if (!p || !p.d) { console.error('[LoveBible] saju data missing'); return; }

    var dg = p.d.g;             // 일간 천간
    var dj = p.d.j;             // 일지
    var mj = p.m.j;             // 월지
    var yj = p.y.j;             // 년지
    var hg = p.h.g;             // 시간
    var dayEl = GAN_EL[dg] || 'earth';
    var dominant = (natal && natal.dominant) ? natal.dominant : dayEl;
    var counts = (natal && natal.counts) ? natal.counts : { wood: 0, fire: 0, earth: 0, metal: 3, water: 0 };
    var total = Math.max(1, counts.wood + counts.fire + counts.earth + counts.metal + counts.water);
    var gender = (typeof GENDER !== 'undefined') ? GENDER : 'M';

    // 신살 계산
    var taoSet = ['子', '午', '卯', '酉'];
    var yeokmaSet = ['寅', '申', '巳', '亥'];
    var hwaSet = ['辰', '戌', '丑', '未'];
    var gwimunSet = [['子', '未'], ['丑', '午'], ['寅', '酉'], ['卯', '申'], ['辰', '亥'], ['巳', '戌']];
    var branches = [p.y.j, p.m.j, p.d.j, p.h.j];

    var taoHit = branches.filter(function (b) { return taoSet.indexOf(b) >= 0; }).length;
    var taoPct = Math.min(100, taoHit * 22 + (taoSet.indexOf(dj) >= 0 ? 25 : 0));

    var yeokmaHit = branches.filter(function (b) { return yeokmaSet.indexOf(b) >= 0; }).length;
    var yeokmaPct = Math.min(100, yeokmaHit * 20 + (yeokmaSet.indexOf(dj) >= 0 ? 20 : 0));

    var hwaHit = branches.filter(function (b) { return hwaSet.indexOf(b) >= 0; }).length;
    var hwaPct = Math.min(100, hwaHit * 22 + (hwaHit >= 2 ? 18 : 0));

    var hasGwimun = gwimunSet.some(function (pair) {
      return (branches.indexOf(pair[0]) >= 0 && branches.indexOf(pair[1]) >= 0);
    });

    // 용신 (희신) 오행 — 억부 기반
    var yongshinEl = dominant;
    if (G_POWER && G_POWER.isStrong) {
      var strong2weak = { wood: 'metal', fire: 'water', earth: 'wood', metal: 'fire', water: 'earth' };
      yongshinEl = strong2weak[dominant] || dominant;
    }

    // 십성 점유 분석 (연애 관련)
    var getTenGod = (typeof window.getTenGod === 'function') ? window.getTenGod : function () { return '식신'; };
    var tsCnt = {};
    [p.y.g, p.y.j, p.m.g, p.m.j, p.d.j, p.h.g, p.h.j].forEach(function (c) {
      var t = getTenGod(dg, c);
      if (t && t !== '?') tsCnt[t] = (tsCnt[t] || 0) + 1;
    });
    var sortedTs = Object.keys(tsCnt).sort(function (a, b) { return tsCnt[b] - tsCnt[a]; });
    var dominantTs = sortedTs[0] || '식신';

    // 월별 연애 지수
    var monthScores = MONTHLY_LOVE_SCORE[dg] || MONTHLY_LOVE_SCORE['甲'];

    // 파트너 DB 조회
    var iljuKey = dg + dj;
    var partnerData = ILJI_PARTNER[iljuKey];
    var yongshinPart = YONGSHIN_PARTNER[yongshinEl] || YONGSHIN_PARTNER.earth;
    var ilganLove = ILGAN_LOVE[dg] || ILGAN_LOVE['甲'];

    // 섹슈얼 프로파일
    var sexProfile;
    if ((counts.fire || 0) / total >= 0.30) sexProfile = SEXUAL_DB.highFire;
    else if ((counts.water || 0) / total >= 0.30) sexProfile = SEXUAL_DB.highWater;
    else if ((counts.wood || 0) / total >= 0.30) sexProfile = SEXUAL_DB.highWood;
    else if ((counts.metal || 0) / total >= 0.30) sexProfile = SEXUAL_DB.highMetal;
    else sexProfile = SEXUAL_DB.highEarth;

    // 개운 처방
    var gaeun = GAEUN_LOVE[dayEl] || GAEUN_LOVE.earth;

    // 신강/신약 연애 팁
    var strengthTip = '';
    if (G_POWER && G_POWER.isStrong) {
      strengthTip = '당신은 신강(身强) 사주입니다. 연애에서 자신의 의견과 에너지가 너무 강해 상대방이 압도당할 수 있습니다. 의도적으로 한 발 물러서고 상대방이 주도할 공간을 주는 것이 관계를 오래 유지하는 비책입니다.';
    } else if (G_POWER) {
      strengthTip = '당신은 신약(身弱) 사주입니다. 연애에서 자신을 지나치게 낮추거나 상대방에게 의존하는 경향이 있습니다. 자신의 가치와 강점을 먼저 인식하고, 동등한 파트너십을 갖출 때 비로소 진정한 사랑이 찾아옵니다.';
    }

    // 결혼 최적 나이 계산 (대운 흐름 기반 간략 추정)
    var birthYear = (p.y && p.y.g) ? 0 : 0;
    var marriageAge = '28~32세 (용신 대운 초입이 최적)';
    if (dominant === 'metal' || dominant === 'water') marriageAge = '30~35세 (신중한 기준을 갖추고 결혼 결정)';
    if (dominant === 'fire') marriageAge = '25~30세 (열정의 시기에 인연이 가장 잘 맺힘)';
    if (dominant === 'wood') marriageAge = '27~33세 (성장과 변화의 시기 속에서 결혼 시기를 잡을 것)';

    // ─── HTML 빌더 ───
    var html = buildLoveBibleHTML({
      dg: dg, dj: dj, mj: mj, dominant: dominant, dayEl: dayEl,
      yongshinEl: yongshinEl, yongshinPart: yongshinPart, dominantTs: dominantTs,
      taoPct: taoPct, yeokmaPct: yeokmaPct, hwaPct: hwaPct, hasGwimun: hasGwimun,
      ilganLove: ilganLove, partnerData: partnerData, tsCnt: tsCnt, sortedTs: sortedTs,
      monthScores: monthScores, sexProfile: sexProfile, gaeun: gaeun,
      strengthTip: strengthTip, marriageAge: marriageAge, gender: gender,
      counts: counts, total: total
    });

    var container = document.getElementById('loveBibleResult');
    if (container) {
      container.innerHTML = html;
      container.style.display = 'block';
      // 월별 차트 렌더링
      setTimeout(function () { renderLoveMonthlyChard(monthScores); }, 100);
    }
  }

  /* =====================================================================
     10. HTML 조립 함수
     ===================================================================== */

  function buildLoveBibleHTML(d) {
    var ilg = GAN_KO[d.dg] || d.dg;
    var ilj = d.dj;
    var domColor = EL_COLOR[d.dayEl] || '#8b5cf6';
    var iljuKey = d.dg + d.dj;
    var animalDj = ZHI_ANIMAL[d.dj] || '';

    function section(num, icon, title, body, locked) {
      var lockClass = locked ? ' lb-section--locked' : '';
      var lockBadge = locked ? '<span class="lb-lock-badge">🔐 이 섹션은 공개된 미리보기입니다</span>' : '';
      return '<section class="lb-section' + lockClass + '" id="lbSec' + num + '">' +
        '<div class="lb-section-hd">' +
          '<span class="lb-section-num">0' + num + '</span>' +
          '<span class="lb-section-icon">' + icon + '</span>' +
          '<h3 class="lb-section-title">' + title + '</h3>' +
          lockBadge +
        '</div>' +
        '<div class="lb-section-body">' + body + '</div>' +
      '</section>';
    }

    function tag(text, color) {
      return '<span class="lb-tag" style="border-color:' + (color || '#8b5cf6') + ';color:' + (color || '#8b5cf6') + '">' + text + '</span>';
    }

    function card(title, content, accent) {
      var ac = accent || '#6d28d9';
      return '<div class="lb-card" style="border-left-color:' + ac + '">' +
        '<div class="lb-card-title" style="color:' + ac + '">' + title + '</div>' +
        '<div class="lb-card-body">' + content + '</div>' +
        '</div>';
    }

    function highlight(text) {
      return '<span class="lb-hl">' + text + '</span>';
    }

    function statBar(label, pct, color) {
      return '<div class="lb-stat-row">' +
        '<span class="lb-stat-label">' + label + '</span>' +
        '<div class="lb-stat-track"><div class="lb-stat-fill" style="width:' + pct + '%;background:' + (color || '#a855f7') + '"></div></div>' +
        '<span class="lb-stat-pct">' + pct + '%</span>' +
        '</div>';
    }

    /* ─── 섹션 1: 본연의 연애 자아 ─── */
    var sec1 = '';
    sec1 += '<div class="lb-hero-badge" style="background:' + domColor + '">' + ilg + ' 일간 — ' + d.ilganLove.title + '</div>';
    sec1 += card('💡 연애 본능', d.ilganLove.instinct, domColor);
    sec1 += card('🌙 무의식적 욕구', d.ilganLove.unconscious, '#7c3aed');
    sec1 += card('💔 연애 자존감의 근원', d.ilganLove.selfEsteem, '#db2777');
    sec1 += '<div class="lb-mbti-wrap">' +
      '<div class="lb-mbti-badge">' + d.ilganLove.mbti.type + '</div>' +
      '<p class="lb-mbti-desc">' + d.ilganLove.mbti.desc + '</p>' +
    '</div>';
    sec1 += '<div class="lb-weakness-box">⚠️ <strong>연애 아킬레스건:</strong> ' + d.ilganLove.weakness + '</div>';

    /* ─── 섹션 2: 치명적 매력과 페로몬 ─── */
    var sec2 = '';
    sec2 += '<div class="lb-stat-board">';
    sec2 += statBar('🌸 도화살 (이성 흡인력)', d.taoPct, '#ec4899');
    sec2 += statBar('🌪️ 역마살 (자유·모험성)', d.yeokmaPct, '#f59e0b');
    sec2 += statBar('🔮 화개살 (신비·깊이)', d.hwaPct, '#8b5cf6');
    sec2 += '</div>';

    var charmClass = '';
    if (d.taoPct >= 60) { charmClass = card('🌹 당신의 매력 클래스', '<strong>치명적 도화형</strong> — 원하지 않아도 이성이 자동으로 모여듭니다. 이 매력은 당신의 최강 무기입니다. 단, 진정성 없는 어어가 많아 보이지 않도록 경계해야 합니다.', '#ec4899'); }
    else if (d.yeokmaPct >= 60) { charmClass = card('🌪️ 당신의 매력 클래스', '<strong>자유로운 탐험가형</strong> — 역동적인 에너지와 새로운 경험이 당신의 매력입니다. 멈추는 순간 매력이 반감됩니다.', '#f59e0b'); }
    else if (d.hwaPct >= 60) { charmClass = card('🔮 당신의 매력 클래스', '<strong>베일에 싸인 철학자형</strong> — 쉽게 읽히지 않는 깊이가 상대방을 계속 궁금하게 만드는 트랩 매력입니다.', '#8b5cf6'); }
    else { charmClass = card('💎 당신의 매력 클래스', '<strong>' + (d.dominant === 'metal' ? '차가운 세련미형' : d.dominant === 'fire' ? '압도적 화려함형' : d.dominant === 'water' ? '위험한 신비로움형' : d.dominant === 'wood' ? '자연스러운 청량미형' : '중독성 강한 안정감형') + '</strong> — 오행 기운이 만드는 당신만의 고유한 매력입니다.', domColor); }
    sec2 += charmClass;

    sec2 += card('🎨 개운 스타일링 처방', 
      '<b>대표 컬러:</b> ' + EL_KO[d.dayEl] + ' 에너지의 ' + d.gaeun.livingColor + '<br>' +
      '<b>향수:</b> ' + d.gaeun.perfume + '<br>' +
      '<b>보석:</b> ' + d.gaeun.gem + '<br>' +
      '<b>핵심 전략:</b> 당신의 ' + EL_KO[d.dayEl] + ' 에너지를 시각적으로 표현하는 아이템이 이성 유인에 가장 효과적입니다.',
    domColor);

    sec2 += '<div class="lb-flirt-list"><h4 class="lb-sub-title">🎯 나만 모르는 나의 플러팅 강점</h4><ul>';
    d.ilganLove.flirt.forEach(function (f) { sec2 += '<li>' + f + '</li>'; });
    sec2 += '</ul></div>';

    /* ─── 섹션 3: 운명의 상대방 리포트 ─── */
    var sec3 = '';
    sec3 += '<div class="lb-partner-hero">';
    if (d.partnerData) {
      sec3 += card('👁️ 일지(' + iljuKey + ') — 배우자궁 분석',
        '<b>외모·첫인상:</b> ' + d.partnerData.exterior + '<br><br>' +
        '<b>성격·내면:</b> ' + d.partnerData.personality + '<br><br>' +
        '<b>주의사항:</b> ' + d.partnerData.challenge,
        '#db2777');
    }
    sec3 += card('🧲 용신 오행(' + EL_KO[d.yongshinEl] + ')으로 끌리는 이상형',
      '<b>외모 경향:</b> ' + d.yongshinPart.exterior + '<br>' +
      '<b>성격:</b> ' + d.yongshinPart.personality + '<br>' +
      '<b>선호 직업군:</b> ' + d.yongshinPart.job + '<br>' +
      '<b>스타일:</b> ' + d.yongshinPart.style,
      EL_COLOR[d.yongshinEl]);
    sec3 += '</div>';

    var gan2 = Object.keys(GAN_EL).filter(function (g) { return GAN_EL[g] === d.yongshinEl; });
    sec3 += '<div class="lb-best-gan">' +
      '<h4 class="lb-sub-title">✨ 천간 궁합 — 나와 가장 잘 맞는 상대 일간</h4>' +
      '<div class="lb-gan-chips">' +
      gan2.map(function (g) { return '<span class="lb-gan-chip">' + GAN_KO[g] + '</span>'; }).join('') +
      '</div><p class="lb-gan-note">위 일간을 가진 상대는 당신의 ' + EL_KO[d.yongshinEl] + ' 부족을 채워주는 자연스러운 보완 관계를 형성합니다.</p>' +
    '</div>';

    // 피해야 할 빌런 사주
    var villainMap = { wood: '금(金) 과다 사주 — 당신의 성장을 억압하고 지나친 비판과 통제를 가할 수 있습니다.',
      fire: '수(水) 과다 사주 — 당신의 열정을 식히고 감정을 억압하는 패턴이 형성될 수 있습니다.',
      earth: '목(木) 과다 사주 — 지나치게 다이나믹하고 변화를 강요해 당신을 불안하게 만듭니다.',
      metal: '화(火) 과다 사주 — 과도한 감정 표현과 충동성이 당신의 원칙 세계를 혼란에 빠뜨립니다.',
      water: '토(土) 과다 사주 — 강한 통제욕과 억압이 당신의 자유로운 흐름을 막습니다.' };
    sec3 += card('🚫 절대 피해야 할 빌런 사주 특징', villainMap[d.dayEl] || '자신과 오행이 극도로 상충하는 사주를 조심하세요.', '#ef4444');

    /* ─── 섹션 4: 실전 연애 전략 ─── */
    var sec4 = '';
    var tsLoveStrat = {
      '식신': { title: '식신(食神) 활용법', desc: '감성적이고 따뜻한 언어로 마음을 표현하세요. 맛있는 음식, 감각적인 경험을 함께하며 자연스럽게 친밀감을 높이는 것이 핵심입니다.' },
      '상관': { title: '상관(傷官) 활용법', desc: '당신의 언어 능력과 유머가 최강 플러팅 무기입니다. 예상치 못한 발언과 독특한 관점으로 상대방을 끊임없이 놀라게 하세요.' },
      '편재': { title: '편재(偏財) 활용법', desc: '다양한 경험과 넓은 인맥을 활용하세요. "나랑 있으면 세상이 넓어진다"는 느낌을 주는 것이 핵심 전략입니다.' },
      '정재': { title: '정재(正財) 활용법', desc: '성실하고 신뢰할 수 있는 모습을 일관되게 보여주세요. 약속을 지키고 상대방의 실질적인 필요를 채워주는 것이 연애 성공의 기반입니다.' },
      '편관': { title: '편관(偏官) 활용법', desc: '당신의 카리스마와 강단 있는 모습이 상대방을 끌어당깁니다. 단, 너무 강하게 나오면 상대가 위축됩니다 — 3의 힘을 발휘할 때는 1의 부드러움을 곁들이세요.' },
      '정관': { title: '정관(正官) 활용법', desc: '원칙과 책임감이 당신의 연애 자산입니다. 상대방에게 "이 사람이라면 믿을 수 있다"는 확신을 주는 것이 첫 번째 목표입니다.' },
      '편인': { title: '편인(偏印) 활용법', desc: '당신만의 독특한 세계관이 상대방을 매혹합니다. 예술적 감각, 창의적인 아이디어, 철학적 대화로 지적 매력을 극대화하세요.' },
      '정인': { title: '정인(正印) 활용법', desc: '깊은 지식과 따뜻한 조언이 상대방에게 귀인처럼 다가갑니다. 배움과 성장을 공유하는 연애가 가장 오래가는 구조입니다.' },
      '비견': { title: '비견(比肩) 활용법', desc: '동등한 파트너십을 추구하세요. "우리 둘 다 독립적이지만 함께할 때 더 강해진다"는 메시지가 이상적입니다.' },
      '겁재': { title: '겁재(劫財) 활용법', desc: '강렬한 에너지와 카리스마로 상대방을 압도하는 첫 인상이 강점입니다. 단, 소유욕과 경쟁심을 내려놓고 상대방에게 여백을 주어야 합니다.' }
    };

    var curTsStrat = tsLoveStrat[d.dominantTs] || tsLoveStrat['식신'];
    sec4 += card(curTsStrat.title, curTsStrat.desc, domColor);
    if (d.strengthTip) sec4 += card('⚖️ 신강/신약으로 본 밀당 전략', d.strengthTip, '#7c3aed');

    var keywords = ['진심', '일관성', '여유', '배려', '유머', '독립심', '설렘', '성장', '신뢰', '공감'];
    sec4 += '<div class="lb-keywords-board"><h4 class="lb-sub-title">🔑 상대방의 마음을 여는 공략 키워드 10</h4><div class="lb-keywords">' +
      keywords.map(function (k, i) { return '<div class="lb-kw-chip"><span class="lb-kw-num">' + (i + 1) + '</span>' + k + '</div>'; }).join('') + '</div></div>';

    sec4 += card('📱 SNS · 카톡 성공 비책',
      '<b>좋은 방법:</b><ul>' +
      '<li>마지막 메시지는 항상 상대방이 답변하고 싶어지는 "열린 질문"으로 마감</li>' +
      '<li>하루 1~2개의 진심 담긴 메시지가 10개의 가벼운 메시지보다 효과적</li>' +
      '<li>상대방 일과 중 작은 것을 기억하고 먼저 안부를 물어보기</li>' +
      '<li>음성 메시지 1번 = 문자 10번의 감정 전달력</li>' +
      '</ul>' +
      '<b>피해야 할 것:</b><ul>' +
      '<li>읽씹 고의 연출 — 상대의 피로감만 축적됩니다</li>' +
      '<li>새벽 감성 대화 후 갑자기 차가워지기</li>' +
      '<li>과도한 이모티콘과 단답형의 잦은 사용</li>' +
      '</ul>',
      '#0ea5e9');

    /* ─── 섹션 5: 시기별 연애 운의 흐름 ─── */
    var sec5 = '';
    var maxMonthScore = Math.max.apply(null, d.monthScores);
    var maxMonthIdx = d.monthScores.indexOf(maxMonthScore);
    var minMonthScore = Math.min.apply(null, d.monthScores);
    var minMonthIdx = d.monthScores.indexOf(minMonthScore);

    sec5 += '<div class="lb-timeline-hint">' +
      '<div class="lb-tm-best">🌟 최고 연애 운: <strong>' + MONTH_NAMES[maxMonthIdx] + '</strong> (' + maxMonthScore + '점)</div>' +
      '<div class="lb-tm-worst">⚠️ 조심 구간: <strong>' + MONTH_NAMES[minMonthIdx] + '</strong> (' + minMonthScore + '점)</div>' +
    '</div>';
    sec5 += '<canvas id="lbMonthChart" class="lb-month-chart" width="400" height="180"></canvas>';
    sec5 += '<p class="lb-chart-caption">※ 위 그래프는 일간 에너지와 월령 흐름의 조합으로 산출한 연애 성공 확률 추이입니다.</p>';
    sec5 += card('🔮 대운(大運) 연애 흐름',
      DAEWUN_LOVE_FLOW[d.dominant] || DAEWUN_LOVE_FLOW.earth, domColor);
    sec5 += card('💘 새로운 인연이 나타나는 시기',
      '일지 ' + highlight(ilj + '(' + animalDj + ')') + '와 합(合)을 이루는 지지의 해가 가장 강력한 만남의 시기입니다. ' +
      '특히 천간에 ' + highlight(GAN_KO[d.dg]) + '와 합을 이루는 천간이 흐르는 세운(歲運)에 운명적 인연이 나타납니다. ' +
      '이 시기 여행·새로운 모임·소개팅 앱을 적극 활용하세요.',
      '#16a34a');

    /* ─── 섹션 6: 연애의 어두운 면 ─── */
    var sec6 = '';
    var risks = [];
    if (d.taoPct >= 60) risks.push(LOVE_RISK.high_tao);
    if (d.yeokmaPct >= 60) risks.push(LOVE_RISK.high_yeokma);
    if (d.hwaPct >= 60) risks.push(LOVE_RISK.high_hwa);
    if (d.hasGwimun) risks.push(LOVE_RISK.gwimunkwan);

    if (risks.length === 0) {
      sec6 += '<div class="lb-no-risk">✅ 두드러진 연애 리스크 살이 없습니다. 그러나 모든 사주는 자신만의 그림자를 가지고 있습니다. 아래 일반 주의사항을 확인하세요.</div>';
    }
    risks.forEach(function (r) {
      sec6 += '<div class="lb-risk-card">' +
        '<div class="lb-risk-title">⚠️ ' + r.title + '</div>' +
        '<div class="lb-risk-content"><b>리스크:</b> ' + r.risk + '</div>' +
        '<div class="lb-risk-solution"><b>해법:</b> ' + r.solution + '</div>' +
        '<div class="lb-risk-karma"><b>업보 해소:</b> ' + r.karma + '</div>' +
      '</div>';
    });

    sec6 += card('🔁 반복되는 연애 패턴 분석',
      '당신의 ' + highlight(GAN_KO[d.dg]) + ' 에너지는 같은 패턴의 상대를 계속 끌어당기는 경향이 있습니다. ' +
      '특히 ' + highlight(d.ilganLove.weakness.substring(0, 30) + '...') + ' 이 행동 패턴을 인식하고 의식적으로 멈추는 것이 ' +
      '"업보 사랑(カルマ恋愛)" 의 사슬에서 벗어나는 첫 번째 열쇠입니다.',
      '#dc2626');

    sec6 += card('💊 권태기 극복 솔루션 — ' + EL_KO[d.dayEl] + ' 기반',
      d.dayEl === 'wood' ? '공동 목표 설정하기 — 함께 배울 것, 함께 달성할 것을 새로 정하세요. 성장이 없으면 목(木) 에너지는 질식합니다.' :
      d.dayEl === 'fire' ? '새로운 경험 주입 — 처음 가보는 여행지, 새로운 활동이 불꽃을 다시 켭니다. 반복과 일상은 화(火)의 적입니다.' :
      d.dayEl === 'earth' ? '깊은 대화로 재연결 — 바쁜 일상 속 둘만의 진지한 시간을 만들어 관계의 기반을 재확인하세요.' :
      d.dayEl === 'metal' ? '상대방에게 구체적인 인정 표현 — 내가 당신의 어떤 점에 감사하는지를 명확하게 말해보세요.' :
      '감성적 추억 되살리기 — 처음 만났을 때의 장소에 다시 방문하거나 그때의 사진을 함께 보세요.',
      domColor);

    /* ─── 섹션 7: 섹슈얼리티 (잠금 구간) ─── */
    var sec7body = '';
    sec7body += card('🌊 성적 에너지 분석', d.sexProfile.energy + ' ' + d.sexProfile.style, '#7c3aed');
    sec7body += card('🤫 숨겨진 감각의 비밀', d.sexProfile.hidden, '#db2777');
    sec7body += card('✨ 상대방을 황홀하게 만드는 법', d.sexProfile.enhance, '#ec4899');
    var sec7 = sec7body;

    /* ─── 섹션 8: 현대적 상황별 비책 ─── */
    var sec8 = '';
    sec8 += card('📱 소개팅 앱 프로필 전략 (사주 기반)',
      '<b>프로필 사진 전략:</b> ' + EL_KO[d.dayEl] + ' 에너지를 담은 ' + d.gaeun.livingColor + ' 계열 배경 또는 의상 선택.<br>' +
      '<b>자기소개 키워드:</b> ' + d.ilganLove.flirt[0] + '에 포커스.<br>' +
      '<b>첫 DM:</b> 상대방의 프로필에서 공통점을 찾아 "이 부분이 저와 비슷하더라고요" 형식의 개인화된 메시지.<br>' +
      '<b>매칭 최적 시간:</b> 당신의 일간 에너지가 활성화되는 시간 — ' + (d.dayEl === 'fire' ? '오전 10~정오' : d.dayEl === 'water' ? '밤 10시~자정' : '오전 8~10시'),
      '#0ea5e9');

    sec8 += card('🏢 사내 연애 성공 전략',
      '사내 연애는 ' + highlight('역마살 ' + d.yeokmaPct + '%') + '가 높을수록 불안정해질 가능성이 있습니다. ' +
      (d.yeokmaPct >= 40 ? '역마가 강한 당신에게 사내 연애는 특히 장기화될 경우 리스크가 있습니다. 감정을 빠르게 공표하기보다는 충분한 시간을 두고 상대방의 진심을 확인하세요.' :
      '안정적인 기운 덕분에 사내 연애에서 신뢰도를 쌓기에 유리합니다. 업무적으로 먼저 인정받는 것이 첫 번째 전략입니다.'),
      '#f59e0b');

    sec8 += card('💬 썸에서 연인으로 — 결정적 한 방',
      '일지가 ' + highlight(iljuKey + '(' + animalDj + ')') + '인 당신의 결정적 제안 타이밍은:<br>' +
      '상대방이 ' + highlight('당신에게 먼저 고민을 털어놓을 때') + ' — 이 순간이 정서적 신뢰가 형성된 신호입니다.<br>' +
      '이 때 "나는 당신 곁에 있을 사람이 되고 싶다"는 메시지를 직접적이고 부드럽게 전달하면 성공률이 크게 올라갑니다.',
      '#16a34a');

    /* ─── 섹션 9: 결혼과 정착 ─── */
    var sec9 = '';
    sec9 += card('💍 결혼 최적 시기', '당신의 결혼 최적 나이대: ' + highlight(d.marriageAge) + '<br>용신(' + EL_KO[d.yongshinEl] + ')의 천간이 연운(年運)으로 흐르는 해에 결혼을 결정하면 결혼 운이 최고로 발현됩니다.', '#7c3aed');
    sec9 += card('👨‍👩‍👧 고부/시댁 갈등 예방책',
      '일지 ' + iljuKey + '로 볼 때, 파트너의 가족 관계에서 ' +
      (d.dayEl === 'metal' ? '원칙과 관습을 중시하는 시댁과의 갈등이 예상됩니다. 초기에 명확한 경계와 예절로 선을 면저 그으세요.' :
      d.dayEl === 'water' ? '유연한 당신이 감정적으로 소진되지 않도록, 파트너와의 단단한 소통 채널을 먼저 구축하세요.' :
      '상대방 가족과의 첫 만남에서 따뜻하고 실질적인 배려(음식, 선물 등)를 표현하면 관계의 기반이 좋아집니다.'),
      '#f59e0b');
    sec9 += card('🌱 자녀운과 가정의 행복',
      '오행 중 ' + highlight(EL_KO[d.dayEl]) + ' 기운이 가장 강한 당신의 자녀운은 ' +
      (d.dayEl === 'wood' || d.dayEl === 'fire' ? '식상(食傷)이 발달해 자녀와의 교감이 깊고 창의적인 가정환경을 만들기 좋습니다.' :
      d.dayEl === 'earth' ? '포용력 있는 가정 분위기를 만들며 자녀에게 든든한 울타리가 됩니다.' :
      d.dayEl === 'metal' ? '원칙 있는 가정 교육으로 자녀가 명확한 기준을 갖고 성장하게 됩니다.' :
      '감성 풍부한 가정환경으로 자녀의 감수성과 예술적 재능을 키워주기에 이상적입니다.'),
      '#16a34a');

    /* ─── 섹션 10: 개운 처방전 ─── */
    var sec10 = '';
    sec10 += '<div class="lb-gaeun-grid">';
    sec10 += '<div class="lb-gaeun-item"><span class="lb-gaeun-icon">🛏️</span><b>침대 방향</b><p>' + d.gaeun.bedDir + '</p></div>';
    sec10 += '<div class="lb-gaeun-item"><span class="lb-gaeun-icon">🌿</span><b>인테리어</b><p>' + d.gaeun.livingColor + '</p></div>';
    sec10 += '<div class="lb-gaeun-item"><span class="lb-gaeun-icon">🌸</span><b>향수</b><p>' + d.gaeun.perfume + '</p></div>';
    sec10 += '<div class="lb-gaeun-item"><span class="lb-gaeun-icon">💎</span><b>행운 보석</b><p>' + d.gaeun.gem + '</p></div>';
    sec10 += '<div class="lb-gaeun-item"><span class="lb-gaeun-icon">🍽️</span><b>개운 음식</b><p>' + d.gaeun.food + '</p></div>';
    sec10 += '<div class="lb-gaeun-item lb-gaeun-item--wide"><span class="lb-gaeun-icon">🧘</span><b>명상법</b><p>' + d.gaeun.meditation + '</p></div>';
    sec10 += '</div>';
    sec10 += '<div class="lb-affirmation"><div class="lb-affirmation-title">✨ 오늘의 확언 (Affirmation)</div><blockquote class="lb-affirmation-text">"' + d.gaeun.affirmation + '"</blockquote><p class="lb-affirmation-guide">매일 아침, 거울을 보며 이 문장을 소리 내어 3회 반복하면 잠재의식에 새로운 사랑의 패턴이 심어집니다.</p></div>';

    /* ─── 최종 조립 ─── */
    var output = '<div id="loveBibleReport" class="lb-report">' +
      '<div class="lb-cover">' +
        '<img class="lb-cover-img" src="/fuctionassets/lovebible.webp" alt="연애 비책" loading="lazy">' +
        '<div class="lb-cover-overlay">' +
          '<div class="lb-cover-eyebrow">LOVE SECRET BIBLE</div>' +
          '<h2 class="lb-cover-title">연애 비책<br>운명의 설계도</h2>' +
          '<p class="lb-cover-sub">' + GAN_KO[d.dg] + ' 일간 · 일지 ' + iljuKey + ' · ' + EL_KO[d.dayEl] + ' 에너지</p>' +
        '</div>' +
      '</div>' +
      section(1, '🔑', '본연의 연애 자아 (The Core Self)', sec1) +
      section(2, '💘', '치명적 매력과 페로몬 (Attraction)', sec2) +
      section(3, '🔮', '운명의 상대방 리포트 (Ideal Partner)', sec3) +
      section(4, '⚔️', '실전 연애 전략 (Art of War in Love)', sec4) +
      section(5, '📅', '시기별 운의 흐름 (Timing & Timeline)', sec5) +
      section(6, '🌑', '연애의 어두운 면 (Crisis Management)', sec6) +
      section(7, '🔥', '섹슈얼리티와 궁합 에너지 (Sexual Chemistry)', sec7) +
      section(8, '📲', '현대적 상황별 비책 (Modern Scenarios)', sec8) +
      section(9, '💍', '결혼과 정착 (Commitment & Marriage)', sec9) +
      section(10, '🌿', '맞춤형 개운 처방전 (Actionable Remedies)', sec10) +
    '</div>';

    return output;
  }

  /* =====================================================================
     11. 월별 연애 운 차트 (Canvas)
     ===================================================================== */

  function renderLoveMonthlyChard(scores) {
    var canvas = document.getElementById('lbMonthChart');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.offsetWidth || 380;
    var h = 180;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    var pad = { l: 32, r: 16, t: 20, b: 30 };
    var gw = w - pad.l - pad.r;
    var gh = h - pad.t - pad.b;
    var cols = scores.length;
    var colW = gw / cols;
    var maxV = 100, minV = 0;

    // 그라디언트 배경
    var grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + gh);
    grad.addColorStop(0, 'rgba(168,85,247,0.18)');
    grad.addColorStop(1, 'rgba(168,85,247,0.02)');

    // 라인 경로
    ctx.beginPath();
    scores.forEach(function (v, i) {
      var x = pad.l + i * colW + colW / 2;
      var y = pad.t + gh - ((v - minV) / (maxV - minV)) * gh;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });

    // 면적
    var lastX = pad.l + (cols - 1) * colW + colW / 2;
    var firstX = pad.l + colW / 2;
    ctx.lineTo(lastX, pad.t + gh);
    ctx.lineTo(firstX, pad.t + gh);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 선
    ctx.beginPath();
    scores.forEach(function (v, i) {
      var x = pad.l + i * colW + colW / 2;
      var y = pad.t + gh - ((v - minV) / (maxV - minV)) * gh;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 점 + 레이블
    scores.forEach(function (v, i) {
      var x = pad.l + i * colW + colW / 2;
      var y = pad.t + gh - ((v - minV) / (maxV - minV)) * gh;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = v >= 80 ? '#ec4899' : v <= 60 ? '#6b7280' : '#a855f7';
      ctx.fill();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(MONTH_NAMES[i], x, h - 6);
    });
  }

  /* =====================================================================
     12. 외부 노출 & 사주 화면 통합 진입점
     ===================================================================== */

  global.LoveSecretService = LoveSecretService;

  // saju-engine.js 의 renderDeferred 체인에서 호출될 래퍼
  global.renderLoveBible = function (p, natal, johu, G_POWER, G_JONG) {
    try { LoveSecretService(p, natal, johu, G_POWER, G_JONG); }
    catch (e) { console.error('[LoveBible] render error:', e); }
  };

  // 스크립트가 늦게 로드된 경우 — 이미 calculate()가 실행됐다면 자동으로 렌더링
  if (global._loveBiblePending) {
    try {
      var _pd = global._loveBiblePending;
      global._loveBiblePending = null;
      LoveSecretService(_pd.p, _pd.natal, _pd.johu, _pd.G_POWER, _pd.G_JONG);
    } catch (e) { console.error('[LoveBible] pending render error:', e); }
  }

}(window));
