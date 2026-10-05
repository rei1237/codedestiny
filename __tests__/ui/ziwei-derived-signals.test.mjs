import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ZIWEI_BUSINESS_MAX_LINE_CHARS, ZIWEI_BUSINESS_MAX_LINKS, buildZiweiBusinessBasis, formatZiweiBusinessLines,
} from '../../worker/lib/ziwei-derived-signals.js';
import {calculateZiweiAiChart} from '../../worker/lib/ziwei-ai-chart.js';

// 로직 검증용 합성 — 실제 성립 명반 아님. Palace i sits on branch i, so the facing palace is i+6. An empty stem flies nothing.
const NAMES = ['명궁','형제궁','부부궁','자녀궁','재백궁','질액궁','천이궁','노복궁','관록궁','전택궁','복덕궁','부모궁'];
const chart = (over = {}) => NAMES.map((name, i) => ({name, branchIndex:i, stem:'', mainStars:[], assistantStars:[], maleficStars:[], transformations:[], ...over[name]}));

test('사업운 줄: 역할 1줄 뒤에 궁 사이 연결을 생년사화보다 먼저, 연결은 최대 4줄', () => {
  // 생년사화 넷이 먼저 쌓이고 그 뒤에 재백궁 화록→자녀궁, 재백궁 화기→자녀궁(대궁 전택궁 충)이 온다.
  const natal = {재백궁:{stem:'갑', transformations:['화록:무곡','화권:파군']}, 관록궁:{transformations:['화과:무곡','화기:태양']}, 자녀궁:{mainStars:['염정','태양']}};
  const basis = buildZiweiBusinessBasis(chart(natal));
  assert.ok(basis.links.length > ZIWEI_BUSINESS_MAX_LINKS);
  const lines = formatZiweiBusinessLines(basis);
  assert.match(lines[0], /^네 궁의 역할: 재백궁=현금 흐름, 자녀궁=동업·투자·확장/);
  assert.match(lines[1], /재백궁의 화록\(염정\)이 자녀궁으로 들어간다/);
  assert.match(lines[2], /재백궁의 화기\(태양\)가 자녀궁에 들어 대궁 전택궁을 충한다/);
  assert.equal(lines.length, 1 + ZIWEI_BUSINESS_MAX_LINKS);
  assert.ok(lines.slice(3).every(line => line.includes('에 생년 ')));
});

test('연결이 없으면 고정 문장, 시간 미상이면 한계 문장을 마지막 줄로', () => {
  const lines = formatZiweiBusinessLines(buildZiweiBusinessBasis(chart(), true));
  assert.equal(lines.length, 3);
  assert.match(lines[1], /연결이 없다 — 사업운은 각 궁의 별과 강약으로만 읽는다/);
  assert.match(lines[2], /출생 시각을 몰라 정오 기준/);
  assert.deepEqual(formatZiweiBusinessLines(null), []);
  assert.deepEqual(formatZiweiBusinessLines({}), []);
});

test('실제 명반에서도 최대 6줄, 줄당 120자 이하', () => {
  for (let year = 1950; year < 2010; year += 3) for (let month = 1; month <= 12; month += 1) {
    const c = calculateZiweiAiChart({birthDate:`${year}-${String(month).padStart(2, '0')}-15`, birthTime:`${String(month * 2 - 1).padStart(2, '0')}:30`, gender:month % 2 ? 'M' : 'F', calendarType:'solar'});
    const lines = formatZiweiBusinessLines(buildZiweiBusinessBasis(c.palaces, true));
    assert.ok(lines.length >= 3 && lines.length <= 2 + ZIWEI_BUSINESS_MAX_LINKS, `${year}-${month}: ${lines.length} lines`);
    for (const line of lines) assert.ok(line.length <= ZIWEI_BUSINESS_MAX_LINE_CHARS, line);
  }
});
