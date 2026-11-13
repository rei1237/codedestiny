export const MOONLIGHT_PASS_NAME = '문라이트 패스(꿀단지 이용권)';
export const MOONLIGHT_PASS_HREF = '/points/#moonlight-plans';

const YEONI = '꽃돼지 연이';
const CAT = '영냥이';

// 이용 안내 웹툰 7컷. 처음 온 사람이 두 장의 타로 카드 앞에서 망설이는 장면에서 시작해
// 예시 질문 하나가 상담으로 이어지고, 프로필 카드·출석 꿀방울·기록 다시 열기를 필요한 순간에 보여 준다.
// img 가 없으면 /images/moonlight-guide/<art>.webp(508×508)를 쓴다. img.w·h 가 있으면 그 비율로 그린다.
// cushion-* 는 연재에서 내린 영냥이 시즌 1의 1화 「데운 방석」 컷이다(2026-11-13). 출처: docs/design/consultation-webtoon-assets.json
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
  { art: '6', img: { src: '/images/moonlight-guide/cushion-07-720.webp', avif: '/images/moonlight-guide/cushion-07', widths: [640, 1024], w: 720, h: 1080 },
    title: '질문이 상담이 되는 순간', alt: '데워진 방석에 앉은 연이가 화로에 손을 녹이며 눈을 감고 편안하게 웃는다. 창밖에는 첫눈이 내린다.',
    lines: [[YEONI, '상대 마음을 대신 정해 드리진 않아요. 다가갈 때와 기다릴 때를 나눠서, 오늘 할 수 있는 한 가지를 함께 찾아요.']] },
  { art: 'card', title: '내 캐릭터 출석부',
    alt: '연이가 레벨 별이 달린 프로필 카드를 들어 보이고, 영냥이가 달력 칸에 꿀방울 도장을 찍는다.',
    lines: [[YEONI, '가입하면 내 프로필 카드가 생겨요. 고른 정령과 일주 동물이 카드 속 캐릭터가 되고, 출석과 퀘스트로 레벨이 올라요.'],
      [CAT, '출석하면 달력에 꿀방울 도장. 닷새 이어지면 꿀단지 보너스야. …오늘 퀘스트도 잊지 말고.']] },
  { art: '5', img: { src: '/images/moonlight-guide/cushion-05-720.webp', avif: '/images/moonlight-guide/cushion-05', widths: [640, 1080], w: 720, h: 480 },
    title: '하루 한 번, 꿀방울', alt: '화로 옆에 데워 둔 방석에서 영냥이가 시치미를 떼며 기지개를 켜고 내려온다.',
    lines: [[CAT, '모은 꿀방울은 그냥 쌓아 두는 게 아니야. 매일 오라는 건 아니고… 오면 좋다는 거지.'],
      [YEONI, '모은 꿀방울로 상담을 열 수 있어요. 간직하고 싶은 마음도 한 줄 남겨 두세요.']] },
  { art: 'records', title: '다시 펼치는 이야기',
    alt: '연이와 영냥이가 함께 지난 이야기가 담긴 앨범을 펼친다.',
    lines: [[CAT, '다시 읽고 싶은 말은 꿀꿀 운세 홈의 ‘나의 상담 다시 보기’에서 찾아봐.'],
      [YEONI, '꿀꿀 운세 기록과 영냥이 상담 기록 중 상담받은 곳을 고르면 돼요.']] },
];
