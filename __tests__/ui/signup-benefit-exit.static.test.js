const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('첫 가입 이탈 혜택은 실제 월정석 정책을 정확히 안내한다', () => {
  const source = read('js/signup-benefit-exit.js');
  assert.match(source, /signupBenefitPolicy.amount/);
  assert.match(source, /상품별 월정석 차감량은 달라요/);
  assert.match(source, /signupBenefitPolicy.days/);
  assert.match(source, /현금 쿠폰이 아니며 이용권 구매에는 쓸 수 없어요/);
  assert.doesNotMatch(source, /5,000원 할인 쿠폰/);
});

test('가입 혜택 선택지는 유지하고 뒤로가기에 새 팝업을 끼워 넣지 않는다', () => {
  const source = read('js/signup-benefit-exit.js');
  const staticBack = read('js/mobile-backstack-navigation.js');
  const nativeBridge = read('scripts/app-native-bridge.js');
  const shell = read('index.html');

  assert.match(source, /aria-modal=\"true\"/);
  assert.match(source, /aria-labelledby=\"cdSignupBenefitExitTitle\"/);
  assert.match(source, /document\.querySelector\('#authQuickLinks \.auth-btn--signup'\)/);
  assert.match(source, /cd_signup_benefit_exit_hide_until_v1/);
  assert.match(source, /setHours\(24, 0, 0, 0\)/);
  assert.match(source, /카카오로 가입하기/);
  assert.match(source, /이메일로 가입하기/);
  assert.match(source, /그냥 종료하기/);
  assert.match(source, /오늘 하루 보지 않기/);
  assert.doesNotMatch(staticBack, /__cdSignupBenefitExit\.open/);
  assert.doesNotMatch(nativeBridge, /__cdSignupBenefitExit\.open/);
  assert.match(shell, /\/js\/signup-benefit-exit\.js\?v=/);
});
