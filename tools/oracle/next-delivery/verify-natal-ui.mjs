import {build} from 'esbuild';
import vm from 'node:vm';
import './guard.cjs';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fork, spawnSync } from 'node:child_process';
import { mockDevSettings } from '../../../scripts/lib/mock-dev-settings.mjs';
import { services, mockResponse } from './service-results-fixtures.mjs';

const output = '.tmp/natal-ui-evidence';
const runName = 'natal';
fs.mkdirSync(output, { recursive: true });
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const originals = services.map(service => hash(service.payload));
const requests = [], blocked = [], errors = [], unknown = [], results = [], inventories = {}, consoleErrors = [], httpFailures = [];
const moduleBuild=await build({stdin:{contents:"export * from './worker/yeongnyangi/fortune/shared/natal-profile';export {context} from './worker/yeongnyangi/fortune/shared/domain';export {chartView} from './worker/yeongnyangi/fortune/charts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'guard',setup(b){b.onResolve({filter:/.*/},a=>{if(a.path==='@/lib/r2-public-url')return {path:path.resolve('lib/r2-public-url.ts')};if(!a.path.startsWith('.')||/swiss|ephemeris|db\.js|models/.test(a.path))throw Error('BLOCKED:'+a.path)})}}]});
const box=vm.createContext({module:{exports:{}},TextEncoder,process:{env:{NEXT_PUBLIC_ASSETS_BASE_URL:'https://mock.test'}}});vm.runInContext(moduleBuild.outputFiles[0].text,box);const core=box.module.exports;
const fixtures={saju:{pillars:{year:'庚辰',month:'辛巳',day:'癸酉',hour:null},dayMaster:'癸'},vedic:{lagna:{sign:'Aries',rashiKo:'양자리'},moon:{sign:'Taurus',signKo:'황소자리',nakshatra:'Rohini',nakshatraLord:'Moon',pada:2},planets:[{name:'Moon',nameKo:'달',sign:'Taurus',signKo:'황소자리',house:2,nakshatra:'Rohini',nakshatraLord:'Moon',pada:2}]},sukuyo:{personA:{name:'각숙',index:0,keywords:['관찰','정리'],strengths:['차분한 정리'],shadows:['생각이 길어짐']}}};
const readings=Object.fromEntries(Object.entries(fixtures).map(([d,f])=>{const c=core.context(d,f);const p=core.buildNatalProfile(c);return [d,{category:d,day:'2026-11-02',title:{saju:'사주',vedic:'베다점',sukuyo:'숙요점'}[d],kind:'calculated',summary:p.summary,paragraphs:p.paragraphs,basis:p.basis,limitations:p.limitations,charts:[core.chartView(c)],natalProfile:p,prompt:'합성 프롬프트',version:'anchovy-natal-v1'}]}));
const categories=JSON.parse(fs.readFileSync('worker/yeongnyangi/fortune/free/categories.json'));
const loadingService=services.find(s=>s.key==='yeongnyangi-vedic');const loadingPayload=structuredClone(loadingService.payload);loadingPayload.fortune.state='GENERATING';loadingPayload.fortune.chapters=[];
const api = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const route=url.pathname.replace(/\/$/,'');
  let payload=req.method==='GET'?mockResponse(url):null;
  if(route==='/api/yeongnyangi/profiles')payload={ok:true,profiles:[]};
  if(route==='/api/yeongnyangi/attendance')payload={ok:true,day:'2026-11-02',balance:0,attended:true,unlocked:true};
  if(route==='/api/yeongnyangi/free/reading')payload={ok:true,result:readings[url.searchParams.get('category')]||null};
  if(route===loadingService.endpoint||route===loadingService.endpoint+'/generate')payload=loadingPayload;
  requests.push({ method: req.method, path: req.url, responseHash: payload ? hash(payload) : null });
  if (!payload) unknown.push({ method: req.method, path: req.url });
  res.writeHead(payload ? 200 : 501, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload || { ok: false, reason: 'MOCK_ROUTE_NOT_IMPLEMENTED' }));
});
await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PATHEXT|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const { env } = mockDevSettings(process.cwd(), { ...inherited, MOCK_DEV_API_PORT: String(api.address().port), MOCK_DEV_PORT: '12002' });
env.NODE_OPTIONS += ` --require="${path.resolve('tools/oracle/next-delivery/guard.cjs').replaceAll('\\', '/')}"`;
const frameworkEnv = fs.readFileSync('next-env.d.ts');
const child = fork('tools/oracle/next-delivery/server.mjs', [], { env, execArgv: [], windowsHide: true, silent: true });
let serverLog = '', browser;
child.stdout.on('data', data => { serverLog += data; });
child.stderr.on('data', data => { serverLog += data; });
child.on('message', value => { if (value.type === 'inventory') inventories[value.compiler] = value.files; });
try {
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Next startup timeout')),120000);child.on('message',v=>{if(v.type==='ready'){clearTimeout(timer);resolve(v.origin)}});child.once('exit',code=>{clearTimeout(timer);reject(Error('Next exited '+code))})});
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:960,height:1000},serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('fortune_auth_user',JSON.stringify({id:'mock-owner',_id:'mock-owner',nickname:'합성 검증'}));document.cookie='fortune_auth_role=user; path=/';localStorage.setItem('cd_lang','ko')});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/yeongnyangi/room/',{waitUntil:'domcontentloaded',timeout:120000});
 for(const d of ['saju','vedic','sukuyo']){
  const label=categories.find(c=>c.id===d).label.replace(' 프롬프트','');await page.locator('.free-categories').getByRole('button',{name:label,exact:true}).click({timeout:60000});
  const cookie=page.getByRole('button',{name:'필수만 사용',exact:true});if(await cookie.isVisible())await cookie.click();
  const reading=page.locator('.free-reading');await expect(reading).toContainText('타고난 성향 · 출생 명반 기준',{timeout:60000});
  for(const width of [960,390]){await page.setViewportSize({width,height:1000});await reading.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`${output}/free-${d}-${width}.png`});}
  if(d==='saju'){await expect(reading.getByRole('table')).toContainText('사주 만세력');await reading.getByRole('table').screenshot({path:output+'/manse-390.png'});}
 }
 await page.goto(origin+loadingService.route,{waitUntil:'domcontentloaded',timeout:120000});const sprite=page.locator('[data-reading-sprite]');await expect(sprite).toBeVisible({timeout:60000});
 const positions=[];for(let i=0;i<4;i++){positions.push(await sprite.evaluate(e=>getComputedStyle(e).backgroundPosition));await page.waitForTimeout(800)}assert.ok(new Set(positions).size>1,'sprite moves through actual cells');
 const pause=page.getByRole('button',{name:'효과 멈추기'});await pause.click();await expect(page.getByRole('button',{name:'효과 다시 재생'})).toHaveAttribute('aria-pressed','true');assert.equal(await sprite.evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
 for(const width of [960,390]){await page.setViewportSize({width,height:1000});await page.locator('[data-reading-stage]').screenshot({path:`${output}/loading-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await sprite.evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);assert.deepEqual(unknown,[]);fs.writeFileSync(`${output}/report.json`,JSON.stringify({passed:true,errors,positions,requests,unknown,viewportWidths:[960,390],realProviders:false},null,2));console.log('PASS: free saju/vedic/sukuyo static profile, natal table, 16-frame sprite, pause/reduced motion, desktop/mobile');
 await context.close();
} finally {
 if(browser)await browser.close();if(child.connected)child.send('stop');if(child.exitCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>{if(child.exitCode===null)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});resolve()},10000);child.once('exit',()=>{clearTimeout(timer);resolve()})});
 api.closeAllConnections();await new Promise(resolve=>api.close(resolve));fs.writeFileSync(`${output}/server.json`,JSON.stringify({log:serverLog},null,2));fs.writeFileSync('next-env.d.ts',frameworkEnv);
}