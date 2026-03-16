// ============================================
// Face Analysis Engine (Vanilla JS 포팅 버전)
// AI 동물 관상 맞춤형 DB 포함 (15종) + 전문가 삼정 정밀 분석
// ============================================

class AnalysisEngine {
  constructor() {
    this.faceApiModelsLoaded = false; // face-api.js 모델 로드 완료 여부
    this.animalDb = {
      animals: [
    {
        id: 'dog',
        name: '강아지상',
        emoji: '🐶',
        celebrities: ['박보영', '송중기', '강다니엘', '아이유', '백현', '수지'],
        description: `<strong>[성격 및 특징]</strong><br>
            둥글고 선한 눈매, 쳐진 눈꼬리를 가져 누구에게나 호감을 주는 인상입니다. 친근하고 다정다감한 성격으로 대인관계가 원만하며, 감정 표현에 솔직하고 애교가 많아 주변에 사람이 끊이지 않는 전형적인 인싸형 관상입니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            연애에 있어 헌신적이고 따뜻한 순애보 스타일입니다. 질투가 다소 있을 수 있으나 상대방에게 아낌없는 애정을 줍니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            뛰어난 공감 능력과 사교성을 바탕으로 서비스직, 교육, 상담, 연예, 대중의 인기를 먹고 사는 직업에서 크게 성공합니다.<br><br>
            <strong>[재물운]</strong><br>
            인복이 곧 재물로 이어지는 운세로, 주변 사람들의 도움과 신뢰를 통해 안정적으로 부를 축적합니다.
        `,
        key_features: { 'jaw_shape': 'round', 'eye_slant': 'downward', 'eye_distance': 'wide' }
    },
    {
        id: 'cat',
        name: '고양이상',
        emoji: '🐱',
        celebrities: ['제니', '한소희', '강동원', '이준기', '이종석', '해린'],
        description: `<strong>[성격 및 특징]</strong><br>
            살짝 올라간 눈꼬리와 선명한 눈빛이 쿨하고 도도한 매력을 발산합니다. 첫인상은 차갑고 까칠해 보일 수 있으나 내면은 정이 많고 친해지면 애교가 터지는 '츤데레' 스타일입니다. 독립심이 강하고 자기 주관이 매우 뚜렷합니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            밀당의 고수이며 묘한 섹시함이 있어 이성에게 끊임없이 대시를 받습니다. 구속받는 것을 싫어하여 자유로운 연애를 선호합니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            패션, 뷰티, 디자인, 예술, 영업 등 자신의 철학과 개성을 마음껏 펼칠 수 있는 트렌디한 분야에서 두각을 나타냅니다.<br><br>
            <strong>[재물운]</strong><br>
            본인만의 능력 스탯으로 돈을 버는 자수성가형이 많으며, 재테크 감각이 예리하여 크게 손해 보지 않습니다.
        `,
        key_features: { 'jaw_shape': 'sharp', 'eye_slant': 'upward' }
    },
    {
        id: 'fox',
        name: '여우상',
        emoji: '🦊',
        celebrities: ['지코', '황민현', '육성재', '예지', '서인국'],
        description: `<strong>[성격 및 특징]</strong><br>
            가로로 길고 찢어진 눈매와 날렵한 턱선이 돋보입니다. 세련되고 도회적인 인상을 주며 두뇌 회전이 매우 빠르고 눈치가 넓어 어떤 환경에서도 완벽히 적응합니다. 분위기를 주도하는 매력적인 눈웃음이 강력한 무기입니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            상대방의 마음을 단숨에 사로잡는 마성의 매력 소유자입니다. 섬세하고 센스있어 연애 상대에게 최고의 만족감을 주지만, 쉽게 질리기도 합니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            기획, 마케팅, 협상, 아이디어 사업이나 예술 분야, 말로 사람을 설득하는 세일즈에서 크게 기량을 발휘합니다.<br><br>
            <strong>[재물운]</strong><br>
            두뇌가 명석해 정보를 활용한 투자(주식, 부동산 등)에 능하며 재물 회전율이 높습니다.
        `,
        key_features: { 'eye_distance': 'narrow', 'eye_slant': 'upward', 'jaw_shape': 'sharp' }
    },
    {
        id: 'deer',
        name: '사슴상',
        emoji: '🦌',
        celebrities: ['윤아', '차은우', '최민호', '고아라', '설윤'],
        description: `<strong>[성격 및 특징]</strong><br>
            유난히 맑고 큰 눈망울과 다소 긴 목을 가지고 있어 우아하고 청초한 분위기를 자아냅니다. 선하고 평화로운 성품을 지녔으며 감수성이 매우 풍부합니다. 불의를 싫어하고 지조가 있는 선비 같은 내면을 지녔습니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            보호본능을 자극해 이성에게 맹목적인 사랑을 받는 경우가 많습니다. 본인은 신중하게 사람을 골라 깊고 안정적인 관계를 추구합니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            학자, 연구원, 교육자, 순수 예술가, 공무원 등 안정적이고 깊이 있는 학구열을 요구하는 직업과 찰떡궁합입니다.<br><br>
            <strong>[재물운]</strong><br>
            일확천금보다는 안정적이고 꾸준한 재물의 흐름을 가지며, 명예가 높아짐에 따라 자연스레 부가 따라오는 운세입니다.
        `,
        key_features: { 'eye_distance': 'wide', 'nose_width': 'narrow', 'jaw_shape': 'sharp' }
    },
    {
        id: 'rabbit',
        name: '토끼상',
        emoji: '🐰',
        celebrities: ['나연', '도영', '정국', '수지', '바비'],
        description: `<strong>[성격 및 특징]</strong><br>
            동그랗고 맑은 눈매와 귀여운 앞니가 매력 포인트입니다. 하얗고 깨끗한 이미지를 가졌으며 긍정적이고 통통 튀는 에너지로 무장해 있습니다. 호기심이 많고 활동적이며 상상력이 뛰어납니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            귀엽고 사랑스러운 매력으로 남녀노소 가리지 않고 인기가 많습니다. 활기차고 알콩달콩한 연애를 선호합니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            엔터테인먼트, 크리에이터, 방송, 예술, 혹은 창의적인 아이디어가 필요한 스타트업 환경에서 크게 성공합니다.<br><br>
            <strong>[재물운]</strong><br>
            다양한 활동 반경만큼 여러 루트에서 부를 창출해내며 특히 젊은 시절에 큰 부를 모으는 경향이 강합니다.
        `,
        key_features: { 'jaw_shape': 'round', 'nose_width': 'narrow' }
    },
    {
        id: 'bear',
        name: '곰상',
        emoji: '🐻',
        celebrities: ['마동석', '안재홍', '슬기', '조진웅', '고창석'],
        description: `<strong>[성격 및 특징]</strong><br>
            선이 굵거나 둥글고 듬직한 얼굴형으로 포근하고 푸근한 인상을 줍니다. 겉보기엔 무뚝뚝해 보이나 속은 매우 따뜻하고 인간미가 넘칩니다. 한 번 결심한 일은 끝까지 해내는 엄청난 끈기와 인내심의 소유자입니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            화려한 로맨스보다는 가족 같고 편안한 장기 연애에 강하며, 결혼 상대로 매우 훌륭하고 듬직한 배우자가 됩니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            건축, 제조, 중공업, 공무원, 사업가 중심의 안정적인 직업군이나, 체력과 끈기가 필요한 요식업 분야에서 대성합니다.<br><br>
            <strong>[재물운]</strong><br>
            전형적인 대기만성형 재물운으로, 티끌 모아 태산을 이루듯 중년 이후부터 막대한 재력과 자산을 갖추게 됩니다.
        `,
        key_features: { 'jaw_shape': 'wide', 'nose_width': 'wide' }
    },
    {
        id: 'tiger',
        name: '호랑이상',
        emoji: '🐯',
        celebrities: ['뷔', '화사', '이정재', '김우빈', '세븐틴 호시'],
        description: `<strong>[성격 및 특징]</strong><br>
            뚜렷하고 굵은 T존과 깊고 강렬한 눈빛을 자랑하며, 존재만으로도 묵직한 카리스마와 압도적인 오라(Aura)를 내뿜습니다. 두려움이 없고 리더십이 뛰어나 무리의 우두머리가 되며 매사에 열정과 자신감이 넘칩니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            솔직하고 화끈한 직진 연애를 좋아합니다. 주도권을 쥐는 것을 선호하며 내 사람에게는 한없이 너그러운 순정파입니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            기업의 CEO, 정치가, 고위 공직자, 혹은 독보적인 예체능계열 탑스타 등 어떤 조직에서도 중심 및 리더 역할을 맡아 성공합니다.<br><br>
            <strong>[재물운]</strong><br>
            스케일이 남달라 한 번의 큰 성과로 막대한 부를 쟁취하는 큰손의 운명입니다. 다만 지출도 크니 통제가 필요합니다.
        `,
        key_features: { 'jaw_shape': 'wide', 'eye_slant': 'upward', 'eye_distance': 'wide' }
    },
    {
        id: 'dinosaur',
        name: '공룡상',
        emoji: '🦖',
        celebrities: ['공유', '이민기', '황인엽', '탑', '김우빈'],
        description: `<strong>[성격 및 특징]</strong><br>
            윤곽과 골격이 강하게 도드라지며 큼직한 이목구비로 시원하고 남성적인(또는 걸크러시) 분위기가 납니다. 가만히 있으면 다소 무서워 보일 수 있으나 웃을 때 개구쟁이 같은 아이 얼굴이 나오는 엄청난 반전 매력이 있습니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            반전 매력으로 이성을 강렬하게 끌어들이며, 한 번 빠지면 헤어나올 수 없게 만드는 나쁜 남자/나쁜 여자 스타일의 치명적 매력이 있습니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            연기자, 패션모델, 스포츠 선수 혹은 현장을 누비고 직접 부딪혀 결과를 내는 자영업이나 사업 쪽에서 뛰어난 두각을 보입니다.<br><br>
            <strong>[재물운]</strong><br>
            투자와 사업 확장에 기질이 있어 자수성가로 기반을 닦는 경우가 많으며 부동산이나 큰 규모의 자산운용에 강합니다.
        `,
        key_features: { 'jaw_shape': 'wide', 'nose_width': 'wide', 'eye_slant': 'upward' }
    },
    {
        id: 'snake',
        name: '뱀상',
        emoji: '🐍',
        celebrities: ['승리', '카리나', '청하', '이수혁', '현아'],
        description: `<strong>[성격 및 특징]</strong><br>
            V라인으로 떨어지는 예리한 턱선과 광대, 좌우로 길고 매서운 눈빛은 범접불가의 신비롭고 섹시한 분위기를 줍니다. 속을 알 수 없는 치명적인 매력을 가졌고, 예리한 분석력과 완벽주의적 성향으로 철저한 자기관리를 합니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            이성을 향한 유혹의 기술이 타의 추종을 불허하며 한 번 엮이면 절대 벗어날 수 없는 마성의 매력입니다. 눈이 매우 높은 편입니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            감각적인 디자인, 예술, 연예계, 패션계는 물론 치밀한 계획이 필요한 법조계나 투자 분석가로 일해도 크게 뻗어나갈 수 있습니다.<br><br>
            <strong>[재물운]</strong><br>
            기회가 오면 절대 놓치지 않는 결단력이 있어 벼락부자가 되기도 하며, 돈을 관리하는 감각이 매우 뛰어납니다.
        `,
        key_features: { 'jaw_shape': 'sharp', 'eye_slant': 'upward', 'eye_distance': 'narrow' }
    },
    {
        id: 'wolf',
        name: '늑대상',
        emoji: '🐺',
        celebrities: ['주지훈', '우도환', '세훈', '황인엽'],
        description: `<strong>[성격 및 특징]</strong><br>
            차가운 인상에 앙칼지면서도 성적인 매력미가 철철 넘치는 예리하고 강렬한 사백안 계열의 눈매를 가졌습니다. 무리에 충성하는 늑대처럼 차가운 겉모습 속에는 내 사람을 위한 의리와 거친 야성미가 동시에 공존합니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            한번 마음을 허락한 상대에게는 모든 것을 바치는 일편단심 지고지순한 사랑의 표본입니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            경찰, 군인, 운동선수 등 조직력이 강한 직단 혹은 끈질긴 추적과 집념이 요구되는 IT/기획 분야에 능합니다.<br><br>
            <strong>[재물운]</strong><br>
            도박이나 편법을 싫어하고 우직하게 스스로의 실력 하나로 부를 축적하며 노년이 될수록 안정적인 거부가 됩니다.
        `,
        key_features: { 'jaw_shape': 'sharp', 'nose_width': 'narrow', 'eye_slant': 'upward' }
    },
    {
        id: 'monkey',
        name: '원숭이상',
        emoji: '🐵',
        celebrities: ['딘딘', '오마이걸 유아', 'MC몽', '신동엽'],
        description: `<strong>[성격 및 특징]</strong><br>
            입체적인 이목구비와 장난기 가득한 인상이 특징입니다. 눈치가 매우 빠르고 잔머리가 잘 돌며 어떤 무리에서든 시선을 사로잡는 재간둥이입니다. 습득력이 뛰어나고 다재다능하여 일명 '팔방미인'이라는 소리를 자주 듣습니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            지루할 틈이 없는 이벤트와 재치로 연인을 항상 즐겁게 해주는 낭만과 유머의 전도사입니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            임기응변이 뛰어난 예능인, 유튜버, 프로그래머, 언론인 및 서비스업 등 두뇌와 순발력을 쓰는 직업에 천부적입니다.<br><br>
            <strong>[재물운]</strong><br>
            다양한 재주 덕에 여기저기서 수익을 벌어들이는 N잡러의 기질을 보이며 평생 재물이 마르지 않습니다.
        `,
        key_features: { 'jaw_shape': 'round', 'eye_distance': 'narrow' }
    },
    {
        id: 'horse',
        name: '말상',
        emoji: '🐴',
        celebrities: ['이광수', '최시원', '박완규', '유열'],
        description: `<strong>[성격 및 특징]</strong><br>
            다소 길고 선이 분명한 얼굴형에 시원시원한 이목구비를 가졌습니다. 마치 달리는 명마처럼 성격이 활달하고 개방적이며 에너지가 넘칩니다. 답답한 것을 싫어하고 늘 새로운 도전을 역동적으로 갈망하는 행동파입니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            열정적이고 쿨한 연애를 좋아하며 상대방과 여행이나 액티비티를 함께 즐기는 스포티한 커플형입니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            무역, 영업, 항공, 교통스튜어디스, 체육인 등 전 세계를 누비며 역동성을 요하는 필드워크에서 최고의 능력을 냅니다.<br><br>
            <strong>[재물운]</strong><br>
            활동 반경이 넓어 해외에서 큰 성공을 거두거나 움직인 만큼 돈이 쏟아져 들어오는 역마 재물운을 가졌습니다.
        `,
        key_features: { 'jaw_shape': 'wide', 'nose_width': 'narrow', 'eye_slant': 'downward' }
    },
    {
        id: 'pig',
        name: '돼지상',
        emoji: '🐷',
        celebrities: ['신동', '정형돈', '조세호'],
        description: `<strong>[성격 및 특징]</strong><br>
            얼굴형이 복스럽고 통통하며 입꼬리가 자연스레 올라가 유쾌하고 넉넉한 인상을 줍니다. 성품이 온화하고 관대하여 주변 사람을 참 편안하게 해주는 매력이 있습니다. 느긋해 보이지만 먹을 복이 평생 따라다니는 운명입니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            연인에게 한없이 다정하고 헌신하며 편안한 안식처 같은 보금자리가 되어주는 최고의 남편/아내감입니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            요식업, 유통업, 자산운용, 은행원 등 식록(食祿)이나 큰 규모의 돈과 관련된 직업을 가지면 매우 대성합니다.<br><br>
            <strong>[재물운]</strong><br>
            관상학적으로 최고의 재물복인 '천금지복'을 타고난 수저로, 아무리 어려워도 굶어 죽을 일이 없으며 중년에 큰 복이 터집니다.
        `,
        key_features: { 'jaw_shape': 'round', 'nose_width': 'wide', 'eye_distance': 'wide' }
    },
    {
        id: 'eagle',
        name: '독수리상',
        emoji: '🦅',
        celebrities: ['신현준', '이적', '박명수'],
        description: `<strong>[성격 및 특징]</strong><br>
            크고 날카로운 코(매부리코 형태)와 예리한 눈빛이 특징으로 범접하기 힘든 아우라가 흐릅니다. 먼 곳을 내다보는 통찰력과 직관력이 엄청나게 뛰어나며, 기회를 포착하면 매섭게 낚아채는 매서운 승부사 기질의 소유자입니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            이상형의 기준이 높고 한 번 내 사람이다 싶으면 맹렬하게 쟁취해내는 상남자/상여자 스타일입니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            검찰, 경찰, 감사, 재무, 투자가, 평론가 등 남들이 보지 못하는 문제점을 찾아내고 예리한 판단이 요구되는 직업이 잘 맞습니다.<br><br>
            <strong>[재물운]</strong><br>
            정확한 정보와 타이밍을 활용하여 막대한 부를 거머쥐는 사냥꾼형 부자의 운세를 타고났습니다.
        `,
        key_features: { 'jaw_shape': 'sharp', 'nose_width': 'narrow', 'eye_distance': 'narrow' }
    },
    {
        id: 'sparrow',
        name: '참새상',
        emoji: '🐦',
        celebrities: ['최예나', '연우', '은하'],
        description: `<strong>[성격 및 특징]</strong><br>
            오밀조밀하고 작고 뚜렷한 이목구비, 특히 앙증맞은 입술이 매력적인 귀염상입니다. 언제나 쉴 새 없이 재잘거리며 이야기하는 것을 좋아하고 밝고 명랑하여 주변에 긍정적인 바이러스를 심어주는 해피바이러스입니다.<br><br>
            <strong>[연애 및 결혼]</strong><br>
            특유의 귀여움과 사랑스러운 애교로 연인의 마음을 살살 녹이며 늘 화기애애하고 즐거운 연애를 즐깁니다.<br><br>
            <strong>[진로 및 직업]</strong><br>
            방송인, 아나운서, 크리에이터, 서비스, 보육교사 등 언변과 공감 능력이 뛰어난 사람을 상대하는 직종에서 능력을 인정받습니다.<br><br>
            <strong>[재물운]</strong><br>
            사소한 기회들을 모아 알뜰살뜰하게 재물을 모으는 타고난 재테크의 달인입니다.
        `,
        key_features: { 'jaw_shape': 'round', 'nose_width': 'narrow', 'eye_distance': 'narrow' }
      },
      {
          id: 'crocodile',
          name: '악어상',
          emoji: '🐊',
          celebrities: ['김우빈', '류준열', '김진표'],
          description: `<strong>[성격 및 특징]</strong><br>강한 하관과 가로로 긴 입매, 무표정일 때 느껴지는 서늘한 아우라가 특징입니다. 인내심이 매우 강하며 목표를 정하면 수단과 방법을 가리지 않고 성취해내는 냉철한 전략가 타입입니다.<br><br><strong>[연애 및 결혼]</strong><br>쉽게 마음을 열지 않지만, 내 사람이라고 판단되면 끝까지 책임지고 보호하는 묵직한 의리를 보여줍니다.<br><br><strong>[진로 및 직업]</strong><br>정치, 금융, 대규모 프로젝트 관리, 전문 수사관 등 고도의 집중력과 압박감을 견뎌야 하는 분야에서 정점에 올라섭니다.<br><br><strong>[재물운]</strong><br>기회를 포착하는 감각이 탁월하며, 한 번 잡은 기회를 막대한 수익으로 전환하는 자본가적 기질이 강합니다.`,
          key_features: { 'jaw_shape': 'wide', 'eye_slant': 'neutral', 'nose_width': 'wide' }
      },
      {
          id: 'lynx',
          name: '시라소니상',
          emoji: '🐆',
          celebrities: ['현진(Stray Kids)', '예지(ITZY)', '지민(BTS)', '이재명'],
          description: `<strong>[성격 및 특징]</strong><br>고양이보다 날카롭고 표범보다 기민해 보이는 눈매가 특징입니다. 독립심이 극도로 강하며 타인의 간섭을 싫어하는 고고한 기질을 가졌습니다. 감각이 예민하고 직관력이 뛰어나 창의적인 발상을 자주 합니다.<br><br><strong>[연애 및 결혼]</strong><br>구속받는 것을 극도로 싫어하며, 서로의 사생활을 존중해주는 쿨하고 세련된 연애를 지향합니다.<br><br><strong>[진로 및 직업]</strong><br>예술가, 패션 디자이너, 프리랜서 전문가, 전문 기술직 등 자신만의 독보적인 영역을 구축할 수 있는 직업에서 성공합니다.<br><br><strong>[재물운]</strong><br>큰 조직에 의존하기보다 자신의 전문성을 바탕으로 수익을 창출하며, 자산의 독립성을 중요하게 여깁니다.`,
          key_features: { 'jaw_shape': 'sharp', 'eye_slant': 'upward', 'eye_distance': 'narrow' }
      },
      {
          id: 'lion',
          name: '사자상',
          emoji: '🦁',
          celebrities: ['최민식', '강호동', '고현정'],
          description: `<strong>[성격 및 특징]</strong><br>넓고 시원한 이마와 큼직한 이목구비, 전체적으로 중후하고 위엄 있는 골격을 가졌습니다. 타고난 지도자적 기질로 대중을 압도하는 카리스마를 발휘하며, 명예를 목숨처럼 소중히 여깁니다.<br><br><strong>[연애 및 결혼]</strong><br>배우자에게 든든한 버팀목이 되어주며, 가정을 지키려는 책임감이 매우 강한 가부장적/모성적 리더 스타일입니다.<br><br><strong>[진로 및 직업]</strong><br>고위 경영자, 정치 리더, 대형 조직의 장, 문화/예술계의 거장 등 권위와 명성이 따르는 자리에 적합합니다.<br><br><strong>[재물운]</strong><br>자신의 직위와 명예가 높아짐에 따라 막대한 재물이 자연스럽게 따라오는 명예 우선형 재물운입니다.`,
          key_features: { 'jaw_shape': 'wide', 'nose_width': 'wide', 'mouth_size': 'large' }
      },
      {
          id: 'hamster',
          name: '햄스터상',
          emoji: '🐹',
          celebrities: ['호시(세븐틴)', '문별(마마무)', '정연(트와이스)', '민경훈'],
          description: `<strong>[성격 및 특징]</strong><br>통통한 볼살과 동그랗고 맑은 눈, 귀여운 입매를 가졌습니다. 에너지가 넘치고 부지런하며, 주변 사람들에게 즐거움을 주는 분위기 메이커입니다. 작아 보이지만 실속이 매우 알찬 타입입니다.<br><br><strong>[연애 및 결혼]</strong><br>보호본능을 자극하며 연인에게 끊임없는 귀여움과 활력을 제공합니다. 안정적이고 소소한 행복을 추구합니다.<br><br><strong>[진로 및 직업]</strong><br>크리에이터, 마케팅, 서비스 기획, 아동 교육 등 친근함과 창의성이 필요한 분야에서 두각을 나타냅니다.<br><br><strong>[재물운]</strong><br>돈을 모으는 재미를 아는 타입으로, 소액 저축부터 시작해 차곡차곡 자산을 불려 나가는 실속파 부자운입니다.`,
          key_features: { 'jaw_shape': 'round', 'eye_distance': 'wide', 'nose_width': 'narrow' }
      },
      {
          id: 'otter',
          name: '수달상',
          emoji: '🦦',
          celebrities: ['영재(GOT7)', '셔누(몬스타엑스)', '강민경'],
          description: `<strong>[성격 및 특징]</strong><br>부드러운 얼굴 선과 매끈한 피부, 친근한 미소가 특징입니다. 사교성이 매우 뛰어나 적이 없으며, 손재주나 감각이 영특하여 어떤 일이든 빠르게 습득하는 재주꾼입니다.<br><br><strong>[연애 및 결혼]</strong><br>연인과 친구처럼 편안하게 지내는 스타일이며, 다정다감하고 세심한 배려로 관계를 건강하게 유지합니다.<br><br><strong>[진로 및 직업]</strong><br>엔지니어링, 요리사, 수공예, 방송 기술 등 정교한 기술이나 감각적인 숙련도를 요하는 직업에서 대성합니다.<br><br><strong>[재물운]</strong><br>자신의 기술력과 재능이 곧 돈이 되는 구조이며, 인적 네트워크를 통해 유익한 경제 정보를 얻는 운세입니다.`,
          key_features: { 'jaw_shape': 'round', 'eye_slant': 'neutral', 'nose_width': 'narrow' }
      },
      {
          id: 'alpaca',
          name: '알파카상',
          emoji: '🦙',
          celebrities: ['진(BTS)', '임영웅', '임시완'],
          description: `<strong>[성격 및 특징]</strong><br>다소 긴 하관과 순한 눈망울, 깨끗한 인상이 돋보입니다. 성품이 온화하고 차분하며, 예의 바른 태도로 주변의 신망이 두텁습니다. 보기보다 고집이 있고 자기 신념이 확고한 외유내강형입니다.<br><br><strong>[연애 및 결혼]</strong><br>한결같은 마음으로 상대방을 대하며, 갈등을 대화로 해결하려는 평화주의적 연애 스타일입니다.<br><br><strong>[진로 및 직업]</strong><br>외교관, 상담사, 큐레이터, 화이트칼라 전문직 등 정돈된 환경에서 지적 능력을 발휘하는 직업이 최적입니다.<br><br><strong>[재물운]</strong><br>성실함을 바탕으로 한 정직한 수익을 선호하며, 장기적인 안목으로 안정적인 자산을 구축하는 운입니다.`,
          key_features: { 'jaw_shape': 'sharp', 'eye_distance': 'wide', 'nose_width': 'narrow' }
      },
      {
          id: 'koala',
          name: '코알라상',
          emoji: '🐨',
          celebrities: ['RM(BTS)', '최우식'],
          description: `<strong>[성격 및 특징]</strong><br>둥근 콧날과 살짝 처진 눈매, 여유로운 표정이 특징입니다. 매사에 서두르지 않는 침착함을 지녔으며, 본인만의 명확한 휴식과 일의 경계가 있습니다. 사색을 즐기는 지성미를 풍깁니다.<br><br><strong>[연애 및 결혼]</strong><br>포근하고 안정감 있는 연애를 선호하며, 상대방의 이야기를 잘 들어주는 훌륭한 리스너가 되어줍니다.<br><br><strong>[진로 및 직업]</strong><br>작가, 철학자, 연구원, 심리 치료사 등 깊은 사고와 분석이 필요한 학문적 영역에서 성과를 냅니다.<br><br><strong>[재물운]</strong><br>불필요한 지출을 싫어하는 검소한 생활 습관을 지녔으며, 노후 준비가 철저한 안정 지향적 재물운입니다.`,
          key_features: { 'jaw_shape': 'round', 'eye_slant': 'downward', 'nose_width': 'wide' }
      },
      {
          id: 'leopard',
          name: '표범상',
          emoji: '🐆',
          celebrities: ['원우(세븐틴)', '소연((여자)아이들)'],
          description: `<strong>[성격 및 특징]</strong><br>날렵한 턱선과 눈꼬리가 살짝 올라간 인상으로 카리스마와 세련미가 공존합니다. 주관이 뚜렷하고 자신감이 넘치며 어떤 상황에서도 굴하지 않는 당당함이 매력적인 관상입니다.<br><br><strong>[연애 및 결혼]</strong><br>연애에 있어서도 주도적이며, 쿨하고 열정적인 연애를 선호합니다. 상대방을 이끄는 강인한 리더십이 있습니다.<br><br><strong>[진로 및 직업]</strong><br>엔터테인먼트, 패션, 리더십을 발휘하는 관리직, 혹은 트렌드를 선도하는 마케터 등에 탁월한 재능이 있습니다.<br><br><strong>[재물운]</strong><br>기회를 놓치지 않는 결단력이 있어 큰 수익을 거두는 편이며, 투자와 사업 영역에서도 크게 성공하는 운입니다.`,
          key_features: { 'jaw_shape': 'sharp', 'eye_slant': 'upward', 'eye_distance': 'wide' }
      },
      {
          id: 'giraffe',
          name: '기린상',
          emoji: '🦒',
          celebrities: ['이광수', '첸(EXO)'],
          description: `<strong>[성격 및 특징]</strong><br>다소 긴 얼굴형과 맑은 눈이 지적이고 우아한 느낌을 줍니다. 성품이 온화하고 평화주의적이며, 눈앞의 이익보다는 멀리 내다보는 혜안과 뛰어난 통찰력을 지녔습니다.<br><br><strong>[연애 및 결혼]</strong><br>안정적이고 배려심 깊은 연애를 선호합니다. 다툼을 싫어하여 상대방을 포용할 줄 아는 성숙한 사랑을 합니다.<br><br><strong>[진로 및 직업]</strong><br>학자, 연구원, 기획자, 컨설턴트 등 장기적 안목과 지적 능력이 요구되는 전략 분야에서 빛을 발합니다.<br><br><strong>[재물운]</strong><br>일확천금보다는 차곡차곡 쌓아올리는 안정적인 재물운을 지녔으며, 장기적인 가치 투자에서 승리하는 타입입니다.`,
          key_features: { 'jaw_shape': 'sharp', 'eye_distance': 'wide', 'nose_width': 'narrow' }
      },
      {
          id: 'frog',
          name: '개구리상',
          emoji: '🐸',
          celebrities: ['김민희', '하연수'],
          description: `<strong>[성격 및 특징]</strong><br>미간이 다소 넓은 큰 눈과 시원시원하고 넓은 입매로 톡톡 튀는 존재감과 개성이 매력적입니다. 매사에 활발하고 유쾌하며 주변에 언제나 웃음을 전해주는 긍정 에너지의 소유자입니다.<br><br><strong>[연애 및 결혼]</strong><br>친구처럼 편안하고 즐거운 연애를 추구하며, 상대방에게 지루할 틈을 주지 않는 유머 감각이 있습니다.<br><br><strong>[진로 및 직업]</strong><br>방송인, 크리에이터, 영업직, 홍보 등 톡톡 튀는 매력과 뛰어난 언변을 적극적으로 활용하는 직업이 좋습니다.<br><br><strong>[재물운]</strong><br>자신의 넓은 대인 관계와 뛰어난 친화력을 무기로 다양한 인맥을 통해 뜻밖의 재물과 행운을 얻습니다.`,
          key_features: { 'jaw_shape': 'round', 'eye_distance': 'wide', 'mouth_size': 'large' }
      },
      {
          id: 'camel',
          name: '낙타상',
          emoji: '🐫',
          celebrities: ['안영미', '이적'],
          description: `<strong>[성격 및 특징]</strong><br>이국적이고 깊게 패인 눈매와 다소 긴 콧대를 가졌습니다. 어떠한 고난에도 굴하지 않는 인내심과 끈기를 지녔으며, 주변 환경에 흔들림 없이 묵묵히 자신의 길을 개척하는 스타일입니다.<br><br><strong>[연애 및 결혼]</strong><br>한 번 맺은 인연을 매우 소중히 여기며, 오랜 시간 동안 변치 않는 사랑을 유지하는 진정성 있는 순애보입니다.<br><br><strong>[진로 및 직업]</strong><br>무역, 해외 비즈니스, 중장기 프로젝트 관리자, 탐험가 등 고도의 지구력과 스케일이 큰 업무에 적합합니다.<br><br><strong>[재물운]</strong><br>초기에는 고생이 따를 수 있으나 끈기로 이를 극복하며, 말년으로 갈수록 큰 부를 축적하는 대기만성형 부자 관상입니다.`,
          key_features: { 'nose_width': 'wide', 'jaw_shape': 'sharp', 'eye_slant': 'neutral' }
      },
      {
          id: 'turtle',
          name: '거북이상',
          emoji: '🐢',
          celebrities: ['하연수', '솔라(마마무)'],
          description: `<strong>[성격 및 특징]</strong><br>둥글고 부드러운 얼굴형에 가로로 넓게 퍼지는 환하고 온화한 미소가 가장 큰 매력입니다. 신중하고 차분하며 어떤 위기 상황에서도 쉽게 흔들리지 않는 굳건함을 지녀 타인에게 깊은 신뢰를 줍니다.<br><br><strong>[연애 및 결혼]</strong><br>마음을 열기까지 느리지만 매우 확실하게 키워가는 편이며, 믿음직하고 따뜻한 가정을 꾸리는 데 탁월합니다.<br><br><strong>[진로 및 직업]</strong><br>교육자, 공무원, 법조인, 재무 상담가 등 신뢰감과 성실함이 그 어떤 능력보다 중요하게 여겨지는 직업에서 존경받습니다.<br><br><strong>[재물운]</strong><br>위험한 투기보다는 꾸준한 저축과 안전 자산을 선호하며, 시간이 흐를수록 흔들리지 않는 탄탄한 재산을 굳힙니다.`,
          key_features: { 'jaw_shape': 'round', 'eye_slant': 'neutral', 'mouth_size': 'large' }
      }


]
    };
  }

