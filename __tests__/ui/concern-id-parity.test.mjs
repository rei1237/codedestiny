import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOME_CONCERNS} from '../../lib/marketing/home-concerns.mjs';

// HOME_CONCERNS 의 id 는 classic 스크립트(import 불가) 세 곳에 복사돼 있다. 여섯 번째 고민을 더할 때 한 곳이 빠지면
// 로그인 복귀 게이트·분석 이벤트·홈 칩에서 조용히 사라지므로, 소스에서 목록을 뽑아 정본과 맞춘다.
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const canonical = HOME_CONCERNS.map(concern => concern.id).sort();
const quoted = body => [...body.matchAll(/'([a-z]+)'/g)].map(match => match[1]);

test('고민 id 허용 목록: 로그인 복귀 게이트가 HOME_CONCERNS 와 같다', () => {
  const body = read('js/core/index-inline-runtime.js').match(/var __CD_GATE_CONCERN_IDS = \{([^}]*)\}/)?.[1];
  assert.ok(body, '__CD_GATE_CONCERN_IDS 선언');
  const ids = [...body.matchAll(/([a-z]+)\s*:\s*true/g)].map(match => match[1]).sort();
  assert.deepEqual(ids, canonical);
});

test('고민 id 허용 목록: 분석 CONCERN_IDS 가 HOME_CONCERNS 와 같다', () => {
  const body = read('js/core/analytics.js').match(/var CONCERN_IDS = \[([^\]]*)\]/)?.[1];
  assert.ok(body, 'CONCERN_IDS 선언');
  assert.deepEqual(quoted(body).sort(), canonical);
});

test('고민 id 허용 목록: 꿀꿀 홈 칩 CONCERN_IDS 가 HOME_CONCERNS 와 같다', () => {
  const body = read('js/core/yehwa-home.mjs').match(/const CONCERN_IDS = new Set\(\[([^\]]*)\]\)/)?.[1];
  assert.ok(body, 'CONCERN_IDS 선언');
  assert.deepEqual(quoted(body).sort(), canonical);
});
