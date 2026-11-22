import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { MASTER_SPRITE_SHEETS } from '../../lib/master-motion/flags.mjs';
import { MASTER_MOTION_BUDGETS, MASTER_MOTION_FRAME_MS, MASTER_MOTION_MAX_FRAMES, MASTER_MOTION_MIN_FRAMES, MASTER_MOTION_SHEETS, masterMotionArt, masterMotionPatch } from '../../lib/master-motion/sheets.mjs';

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
      if (variant.kind === 'patch') {
        // 부분 시트: 포스터 없음, 칸 = area(정본 배율), area 는 정본 안, 알파가 있다(눈 밖은 투명).
        const { area, canvas } = variant;
        assert.equal(variant.poster, undefined, `${id}/${name} patch has no poster`);
        assert.deepEqual(sheet.cell, { width: area.width, height: area.height });
        assert.ok(area.width <= budget.maxWidth && area.height <= budget.maxHeight, `${id}/${name} area ${area.width}x${area.height}`);
        assert.ok(area.left >= 0 && area.top >= 0 && area.left + area.width <= canvas.width && area.top + area.height <= canvas.height, `${id}/${name} area inside canvas`);
        const sheetFile = fileOf(sheet.src);
        assert.ok(statSync(sheetFile).size <= budget.sheetBytes, `${sheetFile} ${statSync(sheetFile).size}B > ${budget.sheetBytes}B`);
        const meta = await sharp(sheetFile).metadata();
        assert.deepEqual([meta.width, meta.height, meta.hasAlpha], [sheet.cols * area.width, area.height, true], sheetFile);
        continue;
      }
      assert.deepEqual(sheet.cell, { width: budget.width, height: budget.height });
      const sheetFile = fileOf(sheet.src), posterFile = fileOf(variant.poster);
      assert.ok(statSync(sheetFile).size <= budget.sheetBytes, `${sheetFile} ${statSync(sheetFile).size}B > ${budget.sheetBytes}B`);
      assert.ok(statSync(posterFile).size <= budget.posterBytes, `${posterFile} ${statSync(posterFile).size}B > ${budget.posterBytes}B`);
      const sheetMeta = await sharp(sheetFile).metadata();
      assert.deepEqual([sheetMeta.width, sheetMeta.height], [sheet.cols * budget.width, budget.height], sheetFile);
      if (variant.kind === 'portrait') {
        assert.deepEqual(sheet.mobile.cell, budget.mobileCell);
        const smallFile = fileOf(sheet.mobile.src);
        const smallMeta = await sharp(smallFile).metadata();
        assert.deepEqual([smallMeta.width, smallMeta.height], [sheet.cols * budget.mobileCell.width, budget.mobileCell.height], smallFile);
        assert.equal(variant.mobileSheetBytes, statSync(smallFile).size);
        assert.ok(variant.mobileSheetBytes <= statSync(sheetFile).size / 2, smallFile);
      }
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
      assert.deepEqual({ kind: entry.kind, poster: entry.poster, sheet: entry.sheet, area: entry.area, canvas: entry.canvas }, { kind: built.kind, poster: built.poster, sheet: built.sheet, area: built.area, canvas: built.canvas });
      const lookup = entry.kind === 'patch' ? masterMotionPatch : masterMotionArt;
      const other = entry.kind === 'patch' ? masterMotionArt : masterMotionPatch;
      assert.equal(lookup(id, name)?.sheet?.src, MASTER_SPRITE_SHEETS[id] ? built.sheet.src : undefined, `${id}/${name} follows its flag`);
      assert.equal(other(id, name), undefined, `${id}/${name} is served only by its own helper`);
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
  assert.match(tsx, /on && sheet && source && art \? \([\s\S]*?<PortraitSheet key=\{source.src\}/, 'the image mounts only when playback is allowed');
  assert.match(tsx, /className=\{styles.sheet\} src=\{source.src\}/, 'the selected file is rendered by one image');
  // 부분 시트(patch): 같은 mmSheet·steps, 움직임 줄이기에서 숨김, 재생 허용(on)일 때만 받는다.
  assert.match(css.match(/\.patchRow\s*\{([\s\S]*?)\}/)?.[1] ?? '', /animation:\s*mmSheet[^;]*steps\(var\(--mm-n\)\)/);
  assert.match(reduced, /\.patch\b[^{]*\{\s*display:\s*none/);
  assert.match(tsx, /const on = gate\.canAnimate && !paused && Boolean\(sheet\);[\s\S]{0,200}?useLazySpriteSource\(sheet\?\.src \?\? "", on\)/, 'patch loads only while playback is allowed');
});
