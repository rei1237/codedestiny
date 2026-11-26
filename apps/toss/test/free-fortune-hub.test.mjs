import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {FREE_PROMO_GROUPS} from '../../../lib/marketing/free-promo.mjs';
import {freeFortuneHref} from '../src/free-fortune-routes.mjs';
import compatBasis from '../service/compat-basis-loader.mjs';

test('every original free card has a distinct, policy-checked Toss destination',()=>{
 const entries=FREE_PROMO_GROUPS.flatMap(g=>g.items),urls=entries.map(freeFortuneHref);
 assert.equal(entries.length,23);
 assert.ok(urls.every(path=>path?.startsWith('/')&&!/premium|checkout|orderId=|intentId=/.test(path)));
 assert.equal(new Set(urls).size,23);
 assert.equal(freeFortuneHref({id:'compat',policyKey:'saju-compat-premium'}),null);
 assert.equal(freeFortuneHref({id:'tarot',freeStart:'other'}),null);
 assert.equal(freeFortuneHref({id:'unknown',policyKey:'section_compat'}),null);
});

test('guest compatibility returns the original static and past-life sections without requesting an order',async()=>{
 const plugin=compatBasis(),source=await plugin.load.call({addWatchFile(){}},plugin.resolveId('virtual:saju-compat-basis'));
 const dom=new JSDOM('<article/>'),context=vm.createContext({window:{},console});
 const render=vm.runInContext(source.replaceAll('export function ','function ')+String.fromCharCode(10)+'compatibilityHtml',context);
 const html=render(['甲子','丁卯','己未','乙卯'],['乙卯','庚戌','甲寅','己巳'],'friend','달빛 & 친구');
 const article=dom.window.document.querySelector('article');article.innerHTML=html;
 assert.match(article.querySelector('.compat-grade-label').textContent,/달빛 & 친구/);
 assert.ok(article.querySelector('.pastlife-cross-title'));
 assert.equal(article.querySelectorAll('form,a[href*="checkout"]').length,0);
 assert.equal(article.querySelectorAll('[class*="cd-compat-light"]').length,0,'web paid light-compat sections must not render free in Toss');
});
