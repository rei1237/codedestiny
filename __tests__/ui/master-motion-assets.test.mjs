import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { MASTER_SPRITE_SHEETS } from '../../lib/master-motion/flags.mjs';
import { MASTER_MOTION_BUDGETS, MASTER_MOTION_FRAME_MS, MASTER_MOTION_MAX_FRAMES, MASTER_MOTION_MIN_FRAMES, MASTER_MOTION_SHEETS, masterMotionArt } from '../../lib/master-motion/sheets.mjs';

// 마스터 스프라이트 시트(F) — 매니페스트·용량·크기·플래그·CSS 계약. 규격: docs/design/master-motion-assets.md
const ROOT = 'public/images/master-motion';
const dirs = existsSync(ROOT) ? readdirSync(ROOT).filter((name) => statSync(join(ROOT, name)).isDirectory()) : [];
const fileOf = (url) => join('public', url.replace(/^\//, ''));

test('every master-motion folder ships manifest.json and provenance.json', () => {
  for (const id of dirs) {
    assert.ok(existsSync(join(ROOT, id, 'manifest.json')), `${id}/manifest.json`);
    const provenance = JSON.parse(readFileSync(join(ROOT, id, 'provenance.json'), 'utf8'));
    assert.equal(provenance.id, id);
    assert.ok(provenance.base?.sha256 && provenance.sources && Object.keys(provenance.sources).length, `${id} provenance names its base and sources`);
  }
});

test('sheets and posters stay within budget and match the declared cell grid', async () => {
  for (const id of dirs) {
    const manifest = JSON.parse(readFileSync(join(ROOT, id, 'manifest.json'), 'utf8'));
    assert.equal(manifest.id, id);
    assert.equal(manifest.frameMs, MASTER_MOTION_FRAME_MS);
    for (const [name, variant] of Object.entries(manifest.variants)) {
      const budget = MASTER_MOTION_BUDGETS[variant.kind];
      assert.ok(budget, `${id}/${name} kind ${variant.kind}`);
      const { sheet } = variant;
      assert.equal(sheet.cols, sheet.frames, `${id}/${name} is one row`);
      assert.ok(sheet.frames >= MASTER_MOTION_MIN_FRAMES && sheet.frames <= MASTER_MOTION_MAX_FRAMES, `${id}/${name} frames ${sheet.frames}`);
      assert.deepEqual(sheet.cell, { width: budget.width, height: budget.height });
      const sheetFile = fileOf(sheet.src), posterFile = fileOf(variant.poster);
      assert.ok(statSync(sheetFile).size <= budget.sheetBytes, `${sheetFile} ${statSync(sheetFile).size}B > ${budget.sheetBytes}B`);
      assert.ok(statSync(posterFile).size <= budget.posterBytes, `${posterFile} ${statSync(posterFile).size}B > ${budget.posterBytes}B`);
      const sheetMeta = await sharp(sheetFile).metadata();
      assert.deepEqual([sheetMeta.width, sheetMeta.height], [sheet.cols * budget.width, budget.height], sheetFile);
      const posterMeta = await sharp(posterFile).metadata();
      assert.deepEqual([posterMeta.width, posterMeta.height], [budget.width, budget.height], posterFile);
    }
  }
});

test('the runtime registry matches the manifests and the flags', () => {
  assert.deepEqual(Object.keys(MASTER_MOTION_SHEETS).sort(), [...dirs].sort(), 'registry ids = asset folders');
  for (const id of Object.keys(MASTER_SPRITE_SHEETS)) assert.ok(MASTER_MOTION_SHEETS[id], `flag ${id} has a registry entry`);
  for (const [id, variants] of Object.entries(MASTER_MOTION_SHEETS)) {
    const manifest = JSON.parse(readFileSync(join(ROOT, id, 'manifest.json'), 'utf8'));
    for (const [name, entry] of Object.entries(variants)) {
      const built = manifest.variants[name];
      assert.ok(built, `${id}/${name} in manifest`);
      assert.deepEqual({ kind: entry.kind, poster: entry.poster, sheet: entry.sheet }, { kind: built.kind, poster: built.poster, sheet: built.sheet });
      assert.equal(masterMotionArt(id, name)?.sheet?.src, MASTER_SPRITE_SHEETS[id] ? built.sheet.src : undefined, `${id}/${name} follows its flag`);
    }
  }
});

test('sheet playback CSS animates transform only, uses steps(), fades .3s and hides under reduced motion', () => {
  const css = readFileSync('app/components/master-motion/MasterMotion.module.css', 'utf8');
  const keyframes = css.match(/@keyframes mmSheet\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(keyframes, 'mmSheet keyframes exist');
  const properties = [...keyframes.matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]);
  assert.ok(properties.length && properties.every((name) => name === 'transform'), `mmSheet animates ${properties}`);
  const sheetRule = css.match(/\.sheet\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  assert.match(sheetRule, /animation:\s*mmSheet[^;]*steps\(var\(--mm-n\)\)/);
  assert.match(css.match(/\.sheetArt\s*\{([\s\S]*?)\}/)?.[1] ?? '', /transition:\s*opacity \.3s/);
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(reduced, /\.art\b[^{]*\{\s*display:\s*none/);
  const tsx = readFileSync('app/components/master-motion/MasterMotion.tsx', 'utf8');
  assert.match(tsx, /useLazySpriteSource\(sheet\?\.src \?\? "", on && Boolean\(sheet\)\)/, 'sheet loads only while the playback gate is open');
});