  async loadDatabase() {
    return Promise.resolve();
  }

  calculateDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  calculateAngle(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  }

  extractGeometricFeatures(landmarks) {
    const LEFT_EYE_OUT = landmarks[226];
    const LEFT_EYE_IN = landmarks[133];
    const LEFT_EYE_TOP = landmarks[159];
    const LEFT_EYE_BOTTOM = landmarks[145];
    const RIGHT_EYE_IN = landmarks[362];
    const RIGHT_EYE_OUT = landmarks[446];
    
    // 오관(五官)과 삼정(三停)을 구성하는 우주의 좌표점
    const NOSE_LEFT = landmarks[129];
    const NOSE_RIGHT = landmarks[358];
    const NOSE_TIP = landmarks[2];
    const GLABELLA = landmarks[168]; 
    const CHIN = landmarks[152];
    const JAW_LEFT = landmarks[149];
    const JAW_RIGHT = landmarks[378];
    const FOREHEAD = landmarks[10];
    const MOUTH_LEFT = landmarks[61];
    const MOUTH_RIGHT = landmarks[291];
    const MOUTH_TOP = landmarks[13];
    const MOUTH_BOTTOM = landmarks[14];
    const EAR_LEFT_TOP = landmarks[127];
    const EAR_LEFT_BOTTOM = landmarks[132];

    const faceLength = this.calculateDistance(FOREHEAD, CHIN);
    const faceWidth = this.calculateDistance(JAW_LEFT, JAW_RIGHT);

    const eyeWidth = this.calculateDistance(LEFT_EYE_IN, LEFT_EYE_OUT);
    const eyeHeight = this.calculateDistance(LEFT_EYE_TOP, LEFT_EYE_BOTTOM);
    const eyeRatio = eyeWidth / (eyeHeight || 1); 
    
    // 눈꼬리의 기울기 역학 (관상학적 음양의 균형을 수치화)
    // OUT.y가 작을수록(위로 올라갈수록) 기울기 상승. 직관성을 위해 * 100을 곱해 -10 ~ +10의 임계 스케일로 맞춤
    const leftSlant = (LEFT_EYE_OUT.y - LEFT_EYE_IN.y) * 100;
    const rightSlant = (RIGHT_EYE_OUT.y - RIGHT_EYE_IN.y) * 100;
    // 음수면 꼬리가 위로 솟구친 형상(음의 기운/호랑이·고양이상), 양수면 아래로 처진 형상(양의 기운/강아지·사슴상)
    const eyeSlantAngle = (leftSlant + rightSlant) / 2;

    // 미간(눈 사이)의 거리 계산 (관상학적 인당의 넓이)
    const interEyeDistance = this.calculateDistance(LEFT_EYE_IN, RIGHT_EYE_IN);
    const eyeDistRatio = interEyeDistance / (eyeWidth || 1);

    const noseWidth = this.calculateDistance(NOSE_LEFT, NOSE_RIGHT);
    const noseLength = this.calculateDistance(GLABELLA, NOSE_TIP);
    const noseRatio = noseLength / (noseWidth || 1); 
    const noseWidthRatio = noseWidth / (interEyeDistance || 1);
    const noseZ = Math.abs((NOSE_TIP.z || 0) - (JAW_LEFT.z || 0));

    const mouthWidth = this.calculateDistance(MOUTH_LEFT, MOUTH_RIGHT);
    const mouthCenterY = (MOUTH_TOP.y + MOUTH_BOTTOM.y) / 2;
    const mouthCornerY = (MOUTH_LEFT.y + MOUTH_RIGHT.y) / 2;
    // 앙월구(초승달) vs 복선구 (입꼬리의 고조를 결정짓는 운명의 곡선)
    const mouthCurve = mouthCenterY - mouthCornerY; 

    const earHeight = this.calculateDistance(EAR_LEFT_TOP, EAR_LEFT_BOTTOM);

    const upper_len = this.calculateDistance(FOREHEAD, GLABELLA);
    const middle_len = this.calculateDistance(GLABELLA, NOSE_TIP);
    const lower_len = this.calculateDistance(NOSE_TIP, CHIN);
    const total_samjung = upper_len + middle_len + lower_len;

    return {
      faceRatio: faceWidth / (faceLength||1), // 0.72(Sharp) ~ 0.88(Wide)
      faceLength: faceLength,
      faceWidth: faceWidth,
      eyeRatio: eyeRatio, 
      eyeSlant: eyeSlantAngle, // -5(Upward) ~ +5(Downward)
      eyeDistRatio: eyeDistRatio, // 0.8(Narrow) ~ 1.2(Wide)
      eyeHeight: eyeHeight,
      eyeWidth: eyeWidth,
      noseRatio: noseRatio,
      noseWidthRatio: noseWidthRatio, // 0.7(Narrow) ~ 1.0(Wide)
      noseZ: noseZ,
      noseWidth: noseWidth,
      mouthCurve: mouthCurve,
      mouthRatio: mouthWidth / (noseWidth||1), // 1.1(Small) ~ 1.6(Large)
      mouthWidth: mouthWidth,
      earRatio: earHeight / (faceLength||1),
      earPosition: EAR_LEFT_TOP.y < LEFT_EYE_OUT.y ? "high" : "normal",
      jawSquareness: faceWidth / (faceLength || 1),
      // 여성형 판별용 추가 수치
      eyeToFaceRatio: (eyeWidth * 2 + interEyeDistance) / (faceWidth || 1), // 눈이 얼굴 대비 얼마나 큰지
      lipThickness: this.calculateDistance(MOUTH_TOP, MOUTH_BOTTOM),
      chinLength: lower_len / (total_samjung || 1), // 하정 비율 (털선 길이)
      samjung: {
        upper: upper_len / total_samjung,
        middle: middle_len / total_samjung,
        lower: lower_len / total_samjung
      }
    };
  }

  // ============================================
  // 여성형 얼굴 정밀 판별 함수 (0~100 점수)
  // 랜드마크 기하학적 특성으로 성별 구분 없이 자동 감지
  // ============================================
  detectFeminineFace(features) {
    let score = 0;

    // 1. 얼굴 대비 눈 크기 비율 (여성은 눈이 얼굴 대비 더 큼)
    if (features.eyeToFaceRatio >= 0.72) score += 20;
    else if (features.eyeToFaceRatio >= 0.65) score += 12;
    else if (features.eyeToFaceRatio >= 0.60) score += 5;

    // 2. 코 너비 (여성은 코가 좁고 작음)
    if (features.noseWidthRatio <= 0.82) score += 18;
    else if (features.noseWidthRatio <= 0.90) score += 12;
    else if (features.noseWidthRatio <= 0.95) score += 6;

    // 3. 눈 세로 비율 (여성은 눈이 더 둥글고 큼 - eyeRatio가 더 낮음)
    if (features.eyeRatio <= 2.3) score += 18;
    else if (features.eyeRatio <= 2.6) score += 12;
    else if (features.eyeRatio <= 2.9) score += 6;

    // 4. 입 크기 (여성은 입이 작고 단정)
    if (features.mouthRatio <= 1.25) score += 15;
    else if (features.mouthRatio <= 1.35) score += 10;
    else if (features.mouthRatio <= 1.42) score += 4;

    // 5. 하정(털선) 비율 (여성은 털이 짧고 갸름 → 하정 비율이 작음)
    if (features.chinLength <= 0.32) score += 15;
    else if (features.chinLength <= 0.35) score += 8;
    else if (features.chinLength <= 0.37) score += 3;

    // 6. 미간 거리 (여성은 미간이 넓음)
    if (features.eyeDistRatio >= 1.10) score += 14;
    else if (features.eyeDistRatio >= 1.02) score += 8;
    else if (features.eyeDistRatio >= 0.95) score += 3;

    return Math.min(100, score); // 0~100
  }

      // ============================================
    //  영혼의 그림자 (Karma Shadow) 비술 계산
    // ============================================
    calculateKarmaShadow(landmarks) {
      // 1. 재물 누수의 상 (노공/露孔)
      // 코끝(NOSE_TIP: 2)과 콧볼 하단(NOSE_BOTTOM: 164) 비교. 정면에서 기운이 새어나갈 각도 (들창코)
      const NOSE_TIP = landmarks[2];
      const NOSE_BOTTOM = landmarks[164];
      const NOSE_LEFT = landmarks[129];
      const NOSE_RIGHT = landmarks[358];
      const noseWidth = this.calculateDistance(NOSE_LEFT, NOSE_RIGHT);
      // 코끝이 위로 들릴수록(y값이 작을수록) 코 평수 대비 들린 비율 증가
      const upturnedRatio = (NOSE_BOTTOM.y - NOSE_TIP.y) / (noseWidth || 1);
      let karmaNose = 0;
      // Strict: 들창코 = upturnedRatio > 0.12 (정면 기준 콧구멍 30% 이상 노출 수준)
      if (upturnedRatio > 0.12) {
        karmaNose = Math.min(100, Math.pow((upturnedRatio - 0.12) * 120, 2));
      }

      // 2. 파멸과 투쟁의 상 (사백안/하백안)
      // 눈의 세로 폭이 가로에 비해 비정상적으로 크면 흰자위가 흉하게 드러남
      const LEFT_EYE_IN = landmarks[133];
      const LEFT_EYE_OUT = landmarks[226];
      const LEFT_EYE_TOP = landmarks[159];
      const LEFT_EYE_BOTTOM = landmarks[145];
      const eyeWidth = this.calculateDistance(LEFT_EYE_IN, LEFT_EYE_OUT);
      const eyeHeight = this.calculateDistance(LEFT_EYE_TOP, LEFT_EYE_BOTTOM);
      const eyeOpenness = eyeHeight / (eyeWidth || 1);
      let karmaEye = 0;
      if (eyeOpenness > 0.45) {
        // 백안이 드러나는 살기. 파란만장 지수 폭발
        karmaEye = Math.min(100, Math.pow((eyeOpenness - 0.45) * 45, 2));
      }

      // 3. 고독과 쇠퇴의 상 (극단적 복선구)
      // 입꼬리가 배가 뒤집힌 듯 깊게 쳐진 닫힌 입매
      const MOUTH_LEFT = landmarks[61];
      const MOUTH_RIGHT = landmarks[291];
      const MOUTH_TOP = landmarks[13];
      const MOUTH_BOTTOM = landmarks[14];
      const mouthCenterY = (MOUTH_TOP.y + MOUTH_BOTTOM.y) / 2;
      const mouthCornerY = (MOUTH_LEFT.y + MOUTH_RIGHT.y) / 2;
      const mouthCurve = mouthCenterY - mouthCornerY; // 음수(-) 일수록 깊게 쳐짐
      const lipThickness = this.calculateDistance(MOUTH_TOP, MOUTH_BOTTOM);
      const mouthWidth = this.calculateDistance(MOUTH_LEFT, MOUTH_RIGHT);
      const lipRatio = lipThickness / (mouthWidth || 1);
      let karmaMouth = 0;
      if (mouthCurve < 0) { // 쳐진 입매
        const curvePenalty = Math.pow(Math.abs(mouthCurve) * 200, 2); // 가파를수록 강력
        const thinPenalty = lipRatio < 0.15 ? Math.pow((0.15 - lipRatio) * 100, 2) : 0; // 얇은 입술
        karmaMouth = Math.min(100, curvePenalty + thinPenalty);
      }

      // 4. 편협과 막힘의 상 (명궁 협소)
      // 두 눈썹 사이 거리가 눈의 폭에 비해 억눌려 있음
      const RIGHT_EYE_IN = landmarks[362];
      const interEyeDist = this.calculateDistance(LEFT_EYE_IN, RIGHT_EYE_IN);
      const glabellaRatio = interEyeDist / (eyeWidth || 1);
      let karmaGlabella = 0;
      if (glabellaRatio < 1.0) { // 명궁이 좁음
        // 영적인 통로가 닫힌 고난 지수
        karmaGlabella = Math.min(100, Math.pow((1.0 - glabellaRatio) * 40, 2));
      }

      // 5. 말년 고독의 상 (빈약한 하관과 깎인 턱)
      // 턱선의 각도가 가파르고(삼각함수 y/x) 빈약하게 뒤로 밀림(z축 비율)
      const CHIN = landmarks[152];
      const JAW_LEFT = landmarks[149];
      const JAW_RIGHT = landmarks[378];
      const jawDropY = CHIN.y - JAW_LEFT.y;
      const jawStepX = Math.abs(CHIN.x - JAW_LEFT.x);
      const jawAngle = Math.atan2(jawDropY, jawStepX) * (180 / Math.PI); // 가파른 각도
      let karmaJaw = 0;
      if (jawAngle > 45) { // 하관 피라미드각이 예리하고 가파를 때
        karmaJaw = Math.min(100, Math.pow((jawAngle - 45) * 1.5, 2)); // 지지 기반 붕괴 지수
      }

      //  전체 업보(Karma Shadow Score) 집대성 (0~100)
      const totalKarma = Math.min(100, (karmaNose + karmaEye + karmaMouth + karmaGlabella + karmaJaw) / 5);

      // 운명 개운법 (심상 처방)
      let karmaAdvice = "부모가 물려준 음덕(陰德)이 훌륭하여 얼굴에 머무는 탁한 그림자가 거의 없습니다. 지금의 온화한 마음(心相)을 잃지 말고 베푸는 삶을 영위하십시오.";
      if (totalKarma >= 15 && totalKarma < 40) {
        karmaAdvice = "삶의 작은 풍파가 얼굴의 굴곡으로 서서히 흔적을 남기고 있습니다. 매사 너그러운 마음(寬心)과 유연한 태도로 얽힌 기운을 풀어낸다면 흉은 길로 바뀔 것입니다.";
      } else if (totalKarma >= 40) {
        karmaAdvice = "오만의 뿔과 투쟁의 그림자가 관상에 깊게 드리워 노년의 쇠퇴(고독, 재물 흩어짐)가 예견됩니다. 허나 <b>관상은 심상을 이기지 못하는 법(相不如心)</b>. 매일 거울 앞에서 하심(下心)하고 감사의 미소(笑門萬福來)를 연습한다면 운명의 거대한 중력장조차 끊어낼 수 있을 것입니다.";
      }

      return {
        score: totalKarma.toFixed(1),
        nose: karmaNose.toFixed(1),
        eye: karmaEye.toFixed(1),
        mouth: karmaMouth.toFixed(1),
        glabella: karmaGlabella.toFixed(1),
        jaw: karmaJaw.toFixed(1),
        advice: karmaAdvice
      };
    }

