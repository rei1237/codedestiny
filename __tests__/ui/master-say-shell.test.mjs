import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { correctLine } from '../../lib/webtoon-result/narrator.mjs';

// 기본 운세(자미두수·숙요·점성술·베다) 마스터 말풍선: 유료 MasterSay 와 같은 문구 규칙, 정본 스프라이트만 쓴다.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = fs.readFileSync(path.join(root, 'js/core/fortune-consultation-ui.js'), 'utf8');
const BANNED = /반드시|무조건|확실|틀림없|100\s*%|박지은/;
const EMOJI = /\p{Extended_Pictographic}/u;

function load(lang = 'ko') {
  const { window } = new JSDOM(`<!doctype html><html lang="${lang}"><body></body></html>`, { url: 'https://cd.test/', runScripts: 'outside-only' });
  window.eval(source);
  return { window, ui: window.CodeDestinyConsultationUI };
}

test('모든 말풍선 문구는 60자·2문장 이하이고 금지어·이모지가 없으며 교정되지 않는다', () => {
  const { ui } = load();
  let count = 0;
  for (const [service, table] of Object.entries(ui.sayLines)) {
    for (const [key, line] of Object.entries(table)) {
      if (key === 'character') continue;
      const text = `${line[1]} ${line[2]}`.replace(/\{\w+\}/g, '각숙');
      assert.ok(text.length <= 60, `${service}.${key} ${text.length}자`);
      assert.equal(BANNED.test(text) || EMOJI.test(text), false, `${service}.${key}`);
      assert.equal(correctLine(text).text, text, `${service}.${key} 가 교정됨`);
      count += 1;
    }
  }
  assert.ok(count >= 18);
});

test('말풍선은 정본 표정 파일만 가리키고 윤달 pain 은 쓰지 않는다', () => {
  const { window, ui } = load();
  for (const [service, table] of Object.entries(ui.sayLines)) {
    for (const key of Object.keys(table).filter((k) => k !== 'character')) {
      const host = window.document.createElement('div');
      host.innerHTML = ui.say(service, key, { side: 'right' });
      const img = host.querySelector('.cd-say__face');
      assert.ok(img, `${service}.${key} 컷 없음`);
      const src = img.getAttribute('src');
      assert.doesNotMatch(src, /pain/);
      assert.ok(fs.existsSync(path.join(root, 'public', src)), `${src} 없음`);
      assert.ok(host.querySelector('.cd-say--right'));
    }
  }
});

test('한국어가 아니거나 모르는 장·빈 자리는 그리지 않고, 값은 이스케이프한다', () => {
  assert.equal(load('en').ui.say('ziwei', 'chart'), '');
  const { ui } = load();
  assert.equal(ui.say('ziwei', 'unknown'), '');
  assert.equal(ui.say('nope', 'chart'), '');
  assert.match(ui.say('ziwei', 'chart'), /무성/);
  assert.doesNotMatch(ui.say('vedic', 'greet', { vars: { x: '<b>' } }), /<b>/);
});
