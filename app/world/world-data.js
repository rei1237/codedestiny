/**
 * /world 페이지의 인물·장소·이야기 지도 데이터.
 *
 * 🔴 정본은 두 곳뿐이다 — 노벨 대본 `content/novel/episodes.source.json` 과
 *    VN 바이블 `docs/webnovel_review/SAJU_SERIES_BIBLE.md`. 여기 적는 설정은 그 안에서만 가져온다.
 * 🔴 스포일러 선: 1부 끝(EP.27B)과 2부 초입(EP.28)까지만 구체적으로 적는다.
 *    네오의 진명·회귀 정체, 무성의 정체, 흑월의 최후, 검은 호랑이의 정체와 동료들의 결말은 쓰지 않는다.
 *    "박지은"은 영구 금지이고, 무성이라는 이름도 이 페이지에 쓰지 않는다(까마귀로만 소개).
 */

export const CHARACTER_GROUPS = [
  {
    id: "companions",
    title: "여정의 동행",
    intro: "사주의 강과 네 개의 섬을 연이와 함께 건너는 사람들입니다.",
    characters: [
      {
        id: "yeoni",
        name: "연이",
        role: "주인공 · 인간과 꽃돼지 · 乙木",
        portrait: "/images/novel/world/yeoni-silhouette.webp",
        alt: "인간 모습과 꽃돼지 모습이 겹친 연이의 실루엣",
        caption: "인간과 꽃돼지, 두 모습의 연이",
        body: "평범한 대학생이었다가 타로의 문을 지나 운명 세계에 떨어졌습니다. 타고난 글자는 을목(乙木), 나무 중에서도 덩굴입니다. 혼자서는 서지 못하지만 붙잡을 것만 있으면 담벼락도 넘습니다. 되찾은 사주의 기운을 빌려 쓰는 그릇이라, 이야기가 진행될수록 쓸 수 있는 결이 하나씩 늘어납니다. 상담 화면에서는 마음의 결을 먼저 살핀 뒤 오늘 해볼 수 있는 한 가지를 권합니다.",
      },
      {
        id: "neo",
        name: "영냥이 네오",
        role: "동행 · 사주의 강 가디언 · 金",
        portrait: "/images/novel/world/neo.webp",
        alt: "모자 쓴 흰 고양이 영냥이 모습의 네오",
        caption: "영냥이 모습으로 사주의 강을 지키는 네오",
        body: "사주의 강을 지키는 가디언이자 연이의 동행입니다. 운명 세계에서는 모자 쓴 흰 고양이 영냥이로 연이 곁을 지키고, 사람 모습을 되찾으면 은빛 머리의 사람으로 돌아옵니다. 타고난 기운은 금(金)이라 베고 끊고 가르는 쪽인데, 금은 본디 나무를 베는 기운이어서 연이 곁에 서는 것 자체가 위험을 안는 일입니다. 그래도 그 칼은 연이를 위협하는 것에만 씁니다.",
      },
      {
        id: "moka",
        name: "모카",
        role: "식상의 섬 동료 · 丙火 · 수달 요리사",
        portrait: "/images/novel/world/moka.webp",
        alt: "헤드폰을 쓴 수달 요리사 모카",
        caption: "식상의 섬에서 몰래 랩을 하는 모카",
        body: "해가 멈춘 축제의 섬에서 만난 수달 길거리 요리사입니다. 독설이 세고 별점 테러 협박도 서슴지 않지만, 한번 편이 되면 끝까지 동료로 남습니다. 몰래 랩을 하는 수달입니다.",
      },
      {
        id: "yun",
        name: "윤달",
        role: "재성의 섬 동료 · 사람 점술가",
        portrait: "/images/novel/world/yun.webp",
        alt: "넉살 좋게 웃는 점술가 윤달",
        caption: "재성의 섬에서 만난 윤달",
        body: "시간을 파는 섬에서 연이 앞에 나타난 사람 점술가입니다. 넉살이 좋고 누구에게나 생시부터 묻습니다. 궁합을 봐 주겠다며 다가오지만 속내는 쉽게 내보이지 않습니다. 이 섬에서 그가 무엇을 지키려 하는지는 본편에서 차례로 드러납니다.",
      },
    ],
  },
  {
    id: "islanders",
    title: "섬에서 만난 사람들",
    intro: "섬마다 연이의 걸음을 붙잡거나 밀어 주는 이들입니다.",
    characters: [
      {
        id: "luna",
        name: "루나 언니",
        role: "재성의 섬 빵집",
        portrait: "/images/novel/world/luna.webp",
        alt: "분홍 앞치마에 토끼 귀 머리띠를 한 빵집 언니 루나",
        caption: "재성의 섬 빵집의 언니",
        body: "재성의 섬에서 빵집을 지키는 언니입니다. 가게를 지키려고 자기 시간을 조금씩 팔아 왔고, 그 피곤한 얼굴에는 긴 밤이 묻어 있습니다. 갓 구운 빵 한 덩이를 아무 대가 없이 건네는 사람이기도 합니다.",
      },
      {
        id: "rab",
        name: "청토끼",
        role: "청토끼 금융 주인 · 자칭 최약체",
        portrait: "/images/novel/world/rab.webp",
        alt: "청토끼 금융의 주인, 파란 토끼",
        caption: "청토끼 금융의 주인",
        body: "'청토끼 금융'이라는 간판을 내건 장사꾼입니다. “최약체랍니다~” 하며 자기를 낮추지만 셈에는 빈틈이 없습니다.",
      },
      {
        id: "crow",
        name: "까마귀",
        role: "식상의 섬 · 검은 깃털",
        portrait: "/images/novel/world/crow.webp",
        alt: "후드를 쓴 까마귀 재판관",
        caption: "검은 깃털의 까마귀",
        body: "식상의 섬 위로 검은 깃털을 떨구며 나타나는 까마귀입니다. 굳은 얼굴로 판결하듯 말하며, 깃털이 떨어진 자리마다 섬이 조용해집니다. 이 까마귀가 누구인지는 본편에서 조금씩 밝혀집니다.",
      },
    ],
  },
  {
    id: "opposition",
    title: "마주하는 존재",
    intro: "연이가 자신과, 그리고 세계와 부딪치게 만드는 얼굴들입니다.",
    characters: [
      {
        id: "mirror",
        name: "거울 속 연이",
        role: "비겁의 섬 · 나를 닮은 얼굴",
        portrait: "/images/novel/world/mirror.webp",
        alt: "거울 속에서 연이를 따라 하는 얼굴",
        caption: "거울 속에서 연이를 따라 하는 얼굴",
        body: "비겁의 섬 거울 속에서 나온 연이입니다. 같은 얼굴로 같은 옷을 입지만 표정이 한 박자 늦거나 어긋납니다. 연이가 자기 자신과 마주해야 하는 첫 시험이 여기서 시작됩니다.",
      },
      {
        id: "tiger",
        name: "의문의 검은 호랑이",
        role: "이름도 사연도 감춘 존재",
        portrait: "/images/novel/hanbi/base.webp",
        alt: "붉은 눈과 금빛 장식을 지닌 검은 호랑이",
        caption: "강가에 나타난 이름 없는 검은 호랑이",
        body: "붉은 눈과 금실을 두른 작은 망토, 앞발에 감긴 가느다란 검은 고리. 사주의 강가에서 만난 이 호랑이는 아직 이름도 사연도 밝히지 않습니다.",
      },
      {
        id: "heukwol",
        name: "흑월",
        role: "그림자 · 목소리만 남은 일식",
        portrait: "/images/novel/world/heukwol.webp",
        alt: "얼굴 없는 일식 실루엣, 흑월",
        caption: "몸 없는 일식, 흑월",
        body: "일식이 드리운 하늘에서 목소리로만 찾아오는 존재입니다. 몸이 없어 남의 얼굴을 빌려 쓰고, 다정한 척 반말로 말을 겁니다. 운명의 코드를 먹고 자랍니다.",
      },
    ],
  },
  {
    id: "voices",
    title: "목소리",
    intro: "얼굴보다 말로 먼저 만나는 이들입니다.",
    characters: [
      {
        id: "universe",
        name: "우주",
        role: "운명 고객센터 상담원",
        portrait: "/images/novel/world/universe.webp",
        alt: "헤드셋을 쓴 운명 고객센터 상담원, 우주",
        caption: "운명 고객센터의 상담원",
        body: "프롤로그에서 연이가 연결된 운명 고객센터의 상담원입니다. 상담원 존댓말로 응대하고, 대기 순번은 늘 ∞입니다.",
      },
    ],
  },
];

