import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {entryCuts} from '../../lib/brand/entry-webtoon.mjs';

// 진입 웹툰 그림: 컷마다 640/1080 AVIF + 720 WebP, 첫 컷은 가볍게, 출처 원장은 컷 id와 1:1, 사자 네오 시트는 참조 금지.
const root = new URL('../../', import.meta.url);
const file = rel => fileURLToPath(new URL(rel, root));
const imageCuts = entryCuts().filter(c => c.kind === 'image');
const ledger = JSON.parse(fs.readFileSync(file('docs/design/entry-webtoon-assets.json'), 'utf8'));
const variants = id => ({avif640: `public/images/entry-webtoon/${id}-640.avif`, avif1080: `public/images/entry-webtoon/${id}-1080.avif`, webp720: `public/images/entry-webtoon/${id}-720.webp`});

test('entry webtoon assets: 이미지 컷마다 세 파일이 있다', () => {
  assert.equal(imageCuts.length, 14);
  for (const cut of imageCuts) for (const [k, rel] of Object.entries(variants(cut.id))) {
    assert.ok(fs.existsSync(file(rel)) && fs.statSync(file(rel)).size > 0, `${cut.id} ${k}`);
  }
});

test('entry webtoon assets: 첫 이미지 컷은 -640.avif, -720.webp 각각 200KB 이하', () => {
  const v = variants(imageCuts[0].id);
  assert.ok(fs.statSync(file(v.avif640)).size <= 200 * 1024, 'avif640');
  assert.ok(fs.statSync(file(v.webp720)).size <= 200 * 1024, 'webp720');
});

test('entry webtoon assets: 원장 id 집합 = 이미지 컷 id 집합, 필드와 바이트 일치', () => {
  assert.deepEqual(ledger.map(e => e.id).sort(), imageCuts.map(c => c.id).sort());
  for (const e of ledger) {
    assert.equal(e.model, 'gpt-image-2');
    assert.equal(e.approvedBy, 'user');
    assert.ok(e.prompt.trim() && !Number.isNaN(Date.parse(e.generatedAt)), `${e.id} prompt/generatedAt`);
    assert.ok(Array.isArray(e.references), `${e.id} references`);
    for (const [k, rel] of Object.entries(variants(e.id))) assert.equal(e.bytes[k], fs.statSync(file(rel)).size, `${e.id} bytes.${k}`);
  }
});

test('entry webtoon assets: 컷 w/h는 내보낸 가장 큰 그림의 비율과 같다', async () => {
  const sharp = (await import('sharp')).default;
  for (const cut of imageCuts) {
    const m = await sharp(file(variants(cut.id).avif1080)).metadata();
    assert.deepEqual([cut.image.w, cut.image.h], [m.width, m.height], cut.id);
  }
});

test('entry webtoon assets: 원장 references에 사자 네오 시트 경로가 없다', () => {
  for (const e of ledger) for (const ref of e.references) {
    assert.ok(!/lion|사자/i.test(ref), `${e.id}: ${ref}`);
    assert.ok(!/네오\s?프로필[12]/.test(ref), `${e.id}: ${ref}`);
  }
});
