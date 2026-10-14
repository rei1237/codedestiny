const captions = {
  love: '달빛 정원에서 마주 앉은 두 사람', business: '펼친 지도 앞에서 방향을 의논하는 두 사람', friend: '등불을 들고 나란히 걷는 두 사람',
  year: '서로 다른 길에서 정원 문으로 향하는 두 사람', month: '정원 앞 각자의 책상에 앉은 두 사람', day: '따뜻한 창가에 나란히 놓인 두 찻잔', hour: '먼 산의 아침을 바라보는 두 등불',
  'past-resonance': '연못 위에서 가까워지는 두 등불', 'past-growth': '꽃나무가 선 두 물가를 잇는 다리', 'past-knot': '연꽃 곁에 느슨하게 묶인 비단 매듭',
};
export const COMPAT_ART = Object.freeze(Object.fromEntries(Object.entries(captions).map(([id, alt]) => [id, Object.freeze({ id, src:`/images/compat-story/${id}.webp`, width:1200, height:800, alt })])));
export function pastLifeArt(grade) { return COMPAT_ART[['S','A'].includes(grade) ? 'past-resonance' : ['D','F'].includes(grade) ? 'past-knot' : 'past-growth']; }