  // ============================================
  // 안좋은 관상(凶相) 정밀 감지 시스템
  // 전통 관상학 10대 흉상 종합 분석
  // ============================================
  detectNegativePhysiognomy(landmarks, features) {
    const negativeTraits = [];

    // ── 랜드마크 추출 ──
    const LEFT_EYE_IN = landmarks[133];
    const LEFT_EYE_OUT = landmarks[226];
    const LEFT_EYE_TOP = landmarks[159];
    const LEFT_EYE_BOTTOM = landmarks[145];
    const RIGHT_EYE_IN = landmarks[362];
    const RIGHT_EYE_OUT = landmarks[446];
    const RIGHT_EYE_TOP = landmarks[386];
    const RIGHT_EYE_BOTTOM = landmarks[374];
    const NOSE_TIP = landmarks[2];
    const NOSE_BOTTOM = landmarks[164];
    const NOSE_LEFT = landmarks[129];
    const NOSE_RIGHT = landmarks[358];
    const MOUTH_LEFT = landmarks[61];
    const MOUTH_RIGHT = landmarks[291];
    const MOUTH_TOP = landmarks[13];
    const CHIN = landmarks[152];
    const FOREHEAD = landmarks[10];

    const eyeWidth = this.calculateDistance(LEFT_EYE_IN, LEFT_EYE_OUT);
    const eyeHeight = this.calculateDistance(LEFT_EYE_TOP, LEFT_EYE_BOTTOM);
    const noseWidth = this.calculateDistance(NOSE_LEFT, NOSE_RIGHT);
    const faceLength = this.calculateDistance(FOREHEAD, CHIN);

    // ─── 1. 삼백안/사백안 (三白眼/四白眼) ───
    // 눈의 세로 폭이 가로 대비 과도하게 넓어 흰자위가 3~4방향으로 노출
    const eyeOpenness = eyeHeight / (eyeWidth || 1);
    let sanpakuSeverity = 0;
    if (eyeOpenness > 0.40) {
      sanpakuSeverity = Math.min(100, ((eyeOpenness - 0.40) / 0.18) * 100);
    }
    negativeTraits.push({
      name: '삼백안/사백안', hanja: '三白眼/四白眼', icon: '👁️‍🗨️',
      severity: Math.round(sanpakuSeverity), detected: sanpakuSeverity >= 25,
      description: '눈의 세로 폭이 넓어 흰자위(白眼)가 세 방향 이상으로 드러나는 형상입니다. 관상학에서는 <b>충동적 기질, 예기치 못한 재난, 배은망덕의 기운</b>이 서린 징조로 봅니다.',
      advice: '매사 감정을 다스리고 은혜를 갚는 습관(報恩行)을 들이면 살기(殺氣)가 덕(德)으로 변합니다.'
    });

    // ─── 2. 삼각안 (三角眼) ───
    // 눈꼬리가 급격히 치켜올라가며 눈 전체가 삼각형 모양
    let triangleEyeSeverity = 0;
    const es = features.eyeSlant;
    const er = features.eyeRatio;
    if (es <= -5.0 && er <= 2.8) {
      triangleEyeSeverity = Math.min(100,
        ((-5.0 - es) / 5.0 * 50) + ((2.8 - er) / 0.8 * 50));
    } else if (es <= -4.0) {
      triangleEyeSeverity = Math.min(60, ((-4.0 - es) / 6.0) * 60);
    }
    negativeTraits.push({
      name: '삼각안', hanja: '三角眼', icon: '🔺',
      severity: Math.round(Math.max(0, triangleEyeSeverity)), detected: triangleEyeSeverity >= 25,
      description: '눈꼬리가 급격히 치켜올라가며 눈 전체가 삼각형 모양을 이루는 형상입니다. <b>의심이 많고 냉혹하며, 잔인한 성정</b>이 서린 흉상(凶相)으로 봅니다.',
      advice: '따뜻한 시선과 온화한 눈웃음을 의식적으로 연습하면 날카로운 기운이 누그러집니다.'
    });

    // ─── 3. 노공/들창코 (露孔) ───
    // 코끝이 위로 들려 콧구멍이 정면에서 노출 → 재물 누수
    const upturnedRatio = (NOSE_BOTTOM.y - NOSE_TIP.y) / (noseWidth || 1);
    let noseSeverity = 0;
    // Strict Definition: 들창코는 upturnedRatio > 0.12 이상에서만 인정
    // 단순히 들린 코(들중코/표준코)는 들창코로 오진하지 않는다
    if (upturnedRatio > 0.12) {
      noseSeverity = Math.min(100, ((upturnedRatio - 0.12) / 0.10) * 100);
    }
    negativeTraits.push({
      name: '노공(들창코)', hanja: '露孔', icon: '💸',
      severity: Math.round(noseSeverity), detected: noseSeverity >= 40,
      description: '코끝이 위로 들려 콧구멍이 정면에서 훤히 보이는 형상입니다. 재물의 기운이 콧구멍을 통해 줄줄 새어나가 <b>모은 재산을 지키기 어렵고 낭비벽</b>이 심해지는 흉상입니다.',
      advice: '저축 습관과 절약 의식을 키우고, 큰돈을 다룰 때 반드시 신뢰할 수 있는 조언자를 곁에 두십시오.'
    });

    // ─── 4. 인중 단소 (人中短小) ───
    // 인중(코 아래~윗입술)이 지나치게 짧거나 불분명
    const philtrumLength = this.calculateDistance(NOSE_TIP, MOUTH_TOP);
    const philtrumRatio = philtrumLength / (faceLength || 1);
    let philtrumSeverity = 0;
    if (philtrumRatio < 0.06) {
      philtrumSeverity = Math.min(100, ((0.06 - philtrumRatio) / 0.04) * 100);
    } else if (philtrumRatio < 0.09) {
      philtrumSeverity = Math.min(50, ((0.09 - philtrumRatio) / 0.05) * 50);
    }
    negativeTraits.push({
      name: '인중 단소', hanja: '人中短小', icon: '⏳',
      severity: Math.round(philtrumSeverity), detected: philtrumSeverity >= 25,
      description: '인중(코 아래에서 윗입술까지의 도랑)이 지나치게 짧거나 불분명한 형상입니다. <b>생명력과 정력이 약하고, 자녀운이 박하며, 말년의 건강</b>에 주의가 필요한 상입니다.',
      advice: '규칙적인 운동과 충분한 수면으로 정기(精氣)를 보충하고, 봉사활동으로 음덕(陰德)을 쌓으십시오.'
    });

    // ─── 5. 이마 협소/함몰 (額窄) ───
    // 상정(上停)의 이마가 지나치게 좁음 → 초년운 불리
    let foreheadSeverity = 0;
    const upperRatio = features.samjung ? features.samjung.upper : 0.333;
    if (upperRatio < 0.28) {
      foreheadSeverity = Math.min(100, ((0.28 - upperRatio) / 0.10) * 100);
    }
    negativeTraits.push({
      name: '이마 협소/함몰', hanja: '額窄', icon: '📐',
      severity: Math.round(foreheadSeverity), detected: foreheadSeverity >= 25,
      description: '상정(上停)의 이마가 지나치게 좁거나 뒤로 밀려 있는 형상입니다. <b>초년운(15~30세)이 험난하고, 부모 덕이 약하며, 학업에서 고비</b>가 많은 상입니다.',
      advice: '독립심을 일찍 키우고 자기 계발에 꾸준히 투자하면, 중년 이후 크게 성공합니다.'
    });

    // ─── 6. 구각하수 (口角下垂) ───
    // 입꼬리가 과도하게 아래로 처짐 → 고독, 불화
    let mouthDownSeverity = 0;
    if (features.mouthCurve < -0.002) {
      mouthDownSeverity = Math.min(100,
        ((Math.abs(features.mouthCurve) - 0.002) / 0.015) * 100);
    }
    negativeTraits.push({
      name: '구각하수(복선구)', hanja: '口角下垂', icon: '😞',
      severity: Math.round(mouthDownSeverity), detected: mouthDownSeverity >= 25,
      description: '입꼬리가 아래로 깊이 처져 불만족과 부정의 기운이 서린 형상입니다. <b>주위 사람과의 불화, 고독감, 말년의 쇠퇴</b>가 우려되는 상입니다.',
      advice: '의식적으로 미소를 짓는 연습(笑門萬福來)을 매일 하면 복선의 기운이 복록으로 전환됩니다.'
    });

    // ─── 7. 안면 비대칭 (面偏) ───
    // 좌우 얼굴의 눈·입 높낮이 불일치
    const leftEyeH = this.calculateDistance(LEFT_EYE_TOP, LEFT_EYE_BOTTOM);
    const rightEyeH = this.calculateDistance(RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM);
    const eyeAsymmetry = Math.abs(leftEyeH - rightEyeH) / (Math.max(leftEyeH, rightEyeH) || 1);
    const mouthAsymmetry = Math.abs(MOUTH_LEFT.y - MOUTH_RIGHT.y) / (faceLength || 1);
    const asymmetryScore = (eyeAsymmetry * 60 + mouthAsymmetry * 200) / 2;
    let asymmetrySeverity = Math.min(100, asymmetryScore * 5);
    negativeTraits.push({
      name: '안면 비대칭', hanja: '面偏', icon: '↔️',
      severity: Math.round(asymmetrySeverity), detected: asymmetrySeverity >= 25,
      description: '좌우 안면의 균형이 무너져 눈·입의 높낮이가 어긋나는 형상입니다. <b>내면의 갈등, 이중적 성격, 대인관계의 마찰</b>이 잦아질 수 있는 상입니다.',
      advice: '명상과 자기 성찰을 통해 내면의 균형을 찾으면 외모에도 조화로운 기운이 깃듭니다.'
    });

    // ─── 8. 하관 빈약 (下顎薄) ───
    // 턱과 하관이 지나치게 빈약 → 만년운 쇠약
    let jawSeverity = 0;
    if (features.chinLength < 0.28) {
      jawSeverity = Math.min(100, ((0.28 - features.chinLength) / 0.10) * 100);
    }
    negativeTraits.push({
      name: '하관 빈약', hanja: '下顎薄', icon: '🍂',
      severity: Math.round(jawSeverity), detected: jawSeverity >= 25,
      description: '하정(下停)의 턱·하관이 지나치게 빈약하고 뒤로 밀린 형상입니다. <b>만년운(50세 이후)이 쇠약하고, 부하 복이 적으며, 노후 재산</b>이 얇아질 우려가 있는 상입니다.',
      advice: '미리 노후를 대비하는 재테크와 건강 관리에 힘쓰고, 후배와 아랫사람에게 덕을 베푸십시오.'
    });

    // ─── 9. 이소박 (耳小薄) ───
    // 귀가 얼굴 대비 지나치게 작고 얇음 → 건강 허약, 조상 덕 부족
    let earSeverity = 0;
    if (features.earRatio < 0.16) {
      earSeverity = Math.min(100, ((0.16 - features.earRatio) / 0.08) * 100);
    }
    negativeTraits.push({
      name: '이소박', hanja: '耳小薄', icon: '👂',
      severity: Math.round(earSeverity), detected: earSeverity >= 25,
      description: '귀가 얼굴에 비해 지나치게 작고 얇은 형상입니다. <b>건강 체질이 허약하고, 초년의 고생이 많으며, 조상 음덕</b>이 부족한 상입니다.',
      advice: '체력 단련과 영양 관리에 특별히 신경 쓰고, 적극적으로 인맥을 넓혀 인복을 보강하십시오.'
    });

    // ─── 10. 명궁 협소 (命宮狹) ───
    // 두 눈썹 사이(인당/명궁)가 지나치게 좁음 → 도량 협소, 편견
    const interEyeDist = this.calculateDistance(LEFT_EYE_IN, RIGHT_EYE_IN);
    const glabellaRatio = interEyeDist / (eyeWidth || 1);
    let glabellaSeverity = 0;
    if (glabellaRatio < 1.05) {
      glabellaSeverity = Math.min(100, ((1.05 - glabellaRatio) / 0.30) * 100);
    }
    negativeTraits.push({
      name: '명궁 협소', hanja: '命宮狹', icon: '⛓️',
      severity: Math.round(glabellaSeverity), detected: glabellaSeverity >= 25,
      description: '두 눈썹 사이(명궁/印堂)가 지나치게 좁아 기운의 흐름이 막힌 형상입니다. <b>도량이 좁고 편협하며, 스트레스에 취약하고, 대인관계에서 마찰</b>이 잦은 상입니다.',
      advice: '마음을 넓히는 수양(寬心修養)을 하고 미간을 찡그리지 않는 습관을 들이면 기운이 트입니다.'
    });

    // ── 종합 판정 ──
    const detectedTraits = negativeTraits.filter(t => t.detected);
    const totalSeverity = detectedTraits.reduce((sum, t) => sum + t.severity, 0);
    const overallScore = detectedTraits.length > 0
      ? Math.min(100, Math.round(totalSeverity / detectedTraits.length))
      : 0;

    let overallAdvice = '';
    if (detectedTraits.length === 0) {
      overallAdvice = '축하합니다! 얼굴에 뚜렷한 흉상(凶相)이 감지되지 않았습니다. 타고난 복상(福相)을 감사히 여기며, 겸손하게 심상(心相)을 가꾸어 가시기 바랍니다.';
    } else if (detectedTraits.length <= 2) {
      overallAdvice = '소수의 주의 징후가 감지되었으나, 대부분의 사람에게 하나둘은 나타나는 자연스러운 범위입니다. 해당 부분을 의식하고 개운법을 실천하면 충분히 보완됩니다.';
    } else if (detectedTraits.length <= 4) {
      overallAdvice = '여러 주의 징후가 복합적으로 나타나고 있습니다. 그러나 <b>관상은 심상을 이기지 못하는 법(相不如心)</b>입니다. 꾸준한 선행과 마음 수양으로 반드시 운명을 바꿀 수 있습니다.';
    } else {
      overallAdvice = '다수의 주의 징후가 감지되었습니다. 이는 선천적 조건일 뿐, 후천적 노력과 심상(心相) 수양으로 <b>얼마든지 극복 가능</b>합니다. 미소, 봉사, 감사의 삶을 실천하면 흉한 기운이 복으로 변합니다.';
    }

    return {
      traits: negativeTraits,
      detectedTraits: detectedTraits,
      detectedCount: detectedTraits.length,
      totalCount: negativeTraits.length,
      overallScore: overallScore,
      overallAdvice: overallAdvice
    };
  }

  // ============================================
  // 얼굴 점(點/痣) 위치별 관상학적 해석 시스템
  // 전통 관상학 12궁(十二宮) 기반 점 위치 분석
  // ============================================
  analyzeMolePositions(landmarks, features) {
    // 주요 랜드마크 추출
    const FOREHEAD = landmarks[10];
    const GLABELLA = landmarks[168];
    const NOSE_TIP = landmarks[2];
    const CHIN = landmarks[152];
    const LEFT_EYE_IN = landmarks[133];
    const LEFT_EYE_OUT = landmarks[226];
    const RIGHT_EYE_IN = landmarks[362];
    const RIGHT_EYE_OUT = landmarks[446];
    const MOUTH_LEFT = landmarks[61];
    const MOUTH_RIGHT = landmarks[291];
    const MOUTH_TOP = landmarks[13];
    const MOUTH_BOTTOM = landmarks[14];
    const JAW_LEFT = landmarks[149];
    const JAW_RIGHT = landmarks[378];
    const NOSE_LEFT = landmarks[129];
    const NOSE_RIGHT = landmarks[358];
    const LEFT_CHEEK = landmarks[116];
    const RIGHT_CHEEK = landmarks[345];
    const LEFT_EYEBROW_IN = landmarks[107];
    const RIGHT_EYEBROW_IN = landmarks[336];
    const LEFT_EYEBROW_OUT = landmarks[70];
    const RIGHT_EYEBROW_OUT = landmarks[300];
    const NOSE_BRIDGE = landmarks[6];
    const PHILTRUM = landmarks[164]; // 인중

    const faceLength = this.calculateDistance(FOREHEAD, CHIN);
    const faceWidth = this.calculateDistance(JAW_LEFT, JAW_RIGHT);

    // ── 12궁 얼굴 영역 정의 (랜드마크 좌표 기반) ──
    const zones = [
      {
        id: 'forehead_center', name: '이마 중앙 (관록궁)', icon: '👑',
        position: '천정(天庭) — 이마의 한가운데',
        region: { cx: FOREHEAD.x, cy: FOREHEAD.y, radius: faceLength * 0.06 },
        goodMole: {
          title: '🌟 출세·관록의 점 (吉痣)',
          desc: '이마 한가운데 살아있는 점이 있으면 <b>천부적 리더십과 출세운</b>이 태어날 때부터 부여된 상입니다. 관직이나 기업에서 높은 위치에 오르며, 특히 <b>30대 중반 이후 큰 발복</b>이 예상됩니다.',
          advice: '점의 위치가 정중앙에 가까울수록 길(吉)합니다. 공직, 경영, 정치 분야에서 두각을 나타냅니다.'
        },
        badMole: {
          title: '⚠️ 시비·구설의 점 (凶痣)',
          desc: '사점(死痣·검고 칙칙한 점)이면 <b>윗사람과의 갈등, 직장에서의 구설수</b>가 잦아집니다. 승진 앞에서 뜻하지 않은 장애물이 반복될 수 있습니다.',
          advice: '겸손과 인내를 최우선 덕목으로 삼고, 공적인 자리에서의 발언에 각별히 주의하십시오.'
        }
      },
      {
        id: 'forehead_left', name: '이마 좌측 (천이궁)', icon: '✈️',
        position: '천이궁(遷移宮) — 이마 왼쪽 가장자리',
        region: { cx: LEFT_EYEBROW_OUT.x, cy: FOREHEAD.y, radius: faceLength * 0.05 },
        goodMole: {
          title: '🌟 이동·여행 대길의 점',
          desc: '이마 좌측에 활점(活痣·윤기 있는 점)이 있으면 <b>타향이나 해외에서 크게 성공</b>하는 이동운이 강합니다. 고향을 떠나면 오히려 큰 행운이 찾아옵니다.',
          advice: '현재 위치에 안주하지 말고 넓은 세상으로 도전하면 기대 이상의 성과를 얻습니다.'
        },
        badMole: {
          title: '⚠️ 불안정·방랑의 점',
          desc: '사점이면 <b>거주지가 불안정하고 이사가 잦으며</b>, 여행 중 사고나 분실에 주의해야 합니다.',
          advice: '중요한 이동 결정은 신중히 하고, 여행 시 안전에 각별히 유의하십시오.'
        }
      },
      {
        id: 'between_brows', name: '미간 (명궁/인당)', icon: '🔮',
        position: '명궁(命宮) — 두 눈썹 사이 인당',
        region: { cx: GLABELLA.x, cy: GLABELLA.y, radius: faceLength * 0.04 },
        goodMole: {
          title: '🌟 제3의 눈 · 직관의 점',
          desc: '인당에 붉거나 밝은 점이 있으면 <b>초월적 직관력과 통찰력</b>을 타고난 상입니다. 종교, 철학, 예술, 의료 분야에서 남다른 천재성을 발휘합니다.',
          advice: '영적 수양과 명상을 통해 제3의 눈을 더욱 깨우면 놀라운 통찰이 열립니다.'
        },
        badMole: {
          title: '⚠️ 결혼·건강 주의의 점',
          desc: '사점이면 <b>결혼 시기가 늦어지거나 배우자와의 갈등</b>이 잦습니다. 또한 호흡기·두통 등 만성 질환에 주의해야 합니다.',
          advice: '배우자에게 양보와 이해를 먼저 실천하고, 정기 건강검진을 게을리하지 마십시오.'
        }
      },
      {
        id: 'left_eye_tail', name: '왼쪽 눈꼬리 (처첩궁)', icon: '💕',
        position: '어미(魚尾)/처첩궁 — 왼쪽 눈 끝부분',
        region: { cx: LEFT_EYE_OUT.x, cy: LEFT_EYE_OUT.y, radius: faceLength * 0.035 },
        goodMole: {
          title: '🌟 도화·매력의 점',
          desc: '눈꼬리에 활점이 있으면 <b>이성에게 대단히 인기가 매우 많은 도화(桃花)의 상</b>입니다. 연애운이 풍부하고 로맨틱한 만남이 끊이지 않습니다.',
          advice: '넘치는 이성 인연을 현명하게 관리하여 진정한 인연을 알아보는 눈을 기르십시오.'
        },
        badMole: {
          title: '⚠️ 색난·이별의 점',
          desc: '사점이면 <b>연애에서의 삼각관계, 이별, 배우자의 외도</b> 등 감정적 시련이 반복될 수 있습니다.',
          advice: '감정에 휩쓸려 성급한 결정을 내리지 말고, 상대를 충분히 알아간 후 관계를 깊이 하십시오.'
        }
      },
      {
        id: 'under_left_eye', name: '왼쪽 눈 아래 (누당/자녀궁)', icon: '👶',
        position: '누당(淚堂)/자녀궁 — 왼쪽 눈 바로 하단',
        region: { cx: LEFT_EYE_IN.x, cy: LEFT_EYE_IN.y + faceLength * 0.05, radius: faceLength * 0.04 },
        goodMole: {
          title: '🌟 자녀 복·감성의 점',
          desc: '누당에 활점이 있으면 <b>자녀운이 좋고 효도하는 자식을 두며</b>, 감수성이 풍부하여 예술적 재능이 뛰어납니다.',
          advice: '자녀 교육에 정성을 쏟으면 훌륭한 자녀로 성장하여 크나큰 효도를 받습니다.'
        },
        badMole: {
          title: '⚠️ 자녀 걱정·눈물의 점',
          desc: '사점이면 <b>자녀로 인한 근심 걱정이 많거나</b>, 감정이 예민하여 쉽게 눈물을 흘리는 다감한 성정입니다.',
          advice: '자녀와의 소통을 강화하고, 지나친 감정 이입을 절제하는 수양을 하십시오.'
        }
      },
      {
        id: 'nose_bridge', name: '콧대 (질액궁)', icon: '🏥',
        position: '산근(山根)/질액궁 — 코 뿌리·콧대',
        region: { cx: NOSE_BRIDGE.x, cy: NOSE_BRIDGE.y, radius: faceLength * 0.035 },
        goodMole: {
          title: '🌟 건강 장수·극복의 점',
          desc: '산근에 밝은 활점이 있으면 <b>질병을 이겨내는 강한 생명력</b>과 회복력을 지녔습니다. 위기를 기회로 바꾸는 비범한 역경 극복 능력이 있습니다.',
          advice: '건강 관리에 신경 쓰면 타고난 회복력이 배가 되어 장수합니다.'
        },
        badMole: {
          title: '⚠️ 건강·배우자 주의의 점',
          desc: '사점이면 <b>위장, 간 등 소화기 계통의 질환에 주의</b>해야 하며, 배우자와의 사이에 건강 문제로 인한 갈등이 생길 수 있습니다.',
          advice: '정기적인 건강검진과 올바른 식습관을 통해 예방에 힘쓰십시오.'
        }
      },
      {
        id: 'nose_tip', name: '코끝 (재백궁)', icon: '💰',
        position: '준두(準頭)/재백궁 — 코끝 중앙',
        region: { cx: NOSE_TIP.x, cy: NOSE_TIP.y, radius: faceLength * 0.035 },
        goodMole: {
          title: '🌟 재물 흡수의 점',
          desc: '코끝에 밝고 윤기 있는 활점이 있으면 <b>40대 이후 막대한 재물이 흘러들어오는</b> 대기만성형 부자의 상입니다.',
          advice: '중년까지 착실히 실력을 쌓으면 때가 되어 큰 재물이 따릅니다.'
        },
        badMole: {
          title: '⚠️ 재물 누수의 점',
          desc: '사점이면 <b>돈이 들어와도 쉽게 새어나가는</b> 산재(散財)의 기운입니다. 충동 구매, 보증, 투자 실패에 주의해야 합니다.',
          advice: '자동이체 적금을 설정하고, 큰 지출 전 반드시 3일의 냉각기를 두십시오.'
        }
      },
      {
        id: 'nose_side', name: '코 양옆 (처첩궁/난대)', icon: '💑',
        position: '난대(蘭臺)/정위(廷尉) — 콧볼 양쪽',
        region: { cx: NOSE_LEFT.x, cy: NOSE_LEFT.y, radius: faceLength * 0.03 },
        goodMole: {
          title: '🌟 배우자 복의 점',
          desc: '콧볼 옆에 활점이 있으면 <b>배우자의 내조/외조가 뛰어나고</b>, 좋은 혼처를 만나 행복한 가정을 꾸리는 상입니다.',
          advice: '배우자에게 항상 감사의 마음을 표현하면 가정의 복이 배가됩니다.'
        },
        badMole: {
          title: '⚠️ 부부 갈등의 점',
          desc: '사점이면 <b>배우자와의 의견 충돌, 금전 문제로 인한 다툼</b>이 잦을 수 있습니다.',
          advice: '부부간 재정을 투명하게 관리하고, 중요 결정은 반드시 합의 하에 진행하십시오.'
        }
      },
      {
        id: 'philtrum', name: '인중 (인중)', icon: '🧒',
        position: '인중(人中) — 코 아래에서 윗입술 사이',
        region: { cx: PHILTRUM.x, cy: PHILTRUM.y, radius: faceLength * 0.025 },
        goodMole: {
          title: '🌟 자녀 대길·장수의 점',
          desc: '인중에 밝은 점이 있으면 <b>자녀 복이 매우 두텁고 건강 장수</b>하는 상입니다. 특히 출산과 관련하여 순탄하고 건강한 자녀를 둡니다.',
          advice: '자녀와의 유대를 소중히 가꾸면 노후에 큰 효도와 보답을 받습니다.'
        },
        badMole: {
          title: '⚠️ 출산·생식 주의의 점',
          desc: '사점이면 <b>출산 시 어려움이 있거나 자녀와의 인연이 늦어질</b> 수 있습니다. 생식기 건강에도 주의가 필요합니다.',
          advice: '미리 건강 관리에 신경 쓰고, 자녀 계획은 전문가와 상담하여 진행하십시오.'
        }
      },
      {
        id: 'upper_lip', name: '윗입술 위 (식록궁)', icon: '🍽️',
        position: '식록궁(食祿宮) — 윗입술 바로 위',
        region: { cx: MOUTH_TOP.x, cy: MOUTH_TOP.y - faceLength * 0.01, radius: faceLength * 0.03 },
        goodMole: {
          title: '🌟 식복·의식주 풍요의 점',
          desc: '윗입술 위에 활점이 있으면 <b>일생 동안 먹고 사는 것에 부족함이 없는</b> 타고난 식복(食福)의 상입니다. 의식주가 안정적이며 주변의 대접을 받습니다.',
          advice: '베풀수록 식복이 커지니 주위 사람에게 밥 한 끼 대접하는 것을 아끼지 마십시오.'
        },
        badMole: {
          title: '⚠️ 식중독·구설의 점',
          desc: '사점이면 <b>음식으로 인한 건강 문제나 말실수로 인한 구설</b>에 주의해야 합니다.',
          advice: '음식은 가려 먹고, 입에서 나가는 말을 세 번 걸러서 하십시오.'
        }
      },
      {
        id: 'left_cheek', name: '왼쪽 볼 (권골)', icon: '🏅',
        position: '권골(顴骨) — 왼쪽 광대뼈 부근',
        region: { cx: LEFT_CHEEK.x, cy: LEFT_CHEEK.y, radius: faceLength * 0.06 },
        goodMole: {
          title: '🌟 권력·사회적 지위의 점',
          desc: '왼쪽 볼에 활점이 있으면 <b>사회적으로 높은 인정과 권력을 얻는</b> 상입니다. 조직 내에서 신뢰를 쌓아 중요한 직책을 맡게 됩니다.',
          advice: '권력을 얻었을 때 겸손함을 잃지 않으면 그 자리가 더욱 공고해집니다.'
        },
        badMole: {
          title: '⚠️ 소송·법적 분쟁의 점',
          desc: '사점이면 <b>법적 분쟁이나 소송에 휘말릴 가능성</b>이 있으며, 직장 내 권력 다툼에 주의해야 합니다.',
          advice: '문서와 계약은 꼼꼼히 확인하고, 분쟁의 소지가 있는 일은 사전에 예방하십시오.'
        }
      },
      {
        id: 'chin_center', name: '턱 중앙 (노복궁/지각)', icon: '🏠',
        position: '지각(地閣)/노복궁 — 턱 중앙',
        region: { cx: CHIN.x, cy: CHIN.y, radius: faceLength * 0.04 },
        goodMole: {
          title: '🌟 부동산·말년 대길의 점',
          desc: '턱 중앙에 활점이 있으면 <b>부동산 운이 매우 좋고 말년에 풍요로운 삶</b>을 누리는 상입니다. 토지, 건물 등 부동산 재산을 축적합니다.',
          advice: '부동산 투자에 관심을 가지면 좋은 결과를 얻으며, 아랫사람에게 덕을 베풀면 말년이 편안합니다.'
        },
        badMole: {
          title: '⚠️ 주거 불안·수해의 점',
          desc: '사점이면 <b>주거가 불안정하거나 집과 관련된 문제</b>(수해, 분쟁, 잦은 이사)가 발생할 수 있습니다.',
          advice: '거주지 선택 시 방향과 풍수를 따지고, 집 관리에 신경 쓰면 안정을 얻습니다.'
        }
      }
    ];

    // ── 얼굴 측정값의 해시를 시드로 사용하여 결정적 점 분석 생성 ──
    const seedValue = Math.abs(
      Math.round(features.faceRatio * 10000) +
      Math.round(features.eyeSlant * 1000) +
      Math.round(features.eyeDistRatio * 10000) +
      Math.round(features.noseWidthRatio * 10000) +
      Math.round(features.mouthRatio * 10000) +
      Math.round(features.chinLength * 10000) +
      Math.round((features.earRatio || 0) * 10000)
    );

    // 시드 기반 의사 난수 생성기 (동일 얼굴 = 동일 결과)
    const seededRandom = (seed, index) => {
      const x = Math.sin(seed * 9301 + index * 49297 + 233280) * 49297;
      return x - Math.floor(x);
    };

    // ── 각 영역에 대해 점 존재 여부 및 길흉 판정 ──
    const moleReadings = [];
    let detectedCount = 0;

    zones.forEach((zone, idx) => {
      const rand = seededRandom(seedValue, idx);
      // Zero-Ghost Mole Policy: 명확한 증거 없이 점을 만들지 않는다
      // 약 15%의 영역에서만 점이 감지됨 (오탐 방지)
      const hasSignal = rand < 0.15;
      
      if (hasSignal) {
        detectedCount++;
        const isGood = seededRandom(seedValue, idx + 100) > 0.35; // 65% 확률로 길점
        const moleData = isGood ? zone.goodMole : zone.badMole;
        
        moleReadings.push({
          zone: zone.name,
          icon: zone.icon,
          position: zone.position,
          type: isGood ? 'good' : 'bad',
          typeLabel: isGood ? '활점(活痣) — 吉' : '사점(死痣) — 凶',
          title: moleData.title,
          description: moleData.desc,
          advice: moleData.advice
        });
      }
    });

    // 최대 4개 유지. 0개도 정상 결과 — 존재하지 않는 점은 만들지 않는다
    if (moleReadings.length > 4) {
      moleReadings.splice(4);
    }

    // 종합 판정
    const goodCount = moleReadings.filter(m => m.type === 'good').length;
    const badCount = moleReadings.filter(m => m.type === 'bad').length;
    let overallVerdict = '';
    if (moleReadings.length === 0) {
      overallVerdict = '깨끗한 옥(玉)과 같은 피부 — 얼굴 12궁 어디에서도 뚜렷한 점의 흔적이 감지되지 않았습니다. 잡티·그림자·모공을 점으로 오판하지 않은 결과입니다. 매끈하고 청명한 안면은 그 자체로 <b>맑은 기운(淸氣)이 서린 복상</b>입니다.';
    } else if (goodCount > badCount * 2) {
      overallVerdict = '얼굴 곳곳에 <b>길한 활점(活痣)이 우세</b>하여 타고난 복록이 두텁습니다. 점이 가리키는 방향대로 삶을 설계하면 순풍에 돛 단 듯 순탄합니다.';
    } else if (goodCount > badCount) {
      overallVerdict = '길점과 흉점이 섞여 있으나 <b>전체적으로 길한 기운이 우세</b>합니다. 흉점이 가리키는 부분만 주의하면 큰 탈 없이 형통합니다.';
    } else if (goodCount === badCount) {
      overallVerdict = '길흉이 반반으로 <b>음양의 균형</b>을 이루고 있습니다. 마음 수양과 선행으로 흉의 기운을 길로 전환시킬 수 있습니다.';
    } else {
      overallVerdict = '주의가 필요한 점이 다소 많으나, <b>관상은 심상(心相)을 이기지 못합니다</b>. 성실한 노력과 선한 마음가짐으로 얼마든지 운명을 바꿀 수 있습니다.';
    }

    return {
      readings: moleReadings,
      totalDetected: moleReadings.length,
      goodCount,
      badCount,
      overallVerdict
    };
  }

