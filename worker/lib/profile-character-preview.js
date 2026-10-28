import { calculateLifeBookAiSaju } from './life-book-ai-saju.js';
import { judgeSajuDayFortune } from './saju-day-fortune.js';
import { ganji, STEM_HANJA, BRANCH_HANJA } from '../../lib/korean-calendar/index.js';
import { hubDay } from '../../lib/fortune/hub-period.mjs';
import { characterForPillar } from '../../js/core/profile-characters.mjs';
import { createHttpError } from './http.js';

export function profileCharacterPreview(body, today = hubDay()) {
  const gender = ({ m: 'male', male: 'male', f: 'female', female: 'female', '남성': 'male', '여성': 'female' })[String(body?.gender || '').toLowerCase()];
  const birthDate = String(body?.birthDate || '');
  const calendarType = body?.calendarType || 'solar';
  const birthTimeUnknown = body?.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? '' : String(body?.birthTime || '');
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const validDate = match && +match[1] >= 1900 && +match[1] <= 2100 && +match[2] >= 1 && +match[2] <= 12 && +match[3] >= 1 && +match[3] <= 31 &&
    (calendarType !== 'solar' || new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])).toISOString().slice(0, 10) === birthDate);
  if (!gender || !validDate || !['solar', 'lunar', 'lunar_leap'].includes(calendarType) || (!birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime))) {
    throw createHttpError(400, '프로필의 생년월일·성별·생시를 확인해 주세요.', { code: 'PROFILE_INCOMPLETE' });
  }
  let natal;
  try {
    natal = calculateLifeBookAiSaju({ birthDate, birthTime, birthTimeUnknown, gender, birthPlace: body?.birthPlace, calendarType: calendarType === 'solar' ? 'solar' : 'lunar', isLeapMonth: calendarType === 'lunar_leap' });
  } catch (error) {
    if (String(error.code || '').startsWith('INVALID_')) throw createHttpError(400, '프로필의 생년정보와 출생지를 확인해 주세요.', { code: 'PROFILE_INCOMPLETE' });
    throw error;
  }
  const character = characterForPillar(natal.dayPillar, gender);
  if (!character) throw createHttpError(422, '일주를 확인하지 못했어요. 프로필을 확인해 주세요.', { code: 'CHARACTER_UNAVAILABLE' });
  const daily = ganji({ ...today, hour: 12, minute: 0 });
  const verdict = daily ? judgeSajuDayFortune(natal, { stem: STEM_HANJA[daily.day.stemIndex], branch: BRANCH_HANJA[daily.day.branchIndex] }) : null;
  return { character, date: `${today.year}-${String(today.month).padStart(2,'0')}-${String(today.day).padStart(2,'0')}`, fortune: verdict ? { headline: verdict.headline, advice: verdict.advice } : null };
}
