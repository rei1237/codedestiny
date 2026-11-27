import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The root error screen can render before (or without) the dictionary. It must show the Korean
// source copy then, not the "번역을 준비 중입니다" placeholder, and that copy must stay equal to ko.json.
test('root error boundary keeps Korean source copy equal to ko.json', () => {
  const source = readFileSync('app/error.tsx', 'utf8');
  assert.doesNotMatch(source, /\buseT\(/);
  assert.match(source, /useTPick\(undefined, "ko"\)/);
  const ko = JSON.parse(readFileSync('public/i18n/ko.json', 'utf8')).errorBoundary;
  for (const [key, value] of Object.entries(ko)) {
    assert.ok(source.includes(`${key}: ${JSON.stringify(value)}`), `KO.${key} must match ko.json`);
  }
  for (const key of Object.keys(ko)) assert.ok(source.includes(`t("errorBoundary.${key}")`), `errorBoundary.${key} must be rendered`);
});
