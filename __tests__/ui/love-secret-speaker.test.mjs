import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {LOVE_SECRET_AI_GROUPS, LOVE_SPEAKER_BY_GROUP} from '../../worker/lib/love-secret-ai-prompt.js';

const bundle=await build({entryPoints:['app/love-secret-ai/result/love-secret-sections.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {resolveLoveSpeaker}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
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