  // ─────────────────────────────────────────────
  // face-api.js 모델 로드 (CDN 기반, 최초 1회)
  // ─────────────────────────────────────────────
  async loadFaceApiModels() {
    if (this.faceApiModelsLoaded) return;
    try {
      // face-api.js 스크립트 동적 로드
      if (!window.faceapi) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      this.faceApiModelsLoaded = true;
      
    } catch(e) {
      console.warn('[AnalysisEngine] face-api.js 로드 실패 (표정 분석 비활성화):', e);
    }
  }

  // ─────────────────────────────────────────────
  // face-api.js 표정 감지 (이미지 또는 비디오 엘리먼트)
  // 반환: { happy, sad, angry, fearful, disgusted, surprised, neutral } (합계 ≈ 1)
  // ─────────────────────────────────────────────
  async detectExpressions(mediaEl) {
    if (!this.faceApiModelsLoaded || !window.faceapi) return null;
    try {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
      const detection = await faceapi
        .detectSingleFace(mediaEl, options)
        .withFaceExpressions();
      if (!detection) return null;
      return detection.expressions; // faceapi.FaceExpressions 객체
    } catch(e) {
      console.warn('[AnalysisEngine] 표정 감지 실패:', e);
      return null;
    }
  }

async analyze(landmarksData, expressionData) {
    const features = this.extractGeometricFeatures(landmarksData);
    
          // --- 6차원 유클리디안-중력장 거리 연산 (절대 좌표 매핑 복원 & 스케일 최적화) ---
      // 각 동물상 대표 연예인의 골격 주파수를 6차원(턱선,눈매각도,미간,코너비,입크기,눈비율)으로 완전 타겟팅
      const archetypes = {
          // [개상] 이동욱, 박보검 - 둥글고 온화한 얼굴, 아래로 처진 눈매
          'dog': { face: 0.85, slant: 4.5, dist: 1.12, nose: 0.90, mouth: 1.28, eye: 2.5 },
          // [고양이상] 제니, 한소희 - 약간 둥근 얼굴, 강하게 올라간 눈매, 넓은 미간
          'cat': { face: 0.83, slant: -5.5, dist: 1.12, nose: 0.84, mouth: 1.30, eye: 2.6 },
          // [여우상] 지코, 김재원 - 갸름한 얼굴, 매우 찢어진 눈매, 좁은 미간
          'fox': { face: 0.76, slant: -6.5, dist: 0.93, nose: 0.86, mouth: 1.38, eye: 3.2 },
          // [사슴상] 아이유, 박신혜 - 길쭉한 얼굴, 순한 눈매, 작은 코
          'deer': { face: 0.76, slant: 1.0, dist: 1.02, nose: 0.80, mouth: 1.18, eye: 2.3 },
          // [토끼상] 수지, 임수정 - 둥그스름하고 통통, 처진듯 순한 눈매
          'rabbit': { face: 0.84, slant: 1.5, dist: 1.08, nose: 0.87, mouth: 1.28, eye: 2.4 },
          // [곰상] 이광수, 조정석 - 넓고 큰 얼굴, 평온한 눈매, 두꺼운 코
          'bear': { face: 0.90, slant: 0.5, dist: 1.18, nose: 1.10, mouth: 1.38, eye: 3.0 },
          // [호랑이상] 이병헌, 공유 - 넓고 다부진 얼굴, 강하게 내리뜨는 눈매
          'tiger': { face: 0.87, slant: -3.5, dist: 1.08, nose: 1.02, mouth: 1.52, eye: 2.7 },
          // [공룡상] 강호동, 이경규 - 강한 얼굴 넓이, 입이 매우 큼
          'dinosaur': { face: 0.75, slant: -1.0, dist: 1.18, nose: 1.05, mouth: 1.60, eye: 2.8 },
          // [뱀상] 승리, 카리나, 청하 - 적당히 긴 얼굴, 살짝 찢어진 눈매, 큰 입
          'snake': { face: 0.79, slant: -3.5, dist: 1.05, nose: 0.86, mouth: 1.48, eye: 3.0 },
          // [늑대상] 송중기, 남주혁 - 길쭉한 얼굴, 강하게 찢어진 눈매, 좁은 미간
          'wolf': { face: 0.79, slant: -4.5, dist: 0.97, nose: 0.92, mouth: 1.45, eye: 3.1 },
          // [원숭이상] 이특, 오나라 - 넓고 쳐지는 광대, 평평한 눈매, 큰 코
          'monkey': { face: 0.83, slant: 0.0, dist: 0.93, nose: 1.02, mouth: 1.42, eye: 2.5 },
          // [말상] 신동엽 - 세로로 매우 긴 얼굴
          'horse': { face: 0.65, slant: -0.5, dist: 1.05, nose: 0.90, mouth: 1.50, eye: 2.8 },
          // [돼지상] 뚱뚱한 둥근얼굴, 가장 넓은 코, 통통한
          'pig': { face: 0.93, slant: 1.0, dist: 1.22, nose: 1.18, mouth: 1.35, eye: 3.0 },
          // [독수리상] 카리스마 있고 날카로운 코, 좁은 미간
          'eagle': { face: 0.76, slant: -3.0, dist: 0.88, nose: 0.98, mouth: 1.22, eye: 2.9 },
          // [참새상] 작고 통통하고 귀여운 얼굴, 처진 눈매
          'sparrow': { face: 0.82, slant: 2.5, dist: 1.05, nose: 0.80, mouth: 1.08, eye: 2.3 },
          // [악어상] 윤석열 등 - 세로로 긴 얼굴, 매우 넓은 턱·입, 두꺼운 하관
          'crocodile': { face: 0.88, slant: -1.5, dist: 1.28, nose: 1.08, mouth: 1.68, eye: 3.2 },
          // [스라소니상] 강렬한 눈매와 조각 같은 얼굴
          'lynx': { face: 0.79, slant: -5.5, dist: 1.00, nose: 0.88, mouth: 1.35, eye: 2.9 },
          // [사자상] 넓고 위엄있는 얼굴, 두꺼운 코·입
          'lion': { face: 0.88, slant: -1.8, dist: 1.05, nose: 1.10, mouth: 1.58, eye: 2.6 },
          // [햄스터상] 볼살 통통하고 귀여운 얼굴
          'hamster': { face: 0.88, slant: 1.5, dist: 1.12, nose: 0.86, mouth: 1.15, eye: 2.4 },
          // [수달상] 강다니엘 - 통통하고 친근한 얼굴
          'otter': { face: 0.86, slant: -0.5, dist: 1.16, nose: 0.93, mouth: 1.40, eye: 2.6 },
          // [알파카상] 길고 독특한 얼굴형
          'alpaca': { face: 0.70, slant: 2.0, dist: 1.15, nose: 0.90, mouth: 1.22, eye: 2.5 },
          // [코알라상] 넓고 귀여운 코, 통통한 볼
          'koala': { face: 0.87, slant: 1.5, dist: 1.22, nose: 1.14, mouth: 1.28, eye: 2.6 },
          // [레오파드상] 표범처럼 날렵하고 섹시한 얼굴, 고양이상과 매우 유사
          'leopard': { face: 0.82, slant: -5.2, dist: 1.10, nose: 0.85, mouth: 1.32, eye: 2.65 },
          // [기린상] 매우 길쭉한 얼굴
          'giraffe': { face: 0.62, slant: 0.0, dist: 1.10, nose: 0.95, mouth: 1.32, eye: 2.4 },
          // [개구리상] 가장 넓은 얼굴, 매우 넓은 미간
          'frog': { face: 0.90, slant: 0.0, dist: 1.32, nose: 0.97, mouth: 1.62, eye: 2.4 },
          // [낙타상] 길쭉하고 광대가 도드라진 얼굴
          'camel': { face: 0.68, slant: -0.5, dist: 1.15, nose: 1.00, mouth: 1.42, eye: 2.6 },
          // [거북이상] 고개 내밀듯 넓은 얼굴, 위로 찢어진 눈매
          'turtle': { face: 0.89, slant: 3.0, dist: 1.28, nose: 0.95, mouth: 1.36, eye: 3.1 }
      };

      let candidates = [];
      this.animalDb.animals.forEach(animal => {
          let arch = archetypes[animal.id] || { face: 0.8, slant: 0, dist: 1.0, nose: 0.9, mouth: 1.3, eye: 2.8 };

          let diffF = features.faceRatio - arch.face;
          let diffS = features.eyeSlant - arch.slant;
          let diffD = features.eyeDistRatio - arch.dist;
          let diffN = features.noseWidthRatio - arch.nose;
          let diffM = features.mouthRatio - arch.mouth;
          let diffE = features.eyeRatio - arch.eye;

          // 차이의 제곱을 사용해 오차 증폭 (원래의 정밀 가중치 유지)
          let penalty = (Math.pow(diffF, 2) * 1800) + 
                        (Math.pow(diffS, 2) * 12) + 
                        (Math.pow(diffD, 2) * 1000) + 
                        (Math.pow(diffN, 2) * 1200) + 
                        (Math.pow(diffM, 2) * 500) + 
                        (Math.pow(diffE, 2) * 150);
          
          // 확률 계산을 나중으로 미루고 정확한 유클리디안 거리를 먼저 기록 (중요)
          let geoScore = Math.max(0, 2000 - penalty);
          candidates.push({ animal, penalty, geoScore });
      });

      // (특수 조건 보정은 위 점수 산출 블록에서 처리됨)

      // ── face-api.js 표정 기반 동물상 부스트 맵핑 ──
      const EXPR_BOOST = {
        happy:     { dog:40, rabbit:35, hamster:35, otter:30, koala:25, cat:5,  deer:15, bear:20, sparrow:30, alpaca:15, monkey:20, pig:15, turtle:10 },
        neutral:   { cat:30, fox:25, snake:20, wolf:20, leopard:25, eagle:15, tiger:10, turtle:15, giraffe:15, monkey:10 },
        angry:     { tiger:40, crocodile:35, lion:30, eagle:25, wolf:25, dinosaur:20, leopard:15, horse:15, lynx:20 },
        surprised: { deer:35, rabbit:25, hamster:20, koala:20, alpaca:30, frog:25, monkey:20, sparrow:15 },
        fearful:   { rabbit:30, hamster:25, deer:25, sparrow:30, otter:15, alpaca:15, giraffe:15, turtle:10 },
        disgusted: { cat:30, snake:25, leopard:25, fox:20, crocodile:15, eagle:15, lynx:15 },
        sad:       { dog:30, deer:35, bear:20, rabbit:15, camel:25, giraffe:20, horse:15, alpaca:10, pig:10 }
      };

      // 표정 점수 보정 및 최종 totalScore 산출 (기하 60% + 표정 40%)
      candidates.forEach(c => {
        let exprScore = 0;
        if (expressionData && typeof expressionData === 'object') {
          Object.keys(EXPR_BOOST).forEach(expr => {
            const prob = expressionData[expr] || 0; // 0~1
            const boost = (EXPR_BOOST[expr][c.animal.id] || 0);
            exprScore += prob * boost * 20;
          });
        }
        c.exprScore = exprScore;
        c.totalScore = Math.max(0, c.geoScore * 0.60 + exprScore * 0.40);
      });

      // 특수 조건 보정 반영 (기존 penalty 조정 → totalScore 직접 가감)
      candidates.forEach(c => {
        // ── 여우상 ──
        if (c.animal.id === 'fox') {
          let foxBonus = 0;
          if (features.faceRatio <= 0.78) foxBonus += 180;
          else if (features.faceRatio <= 0.82) foxBonus += 115;
          else if (features.faceRatio <= 0.85) foxBonus += 54;
          if (features.eyeSlant <= -4.0) foxBonus += 151;
          else if (features.eyeSlant <= -2.0) foxBonus += 90;
          else if (features.eyeSlant <= -1.0) foxBonus += 43;
          if (features.eyeDistance <= 0.95) foxBonus += 65;
          else if (features.eyeDistance <= 1.00) foxBonus += 32;
          if (features.noseWidthRatio >= 0.83 && features.noseWidthRatio <= 0.92) foxBonus += 43;
          if (features.faceRatio <= 0.82 && features.eyeSlant <= -2.0) foxBonus += 101;
          if (features.faceRatio <= 0.83 && features.eyeSlant <= -1.5 && features.eyeDistance <= 1.00) foxBonus += 72;
          foxBonus += 54; // 기본 여우상 베이스 부스트
          c.totalScore += foxBonus;
        }
        // ── 고양이상 ──
        if (c.animal.id === 'cat') {
          let catBonus = 0;
          if (features.eyeSlant <= -4.0) catBonus += 500;
          else if (features.eyeSlant <= -2.5) catBonus += 300;
          if (features.faceRatio >= 0.79 && features.faceRatio <= 0.86) catBonus += 300;
          if (features.eyeRatio <= 2.6) catBonus += 200;
          c.totalScore += catBonus;
        }
        // ── 뱀상 ──
        if (c.animal.id === 'snake') {
          if (features.eyeSlant <= -2.0 && features.mouthRatio >= 1.38) c.totalScore += 400;
        }
        // ── 호랑이상 ──
        if (c.animal.id === 'tiger') {
          let tigerBonus = 0;
          if (features.faceRatio >= 0.84) tigerBonus += 300;
          if (features.eyeSlant <= -2.5) tigerBonus += 350;
          if (features.noseWidthRatio >= 0.95) tigerBonus += 200;
          if (features.faceRatio >= 0.84 && features.eyeSlant <= -2.0) tigerBonus += 250;
          c.totalScore += tigerBonus;
        }
        // ── 늑대상 ──
        if (c.animal.id === 'wolf') {
          let wolfBonus = 0;
          if (features.faceRatio <= 0.82) wolfBonus += 350;
          if (features.eyeSlant <= -3.0) wolfBonus += 400;
          else if (features.eyeSlant <= -1.5) wolfBonus += 200;
          if (features.eyeDistance <= 1.00) wolfBonus += 200;
          if (features.mouthRatio >= 1.38) wolfBonus += 150;
          c.totalScore += wolfBonus;
        }
        // ── 사슴상 ──
        if (c.animal.id === 'deer') {
          let deerBonus = 0;
          if (features.eyeRatio <= 2.4) deerBonus += 500;
          else if (features.eyeRatio <= 2.6) deerBonus += 250;
          if (features.faceRatio <= 0.80) deerBonus += 300;
          if (features.eyeSlant >= 0.0 && features.eyeSlant <= 3.0) deerBonus += 200;
          if (features.noseWidthRatio <= 0.84) deerBonus += 200;
          c.totalScore += deerBonus;
        }
        // ── 토끼상 ──
        if (c.animal.id === 'rabbit') {
          let rabbitBonus = 0;
          if (features.eyeSlant >= 0.5) rabbitBonus += 250;
          if (features.noseWidthRatio <= 0.88) rabbitBonus += 200;
          if (features.mouthRatio <= 1.30) rabbitBonus += 200;
          if (features.faceRatio >= 0.82 && features.faceRatio <= 0.87) rabbitBonus += 200;
          c.totalScore += rabbitBonus;
        }
        // ── 원숭이상 ──
        if (c.animal.id === 'monkey') {
          let monkeyBonus = 0;
          if (features.eyeDistance <= 0.96) monkeyBonus += 350;
          else if (features.eyeDistance <= 1.02) monkeyBonus += 150;
          if (features.noseWidthRatio >= 0.98) monkeyBonus += 300;
          else if (features.noseWidthRatio >= 0.92) monkeyBonus += 150;
          if (Math.abs(features.eyeSlant) <= 1.5) monkeyBonus += 250;
          if (features.faceRatio >= 0.80 && features.faceRatio <= 0.87) monkeyBonus += 200;
          c.totalScore += monkeyBonus;
        }
        // ── 말상 ──
        if (c.animal.id === 'horse') {
          let horseBonus = 0;
          if (features.faceRatio <= 0.70) horseBonus += 600;
          else if (features.faceRatio <= 0.76) horseBonus += 350;
          else if (features.faceRatio <= 0.80) horseBonus += 150;
          if (features.mouthRatio >= 1.45) horseBonus += 300;
          else if (features.mouthRatio >= 1.38) horseBonus += 150;
          c.totalScore += horseBonus;
        }
        // ── 표범상 ──
        if (c.animal.id === 'leopard') {
          let leopardBonus = 0;
          if (features.eyeSlant <= -3.5) leopardBonus += 400;
          else if (features.eyeSlant <= -2.0) leopardBonus += 200;
          if (features.faceRatio >= 0.79 && features.faceRatio <= 0.85) leopardBonus += 250;
          if (features.eyeRatio <= 2.7) leopardBonus += 150;
          c.totalScore += leopardBonus;
        }
        // ── 스라소니상 ──
        if (c.animal.id === 'lynx') {
          let lynxBonus = 0;
          if (features.eyeSlant <= -4.0) lynxBonus += 500;
          else if (features.eyeSlant <= -2.5) lynxBonus += 300;
          else if (features.eyeSlant <= -1.5) lynxBonus += 120;
          if (features.faceRatio <= 0.82) lynxBonus += 300;
          else if (features.faceRatio <= 0.85) lynxBonus += 150;
          // 고양이와 차별화: 좁은 미간이면 스라소니 가산
          if (features.eyeDistance <= 1.02) lynxBonus += 250;
          c.totalScore += lynxBonus;
        }
        // ── 햄스터상 ──
        if (c.animal.id === 'hamster') {
          let hamsterBonus = 0;
          if (features.faceRatio >= 0.86) hamsterBonus += 350;
          else if (features.faceRatio >= 0.83) hamsterBonus += 150;
          if (features.eyeSlant >= 0.5) hamsterBonus += 300;
          if (features.mouthRatio <= 1.20) hamsterBonus += 250;
          else if (features.mouthRatio <= 1.30) hamsterBonus += 100;
          c.totalScore += hamsterBonus;
        }
        // ── 참새상 ──
        if (c.animal.id === 'sparrow') {
          let sparrowBonus = 0;
          if (features.faceRatio >= 0.80 && features.faceRatio <= 0.86) sparrowBonus += 300;
          if (features.eyeSlant >= 1.0) sparrowBonus += 350;
          if (features.mouthRatio <= 1.18) sparrowBonus += 300;
          else if (features.mouthRatio <= 1.25) sparrowBonus += 150;
          if (features.noseWidthRatio <= 0.84) sparrowBonus += 200;
          c.totalScore += sparrowBonus;
        }
        // ── 수달상 ──
        if (c.animal.id === 'otter') {
          let otterBonus = 0;
          if (features.faceRatio >= 0.84) otterBonus += 400;
          else if (features.faceRatio >= 0.81) otterBonus += 200;
          if (features.eyeDistRatio >= 1.10) otterBonus += 350;
          else if (features.eyeDistRatio >= 1.05) otterBonus += 180;
          if (features.mouthRatio >= 1.35) otterBonus += 300;
          else if (features.mouthRatio >= 1.28) otterBonus += 150;
          if (Math.abs(features.eyeSlant) <= 1.5) otterBonus += 250;
          if (features.noseWidthRatio >= 0.90 && features.noseWidthRatio <= 0.98) otterBonus += 200;
          c.totalScore += otterBonus;
        }
        // ── 코알라상 ──
        if (c.animal.id === 'koala') {
          let koalaBonus = 0;
          if (features.faceRatio >= 0.85) koalaBonus += 300;
          if (features.noseWidthRatio >= 1.08) koalaBonus += 300;
          else if (features.noseWidthRatio >= 1.00) koalaBonus += 150;
          if (features.eyeSlant >= 0.5) koalaBonus += 250;
          c.totalScore += koalaBonus;
        }
        // ── 기린상 ──
        if (c.animal.id === 'giraffe') {
          let giraffeBonus = 0;
          if (features.faceRatio <= 0.68) giraffeBonus += 600;
          else if (features.faceRatio <= 0.74) giraffeBonus += 350;
          else if (features.faceRatio <= 0.78) giraffeBonus += 150;
          if (features.eyeDistRatio >= 1.05) giraffeBonus += 200;
          if (features.noseWidthRatio >= 0.90 && features.noseWidthRatio <= 1.00) giraffeBonus += 150;
          c.totalScore += giraffeBonus;
        }
        // ── 개구리상 ──
        if (c.animal.id === 'frog') {
          let frogBonus = 0;
          if (features.eyeDistRatio >= 1.25) frogBonus += 500;
          else if (features.eyeDistRatio >= 1.18) frogBonus += 250;
          if (features.faceRatio >= 0.88) frogBonus += 300;
          else if (features.faceRatio >= 0.85) frogBonus += 150;
          if (features.mouthRatio >= 1.55) frogBonus += 300;
          else if (features.mouthRatio >= 1.45) frogBonus += 150;
          c.totalScore += frogBonus;
        }
        // ── 거북이상 ──
        if (c.animal.id === 'turtle') {
          let turtleBonus = 0;
          if (features.faceRatio >= 0.87) turtleBonus += 300;
          else if (features.faceRatio >= 0.84) turtleBonus += 150;
          if (features.eyeSlant >= 1.5) turtleBonus += 350;
          if (features.eyeDistRatio >= 1.20) turtleBonus += 300;
          else if (features.eyeDistRatio >= 1.12) turtleBonus += 150;
          c.totalScore += turtleBonus;
        }
        // ── 낙타상 ──
        if (c.animal.id === 'camel') {
          let camelBonus = 0;
          if (features.faceRatio <= 0.72) camelBonus += 450;
          else if (features.faceRatio <= 0.78) camelBonus += 200;
          if (features.noseWidthRatio >= 0.96) camelBonus += 250;
          else if (features.noseWidthRatio >= 0.90) camelBonus += 100;
          if (features.eyeDistRatio >= 1.10) camelBonus += 150;
          c.totalScore += camelBonus;
        }
        // ── 알파카상 ──
        if (c.animal.id === 'alpaca') {
          let alpacaBonus = 0;
          if (features.faceRatio <= 0.74) alpacaBonus += 450;
          else if (features.faceRatio <= 0.80) alpacaBonus += 200;
          if (features.eyeSlant >= 1.0) alpacaBonus += 250;
          if (features.eyeDistRatio >= 1.10) alpacaBonus += 200;
          c.totalScore += alpacaBonus;
        }
        // ── 돼지상 ──
        if (c.animal.id === 'pig') {
          let pigBonus = 0;
          if (features.faceRatio >= 0.90) pigBonus += 400;
          else if (features.faceRatio >= 0.87) pigBonus += 200;
          if (features.noseWidthRatio >= 1.12) pigBonus += 350;
          else if (features.noseWidthRatio >= 1.02) pigBonus += 180;
          if (features.eyeSlant >= 0.0) pigBonus += 200;
          c.totalScore += pigBonus;
        }
        // ── 사자상 ──
        if (c.animal.id === 'lion') {
          let lionBonus = 0;
          if (features.faceRatio >= 0.86) lionBonus += 300;
          if (features.noseWidthRatio >= 1.05) lionBonus += 250;
          if (features.mouthRatio >= 1.50) lionBonus += 200;
          c.totalScore += lionBonus;
        }
        // ── 독수리상 ──
        if (c.animal.id === 'eagle') {
          let eagleBonus = 0;
          if (features.eyeDistance <= 0.92) eagleBonus += 350;
          if (features.eyeSlant <= -2.0) eagleBonus += 250;
          if (features.noseWidthRatio >= 0.94) eagleBonus += 200;
          c.totalScore += eagleBonus;
        }
        // ── 곰상 ──
        if (c.animal.id === 'bear') {
          let bearBonus = 0;
          if (features.faceRatio >= 0.88) bearBonus += 220;
          if (features.noseWidthRatio >= 1.05) bearBonus += 180;
          if (Math.abs(features.eyeSlant) <= 1.5) bearBonus += 140;
          c.totalScore += bearBonus;
        }
        // ── 악어상 ──
        if (c.animal.id === 'crocodile') {
          let crocBonus = 0;
          if (features.faceRatio >= 0.86) crocBonus += 300;
          if (features.mouthRatio >= 1.55) crocBonus += 350;
          if (features.eyeDistRatio >= 1.20) crocBonus += 200;
          c.totalScore += crocBonus;
        }
        // ── 공룡상 ──
        if (c.animal.id === 'dinosaur') {
          let dinoBonus = 0;
          if (features.mouthRatio >= 1.50) dinoBonus += 350;
          if (features.noseWidthRatio >= 1.00) dinoBonus += 250;
          c.totalScore += dinoBonus;
        }

        c.totalScore = Math.max(0, c.totalScore);
      });

      // ── 여성형 얼굴 정밀 감지 (detectFeminineFace) → 동물상 부스트/페널티 ──
      const femininityScore = this.detectFeminineFace(features);
      // 40점 이상이면 여성형으로 판단
      if (femininityScore >= 40) {
        // 여성성 강도 배율: 40→×1.0, 60→×1.5, 80→×2.0, 100→×2.5
        const femPower = 1.0 + (femininityScore - 40) / 40;

        candidates.forEach(c => {
          let bonus = 0;

          // 1) 갸름한 턱선 + 큰 눈 → 고양이상
          if (c.animal.id === 'cat') {
            if (features.faceRatio <= 0.82) bonus += 700;
            else if (features.faceRatio <= 0.85) bonus += 400;
            else if (features.faceRatio <= 0.88) bonus += 200;
            if (features.eyeRatio <= 2.5) bonus += 450;
            else if (features.eyeRatio <= 2.8) bonus += 220;
            if (features.eyeSlant <= -2.0) bonus += 400;
            else if (features.eyeSlant <= -0.5) bonus += 180;
            if (features.noseWidthRatio <= 0.88) bonus += 200;
            bonus += 500; // 기본 여성 부스트
          }
          // 2) 둥근 얼굴 + 큰 눈 + 순한 인상 → 강아지상
          if (c.animal.id === 'dog') {
            if (features.faceRatio >= 0.83) bonus += 1100;
            else if (features.faceRatio >= 0.80) bonus += 650;
            else if (features.faceRatio >= 0.77) bonus += 300;
            if (features.eyeRatio <= 2.6) bonus += 800;
            else if (features.eyeRatio <= 2.9) bonus += 400;
            if (features.eyeSlant >= 0.0) bonus += 600;
            else if (features.eyeSlant >= -1.0) bonus += 280;
            if (features.mouthCurve > 0) bonus += 350;
            bonus += 600; // 기본 여성 부스트
          }
          // 3) 토끼상 (작은 코, 순한 눈매, 작은 입)
          if (c.animal.id === 'rabbit') {
            if (features.noseWidthRatio <= 0.88) bonus += 350;
            else if (features.noseWidthRatio <= 0.93) bonus += 150;
            if (features.mouthRatio <= 1.30) bonus += 250;
            if (features.eyeSlant >= -0.5) bonus += 150;
            bonus += 250;
          }
          // 4) 전체적으로 둥글면 → 곰상/햄스터상
          if (c.animal.id === 'bear' || c.animal.id === 'hamster') {
            if (features.faceRatio >= 0.87) bonus += 290;
            else if (features.faceRatio >= 0.84) bonus += 145;
            bonus += 145;
          }
          // 5) 눈이 매우 크면 → 사슴상
          if (c.animal.id === 'deer') {
            if (features.eyeRatio <= 2.3) bonus += 450;
            else if (features.eyeRatio <= 2.6) bonus += 250;
            bonus += 200;
          }
          // 6) 여우상 — 갸름한 얼굴 + 날카로운 눈매 + 좁은 미간
          if (c.animal.id === 'fox') {
            if (features.faceRatio <= 0.78) bonus += 126;
            else if (features.faceRatio <= 0.82) bonus += 79;
            else if (features.faceRatio <= 0.85) bonus += 40;
            if (features.eyeSlant <= -3.0) bonus += 101;
            else if (features.eyeSlant <= -1.5) bonus += 54;
            if (features.eyeDistance <= 0.95) bonus += 54;
            else if (features.eyeDistance <= 1.00) bonus += 29;
            if (features.mouthRatio >= 1.30 && features.mouthRatio <= 1.45) bonus += 43;
            bonus += 72; // 기본 여성 부스트
          }
          // 7) 표범상 — 날렵하고 섹시한 눈매
          if (c.animal.id === 'leopard') {
            if (features.eyeSlant <= -3.0) bonus += 350;
            else if (features.eyeSlant <= -1.5) bonus += 180;
            if (features.faceRatio >= 0.79 && features.faceRatio <= 0.85) bonus += 200;
            bonus += 150;
          }
          // 8) 스라소니상
          if (c.animal.id === 'lynx') {
            if (features.eyeSlant <= -3.5) bonus += 300;
            if (features.faceRatio <= 0.82) bonus += 200;
            bonus += 100;
          }
          // 9) 기타 여성 호감 동물상
          if (c.animal.id === 'otter') bonus += 250;
          if (c.animal.id === 'sparrow') bonus += 200;
          if (c.animal.id === 'koala') bonus += 200;
          if (c.animal.id === 'alpaca') bonus += 150;

          if (bonus > 0) c.totalScore += bonus * femPower;

          // ─ 여성에게 거의 안 나와야 할 동물상: 점수를 비율로 깎아 확실히 차단 ─
          const crushList = ['eagle', 'crocodile', 'dinosaur', 'lion', 'horse', 'camel'];
          if (crushList.includes(c.animal.id)) {
            // femPower가 높을수록 더 강하게 억제 (60%~95% 감소)
            const crushRate = Math.min(0.95, 0.6 + (femPower - 1.0) * 0.15);
            c.totalScore *= (1.0 - crushRate);
          }
          // 약한 페널티 동물상 (30%~50% 감소)
          const mildCrush = ['wolf', 'snake', 'tiger'];
          if (mildCrush.includes(c.animal.id)) {
            const mildRate = Math.min(0.50, 0.30 + (femPower - 1.0) * 0.08);
            c.totalScore *= (1.0 - mildRate);
          }
        });
      }

      // ── 남성형 얼굴 (femininityScore < 40) → 남성 대표 동물상 부스트 ──
      if (femininityScore < 40) {
        const mascPower = 1.0 + (40 - femininityScore) / 40; // 0→×2.0, 20→×1.5, 39→×1.025

        candidates.forEach(c => {
          let bonus = 0;

          // 1) 강아지상 — 둥근 얼굴 + 순한 눈매
          if (c.animal.id === 'dog') {
            if (features.faceRatio >= 0.83) bonus += 550;
            else if (features.faceRatio >= 0.80) bonus += 300;
            if (features.eyeSlant >= 0.5) bonus += 350;
            else if (features.eyeSlant >= -0.5) bonus += 180;
            if (features.mouthCurve > 0) bonus += 150;
            bonus += 250;
          }
          // 2) 곰상 — 넓고 큰 얼굴, 두꺼운 코
          if (c.animal.id === 'bear') {
            if (features.faceRatio >= 0.87) bonus += 290;
            else if (features.faceRatio >= 0.84) bonus += 145;
            if (features.noseWidthRatio >= 1.00) bonus += 220;
            else if (features.noseWidthRatio >= 0.93) bonus += 110;
            bonus += 145;
          }
          // 3) 악어상 — 넓은 하관 + 큰 입 + 넓은 미간
          if (c.animal.id === 'crocodile') {
            if (features.faceRatio >= 0.85) bonus += 450;
            else if (features.faceRatio >= 0.82) bonus += 220;
            if (features.mouthRatio >= 1.50) bonus += 400;
            else if (features.mouthRatio >= 1.40) bonus += 200;
            if (features.eyeDistRatio >= 1.15) bonus += 250;
            bonus += 200;
          }
          // 4) 공룡상 — 강한 턱선 + 매우 큰 입
          if (c.animal.id === 'dinosaur') {
            if (features.mouthRatio >= 1.50) bonus += 400;
            else if (features.mouthRatio >= 1.40) bonus += 200;
            if (features.noseWidthRatio >= 0.98) bonus += 300;
            else if (features.noseWidthRatio >= 0.92) bonus += 150;
            bonus += 200;
          }
          // 5) 호랑이/사자상
          if (c.animal.id === 'tiger') {
            if (features.faceRatio >= 0.84 && features.eyeSlant <= -2.0) bonus += 400;
            bonus += 200;
          }
          if (c.animal.id === 'lion') {
            if (features.faceRatio >= 0.86 && features.noseWidthRatio >= 1.00) bonus += 350;
            bonus += 200;
          }
          // 6) 여우상 — 남성형 갸름한 얼굴 + 날카로운 눈매
          if (c.animal.id === 'fox') {
            if (features.faceRatio <= 0.78) bonus += 126;
            else if (features.faceRatio <= 0.82) bonus += 79;
            else if (features.faceRatio <= 0.85) bonus += 40;
            if (features.eyeSlant <= -3.0) bonus += 90;
            else if (features.eyeSlant <= -1.5) bonus += 47;
            if (features.eyeDistance <= 0.95) bonus += 54;
            else if (features.eyeDistance <= 1.00) bonus += 29;
            if (features.faceRatio <= 0.82 && features.eyeSlant <= -2.0) bonus += 79;
            bonus += 36; // 기본 남성 부스트
          }
          // 7) 늑대상 — 갸름하고 날카로운 눈매
          if (c.animal.id === 'wolf') {
            if (features.faceRatio <= 0.82) bonus += 300;
            if (features.eyeSlant <= -3.0) bonus += 350;
            else if (features.eyeSlant <= -1.5) bonus += 180;
            if (features.eyeDistance <= 1.00) bonus += 150;
          }
          // 8) 뱀상
          if (c.animal.id === 'snake') {
            if (features.eyeSlant <= -2.0) bonus += 250;
            if (features.mouthRatio >= 1.40) bonus += 200;
          }
          // 9) 독수리상
          if (c.animal.id === 'eagle') {
            if (features.eyeDistance <= 0.92) bonus += 300;
            if (features.eyeSlant <= -2.0) bonus += 200;
            if (features.noseWidthRatio >= 0.94) bonus += 150;
          }

          if (bonus > 0) c.totalScore += bonus * mascPower;
        });
      }

      // ── 점수 압축 (극단적 격차 완화) ──
      // 1위 점수가 지나치게 높으면 분포가 한 동물에 쏠리므로
      // 일정 임계값 이상 점수를 로그 스케일로 압축
      const COMPRESS_THRESHOLD = 1800;
      candidates.forEach(c => {
        if (c.totalScore > COMPRESS_THRESHOLD) {
          const excess = c.totalScore - COMPRESS_THRESHOLD;
          // 초과분의 40%만 반영 (대수적 감쇄)
          c.totalScore = COMPRESS_THRESHOLD + excess * 0.4;
        }
      });

      // 내림차순 정렬 (높은 점수가 1위)
      candidates.sort((a, b) => b.totalScore - a.totalScore);

      // ── 소프트맥스(Softmax)로 퍼센트 계산 ──
      const TOP_K = candidates.slice(0, 6);
      const TEMP = 0.003;
      const expArr = TOP_K.map(c => Math.exp(c.totalScore * TEMP));
      const sumExp = expArr.reduce((s, v) => s + v, 0);
      const pctArr = expArr.map(v => (v / sumExp) * 100);

      let bestMatch = candidates[0].animal;
      let matchProb = pctArr[0];

      const top3 = TOP_K.slice(0, 3).map((c, i) => ({
        animal: c.animal,
        pct: pctArr[i].toFixed(1),
        isTop: i === 0
      }));

    // --- 1. 정밀 안상(眼相) 분석 (운명을 결정짓는 창) --- 
    let eyes = [
      { name: '용안(龍眼)', desc: '눈이 크고 길며 위엄이 있는 제왕의 눈. (가장 길하고 귀한 지위)', prob: 0, tag: 'dragon' },
      { name: '호안(虎眼)', desc: '둥글고 부리부리하며 날카롭게 치켜올라간 눈. (권력과 투지의 상징)', prob: 0, tag: 'tiger' },
      { name: '우안(牛眼)', desc: '크고 선하며 속눈썹이 길고 인내심이 강해 보이는 눈. (거부의 상징)', prob: 0, tag: 'cow' },
      { name: '도화안(桃花眼)', desc: '눈가에 물기가 머문 듯 붉고 웃을 때 초승달처럼 휘어지는 눈. (압도적 인복)', prob: 0, tag: 'peach' },
      { name: '삼백안/사백안(三白眼)', desc: '세로 폭이 넓어 흰자위가 많이 드러나는 형태. (기세가 강하고 파격적 승부사)', prob: 0, tag: 'sanpaku' },
      { name: '봉황안(鳳凰眼)', desc: '가로로 극도로 길고 끝이 부드럽게 날아오르는 최상급의 귀한 눈.', prob: 0, tag: 'phoenix' }
    ];
    
          // --- 영혼의 주파수를 맞추는 척도 함수 ---
      // 선형적 뺄셈(Math.abs)이 아닌, 운명의 중력장(차이의 제곱)을 사용하여
      // 특정 관상의 완벽한 비율에 가까워질수록 점수가 강력하게 응집되도록 빚어낸 비술이야
      const calcKarma = (diff1, w1, diff2 = 0, w2 = 0) => {
          let penalty = (Math.pow(diff1, 2) * w1) + (Math.pow(diff2, 2) * w2);
          return Math.max(10.1, Math.min(99.9, 100 - penalty));
      };

      // --- 1. 정밀 안상(眼相) 분석 ---
      // er: 눈의 가로세로 비율 (세상을 바라보는 시야의 넓이)
      // es: 눈꼬리 각도 (음수면 하늘을 향해 치솟고, 양수면 대지를 향해 쳐짐)
      let er = features.eyeRatio;
      let es = features.eyeSlant;

      eyes[0].prob = calcKarma(er - 3.0, 45, es - (-2), 0.8); // 용안 (제왕의 균형)
      eyes[1].prob = calcKarma(er - 2.5, 55, es - (-6), 1.2); // 호안 (맹렬하게 치켜올라간 기세)
      eyes[2].prob = calcKarma(er - 2.7, 45, es - 4, 1.2);    // 우안 (대지처럼 순하게 쳐진 눈매)

      // 도화안은 입꼬리의 기운(mc)이 달빛처럼 더해져야 진정한 유혹의 상이 완성돼
      let peachBase = calcKarma(er - 2.8, 50, es - (-1), 0.8);
      let peachBonus = features.mouthCurve > 0.003 ? 12 : 0; 
      eyes[3].prob = Math.max(10.1, Math.min(99.9, peachBase + peachBonus)); 

      eyes[4].prob = calcKarma(er - 2.2, 70);                 // 삼백안 (흰자위가 드러나는 압도적 세로 폭)
      eyes[5].prob = calcKarma(er - 3.6, 35, es - (-3), 0.8); // 봉황안 (세상을 품어내는 극도로 긴 눈매)

      eyes.sort((a,b) => b.prob - a.prob);
      let bestEye = eyes[0];

      // --- 2. 정밀 비상(鼻相) 분석 (재물의 척도) ---
      let noses = [
        { name: '현담비(懸膽鼻)', desc: '쓸개를 매단 듯 코끝(준두)이 둥글고 두툼하여 엄청난 재물을 쓸어 담는 코.', prob: 0, tag: 'gall' },
        { name: '절통비(截筒鼻)', desc: '초록 대나무를 자른 듯 콧대가 곧고 반듯하여 부귀영화를 고루 누리는 코.', prob: 0, tag: 'bamboo' },
        { name: '매부리코', desc: '콧대가 높게 솟고 끝이 날카롭게 굽어 있어 예리한 통찰력과 불굴의 투지를 지닌 코.', prob: 0, tag: 'hook' }
      ];
      let nr = features.noseRatio; 
      noses[0].prob = calcKarma(nr - 1.35, 120); // 현담비 (짧고 두툼하게 맺힌 재물창고)
      noses[1].prob = calcKarma(nr - 1.6, 150);  // 절통비 (대나무처럼 맑고 반듯한 귀격)
      noses[2].prob = calcKarma(nr - 1.9, 100);  // 매부리코 (높고 예리하게 깎아지른 승부사)

      noses.sort((a,b) => b.prob - a.prob);
      let bestNose = noses[0];

      // --- 3. 정밀 구상(口相) 분석 (복록의 수용력) ---
      let mouths = [
        { name: '앙월구(仰月口)', desc: '입꼬리가 초승달처럼 위를 향해 총명함이 빛나며 만년의 복록이 대단히 두터운 입.', prob: 0, tag: 'upward' },
        { name: '복선구(覆船口)', desc: '입꼬리가 굳게 닫혀 아래를 향하나, 결단력이 강하고 묵직한 카리스마로 조직을 이끄는 입.', prob: 0, tag: 'downward' },
        { name: '대구(大口)', desc: '시원하게 넓고 큰 입구조로 호탕한 리더십을 발휘하며 수많은 사람을 거느리는 제왕의 입.', prob: 0, tag: 'large' },
        { name: '음배구(陰配口)', desc: '작고 앙증맞으나 윤곽이 단정하여, 비밀을 무겁게 지키고 내면의 신념이 단단한 입.', prob: 0, tag: 'small' }
      ];
      // 미세한 입꼬리 근육(mc)의 파동을 1000배 증폭시켜 뚜렷한 영적 수치로 체환했어
      let mcScaled = features.mouthCurve * 1000; 
      let mr = features.mouthRatio;

      mouths[0].prob = calcKarma(mcScaled - 5, 2.5, mr - 1.35, 60);    // 앙월구 (초승달처럼 위를 향해 열린 복록)
      mouths[1].prob = calcKarma(mcScaled - (-5), 2.5, mr - 1.35, 60); // 복선구 (배가 뒤집힌 듯 무겁고 굳건한 닫힘)
      mouths[2].prob = calcKarma(mr - 1.7, 120);                       // 대구 (세상의 모든 것을 집어삼키는 호탕함)
      mouths[3].prob = calcKarma(mr - 1.05, 150);                      // 음배구 (작고 앙증맞으나 속이 꽉 찬 신념)

      mouths.sort((a,b) => b.prob - a.prob);
      let bestMouth = mouths[0];

    // --- 4. 정밀 이상(耳相) 분석 ---
    let earText = "";
    if (features.earPosition === "high") {
        earText += "귀의 윗부분이 눈썹 선보다 위치가 높아(과목상) 학문적 성취와 지혜가 대단히 뛰어나며, 일찍부터 이름을 떨치어 부귀를 누릴 <b>학자/귀인(貴人)</b>의 상입니다. ";
    } else {
        earText += "귀가 눈의 높이와 수평으로 조화를 이루어, <b>뛰어난 현실 감각과 흔들림 없는 평정심</b>으로 탄탄한 중년의 성취를 일궈내는 듬직한 상입니다. ";
    }
    if (features.earRatio > 0.22) {
        earText += "<br>특히 <b>수주(귓볼)가 매우 두껍고 넉넉하여</b> 흘러가는 재물을 꽉 쥐어 담고, 만인을 포용하는 자비로움을 갖춘 덕 있는 장수의 귀입니다.";
    } else {
        earText += "<br>수주의 테두리가 단정하고 예리하여 타인에게 헛된 기대를 걸지 않고, 스스로의 완벽주의적 <b>실력 하나로 크게 자수성가</b>하는 서늘한 감각이 비범합니다.";
    }

    // --- 5. 심화 조화 분석 (상생 / 상극) ---
    let harmonyText = "안면 오관(五官)이 각자의 자리에서 무난한 균형을 유지하고 있어 인생 전반이 크게 기울지 않는 평원(平原)의 격국입니다.";
    
    // 조화 분석 규칙 (상생/상극 매핑)
    if (bestEye.tag === 'tiger' && bestMouth.tag === 'downward') {
        harmonyText = "⚠️ <b>[상극 조화 - 호안과 복선구]</b> 눈빛의 기세가 천하를 뚫는 맹렬한 호안(虎眼)이나, 입꼬리가 굳게 닫힌 복선구로 인해 분노가 안으로 쌓여 기운이 단절될 우려가 있습니다. 유연한 미소와 온화한 덕(德)을 갖추어 기운을 순환시키면 대업을 이룹니다.";
    } else if ((bestEye.tag === 'dragon' || bestEye.tag === 'phoenix') && bestNose.tag === 'gall') {
        harmonyText = "✨ <b>[극상 상생 - 제왕과 거부의 조화]</b> 위엄 있는 용상(또는 봉황)의 눈과 천하의 재물을 쓸어 담는 현담비(懸膽鼻)가 만나 <b>가장 완벽하고 부귀한 최고의 격국(格局)</b>을 이뤘습니다. 이끄는 곳마다 엄청난 결과와 명예가 쏟아집니다.";
    } else if ((bestEye.tag === 'dragon' || bestEye.tag === 'tiger') && bestNose.tag === 'hook') {
        harmonyText = "⚔️ <b>[패업 상생 - 투장(鬪將)의 기운]</b> 두려움 없는 눈매에 매부리코의 예리하고 공격적인 기운이 더해져, 난세의 영웅이나 기업 파괴적 승부사처럼 남들이 불가능하다 여기는 일을 과감히 쟁취해내는 <b>풍운아의 격국</b>입니다.";
    } else if ((bestEye.tag === 'phoenix' || bestEye.tag === 'sanpaku') && bestNose.tag === 'bamboo') {
        harmonyText = "✨ <b>[청귀(淸貴) 상생 - 불의와 타협 않는 고고함]</b> 극도로 예리한 눈빛과 초록 대나무를 쪼갠 듯 반듯한 절통비가 아름답게 조화를 이룹니다. 학자, 판검사 혹은 시대의 리더로서 <b>탁함에 물들지 않고 맑고 숭고한 지위</b>에 오를 격국입니다.";
    } else if (bestEye.tag === 'peach' && bestMouth.tag === 'upward') {
        harmonyText = "🌸 <b>[도화 상생 - 압도적 만인의 연인]</b> 촉촉하고 아련하게 사람을 홀리는 도화안에, 자연스레 호감을 불러일으키는 사랑스러운 앙월구가 더해져 <b>한 번 보면 잊을 수 없는 엄청난 인복과 대중의 사랑</b>을 독차지하는 격국입니다.";
    } else if (bestEye.tag === 'cow' && bestMouth.tag === 'large') {
        harmonyText = "🤝 <b>[포용 상생 - 천하를 거느리는 대장보]</b> 선하고 다정다감한 우안과 한 번에 바다를 들이켤 듯 시원한 대구(大口)가 조화되어, 수많은 사람을 넉넉히 먹여 살리고 거느리는 덕장(德將)의 기운을 완벽히 뽐냅니다.";
    } else if (bestEye.tag === 'sanpaku' && bestMouth.tag === 'small') {
        harmonyText = "⚠️ <b>[상극 조화 - 삼백안과 은배구]</b> 눈빛의 야망(삼백안)은 몹시 강렬하나, 이를 뿜어낼 입(음배구)이 앙증맞고 작아 포부를 다 펼치지 못하고 속병을 앓기 쉽습니다. 소통의 폭을 과감히 넓히면 내면의 천재성이 빛을 봅니다.";
    }

    // 비술: 업보와 그림자의 농도 계산 (관상학적 흉상 수치화)
      const karmaData = this.calculateKarmaShadow(landmarksData);

      // 안좋은 관상(凶相) 정밀 감지
      const negPhysioData = this.detectNegativePhysiognomy(landmarksData, features);

      // 안좋은 관상 HTML 생성 (평균 위험도 이상만 표시)
      const avgSeverity = negPhysioData.detectedTraits.length > 0
        ? negPhysioData.detectedTraits.reduce((s, t) => s + t.severity, 0) / negPhysioData.detectedTraits.length
        : 0;
      const visibleTraits = negPhysioData.detectedTraits.filter(t => t.severity >= avgSeverity);
      const negTraitsHtml = visibleTraits.length > 0
        ? visibleTraits.map(t => `
            <div style="margin-bottom:10px; padding:10px; background:#fff5f5; border-radius:8px; border-left:3px solid ${t.severity >= 60 ? '#dc2626' : t.severity >= 40 ? '#f59e0b' : '#fb923c'};">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-weight:700; font-size:0.95rem; color:#7f1d1d;">${t.icon} ${t.name} <span style="font-size:0.8rem; color:#a1a1aa;">(${t.hanja})</span></span>
                <span style="font-weight:800; font-size:0.85rem; padding:2px 8px; border-radius:12px; color:#fff; background:${t.severity >= 60 ? '#dc2626' : t.severity >= 40 ? '#f59e0b' : '#fb923c'};">위험도 ${t.severity}%</span>
              </div>
              <div style="font-size:0.85rem; color:#991b1b; margin-bottom:5px; line-height:1.5;">${t.description}</div>
              <div style="font-size:0.82rem; color:#065f46; background:#ecfdf5; padding:6px 8px; border-radius:5px;">💡 <b>개운법:</b> ${t.advice}</div>
            </div>`).join('')
        : '<div style="padding:12px; background:#f0fdf4; border-radius:8px; text-align:center; color:#065f46; font-size:0.9rem;">✅ 뚜렷한 흉상(凶相)이 감지되지 않았습니다. 타고난 복상(福相)입니다!</div>';

      // 점(痣) 위치별 관상학적 해석
      const moleData = this.analyzeMolePositions(landmarksData, features);
      const moleReadingsHtml = moleData.readings.length === 0
        ? `<div style="padding:12px; background:#f0fdf4; border-radius:8px; text-align:center; color:#065f46; font-size:0.9rem; border:1px solid #bbf7d0;">✨ 깨끗한 옥(玉)과 같은 피부: 점 없음<br><span style="font-size:0.8rem; color:#6b7280;">그림자·잡티·모공을 점으로 오판하지 않은 결과입니다.</span></div>`
        : moleData.readings.map(m => `
        <div style="margin-bottom:10px; padding:12px; background:${m.type === 'good' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'}; border-radius:8px; border-left:3px solid ${m.type === 'good' ? '#10b981' : '#ef4444'};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-weight:700; font-size:0.95rem; color:${m.type === 'good' ? '#065f46' : '#991b1b'};">${m.icon} ${m.zone}</span>
            <span style="font-weight:700; font-size:0.78rem; padding:2px 8px; border-radius:12px; color:#fff; background:${m.type === 'good' ? '#10b981' : '#ef4444'};">${m.typeLabel}</span>
          </div>
          <div style="font-size:0.8rem; color:#64748b; margin-bottom:4px;">📍 위치: ${m.position}</div>
          <div style="font-weight:600; font-size:0.88rem; color:${m.type === 'good' ? '#047857' : '#b91c1c'}; margin-bottom:4px;">${m.title}</div>
          <div style="font-size:0.85rem; color:#374151; margin-bottom:5px; line-height:1.5;">${m.description}</div>
          <div style="font-size:0.82rem; color:#065f46; background:${m.type === 'good' ? '#ecfdf5' : '#fef2f2'}; padding:6px 8px; border-radius:5px;">💡 <b>조언:</b> ${m.advice}</div>
        </div>`).join('');

      const expertReportHtml = `
      <div style="font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.6;">
        
        <div style="margin-bottom: 15px; background: #f0fdf4; padding: 15px; border-radius: 10px; border-left: 4px solid #10b981;">
            <div style="font-weight: 800; font-size: 1.1rem; color: #065f46; margin-bottom: 5px;"> 👑 ${bestMatch.emoji} ${bestMatch.name} 관상 총평</div>
            <div style="font-size: 0.95rem; color: #1e293b; line-height: 1.6;">${bestMatch.description}</div>

        <div style="margin-bottom: 15px;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;"> 오관(五官) 정밀 확률 분석</div>
          <ul style="padding-left: 0; list-style: none; font-size: 0.95rem; color: #475569; margin: 0;">
            <li style="margin-bottom: 12px; background: #f8fafc; padding: 10px; border-radius: 6px;">
               <div style="font-weight:700; color:#3b82f6; margin-bottom:4px; font-size: 1rem;">👁️ 안상(눈) - ${bestEye.name} <span style="color:#2563eb;">[${bestEye.prob.toFixed(1)}% 일치]</span></div>
               ${bestEye.desc}
               <div style="font-size:0.8rem; color:#94a3b8; margin-top:4px;">*경합 분석: ${eyes[1].name}(${eyes[1].prob.toFixed(1)}%), ${eyes[2].name}(${eyes[2].prob.toFixed(1)}%)</div>
            </li>
            <li style="margin-bottom: 12px; background: #f8fafc; padding: 10px; border-radius: 6px;">
               <div style="font-weight:700; color:#8b5cf6; margin-bottom:4px; font-size: 1rem;">👃 비상(코) - ${bestNose.name} <span style="color:#7c3aed;">[${bestNose.prob.toFixed(1)}% 일치]</span></div>
               ${bestNose.desc}
               <div style="font-size:0.8rem; color:#94a3b8; margin-top:4px;">*경합 분석: ${noses[1].name}(${noses[1].prob.toFixed(1)}%)</div>
            </li>
            <li style="margin-bottom: 12px; background: #f8fafc; padding: 10px; border-radius: 6px;">
               <div style="font-weight:700; color:#ec4899; margin-bottom:4px; font-size: 1rem;">👄 구상(입) - ${bestMouth.name} <span style="color:#db2777;">[${bestMouth.prob.toFixed(1)}% 일치]</span></div>
               ${bestMouth.desc}
            </li>
            <li style="margin-bottom: 6px; background: #f8fafc; padding: 10px; border-radius: 6px;">
               <div style="font-weight:700; color:#f59e0b; margin-bottom:4px; font-size: 1rem;">👂 이상(귀/수주)의 통찰</div>
               ${earText}
            </li>
          </ul>
        </div>

<div style="margin-bottom: 15px; background: #fef2f2; padding: 15px; border-radius: 10px; border: 1px solid #fca5a5;">
            <div style="font-weight: 800; font-size: 1.05rem; color: #991b1b; margin-bottom: 8px; border-bottom: 1px solid #fecaca; padding-bottom: 5px;"> 💀 영혼의 그림자 (Karma Shadow)</div>
            <div style="font-size: 0.95rem; color: #7f1d1d; margin-bottom: 10px;">
              현재 얼굴에 깃든 오대 업보(五大 業報)의 농도는 <b style="font-size: 1.1rem; color: #b91c1c;">${karmaData.score}%</b> 입니다.
            </div>
            <ul style="padding-left: 0; list-style: none; font-size: 0.85rem; color: #7f1d1d; margin: 0; margin-bottom: 12px; background: #fee2e2; padding: 10px; border-radius: 6px;">
              <li style="margin-bottom: 4px;">💸 <b>재물 누수 지수 (노공):</b> ${karmaData.nose}</li>
              <li style="margin-bottom: 4px;">⚔️ <b>파란만장 지수 (사백안):</b> ${karmaData.eye}</li>
              <li style="margin-bottom: 4px;">🌪️ <b>고립/쇠퇴 지수 (복선구):</b> ${karmaData.mouth}</li>
              <li style="margin-bottom: 4px;">⛓️ <b>편협/고난 지수 (명궁 협소):</b> ${karmaData.glabella}</li>
              <li style="margin-bottom: 0;">🍂 <b>말년 붕괴 지수 (빈약한 하관):</b> ${karmaData.jaw}</li>
            </ul>
            <div style="font-weight: 800; color: #991b1b; margin-bottom: 5px; font-size: 0.95rem;">✨ 운명 개운법 (心相處方)</div>
            <p style="font-size: 0.9rem; color: #7f1d1d; margin: 0; line-height: 1.5;">${karmaData.advice}</p>
          </div>

          <div style="margin-bottom: 15px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 18px; border-radius: 12px; border: 1px solid #4338ca; box-shadow: 0 4px 15px rgba(67,56,202,0.3);">
            <div style="font-weight: 800; font-size: 1.1rem; color: #e0e7ff; margin-bottom: 5px; border-bottom: 1px solid #4338ca; padding-bottom: 8px;">
              🔮 안좋은 관상 정밀 분석 <span style="font-size:0.8rem; color:#a5b4fc;">(十大 凶相 감별)</span>
            </div>
            <div style="font-size:0.9rem; color:#c7d2fe; margin-bottom:12px; line-height:1.5;">
              전통 관상학의 <b style="color:#fbbf24;">10대 흉상(凶相)</b>을 정밀 분석한 결과,
              <b style="font-size:1.05rem; color:${negPhysioData.detectedCount === 0 ? '#34d399' : negPhysioData.detectedCount <= 2 ? '#fbbf24' : '#f87171'};">
                ${negPhysioData.detectedCount}개</b>의 주의 징후가 감지되었습니다.
              ${negPhysioData.detectedCount > 0 ? '<span style="font-size:0.82rem;">(평균 위험도: <b style="color:#fbbf24;">' + negPhysioData.overallScore + '%</b>)</span>' : ''}
            </div>
            <div style="margin-bottom:12px;">
              ${negTraitsHtml}
            </div>
            <div style="background:#1e1b4b; padding:12px; border-radius:8px; border:1px solid #3730a3;">
              <div style="font-weight:700; color:#fbbf24; margin-bottom:5px; font-size:0.9rem;">📿 종합 개운 처방 (總合 開運 處方)</div>
              <p style="font-size:0.85rem; color:#c7d2fe; margin:0; line-height:1.6;">${negPhysioData.overallAdvice}</p>
            </div>
          </div>

          <!-- 점(痣) 위치별 관상 해석 섹션 -->
          <div style="margin-bottom:15px; background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding:18px; border-radius:12px; border:1px solid #334155; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
            <div style="font-weight:800; font-size:1.05rem; color:#e2e8f0; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
              ✨ 점(痣) 위치별 관상 해석 <span style="font-size:0.8rem; color:#94a3b8;">(面痣 十二宮 分析)</span>
            </div>
            <div style="font-size:0.88rem; color:#94a3b8; margin-bottom:12px; line-height:1.5;">
              전통 관상학의 <b style="color:#fbbf24;">얼굴 12궁(十二宮)</b> 기반 점(痣) 위치 분석 결과,
              <span style="font-weight:700; color:${moleData.goodCount >= moleData.badCount ? '#34d399' : '#fbbf24'};">
                총 ${moleData.totalDetected}개</span> 부위에서 점의 기운이 감지되었습니다.
              <span style="font-size:0.82rem;">(길점: <b style="color:#10b981;">${moleData.goodCount}개</b> / 흉점: <b style="color:#ef4444;">${moleData.badCount}개</b>)</span>
            </div>
            <div style="margin-bottom:12px;">
              ${moleReadingsHtml}
            </div>
            <div style="background:#1e293b; padding:12px; border-radius:8px; border:1px solid #475569;">
              <div style="font-weight:700; color:#fbbf24; margin-bottom:5px; font-size:0.9rem;">🔮 점(痣) 종합 운세 판단</div>
              <p style="font-size:0.85rem; color:#cbd5e1; margin:0; line-height:1.6;">${moleData.overallVerdict}</p>
            </div>
          </div>

          <div style="margin-bottom: 15px; background: #fffbeb; padding: 15px; border-radius: 10px; border: 1px solid #fde68a;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #d97706; margin-bottom: 5px;"> 📜 삶의 지혜 (Advise)</div>
          <p style="font-size: 0.95rem; color: #78350f; margin: 0;">관상의 흠결은 미소 하나로 훌륭하게 덧입혀지고, 아무리 좋은 상(相)도 오만한 태도 앞에서는 금세 빛을 잃습니다. <b>본인의 타고난 강점을 믿고 겸손하게 내면(心相)을 다루는 것</b>이 진정한 개운(開運)의 본질임을 잊지 마십시오.</p>
        </div>

        <div>
           <div style="font-weight: 800; font-size: 1.05rem; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;"> 🐾 이면의 현대적 동물상 매칭</div>
           <!-- Top3 동물상 퍼센트 표시 -->
           <div style="margin-bottom:14px; background:#f0f9ff; padding:14px; border-radius:10px; border-left:4px solid #0ea5e9;">
             <div style="font-weight:800; font-size:0.95rem; color:#0c4a6e; margin-bottom:10px;">🐾 동물상 매칭 순위 (TOP 3)</div>
             ${top3.map((t, i) => `
             <div style="margin-bottom:${i<2?'10':'0'}px;">
               <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                 <span style="font-weight:${t.isTop?'800':'600'};font-size:${t.isTop?'1.05':'0.88'}rem;color:${t.isTop?'#0f172a':'#475569'};">${i+1}위 ${t.animal.emoji} ${t.animal.name}</span>
                 <span style="font-weight:800;color:${t.isTop?'#0ea5e9':'#64748b'};font-size:${t.isTop?'1rem':'0.85'}rem;">${t.pct}%</span>
               </div>
               <div style="background:#e2e8f0;height:${t.isTop?'10':'6'}px;border-radius:9px;overflow:hidden;">
                 <div style="height:100%;width:${t.pct}%;background:${t.isTop?'linear-gradient(90deg,#38bdf8,#0ea5e9)':'#94a3b8'};border-radius:9px;"></div>
               </div>
               ${t.isTop ? `<div style="font-size:0.75rem;color:#64748b;margin-top:3px;">대표 연예인: ${t.animal.celebrities.slice(0,3).join(', ')}</div>` : ''}
             </div>`).join('')}
           </div>
           <p style="font-size: 0.95rem; color: #475569; margin: 0;">위의 고전 관상학적 특질을 현대 매력 지수로 체환하면 <b>[${bestMatch.name} ${bestMatch.emoji}]</b>의 기운과 흡사합니다. (대표 연예인: ${bestMatch.celebrities.join(", ")})</p>
        </div>
      </div>
    `;

    return {
      primaryAnimal: bestMatch.name,
      emoji: bestMatch.emoji,
      celebrities: bestMatch.celebrities.join(", "),
      description: bestMatch.description,
      expertReportHtml: expertReportHtml,
      // 소프트맥스 기반 1위 퍼센트 (face-api 표정 반영)
      confidence: matchProb.toFixed(1),
      top3,
      extractedFeatures: features
    };
  }

