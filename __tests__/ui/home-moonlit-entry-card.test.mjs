import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync('app/components/HomeMoonlitEntry.tsx','utf8');
const css=readFileSync('app/components/HomeMoonlitEntry.module.css','utf8');

test('online temple invitation is local to the existing card and keeps both destinations and original artwork',()=>{
 assert.match(src,/ko:\{eyebrow:'달빛 드는 작은 법당',welcome:'혼자만의 온라인 절 참배'/);
 assert.match(src,/features:\['108배','명상','긍정 확언'\]/);
 assert.match(src,/<strong id=\{titleId\}>\{copy.title\}<\/strong>/);
 assert.match(src,/\/moonlit-lotus\/\?lang=ja':'\/moonlit-lotus\//);
 assert.match(src,/href="\/moonlit-lotus\/story\/"/);
 assert.match(src,/entry-v2\/yeoni-480\.webp 480w, \/assets\/moonlit-lotus\/entry-v2\/yeoni-768\.webp 768w/);
 assert.match(src,/if\(!MOONLIT_LOTUS_ENABLED\)return null/);
});
test('notice has a defined light foreground; link exposes both title and invitation with visible keyboard focus',()=>{
 assert.match(src,/aria-labelledby=\{\x60\$\{titleId\} \$\{welcomeId\}\x60\}/);
 assert.match(src,/<span id=\{welcomeId\} className=\{styles.welcome\}>\{invite.welcome\}/);
 assert.match(css,/\.entry \.copy \.welcome\s*\{[^}]*color:#f3e2b8/);
 assert.match(css,/\.entry:focus-visible\s*\{\s*outline:3px solid/);
 assert.match(css,/\.entry b\s*\{[^}]*min-height:48px/);
});
test('web home shows the temple entry under the two service cards, after the choice note',()=>{
 const page=readFileSync('app/page.js','utf8');
 const note=page.indexOf('className={styles.entryChoiceNote}'),entry=page.indexOf('{!IS_APP_BUILD && <HomeMoonlitEntry />}');
 assert.ok(note>0&&entry>note,'lotus entry follows the web choice note');
 assert.ok(entry<page.indexOf('<PopularTop5 />'),'lotus entry precedes the TOP5');
});
