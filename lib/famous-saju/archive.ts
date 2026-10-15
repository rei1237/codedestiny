import { getPublicProfile } from "./public-profiles";
import { isProfilePublished } from './profile-publication';
import { celebritySajuSeeds } from './celebrity-data';
import { calculateFamousSaju } from './celebrity-saju-service';
import { getCelebrityEditorial } from './celebrity-editorial';

import { ILJU } from './cycle';

const occupationOverrides: Record<string,string[]> = {
 'grace-hopper':['과학자·발명가'],'alan-turing':['과학자·발명가'],'katherine-johnson':['과학자·발명가'],
 'oprah-winfrey':['방송·미디어','기업인'],'miyazaki-hayao':['감독·작가'],'murakami-haruki':['감독·작가'],'akutagawa-ryunosuke':['감독·작가'],'osamu-tezuka':['감독·작가','예술가·사상가'],'otani-shohei':['스포츠'],'hanyu-yuzuru':['스포츠'],'jackie-chan':['배우','감독·작가'],'jet-li':['배우'],'zhang-ziyi':['배우'],'gong-li':['배우'],'tony-leung':['배우'],'marilyn-monroe':['배우'],'takeshi-kitano':['배우','감독·작가'],'bruce-lee':['배우'],'toyotomi-hideyoshi':['역사 인물','공적 정치 인물'],'akira-kurosawa':['감독·작가']
};
function fields(category: string, tags: string[], slug: string) {
  const profile = getPublicProfile(slug);
  if (profile) return profile.fields;
  if (occupationOverrides[slug]) return occupationOverrides[slug];
  const values = new Set<string>();
  if (category === '배우' || tags.includes('연기')) values.add('배우');
  if (['가수','K-스타'].includes(category) || tags.some(t => /노래|아이돌|음악|보컬|팝|랩/.test(t))) values.add('가수·아이돌');
  const map: Record<string,string> = {'스포츠':'스포츠','기업인':'기업인','감독·작가':'감독·작가','사상가·예술가':'예술가·사상가','역사 위인':'역사 인물','왕족·정치인':'공적 정치 인물'};
  if (map[category]) values.add(map[category]);
  if (tags.some(t => /과학|물리|발명/.test(t))) values.add('과학자·발명가');
  return values.size ? [...values] : ['분야 확인 중'];
}

export function getFamousArchive() {
  return celebritySajuSeeds.filter(p => p.published).map(person => {
    const editorial = getCelebrityEditorial(person.slug);
    const profile = getPublicProfile(person.slug);
    const sources = editorial?.sources || profile?.sources || [];
    // A stored time without a field-specific source is NOT a verified birth time.
    const chart = calculateFamousSaju({ ...person, birthTime: null, isBirthTimeKnown: false, birthTimeStatus: 'unknown' });
    const calculated = chart.saju?.pillars.day.ganji || null;
    const pillar = ILJU.find(x => x.name === calculated);
    const uncertain = !pillar || person.isHistoricalDateUncertain || person.birthCalendar !== 'solar'
      || person.country !== 'KR' || !editorial?.sources?.length;
    return {
      id: person.id, slug: person.slug, name: person.nameKo,
      sourceRecord: { birthDate:person.birthDate, originalCalendar:person.isHistoricalDateUncertain || profile?.calendarVerification === 'pending' ? 'unverified' : person.birthCalendar, leapMonth:null, birthPlace:profile?.birthPlace || person.birthPlace, timeZone:null, reportedBirthTime:person.reportedBirthTime || null,
        birthSources:sources.filter(x=>/생년월일|출생/.test(x.label)), activitySources:sources.filter(x=>!/생년월일|출생/.test(x.label)) },
      calculation: { method:'localSajuCalculator', build:process.env.NEXT_PUBLIC_GIT_SHA || 'development', dayCandidates:pillar ? [pillar.name,ILJU[(ILJU.indexOf(pillar)+1)%60].name] : [], boundaryStatus:'birth_time_unknown' },
      aliases: [...new Set([person.nameEn || '', ...person.aliases, ...person.tags])], fields: fields(person.category, person.tags, person.slug),
      country: person.country || '', birthDate: person.birthDate, birthTime: null,
      dayPillar: pillar?.name || null, stem: pillar?.stem || null,
      classification: 'needs_review',
      dateSourceStatus: uncertain ? 'needs_review' : 'source_linked',
      classificationNote: uncertain ? '출처·역법·현지 날짜 확인 중' : '출처 연결 · 출생시각과 자시 경계 미확인',
      cover: `/images/saju/nature/${pillar?.image || 'winter'}-480.webp`,
      intro: editorial?.hook || profile?.intro || `${person.tags.slice(0, 3).join(' · ')}을 주제로 ${person.nameKo}의 공개 이력과 명식을 읽습니다. 고유 원고 검토 중입니다.`,
      reviewed: Boolean(editorial?.reviewedAt), publicationApproved: isProfilePublished(profile), sources,
      month: chart.saju?.pillars.month.ganji || null,
    };
  });
}
export type ArchivePerson = ReturnType<typeof getFamousArchive>[number];