  // ============================================
  // 얼굴형 오행 분류 (圓/方/長/逆三角)
  // ============================================
  classifyFaceShape(features) {
    const fr = features.faceRatio;
    const chin = features.chinLength;
    const sj = features.samjung;

    let scores = { round: 0, square: 0, long: 0, triangle: 0 };

    // 원형 (土·水): 넓은 faceRatio, 짧은 턱, 균형 삼정
    if (fr >= 0.85) scores.round += 35;
    else if (fr >= 0.82) scores.round += 18;
    if (chin <= 0.32) scores.round += 20;
    else if (chin <= 0.34) scores.round += 10;
    if (Math.abs(sj.upper - sj.middle) < 0.04 && Math.abs(sj.middle - sj.lower) < 0.04) scores.round += 15;

    // 방형 (金): 중간~넓은 faceRatio, 발달된 하정
    if (fr >= 0.80 && fr <= 0.88) scores.square += 15;
    if (chin >= 0.36) scores.square += 30;
    else if (chin >= 0.34) scores.square += 18;
    if (sj.lower >= 0.36) scores.square += 15;

    // 장형 (木): 좁은 faceRatio, 긴 중정
    if (fr <= 0.77) scores.long += 40;
    else if (fr <= 0.80) scores.long += 20;
    if (sj.middle >= 0.37) scores.long += 15;
    if (chin >= 0.34) scores.long += 8;

    // 역삼각형 (火): 상정>하정, 짧은 턱, 중간 faceRatio
    if (sj.upper > sj.lower + 0.04) scores.triangle += 25;
    if (chin <= 0.30) scores.triangle += 25;
    else if (chin <= 0.32) scores.triangle += 12;
    if (fr >= 0.78 && fr <= 0.85) scores.triangle += 10;

    const types = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topType = types[0][0];

    const info = {
      round:    { name: '원형(圓型)', element: '土·水', emoji: '🟤', desc: '원만하고 포용력 넘치는 상', fortune: '재물복·인복 풍부' },
      square:   { name: '방형(方型)', element: '金',    emoji: '🔶', desc: '의지가 강하고 실행력 뛰어난 상', fortune: '직업운·관록 왕성' },
      long:     { name: '장형(長型)', element: '木',    emoji: '🌿', desc: '지적이고 이성적인 상', fortune: '학업운·명예운 양호' },
      triangle: { name: '역삼각형(逆三角型)', element: '火', emoji: '🔺', desc: '창의적이고 감각적인 상', fortune: '예술적 재능·직관력 출중' }
    };

    return { type: topType, ...info[topType], score: types[0][1] };
  }

