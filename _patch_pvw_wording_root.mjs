import { readFileSync, writeFileSync } from 'fs';

const filePath = 'index.html';
const src = readFileSync(filePath, 'utf8');

const OLD_D_START = `  var D={\n    openDestinyFlowerStudio:{cat:'사주 · 운명의 꽃',title:'🌸 사주로 보는 꽃',tagline:'태어난 날의 팔자(八字)를 세상에 단 하나뿐인 꽃으로 피워냅니다'`;

const NEW_D = `  var D={
    openDestinyFlowerStudio:{cat:'사주 · 운명의 꽃',title:'🌸 사주로 보는 꽃',tagline:'세상 80억 명 중 오직 나만 가진 꽃 — 내 사주가 어떤 꽃으로 피어나는지 아직도 모르세요?',feats:['사주 8글자로 내 진짜 성격·기질·운명 완전 해독','세상에 단 하나뿐인 나만의 운명 꽃 비주얼 생성','궁합 잘 맞는 상대와 내 꽃이 어떻게 다른지 비교','인스타에 바로 저장하는 감성 운명 리포트'],cost:'🔒 해금 50코인',ct:'paid',img:'/fuctionassets/flower.webp'},
    openAstrologyFlowerStudio:{cat:'점성술 · 꽃 아틀리에',title:'✨ 점성술 꽃',tagline:'태양·달·상승궁 3개를 동시에 읽어주는 서비스는 여기밖에 없습니다 — 내가 왜 그렇게 행동했는지 이제야 이해됩니다',feats:['태양·달·상승궁 3각 에너지 동시 완전 분석','내가 왜 특정 상황에서 감정이 폭발하는지 설명','별자리 기반 최고 궁합·최악 궁합 완전 파악','성운 비주얼로 만드는 나만의 꽃 아트'],cost:'🔒 해금 50코인',ct:'paid',img:'/fuctionassets/flower2.webp'},
    openJamidusuFlowerStudio:{cat:'자미두수 · 진로 적성',title:'🌺 자미두수 꽃',tagline:'중국 황제들이 세자 교육에 쓴 진로 적성 특화 명리학 — 왜 이 일이 나에게 맞는지 단번에 납득됩니다',feats:['황실 비전 자미두수로 내 숨겨진 재능 발굴','어떤 직업·분야에서 돈을 벌 수 있는지 파악','귀인·재성 에너지를 꽃으로 시각화','진로 적성 완전 해독 비주얼 리포트'],cost:'🔒 해금 50코인',ct:'paid',img:'/fuctionassets/jami.webp'},
    openSukuyoFlowerStudio:{cat:'숙요 · 달빛 꽃',title:'🌙 숙요 꽃',tagline:'에도 막부가 민간에 숨겼던 27수 궁합 분석을 꽃으로 시각화 — 이 별이 맞으면 헤어질 수가 없습니다',feats:['불교 밀교 비전 27수 달빛 에너지 완전 분석','내 수호 별이 상대의 별과 얼마나 맞는지 분석','달의 위상이 내 감정·건강·운에 미치는 영향 해독','달빛 에너지 기반 세상에 하나뿐인 꽃 아트'],cost:'🔒 해금 50코인',ct:'paid',img:'/fuctionassets/sukyo.webp'},
    openDreamModal:{cat:'드림 타로 · 해몽',title:'🌙 드림 타로',tagline:'어젯밤 꿈이 찜찜하다면 — 그 꿈이 진짜로 무엇을 예고하는지 타로가 바로 해독합니다',feats:['꿈 속 이미지를 타로 카드와 직접 연결 분석','불길한 꿈과 좋은 꿈의 정확한 의미 즉시 해독','꿈이 예고하는 미래 상황 & 운명 메시지 리딩','완전 무료 — 지금 바로 결과 확인'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/heamong.webp'},
    openPsychoDreamModal:{cat:'정신분석 · 해몽',title:'🕯️ 정신분석 해몽',tagline:'당신이 꾼 꿈, 사실 무의식이 보내는 경고신호일 수 있습니다 — 프로이트가 그 꿈을 분석합니다',feats:['프로이트 & 현대 임상심리학 교차 분석','꿈이 드러내는 숨겨진 욕구·불안·트라우마 해독','지금 내 심리 상태를 꿈을 통해 정확히 파악','완전 무료 전문가 수준 심리 리포트'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/phydream.webp'},
    openPhysiognomyApp:{cat:'AI · 동물 관상',title:'🎭 AI 동물 관상',tagline:'셀카 한 장이면 됩니다 — 이 얼굴이 돈 버는 관상인지 사랑받는 관상인지 AI가 즉시 판독합니다',feats:['AI가 내 얼굴에서 관상 포인트 정밀 분석','내 얼굴이 닮은 동물 토템 & 숨겨진 성격 파악','재물운·연애운·귀인운 얼굴에서 직접 분석','셀카 업로드 1번으로 완전 무료 즉시 결과'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/ai%20animal.webp'},
    openMbtiModal:{cat:'MBTI · 연애 궁합',title:'🦁 MBTI 동물 궁합',tagline:'내 MBTI와 가장 잘 맞는 사람이 누구인지 — 이 조합이 실제로 결혼까지 가는지 지금 바로 확인하세요',feats:['MBTI 16유형 연애 궁합 완전 분석','왜 저 MBTI에 끌리면서도 싸우게 되는지 설명','내 연애 패턴의 진짜 문제점 & 해결책 제시','완전 무료 — 즉시 결과 제공'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/ai%20face.webp'},
    openAnimalTotemModal:{cat:'토템 · 수호 동물',title:'🧸 애니멀 토템',tagline:'지금 이 순간 나에게 가장 필요한 메시지를 수호 동물이 보내고 있습니다 — 당신은 아직 못 들었을 뿐',feats:['샤머닉 전통 수호 동물 카드 정밀 리딩','오늘 반드시 들어야 할 경고 & 행운 메시지','지금 내가 해야 할 것과 피해야 할 것 분석','고화질 수호 동물 카드 비주얼'],cost:'🪙 30코인',ct:'paid',img:'/fuctionassets/animaltotem.webp'},
    openSajuAnimalPage:{cat:'사주 · 수호 동물 아트',title:'🐲 사주 가디언 아트',tagline:'내 생년월일로 찾는 수호 동물 — 12지신 중 누가 지금 나를 지키고 있는지 알고 계세요?',feats:['사주 8글자 기반 나만의 수호 동물 정확하게 매핑','12지신 + 천간으로 만드는 나만의 캐릭터','AI 생성 나만의 가디언 아트 즉시 제공','완전 무료 — 고화질 결과 이미지 저장 가능'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/Who%20am%20I%20with%20saju.webp'},
    openNevilleMeditationPage:{cat:'네빌 명상 · 현실창조',title:'🧘 네빌 명상 실습',tagline:'이 명상을 3일 연속으로 하면 원하는 현실이 바뀌기 시작합니다 — 네빌 고다드의 검증된 기법',feats:['네빌 고다드가 실제 사용한 의식 명상 기법','원하는 것을 이미 가진 것처럼 느끼는 감각 훈련','부정적 신념 패턴을 즉시 해체하는 기법 적용','30분 완전 가이드 세션으로 처음도 쉽게'],cost:'🪙 30코인',ct:'paid',img:'/fuctionassets/meditation.webp'},
    openYogaGuru:{cat:'인도 요가 · 에너지 정화',title:'🪷 Divya Yoga',tagline:'인도 요기들이 4000년간 비밀로 간직한 에너지 정화 루틴 — 막힌 운을 뚫는 차크라 활성화',feats:['사주·별자리 기반 나만의 에너지 타입 정확히 파악','맞춤 아사나로 지금 막혀 있는 기운 즉시 해소','차크라 활성화로 운의 흐름을 바꾸는 명상','인도 전통 요기 감성 완전 가이드 세션'],cost:'🪙 30코인',ct:'paid',img:'/fuctionassets/india.webp'},
    openTarotLoveModal:{cat:'타로 · 관계 리딩',title:'💕 우리는 무슨 사이?',tagline:'그 사람이 나한테 진심인지 아닌지 — 6장의 타로가 지금 바로 답을 줍니다',feats:['그 사람의 현재 감정 상태 직접 리딩','우리가 실제로 사귈 수 있는 가능성 분석','커플·짝사랑·이별·재회 모든 상황 완전 적용','지금 내가 해야 할 구체적인 행동 가이드'],cost:'🪙 50코인',ct:'paid',img:'/fuctionassets/tarolove.webp'},
    openTarotHealingModal:{cat:'타로 · 힐링',title:'☀ 따뜻한 태양 회복 타로',tagline:'지치고 상처받았다면 — 4장의 태양 카드가 다시 일어서는 방법을 알려줍니다',feats:['지금 내 감정 상처의 정체 & 치유 방향 분석','앞으로 나아가기 위해 진짜 필요한 것 파악','나를 지지하는 에너지와 걸림돌 동시 해석','따뜻한 응원 메시지와 함께하는 무료 리딩'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/healing.webp'},
    openTarotSelfEsteemModal:{cat:'타로 · 자존감 퀘스트',title:'✨ 자존감 레벨업',tagline:'내가 왜 항상 눈치를 보고 자신감이 없는지 — RPG 퀘스트 형식으로 5단계 자존감 완전 부활',feats:['5카드 RPG 퀘스트로 자존감 레벨 정확히 파악','내면의 진짜 강점과 숨겨진 내상 동시 분석','지금 당장 실천 가능한 미션 형식 가이드 제공','완전 무료 — 지금 내 자존감 레벨 확인'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/jajongam.webp'},
    openTarotReunionModal:{cat:'타로 · 재회운',title:'🌊 재회운 타로',tagline:'헤어진 그 사람 진짜 돌아올 수 있을까 — 5장의 타로가 재회 가능성을 직접 말합니다',feats:['재회 가능성을 직접 분석 & 수치로 제시','그 사람이 지금 나를 어떻게 생각하는지 리딩','재회를 위한 최적 타이밍 & 구체적 행동 전략','이별 원인 분석 후 실전 재회 어드바이스 제공'],cost:'🪙 50코인',ct:'paid',img:'/fuctionassets/reunion.webp'},
    openTarotYearFortuneModal:{cat:'십이지신 · 연간 운세',title:'십이지신 천운(天運)',tagline:'올해 어느 달에 돈이 들어오고 언제 사랑이 찾아오는지 — 12달의 흐름을 미리 알면 인생이 달라집니다',feats:['12개월 재물·연애·건강·인간관계 월별 상세 예측','이번 해 절대 놓치면 안 되는 황금 달 파악','조심해야 할 달 & 적극적으로 움직일 달 분석','내 십이지신 수호 기운으로 보는 나만의 천운'],cost:'30코인',ct:'paid',img:'/fuctionassets/12animals.webp'},
    openTarotModal:{cat:'명리학 타로',title:'🔮 명리학 타로',tagline:'동양 명리학과 서양 타로가 동시에 같은 답을 가리킬 때 — 그것이 진짜 운명의 방향입니다',feats:['78장 타로 + 사주 명리학 프레임 교차 분석','사주와 타로가 동시에 가리키는 핵심 메시지 추출','지금 내 상황에 꼭 맞는 카드 배열 선택','AI 심층 리딩으로 구체적인 방향 제시'],cost:'30코인',ct:'paid',img:'/fuctionassets/ai%20tarrot.webp'},
    openHwatuModal:{cat:'화투점 · 한국 전통',title:'🎴 타짜들의 화투점',tagline:'타짜가 뒤집는 화투패에 오늘의 운명이 숨어 있습니다 — 12달 꽃패로 보는 직설 운세',feats:['한국 전통 화투패 12달 운세 완전 리딩','월별 꽃패 상징 심층 해석 — 재물·사랑·시험','타짜식 직설 화법으로 꾸밈없는 운세 제공','완전 무료 — 지금 내 패를 뒤집어 보세요'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/tazza.webp'},
    openKemetModal:{cat:'이집트 신탁 · 케멧',title:'𓂀 이집트 신탁',tagline:'파라오들이 전쟁·혼인·국가 대사를 결정할 때 물었던 그 신탁 — 오늘 당신의 차례입니다',feats:['고대 이집트 47개 신 오라클 카드 리딩','오늘의 질문에 직접 답하는 신탁 메시지 제공','재물·사랑·진로 방향 신비로운 방식으로 해석','고대 케멧 신비주의 아트 비주얼'],cost:'🪙 30코인',ct:'paid',img:'/fuctionassets/egypt.webp'},
    openJuyukModal:{cat:'주역 64괘 · 거북점',title:'☯️ 주역 거북점',tagline:'공자도 매일 괘를 뽑았습니다 — 3000년 검증된 64괘가 지금 내가 내려야 할 결정을 말해줍니다',feats:['64괘 중 오늘 내 상황에 정확히 맞는 괘 자동 매핑','한자 원문 + 현대어 해석 동시 제공','진퇴를 결정해야 할 때 명확한 방향 제시','거북이 등 문양 전통 점술 의식 체험'],cost:'🪙 30코인',ct:'paid',img:'/fuctionassets/juyuk.webp'},
    openSukuyoModal:{cat:'숙요점 · 금서 궁합 분석',title:'💫 숙요점(宿曜占)',tagline:'에도 막부가 민간 사용을 금지했던 27수 궁합 분석법 — 이 별이 맞으면 이혼율이 극히 낮아집니다',feats:['불교 밀교 비전 27수로 궁합의 진짜 상성 완전 분석','생년월일만으로 진짜 소울메이트 vs 독성 관계 판별','재물·건강·수명 전반에 걸친 1:1 정밀 운세 리딩','400코인 단 한 번 결제로 평생 무제한 이용'],cost:'🔒 해금 400코인',ct:'paid',img:'/fuctionassets/sukyo.webp'},
    openRuneOracle:{cat:'스톤헨지 · 룬 오라클',title:'ᚠ 스톤헨지 룬 오라클',tagline:'바이킹 전사들이 전투 전날 뽑았던 그 룬 — 오늘 내린 결정이 맞는지 룬 문자가 답합니다',feats:['고대 퓨사크 24룬 완전 정통 해석','정방향·역방향 모든 상황 적용','지금 직면한 결정에 룬이 구체적으로 답함','켈트 전통 스톤헨지 의식 감성 비주얼'],cost:'🪙 50코인',ct:'paid',img:'/fuctionassets/rune.webp'},
    openGeomancyOracle:{cat:'지오맨시 · 흙점',title:'⟁ 지오맨시 흙점',tagline:'아라비아 왕국의 재상들이 국가 대사를 결정할 때 쓴 대지의 신탁 — 16행 점이 오늘 방향을 알려줍니다',feats:['중동·아프리카 4000년 전통 흙점 완전 분석','16개 점 패턴으로 보는 오늘 내가 해야 할 것','돈·사랑·진로 중 지금 집중해야 할 방향 파악','감성적 사막 아트 비주얼 리딩'],cost:'🪙 50코인',ct:'paid',img:'/fuctionassets/geomancy.webp'},
    openRoyalTeaOracle:{cat:'영국 홍차점 · 타세오그래피',title:'🫖 영국 홍차점',tagline:'빅토리아 여왕도 중요한 결정 전에 찻잎을 읽었습니다 — 왕실의 찻잎 문양이 오늘의 운명을 말합니다',feats:['영국 왕실 전통 타세오그래피 의식 완전 체험','찻잎 형태 20가지 상징 심층 해독 & 적용','오늘 내가 반드시 알아야 할 운명의 메시지','빅토리아 시대 감성 왕실 리포트'],cost:'🪙 30코인',ct:'paid',img:'/fuctionassets/london.webp'},
    '/oracle/sikojen-povailu':{cat:'핀란드 주석점',title:'🐷 핀란드 돼지 주석점',tagline:'녹인 주석을 물에 던지는 순간 올해 운명이 보입니다 — 핀란드 전통 새해 점술을 지금 체험하세요',feats:['핀란드 정통 주석점 의식 시뮬레이션 완전 구현','주석 형태 상징 20가지 즉석 해석','돼지 마스코트 연이와 함께하는 귀여운 운세 리딩','행운·사랑·재물 완전 무료 즉시 결과'],cost:'✨ 무료',ct:'free',img:'/fortune/sikojen-povailu/images/piggyfortune.webp'},
    '/destiny-poker.html':{cat:'데스티니 포커',title:'🃏 데스티니 포커',tagline:'신과의 카드 대결에서 이기면 행운이 찾아옵니다 — 올림푸스 신들과 운명을 건 포커 한 판',feats:['5장 포커로 신과 벌이는 운명 대결 게임','제우스·아테나·포세이돈·헤르메스 4신 배틀','오늘 내 승률이 바로 오늘의 운세 지수','완전 무료 엔터테인먼트 점술 게임'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/destiny%20pocker.webp'},
    openLifeBookModal:{cat:'프리미엄 · 사주 심층 분석',title:'📜 인생의 책',tagline:'10년 후 내 인생이 어떻게 될지 지금 미리 볼 수 있습니다 — 돈이 들어오는 해와 조심해야 할 해를 미리 아는 것',feats:['사주 팔자 8글자로 평생 운세 흐름 완전 분석','대운 10년 단위로 기회의 해 & 위기의 해 미리 파악','재물이 크게 들어오는 시기 & 피해야 할 시기 정확히 계산','평생 간직할 PDF 저장 가능 프리미엄 리포트'],cost:'🪙 490코인',ct:'paid',img:'/fuctionassets/lifebook.webp'},`;

