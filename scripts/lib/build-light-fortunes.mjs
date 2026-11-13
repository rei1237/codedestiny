#!/usr/bin/env node
// 라이트 운세 판매 목록을 화면용 JSON으로 뽑는다.
// lib/marketing/pass-benefits.mjs 는 앱 번들에도 들어가므로 결제 레지스트리를 직접 읽지 않고 이 파일만 읽는다.
//
//   node scripts/lib/build-light-fortunes.mjs           다시 쓰기
//   node scripts/lib/build-light-fortunes.mjs --check   커밋된 파일이 낡았으면 실패
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIGHT_FORTUNE_FEATURE_KEYS } from '../../worker/lib/light-fortune-catalog.js';
import { resolveProduct } from '../../worker/payments/catalog.js';
import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';

const OUTPUT = fileURLToPath(new URL('../../lib/payment/light-fortunes.generated.json', import.meta.url));

// 결제 라벨은 영수증·내부 기록용이다. 고객 목록에 그대로 보이면 어색한 것만 고친다.
const NAME_OVERRIDES = {
  'flower-fc': '운명의 꽃 아틀리에 전체 해석',
  'olympus-fc': '올림포스 신탁 프로필 해석',
  'nakshatra-basic-reading': '나크샤트라 기본 해석',
};

export function customerName(featureKey, label) {
  if (NAME_OVERRIDES[featureKey]) return NAME_OVERRIDES[featureKey];
  return label
    .replace(/ 티저 해석$/, ' 해석')
    .replace(/ 1회 (이용|분석|생성)$/, '')
    .replace(/ (생성|해금|잠금 해제)$/, '');
}

function onSaleProduct(featureKey) {
  try {
    const product = resolveProduct({ featureKey });
    return product.lightFortune === true ? product : null;
  } catch (error) {
    if (error?.code === 'PRODUCT_NOT_FOUND') return null;
    throw error;
  }
}

/** @returns {{count:number, valueKRW:number, freeCount:number, paidValueKRW:number, keys:string[], labels:Record<string,string>}} */
export function buildLightFortunes() {
  const collator = new Intl.Collator('ko');
  const rows = LIGHT_FORTUNE_FEATURE_KEYS
    .map((key) => [key, onSaleProduct(key)])
    .filter(([, product]) => product)
    .map(([key, product]) => ({ key, name: customerName(key, product.label), price: product.priceKRW }))
    .sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.key, b.key));
  const paid = rows.filter((row) => !isFreeFortuneFeatureKey(row.key));
  return {
    count: rows.length,
    valueKRW: rows.reduce((sum, row) => sum + row.price, 0),
    // 화면의 "상당" 금액은 paidValueKRW 만 쓴다. 지금 무료로 열린 운세(free-fortune-policy)는 유료 가치로 세지 않는다.
    freeCount: rows.length - paid.length,
    paidValueKRW: paid.reduce((sum, row) => sum + row.price, 0),
    keys: rows.map((row) => row.key),
    labels: Object.fromEntries(rows.map((row) => [row.key, row.name])),
  };
}

function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const next = JSON.stringify(buildLightFortunes(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const current = readFileSync(OUTPUT, 'utf8').replace(/\r\n/g, '\n');
    if (current !== next) {
      console.error('lib/payment/light-fortunes.generated.json 이 낡았습니다. node scripts/lib/build-light-fortunes.mjs 로 다시 만드세요.');
      process.exit(1);
    }
    console.log('light fortunes: fresh');
  } else {
    writeFileSync(OUTPUT, next);
    console.log('light fortunes: written');
  }
}