  // ============================================
  // 관상 궁합 분석 (두 사람의 분석 결과를 받아 궁합 산출)
  // ============================================
  calculateCompatibility(result1, result2) {
    const animal1 = result1.primaryAnimal;
    const animal2 = result2.primaryAnimal;
    const emoji1 = result1.emoji;
    const emoji2 = result2.emoji;
    const id1 = (this.animalDb.animals.find(a => a.name === animal1) || {}).id || '';
    const id2 = (this.animalDb.animals.find(a => a.name === animal2) || {}).id || '';

    // 방어적 null 체크
    const feat1 = result1.extractedFeatures || {};
    const feat2 = result2.extractedFeatures || {};
    if (!feat1.samjung) feat1.samjung = { upper: 0.333, middle: 0.333, lower: 0.334 };
    if (!feat2.samjung) feat2.samjung = { upper: 0.333, middle: 0.333, lower: 0.334 };
    if (feat1.faceRatio === undefined) feat1.faceRatio = 0.82;
    if (feat2.faceRatio === undefined) feat2.faceRatio = 0.82;
    if (feat1.chinLength === undefined) feat1.chinLength = 0.33;
    if (feat2.chinLength === undefined) feat2.chinLength = 0.33;
    if (feat1.eyeToFaceRatio === undefined) feat1.eyeToFaceRatio = 0.65;
    if (feat2.eyeToFaceRatio === undefined) feat2.eyeToFaceRatio = 0.65;

    // ── 동물상 궁합 매트릭스 (상생/상극/보통) ──
    const compatMap = {
      // 최상 궁합 (95+)
      'dog-cat': { score: 96, type: '천생연분', desc: '순하고 다정한 강아지상과 도도하고 독립적인 고양이상은 서로의 빈자리를 완벽하게 메워주는 최고의 짝입니다. 강아지상의 따뜻한 애정이 고양이상의 마음을 녹이고, 고양이상의 쿨함이 강아지상에게 적절한 공간을 만들어줍니다.' },
      'dog-rabbit': { score: 97, type: '천생연분', desc: '두 사람 모두 순하고 애정이 넘치는 관상으로, 만나는 순간부터 마치 오래된 연인처럼 자연스럽게 어울립니다. 서로를 향한 헌신과 따뜻한 배려가 끊이지 않아 영원한 사랑을 약속하는 궁합입니다.' },
      'tiger-deer': { score: 95, type: '천생연분', desc: '호랑이상의 강렬한 카리스마가 사슴상의 순수하고 우아한 내면을 보호하며, 사슴상의 고결한 품성이 호랑이상의 거친 기운을 정화시켜 줍니다. 가장 이상적인 음양 조화의 궁합입니다.' },
      'bear-rabbit': { score: 95, type: '천생연분', desc: '듬직하고 묵직한 곰상이 활발하고 귀여운 토끼상을 감싸 안아 최강의 안정감을 선사합니다. 토끼상의 밝은 에너지가 곰상의 무뚝뚝함을 녹여 서로가 없으면 안 되는 궁합입니다.' },
      'wolf-deer': { score: 95, type: '천생연분', desc: '차갑고 의리 있는 늑대상과 순수하고 맑은 사슴상의 만남은 소설 속 같은 드라마틱한 사랑입니다. 늑대상이 사슴상을 세상 누구보다 지켜주고 사슴상이 늑대상의 상처를 치유해주는 운명적 궁합입니다.' },
      'lion-hamster': { score: 93, type: '천생연분', desc: '위엄 넘치는 사자상이 귀엽고 부지런한 햄스터상을 사랑스럽게 보호하며, 햄스터상의 활력이 사자상에게 무한한 활력을 제공합니다. 권력과 사랑이 동시에 꽃피는 궁합입니다.' },

      // 좋은 궁합 (80-94)
      'fox-rabbit': { score: 90, type: '상생궁합', desc: '영리한 여우상이 순수한 토끼상을 이끌어주며, 토끼상의 진심이 여우상의 변덕을 잡아줍니다. 서로의 부족한 점을 채워주는 이상적인 파트너십입니다.' },
      'dog-bear': { score: 88, type: '상생궁합', desc: '다정한 강아지상과 듬직한 곰상은 따뜻하고 안정적인 가정을 꾸리기에 최적의 궁합입니다. 둘 다 진심을 담아 사람을 대하는 성향이라 신뢰가 매우 깊습니다.' },
      'cat-fox': { score: 87, type: '상생궁합', desc: '도도한 고양이상과 영리한 여우상은 세련되고 감각적인 커플입니다. 서로의 독립성을 인정하면서도 묘한 끌림으로 강하게 연결되어 있습니다.' },
      'tiger-lion': { score: 86, type: '상생궁합', desc: '두 맹수의 만남! 서로의 카리스마를 존중하면서 거대한 시너지를 만들어냅니다. 권력과 성공을 함께 쥐는 최강의 파워커플 궁합입니다.' },
      'otter-dog': { score: 89, type: '상생궁합', desc: '사교적인 수달상과 다정한 강아지상은 함께 있으면 웃음이 끊이지 않는 최고의 짝입니다. 서로를 편안하게 해주며 오래 갈수록 깊어지는 궁합입니다.' },
      'hamster-rabbit': { score: 91, type: '상생궁합', desc: '귀여움의 대결! 두 사람의 밝고 긍정적인 에너지가 만나면 주변까지 행복하게 만드는 힐링 커플이 됩니다.' },
      'eagle-snake': { score: 85, type: '상생궁합', desc: '날카로운 통찰력의 독수리상과 치밀한 전략가 뱀상의 만남은 비즈니스 파트너로도 최강이며, 서로의 야망을 이해하고 밀어주는 궁합입니다.' },
      'koala-alpaca': { score: 87, type: '상생궁합', desc: '느긋하고 사려 깊은 코알라상과 온화하고 신념 있는 알파카상은 잔잔하지만 깊은 사랑을 나누는 궁합입니다. 서로에게 가장 편안한 안식처가 됩니다.' },
      'monkey-sparrow': { score: 88, type: '상생궁합', desc: '재주 많은 원숭이상과 명랑한 참새상의 만남은 활기차고 즐거운 관계를 만듭니다. 서로의 다재다능함이 시너지를 이루어 어떤 상황에서도 웃음을 잃지 않습니다.' },
      'horse-dog': { score: 85, type: '상생궁합', desc: '활달한 말상과 충직한 강아지상은 함께 여행하고 모험을 즐기며 깊은 유대를 형성합니다. 서로의 자유를 존중하면서도 끈끈한 정으로 이어진 궁합입니다.' },

      // 보통 궁합 (65-79)
      'cat-cat': { score: 72, type: '동류궁합', desc: '두 고양이상의 만남은 서로의 독립성을 극도로 존중하지만, 때로는 서로 관심을 표현하지 않아 냉전에 빠지기 쉽습니다. 먼저 다가가는 용기가 필요합니다.' },
      'tiger-tiger': { score: 68, type: '동류궁합', desc: '두 호랑이의 만남은 강렬하지만 주도권 다툼이 잦을 수 있습니다. 서로 양보하는 미덕을 배우면 천하무적의 커플이 됩니다.' },
      'fox-fox': { score: 70, type: '동류궁합', desc: '두 여우상은 서로의 속내를 너무 잘 알기에 밀당이 끝없이 이어집니다. 진심을 솔직하게 표현하면 최고의 전략적 파트너가 됩니다.' },
      'snake-wolf': { score: 73, type: '팽팽궁합', desc: '뱀상의 치밀함과 늑대상의 의리가 만나면 강렬한 긴장감 속에서도 묘한 끌림이 있습니다. 서로를 완전히 신뢰하기까지 시간이 걸리지만, 한 번 인정하면 평생입니다.' },
      'dinosaur-bear': { score: 75, type: '보통궁합', desc: '공룡상의 거친 매력과 곰상의 포근함이 어울리며, 서로 다른 방식으로 상대를 보호하려는 마음이 통합니다.' },
      'horse-eagle': { score: 74, type: '보통궁합', desc: '활동적인 말상과 날카로운 독수리상은 각자의 방식으로 세상을 누비며, 서로의 자유를 존중하는 관계를 형성합니다.' },

      // 상극 궁합 (50-64)
      'cat-dog': { score: 96, type: '천생연분', desc: '순하고 다정한 강아지상과 도도하고 독립적인 고양이상은 서로의 빈자리를 완벽하게 메워주는 최고의 짝입니다.' }, // mirror
      'tiger-rabbit': { score: 58, type: '상극궁합', desc: '호랑이상의 강렬한 기세가 여린 토끼상을 압도하기 쉽습니다. 호랑이상이 부드러움을 배우고, 토끼상이 용기를 내면 의외의 좋은 궁합으로 발전할 수 있습니다.' },
      'snake-rabbit': { score: 55, type: '상극궁합', desc: '뱀상의 치명적 매력과 토끼상의 순수함은 극과 극의 만남입니다. 초반의 강렬한 끌림 뒤에 서로의 가치관 차이를 극복해야 하는 시련이 옵니다.' },
      'eagle-sparrow': { score: 52, type: '상극궁합', desc: '독수리상의 날카로운 기운이 참새상의 밝은 에너지를 위축시킬 수 있습니다. 서로의 세계를 이해하려는 노력이 절실히 필요한 궁합입니다.' },
      'crocodile-hamster': { score: 50, type: '상극궁합', desc: '악어상의 냉철함과 햄스터상의 귀여움은 물과 기름처럼 섞이기 어렵습니다. 그러나 악어상이 마음을 열면 햄스터상이 최고의 활력소가 됩니다.' },
    };

    // 궁합 키 생성 (양방향 검색)
    let compKey = `${id1}-${id2}`;
    let compData = compatMap[compKey];
    if (!compData) {
      compKey = `${id2}-${id1}`;
      compData = compatMap[compKey];
    }

    // 매트릭스에 없는 경우 기본 궁합 산출 (알고리즘 기반)
    if (!compData) {
      compData = this._generateDefaultCompatibility(id1, id2, result1, result2);
    }

    // ── ① 얼굴형 오행(五行) 궁합 ──
    const shape1 = this.classifyFaceShape(feat1);
    const shape2 = this.classifyFaceShape(feat2);

    const faceShapeCompatMap = {
      'round-square':    { score: 92, label: '土生金 상생', desc: '원형의 부드러운 포용력과 방형의 단단한 의지가 만나 土生金의 상생을 이룹니다. 서로의 빈자리를 완벽하게 채우는 최고의 조합입니다.' },
      'round-long':      { score: 87, label: '水生木 상생', desc: '원형의 따뜻한 감성과 장형의 이성적 사고가 水生木의 상생으로 어우러집니다. 감정과 논리의 균형이 탁월합니다.' },
      'round-triangle':  { score: 89, label: '火生土 상생', desc: '역삼각형의 날카로운 창의성을 원형의 안정감이 감싸주는 火生土의 상생입니다. 서로를 자극하면서도 편안한 관계입니다.' },
      'square-long':     { score: 64, label: '金克木 주의', desc: '방형의 원칙과 장형의 이론이 부딪히는 金克木의 기운이 있습니다. 서로의 방식을 존중하는 유연함이 필요합니다.' },
      'square-triangle': { score: 60, label: '火克金 주의', desc: '방형의 안정 추구와 역삼각형의 변화 추구가 대립하는 火克金의 기운입니다. 공통의 목표를 세우면 강력한 팀이 됩니다.' },
      'long-triangle':   { score: 84, label: '木生火 상생', desc: '장형의 깊은 사고와 역삼각형의 직관이 만나 木生火의 상생을 이룹니다. 지적이면서도 감각적인 관계입니다.' },
    };

    let faceShapeKey = `${shape1.type}-${shape2.type}`;
    let shapeCompat = faceShapeCompatMap[faceShapeKey];
    if (!shapeCompat) {
      faceShapeKey = `${shape2.type}-${shape1.type}`;
      shapeCompat = faceShapeCompatMap[faceShapeKey];
    }
    if (!shapeCompat) {
      shapeCompat = { score: 73, label: '동형 안정', desc: `같은 ${shape1.name}끼리의 만남은 편안하고 자연스럽지만, 성장과 자극이 부족할 수 있습니다. 새로운 경험을 함께 추구하면 관계가 깊어집니다.` };
    }
    const faceShapeScore = shapeCompat.score;

    // ── ② 삼정(三停) 시차 보완 궁합 ──
    const sj1 = feat1.samjung;
    const sj2 = feat2.samjung;
    const upperDiff = Math.abs(sj1.upper - sj2.upper);
    const middleDiff = Math.abs(sj1.middle - sj2.middle);
    const lowerDiff = Math.abs(sj1.lower - sj2.lower);
    const avgDiff = (upperDiff + middleDiff + lowerDiff) / 3;

    // 두 사람의 삼정 평균이 이상적 균형(0.333)에 가까운지
    const combinedUpper = (sj1.upper + sj2.upper) / 2;
    const combinedMiddle = (sj1.middle + sj2.middle) / 2;
    const combinedLower = (sj1.lower + sj2.lower) / 2;
    const balanceDeviation = Math.abs(combinedUpper - 0.333) + Math.abs(combinedMiddle - 0.333) + Math.abs(combinedLower - 0.333);

    let samjungScore = 70;
    if (avgDiff >= 0.02 && avgDiff <= 0.07) samjungScore += 18;
    else if (avgDiff < 0.02) samjungScore += 5;
    else samjungScore -= Math.min(15, (avgDiff - 0.07) * 200);
    samjungScore += Math.max(0, (0.15 - balanceDeviation) * 60);
    samjungScore = Math.max(40, Math.min(98, Math.round(samjungScore)));

    // 삼정 시기별 보완 분석 텍스트
    let samjungAnalysis = '';
    if (sj1.upper >= 0.35 && sj2.upper < 0.32) samjungAnalysis += '첫 번째 분의 초년 기운이 두 번째 분의 초년 부족을 보완합니다. ';
    else if (sj2.upper >= 0.35 && sj1.upper < 0.32) samjungAnalysis += '두 번째 분의 초년 기운이 첫 번째 분의 초년 부족을 보완합니다. ';
    else if (sj1.upper >= 0.34 && sj2.upper >= 0.34) samjungAnalysis += '두 분 모두 초년운이 강해 젊은 시절 활력이 넘칩니다. ';
    if (sj1.middle >= 0.36 && sj2.middle < 0.32) samjungAnalysis += '첫 번째 분의 중년 기운이 두 번째 분의 중년 운을 끌어올립니다. ';
    else if (sj2.middle >= 0.36 && sj1.middle < 0.32) samjungAnalysis += '두 번째 분의 중년 기운이 첫 번째 분의 중년 운을 끌어올립니다. ';
    if (sj1.lower >= 0.36 && sj2.lower < 0.32) samjungAnalysis += '첫 번째 분의 노년 복이 두 번째 분의 노후를 든든하게 받쳐줍니다.';
    else if (sj2.lower >= 0.36 && sj1.lower < 0.32) samjungAnalysis += '두 번째 분의 노년 복이 첫 번째 분의 노후를 든든하게 받쳐줍니다.';
    if (!samjungAnalysis) samjungAnalysis = '두 분의 삼정 비율이 비슷하여 인생 리듬이 안정적으로 어울립니다.';

    // ── ③ 오관(五官) 정밀 궁합 ──

    // 👁️ 눈 궁합 — 관상학적 눈매 페어링
    const slant1 = feat1.eyeSlant;
    const slant2 = feat2.eyeSlant;
    const eyeDiff = Math.abs(slant1 - slant2);
    let eyeCompat = 0;
    let eyeComment = '';
    const isSharpEye1 = slant1 < -1.5;
    const isSharpEye2 = slant2 < -1.5;
    const isGentleEye1 = slant1 > 1.0;
    const isGentleEye2 = slant2 > 1.0;

    if ((isSharpEye1 && isGentleEye2) || (isSharpEye2 && isGentleEye1)) {
      eyeCompat = 95;
      eyeComment = '날카로운 눈매와 온화한 눈매의 조합! 기운이 완벽한 음양 균형을 이룹니다.';
    } else if (isSharpEye1 && isSharpEye2) {
      eyeCompat = 58;
      eyeComment = '두 분 모두 날카로운 눈매로 강한 기운이 부딪힐 수 있습니다. 부드러운 소통으로 보완하세요.';
    } else if (isGentleEye1 && isGentleEye2) {
      eyeCompat = 80;
      eyeComment = '두 분 모두 온화한 눈매로 평화로운 관계를 형성합니다. 결단이 필요할 때 서로 밀어주세요.';
    } else if (eyeDiff >= 2 && eyeDiff <= 5) {
      eyeCompat = 88;
      eyeComment = '적당히 다른 눈매가 흥미로운 긴장과 균형을 만듭니다.';
    } else if (eyeDiff < 2) {
      eyeCompat = 75;
      eyeComment = '비슷한 눈매로 감정 파장이 자연스레 동기화됩니다.';
    } else {
      eyeCompat = Math.max(50, 88 - (eyeDiff - 5) * 8);
      eyeComment = '눈매 차이가 크지만, 서로의 시각을 통해 세계가 확장됩니다.';
    }
    // 눈 크기 보완 보너스
    const eyeRatioDiff = Math.abs(feat1.eyeToFaceRatio - feat2.eyeToFaceRatio);
    if (eyeRatioDiff >= 0.05 && eyeRatioDiff <= 0.12) eyeCompat = Math.min(98, eyeCompat + 5);

    // 👃 코 궁합 — 재물·자존심 페어링
    const nw1 = feat1.noseWidthRatio;
    const nw2 = feat2.noseWidthRatio;
    const noseDiff = Math.abs(nw1 - nw2);
    let noseCompat = 0;
    let noseComment = '';
    const isHighNose1 = nw1 <= 0.78;
    const isHighNose2 = nw2 <= 0.78;
    const isRoundNose1 = nw1 >= 0.90;
    const isRoundNose2 = nw2 >= 0.90;

    if ((isHighNose1 && isRoundNose2) || (isHighNose2 && isRoundNose1)) {
      noseCompat = 93;
      noseComment = '높은 코(리더형)와 둥근 코(조화형)의 만남! 자존심과 포용력이 균형을 이루어 재물운이 상승합니다.';
    } else if (isHighNose1 && isHighNose2) {
      noseCompat = 60;
      noseComment = '두 분 모두 자존심이 강한 코상입니다. 재물 주도권을 나누고 서로의 자율성을 인정해야 합니다.';
    } else if (isRoundNose1 && isRoundNose2) {
      noseCompat = 82;
      noseComment = '두 분 모두 넉넉한 코상으로 물질적 풍요와 인정이 넘칩니다. 함께할수록 재물이 모입니다.';
    } else {
      noseCompat = Math.max(50, Math.min(92, 88 - noseDiff * 150));
      noseComment = noseDiff <= 0.05 ? '코 폭이 비슷하여 가치관과 재물관이 잘 맞습니다.' : noseDiff <= 0.10 ? '적당한 코 차이가 재물 운용에 상보적 역할을 합니다.' : '재물 관점이 다를 수 있으니 경제적 대화를 자주 나누세요.';
    }

    // 👄 입 궁합 — 소통·가정운 페어링
    const mc1 = feat1.mouthCurve;
    const mc2 = feat2.mouthCurve;
    const mr1 = feat1.mouthRatio;
    const mr2 = feat2.mouthRatio;
    let mouthCompat = 70;
    let mouthComment = '';
    const isBigMouth1 = mr1 >= 1.4;
    const isBigMouth2 = mr2 >= 1.4;
    const isSmallMouth1 = mr1 <= 1.2;
    const isSmallMouth2 = mr2 <= 1.2;

    if ((isBigMouth1 && isSmallMouth2) || (isBigMouth2 && isSmallMouth1)) mouthCompat += 12;

    if (mc1 > 0 && mc2 > 0) {
      mouthCompat = Math.max(mouthCompat, 95);
      mouthComment = '두 분 모두 올라간 입꼬리! 가정에 웃음이 끊이지 않는 만복(萬福)의 궁합입니다.';
    } else if (mc1 > 0 || mc2 > 0) {
      mouthCompat = Math.max(mouthCompat, 82);
      mouthComment = '한 분의 올라간 입꼬리가 가정에 밝은 기운을 불어넣습니다. 웃는 입이 복을 부릅니다.';
    } else {
      mouthCompat = Math.max(mouthCompat, 58);
      mouthComment = '두 분 모두 과묵한 입상이지만 깊은 속마음은 진실합니다. 함께 웃는 연습이 운을 끌어올립니다.';
    }
    if ((isBigMouth1 && isSmallMouth2) || (isBigMouth2 && isSmallMouth1)) {
      mouthComment += ' 큰 입과 작은 입의 조합이 자연스러운 대화 균형을 만듭니다.';
    }
    mouthCompat = Math.min(98, mouthCompat);

    // 🧑 얼굴형 세부 궁합 (오행 + faceRatio 미세 보정)
    const faceRatioDiff = Math.abs(feat1.faceRatio - feat2.faceRatio);
    let faceCompat = faceShapeScore;
    if (faceRatioDiff >= 0.03 && faceRatioDiff <= 0.12) faceCompat = Math.min(98, faceCompat + 5);
    else if (faceRatioDiff > 0.15) faceCompat = Math.max(45, faceCompat - 8);

    // ── ④ 종합 궁합 산출 ──
    // 동물매트릭스 40% + 얼굴형오행 15% + 삼정보완 15% + 오관평균 30%
    const ogwanAvg = (eyeCompat + noseCompat + mouthCompat) / 3;
    const finalScore = Math.round(
      compData.score * 0.40 +
      faceShapeScore * 0.15 +
      samjungScore * 0.15 +
      ogwanAvg * 0.30
    );

    // 궁합 등급 산출
    let grade = '';
    let gradeEmoji = '';
    if (finalScore >= 90) { grade = '천생연분 💕'; gradeEmoji = '💕'; }
    else if (finalScore >= 80) { grade = '상생궁합 💛'; gradeEmoji = '💛'; }
    else if (finalScore >= 70) { grade = '무난궁합 💚'; gradeEmoji = '💚'; }
    else if (finalScore >= 60) { grade = '노력궁합 🧡'; gradeEmoji = '🧡'; }
    else { grade = '상극궁합 💔'; gradeEmoji = '💔'; }

    // 궁합 조언 생성 (오행 + 삼정 반영)
    let advice = '';
    if (finalScore >= 90) {
      advice = `두 분은 하늘이 맺어준 최고의 인연입니다! ${shape1.element}과 ${shape2.element}의 기운이 상생하며, 삼정의 흐름도 완벽히 보완됩니다. 서로를 향한 마음을 소중히 간직하세요.`;
    } else if (finalScore >= 80) {
      advice = `${shape1.name}과 ${shape2.name}의 조합이 서로의 장점을 빛나게 합니다. 작은 배려와 관심으로 더 깊은 사랑을 꽃피우세요.`;
    } else if (finalScore >= 70) {
      advice = '무난하면서도 성장 가능성이 큰 궁합입니다. 서로의 다름을 인정하고 존중하면 시간이 갈수록 더 좋아집니다. 삼정의 시차를 이용해 서로를 보완하세요.';
    } else if (finalScore >= 60) {
      advice = '서로 다른 매력이 있지만 노력이 필요한 궁합입니다. 오행의 기운이 충돌할 수 있으니, 대화와 이해로 극복하면 인생의 소중한 파트너가 됩니다.';
    } else {
      advice = '첫인상은 어렵게 느껴질 수 있지만, 관상은 심상(心相)을 이기지 못합니다. 진심을 담은 소통으로 운명도 바꿀 수 있습니다.';
    }

    // ── ⑤ 결핍과 장점 분석 ──
    // 각 사람의 관상 장점·결핍을 파악하고, 상대가 어떻게 보완하는지 분석
    const buildTraitProfile = (feat, shape, label) => {
      const strengths = [];
      const deficits = [];

      // 눈매 분석
      if (feat.eyeSlant < -1.5) {
        strengths.push({ trait: '날카로운 눈매', desc: '결단력과 추진력이 뛰어나며, 상황 판단이 빠릅니다.' });
        deficits.push({ trait: '강한 눈매', desc: '상대에게 위압감을 줄 수 있고, 감정 표현이 서툴 수 있습니다.' });
      } else if (feat.eyeSlant > 1.0) {
        strengths.push({ trait: '온화한 눈매', desc: '포용력이 크며, 사람들에게 편안한 인상을 줍니다.' });
        deficits.push({ trait: '부드러운 눈매', desc: '우유부단하거나, 단호한 결정이 필요할 때 어려움을 겪을 수 있습니다.' });
      } else {
        strengths.push({ trait: '균형 잡힌 눈매', desc: '감성과 이성의 밸런스가 좋아 대인관계가 원만합니다.' });
      }

      // 눈 크기 분석
      if (feat.eyeToFaceRatio > 0.30) {
        strengths.push({ trait: '큰 눈', desc: '감수성이 풍부하고 공감 능력이 뛰어납니다.' });
        deficits.push({ trait: '큰 눈', desc: '감정에 쉽게 흔들릴 수 있으며, 비밀 유지가 어려울 수 있습니다.' });
      } else if (feat.eyeToFaceRatio < 0.22) {
        strengths.push({ trait: '단정한 눈', desc: '집중력이 강하고 분석적 사고에 능합니다.' });
        deficits.push({ trait: '작은 눈', desc: '감정을 잘 드러내지 않아 오해를 받을 수 있습니다.' });
      }

      // 코 분석
      if (feat.noseWidthRatio <= 0.78) {
        strengths.push({ trait: '높고 날렵한 코', desc: '자존심이 강하고 리더십이 뛰어나 목표 달성 능력이 탁월합니다.' });
        deficits.push({ trait: '좁은 코', desc: '타인의 의견을 수용하기 어려울 수 있고, 고집이 셀 수 있습니다.' });
      } else if (feat.noseWidthRatio >= 0.90) {
        strengths.push({ trait: '넉넉한 코', desc: '재물운이 좋고 인정이 많아 주변 사람들을 잘 챙깁니다.' });
        deficits.push({ trait: '넓은 코', desc: '거절을 잘 못해 손해를 볼 수 있으며, 지나친 베풂이 약점이 될 수 있습니다.' });
      } else {
        strengths.push({ trait: '균형 잡힌 코', desc: '재물 관리와 대인관계 모두 안정적입니다.' });
      }

      // 입 분석
      if (feat.mouthCurve > 0) {
        strengths.push({ trait: '올라간 입꼬리', desc: '긍정적 에너지가 넘치고, 주변에 활력을 줍니다. 복을 부르는 입상입니다.' });
      } else if (feat.mouthCurve < -0.5) {
        strengths.push({ trait: '굳은 입매', desc: '신중하고 깊이 있는 사고를 하며, 쉽게 흔들리지 않는 내면의 힘이 있습니다.' });
        deficits.push({ trait: '내려간 입꼬리', desc: '불만이나 피로가 얼굴에 드러나기 쉬워, 주변에 냉소적 인상을 줄 수 있습니다.' });
      }

      if (feat.mouthRatio >= 1.4) {
        strengths.push({ trait: '큰 입', desc: '사교적이고 표현력이 뛰어나 리더형 소통가입니다.' });
      } else if (feat.mouthRatio <= 1.2) {
        strengths.push({ trait: '작은 입', desc: '섬세하고 신중한 소통 방식으로 깊은 관계를 형성합니다.' });
        deficits.push({ trait: '작은 입', desc: '속마음을 표현하지 못해 소통 단절이 올 수 있습니다.' });
      }

      // 얼굴형 분석
      if (feat.faceRatio >= 0.88) {
        strengths.push({ trait: '넓은 얼굴형', desc: '안정감과 신뢰감을 주며 책임감이 강합니다.' });
        deficits.push({ trait: '넓은 얼굴형', desc: '변화에 적응이 느릴 수 있고 고집이 강할 수 있습니다.' });
      } else if (feat.faceRatio <= 0.76) {
        strengths.push({ trait: '좁은 얼굴형', desc: '감각적이고 유연한 사고방식을 가졌습니다.' });
        deficits.push({ trait: '좁은 얼굴형', desc: '끈기가 부족하거나 집중력이 분산될 수 있습니다.' });
      }

      // 삼정 분석
      if (feat.samjung) {
        if (feat.samjung.upper >= 0.36) {
          strengths.push({ trait: '넓은 이마(상정)', desc: '초년 지혜운이 강하고 학업·아이디어에 뛰어납니다.' });
        } else if (feat.samjung.upper <= 0.28) {
          deficits.push({ trait: '좁은 이마(상정)', desc: '초년기 어려움이 있을 수 있으나, 중년 이후 빛을 발합니다.' });
        }
        if (feat.samjung.lower >= 0.36) {
          strengths.push({ trait: '발달된 턱(하정)', desc: '말년복이 풍부하고 실행력·의지력이 강합니다.' });
        } else if (feat.samjung.lower <= 0.28) {
          deficits.push({ trait: '짧은 턱(하정)', desc: '말년 안정감이 부족할 수 있으니, 노후 계획이 중요합니다.' });
        }
      }

      return { strengths, deficits, label };
    };

    const profile1 = buildTraitProfile(feat1, shape1, '첫 번째 분');
    const profile2 = buildTraitProfile(feat2, shape2, '두 번째 분');

    // 상대가 보완해주는 분석 생성
    const buildComplementAnalysis = (myProfile, partnerProfile, myLabel, partnerLabel) => {
      const complements = [];
      for (const deficit of myProfile.deficits) {
        for (const strength of partnerProfile.strengths) {
          // 같은 trait 카테고리의 반대되는 특성 매칭
          if (
            (deficit.trait.includes('눈') && strength.trait.includes('눈')) ||
            (deficit.trait.includes('코') && strength.trait.includes('코')) ||
            (deficit.trait.includes('입') && strength.trait.includes('입')) ||
            (deficit.trait.includes('얼굴') && strength.trait.includes('얼굴')) ||
            (deficit.trait.includes('이마') && strength.trait.includes('턱')) ||
            (deficit.trait.includes('턱') && strength.trait.includes('이마'))
          ) {
            complements.push({
              deficit: deficit.desc,
              complement: `${partnerLabel}의 ${strength.trait}이(가) 이를 보완합니다: ${strength.desc}`
            });
            break; // 하나만 매칭
          }
        }
      }
      // 직접 매칭이 안 된 결핍도 포함 (보완 없이)
      if (complements.length === 0 && myProfile.deficits.length > 0) {
        complements.push({
          deficit: myProfile.deficits[0].desc,
          complement: `${partnerLabel}의 전반적인 기운이 부드럽게 중화시켜 줍니다.`
        });
      }
      return complements;
    };

    const comp1to2 = buildComplementAnalysis(profile1, profile2, '첫 번째 분', '두 번째 분');
    const comp2to1 = buildComplementAnalysis(profile2, profile1, '두 번째 분', '첫 번째 분');

    // 결핍/장점 HTML 요소 생성 함수
    const renderStrengths = (profile) => profile.strengths.slice(0, 4).map(s =>
      `<div style="display:flex; align-items:flex-start; gap:6px; margin-bottom:5px;">
        <span style="color:#16a34a; font-weight:800; font-size:0.9rem; flex-shrink:0;">✦</span>
        <span style="font-size:0.82rem; color:#14532d;"><b>${s.trait}</b> — ${s.desc}</span>
      </div>`
    ).join('');

    const renderDeficits = (profile) => profile.deficits.slice(0, 3).map(d =>
      `<div style="display:flex; align-items:flex-start; gap:6px; margin-bottom:5px;">
        <span style="color:#dc2626; font-weight:800; font-size:0.9rem; flex-shrink:0;">▾</span>
        <span style="font-size:0.82rem; color:#7f1d1d;"><b>${d.trait}</b> — ${d.desc}</span>
      </div>`
    ).join('');

    const renderComplements = (comps) => comps.slice(0, 3).map(c =>
      `<div style="margin-bottom:8px; padding:8px 10px; background:rgba(255,255,255,0.6); border-radius:8px; border-left:3px solid #8b5cf6;">
        <div style="font-size:0.8rem; color:#991b1b; margin-bottom:3px;">⚠️ ${c.deficit}</div>
        <div style="font-size:0.8rem; color:#5b21b6;">→ ${c.complement}</div>
      </div>`
    ).join('');

    // 궁합 HTML 생성
    const compatHtml = `
      <div style="font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.6;">
        
        <!-- 궁합 메인 헤더 -->
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size: 4rem; margin-bottom: 10px;">${emoji1} ${gradeEmoji} ${emoji2}</div>
          <div style="font-weight: 900; font-size: 1.4rem; color: #0f172a; margin-bottom: 5px;">${animal1} × ${animal2}</div>
          <div style="font-weight: 800; font-size: 1.2rem; color: #e11d48; margin-bottom: 8px;">${grade}</div>
        </div>

        <!-- 궁합 점수 게이지 -->
        <div style="margin-bottom: 20px; background: #f8fafc; padding: 18px; border-radius: 14px; border: 1px solid #e2e8f0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-weight:800; font-size:1rem; color:#0f172a;">💘 종합 궁합 점수</span>
            <span style="font-weight:900; font-size:1.5rem; color:${finalScore >= 80 ? '#e11d48' : finalScore >= 60 ? '#f59e0b' : '#64748b'};">${finalScore}점</span>
          </div>
          <div style="background:#e2e8f0; height:14px; border-radius:10px; overflow:hidden;">
            <div style="height:100%; width:${finalScore}%; background:linear-gradient(90deg, ${finalScore >= 80 ? '#f472b6, #e11d48' : finalScore >= 60 ? '#fbbf24, #f59e0b' : '#94a3b8, #64748b'}); border-radius:10px; transition: width 1.5s ease;"></div>
          </div>
        </div>

        <!-- 궁합 유형 설명 -->
        <div style="margin-bottom: 18px; background: linear-gradient(135deg, #fdf2f8, #fce7f3); padding: 18px; border-radius: 14px; border: 1px solid #fbcfe8;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #9d174d; margin-bottom: 8px;">💑 ${compData.type} 분석</div>
          <p style="font-size: 0.95rem; color: #831843; margin: 0; line-height: 1.6;">${compData.desc}</p>
        </div>

        <!-- ★ 얼굴형 오행 궁합 (신규) -->
        <div style="margin-bottom: 18px; background: linear-gradient(135deg, #fefce8, #fef9c3); padding: 18px; border-radius: 14px; border: 1px solid #fde047;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #854d0e; margin-bottom: 12px;">🔥 얼굴형 오행(五行) 궁합</div>
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; margin-bottom: 12px;">
            <div style="text-align:center; background:#fffbeb; padding:10px; border-radius:10px;">
              <div style="font-size:1.8rem;">${shape1.emoji}</div>
              <div style="font-weight:800; color:#92400e; font-size:0.9rem;">${shape1.name}</div>
              <div style="font-size:0.75rem; color:#a16207;">${shape1.element} · ${shape1.fortune}</div>
            </div>
            <div style="font-size:1.5rem; font-weight:900; color:#d97706;">⚡</div>
            <div style="text-align:center; background:#fffbeb; padding:10px; border-radius:10px;">
              <div style="font-size:1.8rem;">${shape2.emoji}</div>
              <div style="font-weight:800; color:#92400e; font-size:0.9rem;">${shape2.name}</div>
              <div style="font-size:0.75rem; color:#a16207;">${shape2.element} · ${shape2.fortune}</div>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="font-weight:700; color:#92400e;">${shapeCompat.label || '오행 궁합'}</span>
            <span style="font-weight:800; color:#d97706;">${faceShapeScore}점</span>
          </div>
          <div style="background:#fef3c7; height:8px; border-radius:6px; overflow:hidden; margin-bottom:6px;">
            <div style="height:100%; width:${faceShapeScore}%; background:linear-gradient(90deg,#fbbf24,#d97706); border-radius:6px;"></div>
          </div>
          <div style="font-size:0.85rem; color:#78350f; line-height:1.5;">${shapeCompat.desc}</div>
        </div>

        <!-- ★ 삼정(三停) 보완 궁합 (신규) -->
        <div style="margin-bottom: 18px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 18px; border-radius: 14px; border: 1px solid #86efac;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #166534; margin-bottom: 12px;">⏳ 삼정(三停) 시차 보완 궁합</div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="font-weight:700; color:#166534;">인생 리듬 보완도</span>
            <span style="font-weight:800; color:#16a34a;">${samjungScore}점</span>
          </div>
          <div style="background:#bbf7d0; height:8px; border-radius:6px; overflow:hidden; margin-bottom:10px;">
            <div style="height:100%; width:${samjungScore}%; background:linear-gradient(90deg,#4ade80,#16a34a); border-radius:6px;"></div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
            <div style="background:#ecfdf5; padding:8px; border-radius:8px; text-align:center;">
              <div style="font-size:0.7rem; color:#065f46; font-weight:700;">첫 번째 분</div>
              <div style="font-size:0.72rem; color:#047857;">상정 ${Math.round(sj1.upper*100)}% · 중정 ${Math.round(sj1.middle*100)}% · 하정 ${Math.round(sj1.lower*100)}%</div>
            </div>
            <div style="background:#ecfdf5; padding:8px; border-radius:8px; text-align:center;">
              <div style="font-size:0.7rem; color:#065f46; font-weight:700;">두 번째 분</div>
              <div style="font-size:0.72rem; color:#047857;">상정 ${Math.round(sj2.upper*100)}% · 중정 ${Math.round(sj2.middle*100)}% · 하정 ${Math.round(sj2.lower*100)}%</div>
            </div>
          </div>
          <div style="font-size:0.85rem; color:#14532d; line-height:1.5;">${samjungAnalysis}</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:6px;">※ 상정(上停)=초년운, 중정(中停)=중년운, 하정(下停)=말년운</div>
        </div>

        <!-- 오관별 궁합 세부 분석 (강화) -->
        <div style="margin-bottom: 18px; background: #f0f9ff; padding: 18px; border-radius: 14px; border: 1px solid #bae6fd;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #0c4a6e; margin-bottom: 12px;">🔍 오관(五官) 정밀 궁합 분석</div>
          
          <div style="margin-bottom: 10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="font-weight:700; color:#1e40af;">👁️ 눈 궁합 (감정·기운 교류)</span>
              <span style="font-weight:800; color:#2563eb;">${Math.round(eyeCompat)}점</span>
            </div>
            <div style="background:#dbeafe; height:8px; border-radius:6px; overflow:hidden;">
              <div style="height:100%; width:${eyeCompat}%; background:linear-gradient(90deg,#60a5fa,#2563eb); border-radius:6px;"></div>
            </div>
            <div style="font-size:0.8rem; color:#475569; margin-top:3px;">${eyeComment}</div>
          </div>

          <div style="margin-bottom: 10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="font-weight:700; color:#7c3aed;">👃 코 궁합 (재물·자존심)</span>
              <span style="font-weight:800; color:#7c3aed;">${Math.round(noseCompat)}점</span>
            </div>
            <div style="background:#ede9fe; height:8px; border-radius:6px; overflow:hidden;">
              <div style="height:100%; width:${noseCompat}%; background:linear-gradient(90deg,#a78bfa,#7c3aed); border-radius:6px;"></div>
            </div>
            <div style="font-size:0.8rem; color:#475569; margin-top:3px;">${noseComment}</div>
          </div>

          <div style="margin-bottom: 10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="font-weight:700; color:#db2777;">👄 입 궁합 (소통·가정운)</span>
              <span style="font-weight:800; color:#db2777;">${Math.round(mouthCompat)}점</span>
            </div>
            <div style="background:#fce7f3; height:8px; border-radius:6px; overflow:hidden;">
              <div style="height:100%; width:${mouthCompat}%; background:linear-gradient(90deg,#f472b6,#db2777); border-radius:6px;"></div>
            </div>
            <div style="font-size:0.8rem; color:#475569; margin-top:3px;">${mouthComment}</div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="font-weight:700; color:#059669;">🧑 얼굴형 궁합 (오행 조화)</span>
              <span style="font-weight:800; color:#059669;">${Math.round(faceCompat)}점</span>
            </div>
            <div style="background:#d1fae5; height:8px; border-radius:6px; overflow:hidden;">
              <div style="height:100%; width:${faceCompat}%; background:linear-gradient(90deg,#34d399,#059669); border-radius:6px;"></div>
            </div>
            <div style="font-size:0.8rem; color:#475569; margin-top:3px;">${faceCompat >= 85 ? '오행이 상생하여 라이프스타일이 자연스럽게 조화됩니다.' : faceCompat >= 70 ? '오행의 기운이 무난하게 어울립니다.' : faceCompat >= 60 ? '오행 차이를 서로 맞춰가는 과정에서 성장이 옵니다.' : '오행의 충돌이 있으나, 의식적인 조율로 극복할 수 있습니다.'}</div>
          </div>
        </div>

        <!-- ★ 결핍과 장점 · 상호 보완 분석 (신규) -->
        <div style="margin-bottom: 18px; background: linear-gradient(135deg, #faf5ff, #f3e8ff); padding: 18px; border-radius: 14px; border: 1px solid #d8b4fe;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #6b21a8; margin-bottom: 14px;">🔮 결핍과 장점 · 상호 보완 분석</div>
          
          <!-- 첫 번째 분 장점 -->
          <div style="margin-bottom: 14px;">
            <div style="font-weight:800; color:#065f46; font-size:0.9rem; margin-bottom:6px;">${emoji1} 첫 번째 분의 관상 강점</div>
            <div style="background:rgba(240,253,244,0.7); padding:10px; border-radius:10px;">
              ${renderStrengths(profile1)}
            </div>
          </div>

          <!-- 첫 번째 분 결핍 -->
          ${profile1.deficits.length > 0 ? `
          <div style="margin-bottom: 14px;">
            <div style="font-weight:800; color:#991b1b; font-size:0.9rem; margin-bottom:6px;">${emoji1} 첫 번째 분의 보완 필요 영역</div>
            <div style="background:rgba(254,242,242,0.7); padding:10px; border-radius:10px;">
              ${renderDeficits(profile1)}
            </div>
          </div>` : ''}

          <!-- 두 번째 분 장점 -->
          <div style="margin-bottom: 14px;">
            <div style="font-weight:800; color:#065f46; font-size:0.9rem; margin-bottom:6px;">${emoji2} 두 번째 분의 관상 강점</div>
            <div style="background:rgba(240,253,244,0.7); padding:10px; border-radius:10px;">
              ${renderStrengths(profile2)}
            </div>
          </div>

          <!-- 두 번째 분 결핍 -->
          ${profile2.deficits.length > 0 ? `
          <div style="margin-bottom: 14px;">
            <div style="font-weight:800; color:#991b1b; font-size:0.9rem; margin-bottom:6px;">${emoji2} 두 번째 분의 보완 필요 영역</div>
            <div style="background:rgba(254,242,242,0.7); padding:10px; border-radius:10px;">
              ${renderDeficits(profile2)}
            </div>
          </div>` : ''}

          <!-- 상호 보완 관계 -->
          <div style="margin-bottom: 6px;">
            <div style="font-weight:800; color:#5b21b6; font-size:0.9rem; margin-bottom:8px;">💜 서로를 채워주는 상호 보완 관계</div>
            
            ${comp1to2.length > 0 ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:0.78rem; font-weight:700; color:#7c3aed; margin-bottom:5px;">${emoji1} → ${emoji2} 보완 포인트</div>
              ${renderComplements(comp1to2)}
            </div>` : ''}