// openLoveSecretModal 이후 항목들 (루트 파일 구조에 따라 처리)
const TAIL_REPLACEMENTS = [
  [
    `openLoveSecretModal:{cat:'프리미엄 · 연애 전략서',title:'💕 연애 비책',tagline:'운명이 설계한 사랑의 지도 — 사주 명리학자가 쓴 10가지 연애 전략',feats:['일간·십성·신살·12운성 종합 분석','도화살·홍염살 매력 해독','배우자궁(일지) 이상형 프로파일링','PDF 저장 가능한 프리미엄 리포트'],cost:'🪙 290코인',ct:'paid',img:'/fuctionassets/lovebible.webp'},`,
    `openLoveSecretModal:{cat:'프리미엄 · 연애 전략서',title:'💕 연애 비책',tagline:'내가 왜 그 사람에게 계속 끌리는지, 왜 연애가 항상 그 패턴으로 끝나는지 — 사주가 전부 설명합니다',feats:['도화살·홍염살로 내 매력의 실체와 약점 파악','사주로 보는 나의 진짜 이상형 & 실제 잘 맞는 유형','이 사람과 진짜 사귈 수 있는지 사주적 가능성 분석','PDF 저장 가능한 프리미엄 연애 전략서'],cost:'🪙 290코인',ct:'paid',img:'/fuctionassets/lovebible.webp'},`,
  ],
  [
    `openLoveSimulation:{cat:'사주 · 연애 시뮬레이션',title:'💕 LOVE CODE',tagline:'사주 오행으로 찾는 운명의 소울메이트와 가상 데이트 코스 시뮬레이션',feats:['사주 8글자 기반 연애 페르소나 자동 생성','오행 궁합으로 찾는 최고 상성 상대','일간별 실시간 채팅 시뮬레이션','8가지 데이트 코스 & 크리티컬 히트 이벤트'],cost:'🪙 100코인',ct:'paid',img:'/fuctionassets/lovesimulation.webp'}`,
    `openLoveSimulation:{cat:'사주 · 연애 시뮬레이션',title:'💕 LOVE CODE',tagline:'사주 오행으로 이 사람이 내 소울메이트인지 즉시 알 수 있습니다 — 가상 데이트로 찰떡 궁합 직접 확인',feats:['사주 8글자 기반 연애 페르소나 자동 생성','오행 궁합으로 찾는 최고 상성 & 최악 상대 비교','일간별 실시간 채팅으로 연애 케미 직접 체험','8가지 데이트 코스 & 크리티컬 히트 이벤트'],cost:'🪙 100코인',ct:'paid',img:'/fuctionassets/lovesimulation.webp'}`,
  ],
  [
    `openAstroModal:{cat:'점성술 · 코즈믹 차트',title:'✨ 점성술 코즈믹 차트',tagline:'태양·달·상승궁 3각 에너지로 우주적 자아를 분석합니다',feats:['서양 점성술 전체 행성 배치 분석','태양궁·달궁·상승궁 정밀 해석','12하우스 영역별 운세 적용','트랜지트 & 프로그레션 해석 포함'],cost:'🔒 영구 해금 400코인',ct:'paid',img:'/fuctionassets/jumsung.webp'},`,
    `openAstroModal:{cat:'점성술 · 코즈믹 차트',title:'✨ 점성술 코즈믹 차트',tagline:'실제 행성 좌표 기반으로 계산한 정밀 차트 — 별자리 앱에서 절대 못 본 내 진짜 운명의 패턴',feats:['태양·달·상승궁 3각 에너지 완전 분석','12하우스 영역별 재물·사랑·직업 운세 파악','지금 행성 트랜지트가 내 인생에 미치는 영향 계산','400코인 단 한 번 결제로 평생 무제한 이용'],cost:'🔒 영구 해금 400코인',ct:'paid',img:'/fuctionassets/jumsung.webp'},`,
  ],
  [
    `openZiweiModal:{cat:'자미두수 · 12궁 명반',title:'🌌 자미두수(紫微)',tagline:'동양 최고 명리학 자미두수로 12궁 명반을 펼쳐드립니다',feats:['자미두수 12궁 명반 완전 분석','주성·보성·화기성 정밀 해석','명궁·재백궁·관록궁 운세 적용','한 번 해금으로 평생 이용'],cost:'🔒 영구 해금 400코인',ct:'paid',img:'/fuctionassets/jami.webp'},`,
    `openZiweiModal:{cat:'자미두수 · 진로 적성 특화',title:'🌌 자미두수(紫微)',tagline:'중국 황제들이 세자 교육에 쓴 명리학 — 진로·직업 적성에 특화되어 있어 왜 이 일이 맞는지 즉시 납득됩니다',feats:['자미두수 12궁으로 내 진짜 직업 적성 완전 파악','관록궁·재백궁으로 어떤 분야에서 돈을 버는지 분석','숨겨진 재능과 성공 패턴 완전 해독','400코인 단 한 번 결제로 평생 무제한 이용'],cost:'🔒 영구 해금 400코인',ct:'paid',img:'/fuctionassets/jami.webp'},`,
  ],
  [
    `navigateToVedic:{cat:'베다 점성술 · Jyotish',title:'🪐 베다 점성술',tagline:'5000년 인도 Jyotish 별자리로 업장과 운명의 패턴을 읽습니다',feats:['Jyotish 라시·낙샤트라 정밀 분석','다샤 기간별 운세 흐름 해석','카르마·업장 운명 패턴 해독','도시·나라 기반 로컬 차트 적용'],cost:'🔒 영구 해금 300코인',ct:'paid',img:'/fuctionassets/veda.webp'},`,
    `navigateToVedic:{cat:'베다 점성술 · Jyotish',title:'🪐 베다 점성술',tagline:'전생 업장이 지금 내 인생에 어떻게 작용하는지 — 5000년 인도 Jyotish 점성술이 카르마를 해독합니다',feats:['Jyotish 라시·낙샤트라로 내 업장 패턴 완전 해독','다샤 기간별로 기회의 시기 & 위기의 시기 미리 파악','왜 계속 같은 실수를 반복하는지 카르마 분석','300코인 단 한 번 결제로 평생 무제한 이용'],cost:'🔒 영구 해금 300코인',ct:'paid',img:'/fuctionassets/veda.webp'},`,
  ],
  [
    `openOlympusOracleModal:{cat:'올림푸스 · 별자리 신탁',title:'⚡ 올림푸스 신탁',tagline:'12 올림푸스 신이 당신의 별자리에 맞는 신탁을 내립니다',feats:['12 올림푸스 신 신탁 오라클 리딩','출생 별자리 & 재전생 수호신 해석','신탁 메시지 & 행운의 기운 분석','한 번 해금으로 평생 이용'],cost:'🔒 영구 해금 300코인',ct:'paid',img:'/fuctionassets/olympus.webp'}`,
    `openOlympusOracleModal:{cat:'올림푸스 · 별자리 신탁',title:'⚡ 올림푸스 신탁',tagline:'12 올림푸스 신 중 누가 지금 내 편인지 — 내 수호신이 보내는 신탁 메시지를 직접 받으세요',feats:['12 올림푸스 신 중 내 수호신이 누구인지 즉시 파악','수호신이 지금 내 상황에 보내는 신탁 메시지 리딩','별자리 기반 행운·주의 에너지 완전 분석','300코인 단 한 번 결제로 평생 무제한 이용'],cost:'🔒 영구 해금 300코인',ct:'paid',img:'/fuctionassets/olympus.webp'}`,
  ],
];

