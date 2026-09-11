const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

// 🔴 두 화면이 각자 body.style.overflow 를 스냅샷·복원하면, 결제 대기 화면이 먼저 열리고
//    먼저 닫힐 때 코덱스 오버레이가 언마운트되며 "hidden" 을 되살린다. 그 결과 마스터 인연의 서
//    결과 화면이 모바일에서 전혀 스크롤되지 않았다. 둘 다 참조 카운트 공용 락만 쓰게 한다.
const OWNERS = [
  "src/features/master-love-codex/components/CodexShell.tsx",
  "app/components/common/PaymentLoading.tsx",
];

for (const owner of OWNERS) {
  test(`${owner} 는 공용 바디 스크롤 락만 쓴다`, () => {
    const source = read(owner);
    assert.ok(source.includes('from "@/app/_lib/body-scroll-lock"'), `${owner} 가 body-scroll-lock 을 쓰지 않는다`);
    assert.ok(!/body\.style\.overflow/.test(source), `${owner} 가 body.style.overflow 를 직접 만진다`);
  });
}
