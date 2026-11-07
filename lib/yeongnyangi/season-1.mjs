// 영냥이 시즌 1 연재표. 프롤로그(/yeongnyangi/room/#story, "내 이름이 네오였던 밤") 다음 이야기.
// 매주 토요일 21:00 KST 공개. status가 'ready'이고 컷·이미지가 모두 갖춰진 회차만 publishAt 이후 공개된다.
// 'draft' 회차는 시각이 지나도 공개되지 않는다 — 일정 때문에 미완성 회차를 자동 공개하지 않는다.
// 설계: docs/design/yeongnyangi-season1.md · 발행: .github/workflows/yeongnyangi-weekly-publish.yml

export const SEASON_ONE = {
  slug: 'season-1',
  title: '영냥이의 점술방 · 시즌 1',
  schedule: { label: '매주 토요일 밤 9시', weekday: 6, hour: 21, timeZone: 'Asia/Seoul' },
  prologue: { href: '/yeongnyangi/room/#story', title: '내 이름이 네오였던 밤' },
  episodes: [
    {
      no: 1, slug: 'ep1', title: '데운 방석', status: 'ready',
      publishAt: '2026-11-07T00:00:00+09:00',
      logline: '첫눈 전날 밤, 화로 옆으로 옮겨진 방석. "내가 앉으려고 데운 거야."',
      nextQuestion: '방석에 눌린 봉투는 누구의 것이었을까.',
    },
    {
      no: 2, slug: 'ep2', title: '젖은 봉투', status: 'ready',
      publishAt: '2026-11-14T21:00:00+09:00',
      logline: '화로 받침 밑에서 나온 젖은 봉투. 영냥이는 읽지 말라는 약속부터 받는다.',
      nextQuestion: '아직 못 부친 편지는 누구에게 가야 했을까.',
    },
    {
      no: 3, slug: 'ep3', title: '받는 사람 칸', status: 'ready',
      publishAt: '2026-11-21T21:00:00+09:00',
      logline: '생선 한 마리를 복채로 받은 밤, 봉투의 받는 사람 칸이 비어 있다는 걸 알게 된다.',
      nextQuestion: '영냥이는 누구의 이름을 부를까.',
    },
    {
      no: 4, slug: 'ep4', title: '부르지 못한 이름', status: 'draft',
      publishAt: '2026-11-28T21:00:00+09:00',
      logline: '이름을 부르려던 순간 손님이 찾아온다. 영냥이는 남의 고민을 먼저 들어 준다.',
      nextQuestion: '미뤄 둔 이름은 그대로 기다려 줄까.',
    },
    {
      no: 5, slug: 'ep5', title: '두 마리 생선', status: 'draft',
      publishAt: '2026-12-05T21:00:00+09:00',
      logline: '연이가 생선을 두 마리 가져온 밤. 한 마리는 복채, 한 마리는 부탁이다.',
      nextQuestion: '부탁을 들어주는 쪽은 누구일까.',
    },
    {
      no: 6, slug: 'ep6', title: '첫 답장', status: 'draft',
      publishAt: '2026-12-12T21:00:00+09:00',
      logline: '봉투가 부쳐지고 일주일 뒤, 점술방 문틈에 답장이 끼어 있다.',
      nextQuestion: '시즌 2로 이어집니다.',
    },
  ],
};
