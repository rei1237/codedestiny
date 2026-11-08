import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {LOVE_SECRET_AI_GROUPS, LOVE_SECRET_AI_GROUPS_V1, LOVE_SECRET_AI_SECTION_TITLES, LOVE_SPEAKER_BY_GROUP} from '../../worker/lib/love-secret-ai-prompt.js';

const bundle=await build({entryPoints:['app/love-secret-ai/result/love-secret-sections.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {resolveLoveSpeaker, groupLoveSections, loveChapterKicker, splitLoveSecretAnswerByTitles, LOVE_SECRET_CHAPTER_GROUPS, LOVE_SECRET_SECTION_TITLES, LOVE_SECRET_SECTION_TITLES_V1}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const profilesBundle=await build({entryPoints:['components/fortune/master-profiles.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {masterProfiles}=await import(`data:text/javascript;base64,${Buffer.from(profilesBundle.outputFiles[0].text).toString('base64')}`);

test('결과 화면의 화자 칩은 백엔드가 그 부를 맡긴 상담자와 같다', () => {
  for (const group of LOVE_SECRET_AI_GROUPS) {
    for (const {title} of group.sections) assert.equal(resolveLoveSpeaker(title), LOVE_SPEAKER_BY_GROUP[group.key], title);
  }
});

test('모르는 제목은 진행자인 연이에게 돌아간다', () => {
  assert.equal(resolveLoveSpeaker(''), 'yeoni');
  assert.equal(resolveLoveSpeaker('추가 조언'), 'yeoni');
});

test('소개장의 "맡는 부분"은 백엔드가 그 마스터에게 맡긴 부와 같다', () => {
  for (const [speaker, profile] of Object.entries({yeoni: masterProfiles.yeoniLove, hanbi: masterProfiles.hanbiLove})) {
    const scope = profile.dossier.find((row) => row.label === '이 상담에서 맡는 부분').text;
    for (const group of LOVE_SECRET_AI_GROUPS) {
      assert.equal(scope.includes(group.label), LOVE_SPEAKER_BY_GROUP[group.key] === speaker, `${speaker} · ${group.label}`);
    }
  }
});

test('장 메타 표(제목·순서·부 이름·화자)는 워커 V2 그룹 계획과 같다', () => {
  assert.deepEqual(
    LOVE_SECRET_CHAPTER_GROUPS.map((group) => ({key: group.key, label: group.label, speaker: group.speaker, titles: [...group.titles]})),
    LOVE_SECRET_AI_GROUPS.map((group) => ({key: group.key, label: group.label, speaker: LOVE_SPEAKER_BY_GROUP[group.key], titles: group.sections.map((section) => section.title)})),
  );
  assert.deepEqual([...LOVE_SECRET_SECTION_TITLES], [...LOVE_SECRET_AI_SECTION_TITLES]);
  assert.deepEqual([...LOVE_SECRET_SECTION_TITLES_V1], LOVE_SECRET_AI_GROUPS_V1.flatMap((group) => group.sections.map((section) => section.title)));
});

test('타고난 연애 기질 두 장은 맨 앞의 강조 카드로 모이고, 예전 28장 상담에는 그 카드가 없다', () => {
  const sections = LOVE_SECRET_SECTION_TITLES.map((title) => ({title, body: '본문'}));
  const groups = groupLoveSections(sections);
  assert.equal(groups[0].spec.id, 'nature');
  assert.deepEqual(groups[0].sections.map((section) => section.title), LOVE_SECRET_AI_GROUPS[0].sections.map((section) => section.title));
  const legacy = groupLoveSections(LOVE_SECRET_SECTION_TITLES_V1.map((title) => ({title, body: '본문'})));
  assert.equal(legacy.some((group) => group.spec.id === 'nature'), false);
  assert.equal(loveChapterKicker('상대의 기운과 감정 거리감'), '상대·궁합·이상형');
});

test('보관함 본문은 알려진 제목으로 다시 나뉘고 글자를 잃지 않는다', () => {
  const sections = LOVE_SECRET_SECTION_TITLES.slice(0, 4).map((title, index) => ({title, body: `${index}번째 장 첫 문단.\n\n둘째 문단에도 ${title.slice(0, 4)}이 나온다.`}));
  const answer = sections.map((section) => `${section.title}\n${section.body}`).join('\n\n');
  assert.deepEqual(splitLoveSecretAnswerByTitles(answer), sections);
  assert.deepEqual(splitLoveSecretAnswerByTitles(`머리말\n\n${answer}`)[0].body, `머리말\n\n${sections[0].body}`);
});
