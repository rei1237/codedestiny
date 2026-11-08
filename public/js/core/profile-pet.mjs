import { BASE_ANIMALS } from './profile-characters.mjs';

export const PET_ART_VERSION = 'moon-garden-v1';
export const PET_EGGS = Object.freeze([
  { id: 'moon', name: '달빛 알', description: '고요한 달빛을 닮은 작은 친구' },
  { id: 'flower', name: '꽃잎 알', description: '다정한 꽃향기를 품은 작은 친구' },
  { id: 'star', name: '별무늬 알', description: '반짝이는 호기심을 지닌 작은 친구' },
]);
export const PET_RARE_SPECIES = Object.freeze([
  { id: 'lion', name: '사자' }, { id: 'giraffe', name: '기린' }, { id: 'rhino', name: '코뿔소' },
]);
export const PET_SPECIES = Object.freeze(BASE_ANIMALS.map(row => ({ id: row.id.replace('animal-', ''), name: row.name })).concat(PET_RARE_SPECIES, [{ id: 'yeongnyangi', name: '영냥이' }]));
export const PET_RARE_CHANCE = 0.01;
export const PET_CARE_HONEY = 1;
export const PET_AFFECTION_GAIN = 5;
// Fur color now follows the real natal element, rather than a random trait.
export const PET_VARIANTS = Object.freeze({ pattern: 4, expression: 6, accessory: 8 });
export const PET_ELEMENT_COATS = Object.freeze({ 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' });
export const PET_COMBINATIONS_PER_SPECIES = Object.values(PET_VARIANTS).reduce((total, count) => total * count, 1);
const pad = value => String(value).padStart(2, '0');

export function petBirthInput(profile) {
  const birth = profile?.birth || {}, place = profile?.location || {};
  return {
    birthDate: birth.year && birth.month && birth.day ? `${birth.year}-${pad(birth.month)}-${pad(birth.day)}` : '',
    birthTime: birth.hour != null && birth.minute != null ? `${pad(birth.hour)}:${pad(birth.minute)}` : '',
    birthTimeUnknown: birth.timeUnknown === true || profile?.birthTimeUnknown === true,
    gender: profile?.gender || profile?.sex || '', calendarType: birth.calType || 'solar',
    ...(place.tz && place.lng != null ? { birthPlace: { longitude: Number(place.lng), latitude: Number(place.lat), timezone: place.tz } } : {}),
  };
}

// Randomness is supplied by the server; the browser only renders the stored traits.
export function rollPetTraits(random) {
  const pick = count => Math.floor(random() * count);
  const rareSpecies = random() < PET_RARE_CHANCE ? PET_RARE_SPECIES[pick(PET_RARE_SPECIES.length)].id : null;
  return { rareSpecies, ...Object.fromEntries(Object.entries(PET_VARIANTS).map(([key, count]) => [key, pick(count)])) };
}
export function petIdentity(traits, character, exclusiveSpecies = null) {
  const speciesId = exclusiveSpecies || traits.rareSpecies || character.id.replace('animal-', '');
  const species = PET_SPECIES.find(row => row.id === speciesId);
  return { speciesId, name: species?.name || character.name, rare: Boolean(traits.rareSpecies) && !exclusiveSpecies,
    unique: Boolean(exclusiveSpecies), coat: exclusiveSpecies || traits.rareSpecies ? 'natural' : PET_ELEMENT_COATS[character.element] };
}
export function petArtUrl(speciesId, layer = 'body') {
  if (!PET_SPECIES.some(row => row.id === speciesId) || !['body', 'sleep'].includes(layer)) return '';
  return `/assets/profile-pets/${PET_ART_VERSION}/${speciesId}-${layer}.webp`;
}
export function petReaction(affection, action = 'idle') {
  const close = affection >= 70, familiar = affection >= 30;
  if (action === 'feed') return close ? '익숙한 손길을 알아보고, 맛있게 한 입 먹어요.' : '한 입 먹고 나니 마음도 조금 가까워졌어요.';
  if (action === 'play') return close ? '함께 노는 시간이 제일 기다려진대요.' : '작은 장난에 어느새 마음을 열고 있어요.';
  return close ? '오늘도 당신이 올 줄 알았다는 듯 반겨요.' : familiar ? '당신의 발걸음을 알아보고 고개를 들어요.' : '천천히 알아가도 좋아요. 오늘부터 함께해요.';
}
