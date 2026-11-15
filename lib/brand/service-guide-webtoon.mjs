import { entryCuts } from './entry-webtoon.mjs';
import { consultationWebtoons } from './consultation-webtoons.mjs';

// 안내용 각색. 원화의 인물·장소를 유지하며 기존 자산을 참조한다. 그림 파일을 복제하지 않는다.
// 실제 동선: app/saju/free, app/fortune/[period], app/tarot, app/sukuyo,
// app/yeongnyangi. 전문 상담의 해석 근거는 consultation-stories.mjs와 해당 Worker prompt를 따른다.
const say = (speaker, text) => ({ speaker, text });
const scene = (work, index, lines) => ({ ...consultationWebtoons[work].cuts[index - 1], lines });
const entryScene = (id, lines) => {
  const { image } = entryCuts().find(cut => cut.id === id);
  return { ...image, widths: [640, 1080], fallback: 720, kind: 'dialogue', lines };
};

export const SERVICE_GUIDE_LABEL = '서비스 설명 이용 안내 웹툰';
export const quickGuideStories = [
  {
    id: 'saju', name: '사주 · 기본부터 라이트 풀이까지', title: '나라는 나무를 처음 읽는 날',
    lead: '할 일은 많은데 끝맺음이 어렵던 손님이, 자신의 힘을 쓰는 방식을 돌아봅니다.',
    href: '/saju/free/', action: '기본 사주부터 살펴보기',
    cuts: [
      entryScene('question-door', [say('연이', '시작한 일은 많은데, 끝낸 일은 적은 하루였나요? 오늘은 나를 탓하기 전에 기질부터 살펴봐요.')]),
      entryScene('offer-pig', [say('꽃돼지 연이', '출생 정보를 넣으면 만세력으로 사주 여덟 글자를 세워요. 오행은 그 안에서 힘이 어디로 모이는지 보는 단서예요.'), say('', '무료 만세력에서는 기본 성향과 고민의 짧은 답부터 살펴요. 라이트 사주 풀이와 대운 풀이 등 가격이 표시된 항목은 별도 이용 조건을 확인해 주세요.')]),
      entryScene('invite-tea', [say('연이', '뻗어나가려는 목의 힘은 시작할 때 든든하지만, 방향이 많으면 마무리가 어려울 수도 있어요. 많고 적음만으로 좋고 나쁨을 정하지 않아요.'), say('', '손님은 할 일 목록에 새 줄을 더하는 대신, 오늘 끝낼 일 하나에 동그라미를 그렸다. 이 장면은 기질을 읽는 방식의 예시예요.')]),
    ],
  },
  {
    id: 'daily', name: '오늘·내일의 운세', title: '우산을 챙기는 정도의 예감',
    lead: '중요한 약속이 있는 아침. 운세를 하루의 점검 메모처럼 읽어 봅니다.',
    href: '/fortune/today/', action: '오늘의 운세 살펴보기',
    cuts: [
      entryScene('imagine-calendar', [say('', '약속은 오후 세 시. 손님은 달력보다 먼저 휴대폰을 들여다봤다.'), say('연이', '오늘의 운세가 궁금하면 띠나 별자리부터 골라 보세요. 오늘과 내일, 주간·월간 흐름을 살펴볼 수 있어요.')]),
      entryScene('imagine-phone', [say('연이', '같은 띠나 별자리를 위한 공통 해석이에요. 개인의 출생 정보를 모두 읽는 상담과는 깊이가 달라요. 내 상황에 맞는 조언을 골라 참고해요.')]),
      entryScene('imagine-desk', [say('', '“서두르지 말기”를 읽고 손님은 약속 장소를 한 번 더 확인했다.'), say('연이', '행운을 기다리는 대신 준비할 일을 하나 찾았네요. 하루의 주도권은 여전히 당신에게 있어요.')]),
    ],
  },
  {
    id: 'tarot', name: '타로 · 연애와 재회, 지금의 선택', title: '연락이 올까요, 다음에 놓인 질문',
    lead: '답장을 기다리던 밤, 카드 앞에서 질문이 조금 달라집니다.',
    href: '/tarot/', action: '고민에 맞는 타로 고르기',
    cuts: [
      scene('love-secret', 3, [say('지우', '연락이 올까요? 그것만 알면 편할 것 같았는데, 계속 휴대폰만 보게 돼요.')]),
      scene('fusion', 6, [say('연이', '그 질문을 안고 카드를 펼쳐 봐요. 카드는 감정과 상황을 비춰 볼 상징이에요. 상대의 마음이나 연락 날짜를 확정하는 답은 아니고요.')]),
      scene('love-secret', 9, [say('지우', '그럼 기다리는 동안, 저는 무엇을 하면 좋을까요?'), say('연이', '지금 선택할 수 있는 행동까지 질문에 담겼네요. 연애·재회처럼 고민에 맞는 타로를 고르고, 해석 속 조언을 내 상황에 비춰 봐요.')]),
    ],
  },
  {
    id: 'compatibility', name: '숙요점 · 두 사람의 관계', title: '우리 사이의 적당한 한 뼘',
    lead: '매일 연락하고 싶은 사람과 혼자 쉴 시간이 필요한 사람이 마주 앉습니다.',
    href: '/sukuyo/', action: '숙요점 살펴보기',
    cuts: [
      scene('sukuyo-compat', 3, [say('친구 A', '잘 맞는다는데 왜 자꾸 다투지?'), say('친구 B', '다르다는데 왜 자꾸 만나고 싶지?')]),
      scene('sukuyo-compat', 4, [say('서한비', '숙요점은 출생일에 따른 본명숙과 두 숙의 관계를 읽습니다. 끌림과 편안함은 같은 뜻이 아니에요. 좋고 나쁜 한마디로 닫지 않고 관계의 결을 살펴요.')]),
      scene('sukuyo-compat', 8, [say('', '두 사람은 연락 횟수 대신 서로 편한 시간을 묻기 시작했다.'), say('서한비', '기본 관계를 살펴본 뒤, 구체적인 고민을 더 풀고 싶다면 숙요점 궁합 상담으로 이어갈 수 있어요.')]),
    ],
  },
  {
    id: 'cat', name: '영냥이의 달빛 점술방', title: '고양이 앞에서는 숨기지 않아도',
    lead: '고민을 한 문장으로 줄이지 못한 손님이 창가의 고양이를 만납니다.',
    href: '/yeongnyangi/', action: '영냥이 만나기',
    cuts: [
      entryScene('imagine-night', [say('', '찻집 창가에 작은 불이 하나 더 켜져 있었다. 남색 모자의 흰 고양이가 자리를 내주었다.')]),
      entryScene('invite-yeongnyangi', [say('영냥이', '질문이 길어도 괜찮아. 지금 제일 마음에 걸리는 일부터 들려줘. 입력한 이야기와 선택한 상담을 바탕으로 같이 살펴보자.')]),
      entryScene('imagine-phone', [say('', '손님은 “잘될까요?”를 지우고, 무슨 일이 있었는지부터 적었다.'), say('영냥이', '마음이 조금 가벼워졌으면, 다음에 할 작은 행동도 찾아보자. 그건 네가 고르는 거야.')]),
    ],
  },
];

export const guideGroups = [
  { id: 'signature', title: '대표 상담 · 고민이 이야기가 될 때',
    intro: '답장을 기다리는 밤부터 한 해의 계획까지. 연이와 네오, 마스터들이 서로 다른 방식으로 고민을 풀어요.',
    ids: ['love-secret', 'new-year', 'life-book', 'tea', 'neo', 'codex'] },
  { id: 'expert', title: '전문가 상담 · 같은 고민, 다른 지도',
    intro: '별과 명식의 이름만 바꾸지 않아요. 각 체계가 어떤 근거로 나와 관계, 시기를 읽는지 이야기 안에서 만나 보세요.',
    ids: ['ziwei', 'astrology', 'vedic', 'sukuyo-compat', 'legacy-naming', 'karma', 'fusion'] },
];