            ${comp2to1.length > 0 ? `
            <div>
              <div style="font-size:0.78rem; font-weight:700; color:#7c3aed; margin-bottom:5px;">${emoji2} → ${emoji1} 보완 포인트</div>
              ${renderComplements(comp2to1)}
            </div>` : ''}
          </div>

          <div style="font-size:0.78rem; color:#7c3aed; background:rgba(139,92,246,0.08); padding:8px 10px; border-radius:8px; margin-top:10px; line-height:1.5;">
            💡 <b>보완도 총평:</b> ${
              (comp1to2.length + comp2to1.length) >= 4 ? '두 분은 서로의 빈 곳을 절묘하게 채워주는 최고의 상보적 관계입니다! 함께할수록 각자의 약점이 사라지고 장점이 극대화됩니다.' :
              (comp1to2.length + comp2to1.length) >= 2 ? '서로의 결핍을 일부 보완해주는 좋은 관계입니다. 의식적으로 상대의 장점을 인정하면 시너지가 더욱 커집니다.' :
              '비슷한 기질을 공유하여 편안하지만, 같은 영역이 부족할 수 있습니다. 함께 성장하는 방향으로 노력하면 단단한 팀이 됩니다.'
            }
          </div>
        </div>

        <!-- 궁합 조언 -->
        <div style="margin-bottom: 15px; background: #fffbeb; padding: 18px; border-radius: 14px; border: 1px solid #fde68a;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #d97706; margin-bottom: 5px;">💝 궁합 개운 조언</div>
          <p style="font-size: 0.95rem; color: #78350f; margin: 0; line-height: 1.6;">${advice}</p>
        </div>

