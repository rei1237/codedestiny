export const MOONLIGHT_PASS_NAME = '문라이트 패스(꿀단지 이용권)';
export const MOONLIGHT_PASS_HREF = '/points/#moonlight-plans';

const YEONI = '꽃돼지 연이';
const CAT = '영냥이';

// 이용 안내 웹툰 7컷. 처음 온 사람이 두 장의 타로 카드 앞에서 망설이는 장면에서 시작해
// 예시 질문 하나가 상담으로 이어지고, 프로필 카드·출석 꿀방울·기록 다시 열기를 필요한 순간에 보여 준다.
// img 가 없으면 /images/moonlight-guide/<art>.webp 를 쓴다. 출처: docs/design/consultation-webtoon-assets.json
export const moonlightPanels = [
  { art: 'first', img: { src: '/images/moonlight-guide/first-720.webp', avif: '/images/moonlight-guide/first', widths: [508, 1016] },
    title: '두 장의 카드 앞에서',
    alt: '연꽃 카드와 초승달 카드 사이에서 손가락을 멈춘 첫 방문자, 카드 뒤에서 내다보는 연이와 영냥이.',
    lines: [[YEONI, '어느 쪽부터 펼쳐야 할지 몰라도 괜찮아요. 오늘 마음에 걸린 장면부터 말해 주세요.'],
      [CAT, '뭘 물어야 할지 모르겠으면, 그 망설임부터 적어. 그것도 질문이야.']] },
  { art: '2', title: '한 줄이면 충분해요', alt: '손님의 두 손이 휴대폰 입력창에 첫 문장을 적기 시작한다.',
    lines: [[YEONI, '예를 들면 이렇게요. “사흘째 답장이 없는데, 먼저 연락해도 될까요?”']] },
  { art: 'readings', title: '고민에 맞는 상담',
    alt: '영냥이가 별자리 지도를 펴고 연이는 타로 카드를 살펴본다.',
    lines: [[CAT, '되풀이되는 내 선택이 궁금하면 사주를, 지금 마음에 걸린 장면은 타로를 펼쳐 봐. 그 답장 질문이라면 연애 비책이 맞겠군.'],
      [YEONI, '운세 종류로 찾기에서 마스터별 상담도 볼 수 있어요.']],
    link: { href: '/consultations/', text: '마스터 상담 둘러보기' } },
  { art: '6', title: '질문이 상담이 되는 순간', alt: '손님이 화면 속 상담 내용을 읽으며 처음으로 편안하게 웃는다.',
    lines: [[YEONI, '상대 마음을 대신 정해 드리진 않아요. 다가갈 때와 기다릴 때를 나눠서, 오늘 할 수 있는 한 가지를 함께 찾아요.']] },
  { art: 'forest', title: '프로필 카드와 출석 혜택',
    alt: '숲길에서 등불을 든 영냥이 옆으로 연이가 작은 카드를 들어 보인다.',
    lines: [[YEONI, '가입하고 내 프로필 카드를 만들어 보세요. 고른 정령과 일주 동물이 카드에 함께 담겨요.'],
      [CAT, '…카드 하나 만드는 데 오래 걸리지 않아. 들고 다니기 편하다고.']] },
  { art: '5', title: '하루 한 번, 꿀방울', alt: '연이가 연꽃이 비치는 꿀단지 위에 이름표 두 장을 걸어 둔다.',
    lines: [[CAT, '출석하면 꿀방울이 한 방울씩 모여. 매일 오라는 건 아니고… 오면 좋다는 거지.'],
      [YEONI, '모은 꿀방울로 상담을 열 수 있어요. 간직하고 싶은 마음도 한 줄 남겨 두세요.']] },
  { art: 'records', title: '다시 펼치는 이야기',
    alt: '연이와 영냥이가 함께 지난 이야기가 담긴 앨범을 펼친다.',
    lines: [[CAT, '다시 읽고 싶은 말은 꿀꿀 운세 홈의 ‘나의 상담 다시 보기’에서 찾아봐.'],
      [YEONI, '꿀꿀 운세 기록과 영냥이 상담 기록 중 상담받은 곳을 고르면 돼요.']] },
];
