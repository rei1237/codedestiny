// Shared browser/server catalogue. Price and growth effects are authoritative on the server.
export const SPIRIT_HONEY_COST = 5;
export const SPIRIT_BONUS_PERCENT = 20;
export const SPRITE_FRAMES = 4;
const stems = ['갑','을','병','정','무','기','경','신','임','계'];
const branches = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const hanStems = [...'甲乙丙丁戊己庚辛壬癸'];
const hanBranches = [...'子丑寅卯辰巳午未申酉戌亥'];
const animals = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','강아지','돼지'];
export const BASE_ANIMALS = ['mouse','ox','tiger','rabbit','dragon','snake','horse','sheep','monkey','rooster','dog','pig'].map((key,index) => Object.freeze({id:`animal-${key}`,name:animals[index]}));
const stemProfiles = [
  ['새싹','목','새로운 방향을 발견하고 먼저 시도하는 힘','시작한 일을 끝맺기 전에 다음 일로 마음이 옮겨갈 수 있어요.','오늘 시작할 일 하나와 마칠 일 하나를 따로 정해 보세요.'],
  ['꽃잎','목','상황에 맞게 방법을 바꾸며 관계를 이어가는 힘','다른 사람에게 맞추다 자신의 기준이 흐려질 수 있어요.','부탁을 받기 전에 내가 할 수 있는 범위를 먼저 적어 보세요.'],
  ['햇살','화','생각을 밝게 표현하고 사람들에게 활기를 전하는 힘','마음이 앞서면 상대의 준비 시간을 놓치기 쉬워요.','제안한 뒤에는 상대가 생각할 시간을 남겨 주세요.'],
  ['촛불','화','작은 변화를 알아보고 한 가지에 정성을 쏟는 힘','세밀하게 살피는 만큼 사소한 반응에도 지칠 수 있어요.','추측과 직접 확인한 사실을 구분해 보세요.'],
  ['산들','토','흔들리는 상황에서도 중심을 잡고 책임지는 힘','지키려는 마음이 강하면 도움을 청하기 어려울 수 있어요.','내가 맡을 일과 함께 나눌 일을 하나씩 골라 보세요.'],
  ['씨앗','토','필요한 것을 챙기며 작게 쌓아가는 힘','준비가 길어지면 시작할 기회를 미룰 수 있어요.','완벽히 갖추기 전에 작은 시험부터 해보세요.'],
  ['은종','금','복잡한 문제에서 기준을 세우고 정리하는 힘','빠른 판단이 상대에게는 단호하게 느껴질 수 있어요.','결론 앞에 판단의 이유를 한 문장 덧붙여 보세요.'],
  ['진주','금','섬세한 차이를 발견하고 완성도를 높이는 힘','기준이 높아지면 이미 잘한 부분을 놓치기 쉬워요.','고칠 점 하나와 잘한 점 하나를 함께 기록해 보세요.'],
  ['물결','수','넓게 바라보고 새로운 가능성을 연결하는 힘','선택지가 많으면 결정이 뒤로 밀릴 수 있어요.','지금 할 수 있는 선택 두 개만 남겨 비교해 보세요.'],
  ['빗방울','수','조용히 관찰하며 필요한 실마리를 찾아내는 힘','생각을 혼자 오래 품으면 오해가 쌓일 수 있어요.','정리된 생각부터 짧게 나누어 보세요.'],
];
const branchProfiles = [
  ['작은 신호를 빠르게 알아채는', '정보를 모으는 데서 멈추지 않고 한 가지 행동으로 옮길 때 장점이 살아나요.'],
  ['익숙한 일을 꾸준히 다져가는', '속도를 비교하기보다 반복할 수 있는 리듬을 만들 때 편안해져요.'],
  ['호기심을 행동으로 펼치는', '혼자 앞서기보다 함께할 사람과 방향을 맞추면 힘이 오래가요.'],
  ['관계의 분위기를 부드럽게 읽는', '조화를 지키면서도 자신의 의사를 짧고 분명하게 전해 보세요.'],
  ['여러 가능성을 한데 모으는', '큰 그림을 작은 순서로 나누면 실행할 길이 보이기 쉬워요.'],
  ['관찰한 것을 깊이 익히는', '충분히 생각한 뒤에는 작은 시도로 판단을 확인해 보세요.'],
  ['마음의 에너지를 밖으로 표현하는', '열중한 뒤 쉬는 시간을 확보하면 꾸준함을 유지하기 좋아요.'],
  ['사람과 일의 빈틈을 다정하게 채우는', '누군가를 돕는 일과 나를 돌보는 일을 함께 일정에 넣어 보세요.'],
  ['도구와 방법을 유연하게 바꾸는', '새로운 방법을 발견했다면 끝까지 써볼 기준도 함께 정해 보세요.'],
  ['차이를 알아보고 질서를 세우는', '잘못된 점만큼 이미 나아진 부분도 살펴보면 관계가 부드러워져요.'],
  ['신뢰와 약속을 오래 지키는', '내 기준을 모두에게 요구하기보다 서로의 사정을 확인해 보세요.'],
  ['생각과 감정을 넉넉하게 품는', '충분히 공감한 뒤 지금 필요한 행동을 하나 골라 보세요.'],
];
export const GANJI_CHARACTERS = Array.from({ length: 60 }, (_, index) => {
  const stem = stemProfiles[index % 10], branch = branchProfiles[index % 12];
  return Object.freeze({ index, ganji: stems[index % 10] + branches[index % 12], hanja: hanStems[index % 10] + hanBranches[index % 12],
    name: `${stem[0]} ${animals[index % 12]}`, element: stem[1], animal: animals[index % 12],
    summary: `${branch[0]} ${stem[0]} ${animals[index % 12]}`,
    strength: `${stem[2]}을 지닌 모습으로 읽을 수 있어요. ${branch[1]}`,
    caution: stem[3], advice: stem[4],
  });
});
const spiritNames = ['연꽃씨 쥐','이끼숲 소','햇무리 호랑이','초승달 토끼','복숭아구름 용','별리본 뱀','혜성 말','구름종 양','꽃꼬리 원숭이','해오름 닭','등불 강아지','꿀연꽃 돼지'];
export const SPIRITS = spiritNames.map((name, index) => Object.freeze({ id: `spirit-${String(index).padStart(2, '0')}`, name, cost: SPIRIT_HONEY_COST, bonusPercent: SPIRIT_BONUS_PERCENT }));
export function findSpirit(id) { return SPIRITS.find(item => item.id === id) || null; }
export function characterForPillar(dayPillar, gender) {
  const sex = ({ male: 'm', female: 'f', m: 'm', f: 'f', '남성': 'm', '여성': 'f' })[String(gender || '').toLowerCase()];
  const profile = GANJI_CHARACTERS.find(item => item.hanja === dayPillar || item.ganji === dayPillar);
  const animal = profile && BASE_ANIMALS[profile.index % 12];
  return profile && sex ? { ...profile, id: animal.id, name: animal.name } : null;
}
export function spriteUrl(id) {
  return BASE_ANIMALS.some(animal => animal.id === id) || findSpirit(id) ? `/assets/profile-characters/${id}.webp` : '';
}
export function spiritExp(kind, baseExp, ownedIds, equippedId) {
  const active = Boolean(findSpirit(equippedId) && ownedIds?.includes(equippedId));
  return active && (kind === 'checkin' || kind === 'quest') ? Math.floor(baseExp * (100 + SPIRIT_BONUS_PERCENT) / 100) : baseExp;
}