export const STORY_MAP = [
  {
    part: "1부 · 사주의 세계",
    stops: [
      { name: "비겁의 섬", note: "거울 속 나를 마주하는 첫 섬" },
      { name: "식상의 섬", note: "해가 멈춘 축제의 섬" },
      { name: "재성의 섬", note: "시간을 파는 섬" },
      { name: "인성의 도서관", note: "숨 쉬는 책의 도서관" },
      { name: "다섯 번째 빛", note: "빈 시간 칸과 일식이 드리운 자리" },
    ],
  },
  {
    part: "2부 · 돌아온 방",
    stops: [{ name: "현실의 아파트 복도", note: "연이가 낯선 얼굴을 알아보기 시작하는 곳" }],
  },
];

export const PLACES = [
  {
    name: "타로의 문",
    body: "현실과 운명 세계를 잇는 입구. 연이는 이 문을 지나며 모습이 바뀌었습니다.",
    image: "/images/novel/remaster/tarot-door-awakening-v1.webp",
    alt: "타로의 문이 열리는 장면",
  },
  {
    name: "사주의 강",
    body: "간지의 글자들이 떠다니는 큰 강. 필요한 만큼 스스로 길을 만들며, 네오가 지킵니다.",
    image: "/images/novel/remaster/river-of-names-v1.webp",
    alt: "글자들이 떠다니는 사주의 강",
  },
  {
    name: "비겁의 섬",
    body: "강 위에 흩어진 네 곳 중 첫 번째. 나와 같은 편, 그리고 나를 닮은 경쟁자를 마주하는 자리입니다.",
    image: "/images/novel/remaster/mirror-trial-v1.webp",
    alt: "거울이 늘어선 비겁의 섬",
  },
  {
    name: "식상의 섬",
    body: "표현하고 내보내는 기운의 섬. 무대와 소리가 있는 곳입니다.",
    image: "/images/novel/remaster/siksang-festival-street-v1.webp",
    alt: "해가 멈춘 축제 거리",
  },
  {
    name: "재성의 섬",
    body: "가지려는 마음과 값을 매기는 일이 시험대에 오르는 섬입니다.",
    image: "/images/novel/remaster/time-vault-v1.webp",
    alt: "시계 톱니가 얽힌 시간 금고",
  },
  {
    name: "인성의 도서관",
    body: "기억이 책으로 꽂혀 있는 곳. 숨 쉬는 책들이 가득한 서고입니다.",
    image: "/images/novel/remaster/sunken-stacks-v1.webp",
    alt: "물에 잠긴 서고",
  },
  {
    name: "현실의 아파트 복도",
    body: "운명 세계를 빠져나온 뒤의 현실. 연이가 낯선 얼굴을 알아보기 시작하는 곳입니다.",
    image: "/images/novel/remaster/apartment-hall-v1.webp",
    alt: "현실의 아파트 복도",
  },
];
