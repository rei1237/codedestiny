const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

/**
 * 이파점 신탁표 가드.
 *
 * 왜 (2026-08-24): 오두 배열에 항목이 17개였다. 코드는 오펠레의 여덟 표시를 네 개씩 두 다리로
 * 나눠 `O[L]`·`O[R]` 로 읽는데 L·R 은 4비트라 **0~15 만** 나온다. 전통 16 주요 오두에 없는
 * Otua(Otura 의 표기 변형)가 인덱스 12 에 끼어 있어서, 인덱스 16 으로 밀려난 Ofun(오푼)이
 * 절대 나오지 않았다. 결과 번호 계산(L*16 + R + 1 → 1~256)은 처음부터 정확했다.
 *
 * 같은 배열이 두 파일에 복제돼 있어 둘 다 본다 — 한쪽만 고치면 같은 자리에서 다른 오두가
 * 나오는 새 불일치가 생긴다.
 */
const IFA_FILES = ["public/ifa-oracle.html", "ifa_oracle_v2_full.html"];

// 요루바 이파의 주요 오두 열여섯. 순서가 곧 인덱스이며 두 다리의 조합이 16 × 16 = 256 이 된다.
const CANONICAL_ODU = [
  "Ogbe", "Oyeku", "Iwori", "Odi", "Irosun", "Owonrin", "Obara", "Okanran",
  "Ogunda", "Osa", "Ika", "Oturupon", "Otura", "Irete", "Ose", "Ofun",
];

function readOduNames(file) {
  return [...read(file).matchAll(/\{n:"([^"]+)",k:"([^"]+)"/g)].map((match) => match[1]);
}

test("ifa odu table is exactly the sixteen principal odu, in order", () => {
  for (const file of IFA_FILES) {
    const names = readOduNames(file);
    assert.equal(
      names.length,
      16,
      `${file}: 오두가 ${names.length}개다. 4비트 인덱스는 0~15 만 만들므로 16개를 넘으면 넘친 항목은 절대 나오지 않는다.`,
    );
    assert.deepEqual(
      names,
      CANONICAL_ODU,
      `${file}: 오두 이름·순서가 정본과 다르다. 인덱스가 곧 두 다리의 값이라 순서가 바뀌면 결과가 통째로 어긋난다.`,
    );
  }
});

test("ifa reading stays a 16 x 16 = 256 table", () => {
  for (const file of IFA_FILES) {
    const source = read(file);
    // 두 다리를 4비트씩 읽는다.
    assert.match(source, /const L=bits\[0\]\+bits\[1\]\*2\+bits\[2\]\*4\+bits\[3\]\*8/, `${file}: 왼쪽 다리 계산이 바뀌었다`);
    assert.match(source, /const R=bits\[4\]\+bits\[5\]\*2\+bits\[6\]\*4\+bits\[7\]\*8/, `${file}: 오른쪽 다리 계산이 바뀌었다`);
    // 번호는 1~256 이어야 한다.
    assert.match(source, /L\*16\+R\+1/, `${file}: 신탁 번호 계산이 16 × 16 표를 벗어났다`);
  }
});