const endOfOldD = src.indexOf(`openLoveSecretModal:{cat:'프리미엄 · 연애 전략서',title:'💕 연애 비책',tagline:'운명이 설계한 사랑의 지도`);
if (endOfOldD === -1) { console.error('LOVE SECRET OLD NOT FOUND'); process.exit(1); }

const startIdx = src.indexOf(OLD_D_START);
if (startIdx === -1) { console.error('START NOT FOUND'); process.exit(1); }

// openLifeBookModal 끝 위치 찾기
const lifebookEnd = src.indexOf(`cost:'🪙 490코인',ct:'paid',img:'/fuctionassets/lifebook.webp'},`) + 
  `cost:'🪙 490코인',ct:'paid',img:'/fuctionassets/lifebook.webp'},`.length;

let result = src.slice(0, startIdx) + NEW_D + src.slice(lifebookEnd);

// 나머지 항목들 교체
for (const [oldStr, newStr] of TAIL_REPLACEMENTS) {
  if (result.includes(oldStr)) {
    result = result.replace(oldStr, newStr);
    console.log('Replaced:', oldStr.slice(0, 50) + '...');
  } else {
    console.warn('NOT FOUND:', oldStr.slice(0, 50) + '...');
  }
}

writeFileSync(filePath, result, 'utf8');
console.log('Root index.html Done!');
console.log('Result length:', result.length);
