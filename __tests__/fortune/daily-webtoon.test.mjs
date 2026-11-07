import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadTsModule } from '../../scripts/lib/load-ts-module.mjs';

const { buildDailyWebtoon, firstSentence } = loadTsModule('lib/fortune/daily-webtoon.ts');
const { resolveSlotArt, DAILY_WEBTOON_SLOTS } = loadTsModule('lib/fortune/daily-webtoon-slots.ts');
const { getSignProfile } = loadTsModule('lib/fortune/sign-profiles.ts');
const { animalDayRelation, zodiacDayRelation } = loadTsModule('lib/fortune/day-relation.ts');
const { computeSignScore } = loadTsModule('lib/fortune/fortune-score.ts');
const { dailyTarotReading } = loadTsModule('lib/tarot/yeongnyangi-daily-card.ts');

const box = (kr) => ({ kr });
const ENTRY = {
  keyword: box('풍요·나눔'),
  score: { overall: 5, love: 5, money: 5, health: 5, work: 5 },
  lucky: { color_kr: '피치', number: 12 },
  sections: {
    overall: box('나눔이 복으로 돌아오는 날이에요. 작은 선물이 마음을 부드럽게 합니다.'),
    love: box('서운함은 쌓아 두지 말고 가장 작은 조각부터 꺼내 보세요.'),
    money: box('버는 쪽보다 새는 쪽을 먼저 보세요. 구독 목록 한 번이면 충분합니다.'),
    health: box('몸이 보내는 작은 신호를 미루지 마세요. 오늘의 10분이 다음 주를 아낍니다.'),
    work: box('회의 전에 결론을 한 문장으로 정해 두면 시간이 절반으로 줄어요.'),
    advice: box('꿀꿀 연이: 오늘은 잘하려는 마음보다 끝내려는 마음이 당신을 지켜 줘요.'),
  },
};

function input(signId, dateKey = '2026-11-08', ilchin = '丙戌', period = 'today') {
  const profile = getSignProfile(signId);
  const sky = { ilchin, moonSign: 'Scorpio', moonPhase: 'New moon / 신월' };
  const score = computeSignScore(profile, { ganji: ilchin, moonPhase: sky.moonPhase, moonSign: sky.moonSign, ymd: dateKey });
  const relation = profile.kind === 'animal' ? animalDayRelation(profile.id, ilchin) : zodiacDayRelation(profile, dateKey, sky.moonSign);
  return { period, dateKey, profile, entry: ENTRY, score, basis: score.basis, relation, sky };
}

const text = (cut) => cut.lines.map((line) => line.text).join(' ');
const speakers = (cut) => cut.lines.map((line) => line.speaker).filter(Boolean);

test('seven cuts: narration opening with the keyword, Yeoni closing with the overall score', () => {
  const vm = input('pig');
  const toon = buildDailyWebtoon(vm);
  assert.equal(toon.cuts.length, 7);
  assert.deepEqual(speakers(toon.cuts[0]), []);
  assert.match(text(toon.cuts[0]), /풍요·나눔/);
  assert.match(text(toon.cuts[0]), /돼지띠/);
  assert.deepEqual(speakers(toon.cuts[6]), ['연이']);
  assert.match(text(toon.cuts[6]), new RegExp(`${vm.score.overall}점`));
  assert.ok(!text(toon.cuts[6]).includes('꿀꿀 연이:'), 'advice label is stripped');
  assert.match(toon.heading, /돼지띠/);
  assert.match(toon.note, /예화/);
});

test('every system cut carries its own speaker and real value', () => {
  const vm = input('pig');
  const toon = buildDailyWebtoon(vm);
  const bySpeaker = (name) => toon.cuts.find((cut) => speakers(cut)[0] === name);
  assert.match(text(bySpeaker('네오')), new RegExp(vm.relation.badge.replace(/[()]/g, '\\$&')));
  assert.match(text(bySpeaker('네오')), /丙戌/);
  assert.match(text(bySpeaker('윤달')), /전갈자리/);
  assert.match(text(bySpeaker('윤달')), /신월/);
  const card = dailyTarotReading('2026-11-08', 'fortune-sign:pig');
  assert.match(text(bySpeaker('연이')), new RegExp(card.cardName));
  assert.match(text(bySpeaker('무성')), new RegExp(`애정 ${vm.score.love}`));
  assert.match(text(bySpeaker('서한비')), /피치/);
  assert.ok(!/Scorpio|Virgo|Aries/.test(toon.cuts.map(text).join(' ')), 'no latin sign names');
});

test('zodiac pages never borrow animal branch relations in the saju cut', () => {
  for (const id of ['aries', 'scorpio', 'pisces']) {
    const toon = buildDailyWebtoon(input(id));
    const neo = toon.cuts.find((cut) => speakers(cut)[0] === '네오');
    assert.ok(!/삼합|충|비화/.test(text(neo)), `${id}: ${text(neo)}`);
    assert.match(text(neo), new RegExp(getSignProfile(id).nameKo));
  }
});

test('missing relation or element basis still yields seven cuts', () => {
  const vm = { ...input('pig'), relation: null, basis: [] };
  assert.equal(buildDailyWebtoon(vm).cuts.length, 7);
});

test('tomorrow speaks of 내일', () => {
  const toon = buildDailyWebtoon(input('rat', '2026-11-09', '丁亥', 'tomorrow'));
  assert.match(text(toon.cuts[0]), /내일/);
});

test('the same sign looks different across days', () => {
  const looks = new Set();
  for (let day = 1; day <= 30; day += 1) {
    const dateKey = `2026-11-${String(day).padStart(2, '0')}`;
    const toon = buildDailyWebtoon(input('tiger', dateKey));
    looks.add(toon.cuts.map((cut) => cut.src).join('|'));
  }
  assert.ok(looks.size >= 10, `only ${looks.size} looks in 30 days`);
});

test('every slot candidate points at an existing cut image', () => {
  for (const [slot, candidates] of Object.entries(DAILY_WEBTOON_SLOTS)) {
    for (let index = 0; index < candidates.length * 4; index += 1) {
      const art = resolveSlotArt(slot, `seed-${index}`);
      assert.ok(existsSync(join(process.cwd(), 'public', `${art.src}-${art.fallback}.webp`)), `${slot} ${art.src}`);
      assert.ok(art.alt.length > 0);
    }
  }
  assert.throws(() => resolveSlotArt('missing-slot', 'x'));
});

test('firstSentence keeps a sentence without a final stop', () => {
  assert.equal(firstSentence('하나. 둘.'), '하나.');
  assert.equal(firstSentence('마침표 없는 문장'), '마침표 없는 문장');
  assert.equal(firstSentence(''), '');
});