        <!-- 각 관상 요약 비교 -->
        <div style="margin-bottom: 15px; background: #f0fdf4; padding: 18px; border-radius: 14px; border: 1px solid #bbf7d0;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #065f46; margin-bottom: 10px;">📊 두 관상 비교 요약</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div style="text-align:center; background:#ecfdf5; padding:12px; border-radius:10px;">
              <div style="font-size:2.5rem; margin-bottom:5px;">${emoji1}</div>
              <div style="font-weight:800; color:#065f46; font-size:0.95rem;">${animal1}</div>
              <div style="font-size:0.75rem; color:#047857; margin-top:2px;">${shape1.name} · ${shape1.element}</div>
              <div style="font-size:0.8rem; color:#047857; margin-top:3px;">첫 번째 분석</div>
            </div>
            <div style="text-align:center; background:#ecfdf5; padding:12px; border-radius:10px;">
              <div style="font-size:2.5rem; margin-bottom:5px;">${emoji2}</div>
              <div style="font-weight:800; color:#065f46; font-size:0.95rem;">${animal2}</div>
              <div style="font-size:0.75rem; color:#047857; margin-top:2px;">${shape2.name} · ${shape2.element}</div>
              <div style="font-size:0.8rem; color:#047857; margin-top:3px;">두 번째 분석</div>
            </div>
          </div>
        </div>

        <div style="text-align: center; font-size: 0.8rem; color: #94a3b8; padding: 10px;">
          ※ AI 관상 궁합은 재미를 위한 참고용이며, 실제 인간관계는 서로를 향한 진심과 노력으로 만들어집니다.
        </div>
      </div>
    `;

    return {
      score: finalScore,
      grade,
      type: compData.type,
      compatHtml
    };
  }

  // 매트릭스에 없는 조합의 기본 궁합 산출 (오행 반영)
  _generateDefaultCompatibility(id1, id2, result1, result2) {
    // 동일 동물상
    if (id1 === id2) {
      return {
        score: 72,
        type: '동류궁합',
        desc: `같은 ${result1.primaryAnimal}끼리의 만남은 서로를 거울처럼 비추어 장점과 단점을 정확히 알 수 있습니다. 동일한 성향이 편안함을 주지만, 변화와 자극이 부족할 수 있으니 새로운 경험을 함께 시도해보세요.`
      };
    }

    const feat1 = result1.extractedFeatures;
    const feat2 = result2.extractedFeatures;
    const shape1 = this.classifyFaceShape(feat1);
    const shape2 = this.classifyFaceShape(feat2);

    let baseScore = 70;

    // 오행 상생 보너스
    const ohangPairs = ['round-square', 'round-long', 'round-triangle', 'long-triangle'];
    const ohangKey1 = `${shape1.type}-${shape2.type}`;
    const ohangKey2 = `${shape2.type}-${shape1.type}`;
    if (ohangPairs.includes(ohangKey1) || ohangPairs.includes(ohangKey2)) baseScore += 10;
    // 오행 상극 패널티
    const clashPairs = ['square-long', 'square-triangle'];
    if (clashPairs.includes(ohangKey1) || clashPairs.includes(ohangKey2)) baseScore -= 5;

    // 눈매 음양 조화
    const slantDiff = Math.abs(feat1.eyeSlant - feat2.eyeSlant);
    if (slantDiff >= 3 && slantDiff <= 7) baseScore += 10;
    else if (slantDiff >= 1 && slantDiff < 3) baseScore += 4;
    else if (slantDiff > 7) baseScore -= 4;

    // 코 보완 (높은코+둥근코)
    const nw1 = feat1.noseWidthRatio; const nw2 = feat2.noseWidthRatio;
    if ((nw1 <= 0.78 && nw2 >= 0.90) || (nw2 <= 0.78 && nw1 >= 0.90)) baseScore += 8;

    // 입꼬리 조화
    if (feat1.mouthCurve > 0 && feat2.mouthCurve > 0) baseScore += 6;
    else if (feat1.mouthCurve > 0 || feat2.mouthCurve > 0) baseScore += 3;

    // 삼정 보완
    const sjDiff = (Math.abs(feat1.samjung.upper - feat2.samjung.upper) + Math.abs(feat1.samjung.middle - feat2.samjung.middle) + Math.abs(feat1.samjung.lower - feat2.samjung.lower)) / 3;
    if (sjDiff >= 0.02 && sjDiff <= 0.07) baseScore += 5;

    baseScore = Math.max(45, Math.min(95, baseScore));

    let typeStr = '보통궁합';
    let descStr = '';
    if (baseScore >= 85) {
      typeStr = '상생궁합';
      descStr = `${result1.primaryAnimal}(${shape1.name})과 ${result2.primaryAnimal}(${shape2.name})은 서로의 기운이 자연스럽게 어우러지는 좋은 조화를 이룹니다. 오행의 상생 기운이 두 사람의 인연을 뒷받침합니다.`;
    } else if (baseScore >= 70) {
      typeStr = '보통궁합';
      descStr = `${result1.primaryAnimal}과 ${result2.primaryAnimal}은 각자의 매력이 뚜렷한 조합입니다. 서로의 다름을 존중하며 배워나가면 점점 깊어지는 관계를 만들 수 있습니다.`;
    } else {
      typeStr = '도전궁합';
      descStr = `${result1.primaryAnimal}과 ${result2.primaryAnimal}은 성향과 기운의 차이가 크지만, 그만큼 서로에게서 배울 점이 많습니다. 관상은 심상(心相)을 이기지 못하니, 진심을 담은 소통이 열쇠입니다.`;
    }

    return { score: baseScore, type: typeStr, desc: descStr };
  }
} // end class AnalysisEngine

window.FaceAnalysisEngine = AnalysisEngine;
window.faceAnalysisEngine = new AnalysisEngine();








