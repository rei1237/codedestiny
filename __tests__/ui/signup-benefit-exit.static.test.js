const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('첫 가입 이탈 혜택은 실제 월정석 정책을 정확히 안내한다', () => {
  const source = read('js/signup-benefit-exit.js');
  assert.match(source, /5,000원 상당 혜택/);
  assert.match(source, /월정석 500개/);
  assert.match(source, /30일 동안/);
  assert.match(source, /현금 쿠폰이 아닌 첫 가입 이벤트 월정석/);
  assert.doesNotMatch(source, /5,000원 할인 쿠폰/);
});

test('게스트 종료 팝업은 접근 가능한 선택지와 기존 종료 폴백을 함께 둔다', () => {
  const source = read('js/signup-benefit-exit.js');
  const staticBack = read('js/mobile-backstack-navigation.js');
  const nativeBridge = read('scripts/app-native-bridge.js');
  const shell = read('index.html');

  assert.match(source, /aria-modal=\"true\"/);
  assert.match(source, /aria-labelledby=\"cdSignupBenefitExitTitle\"/);
  assert.match(source, /document\.querySelector\('#authQuickLinks \.auth-btn--signup'\)/);
  assert.match(source, /cd_signup_benefit_exit_hide_until_v1/);
  assert.match(source, /setHours\(24, 0, 0, 0\)/);
  assert.match(source, /혜택 받고 가입하기/);
  assert.match(source, /그냥 종료하기/);
  assert.match(source, /오늘 하루 보지 않기/);
  assert.match(staticBack, /__cdSignupBenefitExit\.open/);
  assert.match(nativeBridge, /__cdSignupBenefitExit\.open/);
  assert.match(shell, /\/js\/signup-benefit-exit\.js\?v=/);
});
