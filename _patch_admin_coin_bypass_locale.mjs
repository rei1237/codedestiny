/**
 * 로케일 index.html 관리자 코인 bypass 패치
 * _cdRunPerUseCoinGate에 isAdminUser() 체크 추가
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OLD_BLOCK = `      // 프리미엄 구독 플랜 보유자: 코인 차감 없이 즉시 실행
      try {
        var _subUser = readAuthUser();
        var _subPlan = (_subUser && _subUser.plan) ? String(_subUser.plan) : '';
        if (_subPlan === 'unlimited' || _subPlan === 'premium') {
          sessionStorage.setItem('cd_pa_' + action, '1');
          _cdInvokeActionDirect(action, actionNode);
          return;
        }
      } catch (_subErr) {}`;

const NEW_BLOCK = `      // 관리자 모드: 코인 차감 없이 즉시 실행
      try {
        if (isAdminUser()) {
          sessionStorage.setItem('cd_pa_' + action, '1');
          _cdInvokeActionDirect(action, actionNode);
          return;
        }
      } catch (_adminErr) {}
      // 프리미엄 구독 플랜 보유자: 코인 차감 없이 즉시 실행
      try {
        var _subUser = readAuthUser();
        var _subPlan = (_subUser && _subUser.plan) ? String(_subUser.plan) : '';
        if (_subPlan === 'unlimited' || _subPlan === 'premium') {
          sessionStorage.setItem('cd_pa_' + action, '1');
          _cdInvokeActionDirect(action, actionNode);
          return;
        }
      } catch (_subErr) {}`;

const targets = [
  'public/zh-cn/index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/hi-in/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/nl-nl/index.html',
  'public/static/index.html',
];

let patched = 0;
let skipped = 0;
let errors = 0;

for (const rel of targets) {
  const full = path.join(__dirname, rel);
  if (!fs.existsSync(full)) { console.log(`[SKIP not found] ${rel}`); skipped++; continue; }
  const src = fs.readFileSync(full, 'utf8');
  if (!src.includes(OLD_BLOCK)) {
    if (src.includes('관리자 모드: 코인 차감 없이 즉시 실행')) {
      console.log(`[ALREADY] ${rel}`);
    } else {
      console.log(`[NO MATCH] ${rel}`);
    }
    skipped++;
    continue;
  }
  const result = src.replace(OLD_BLOCK, NEW_BLOCK);
  if (result === src) { console.log(`[NO CHANGE] ${rel}`); skipped++; continue; }
  fs.writeFileSync(full, result, 'utf8');
  console.log(`[PATCHED] ${rel}`);
  patched++;
}

console.log(`\n완료: ${patched}개 패치, ${skipped}개 스킨, ${errors}개 오류`);
