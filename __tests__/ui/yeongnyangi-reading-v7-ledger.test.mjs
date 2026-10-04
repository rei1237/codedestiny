import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Design §6-3: the v7 fact ledger splits real engine facts into ASCII sub-IDs and pins each to one chapter. Flag OFF, no LLM.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/reading-v7-ledger'; export {readingManifestV7,V7_ANCHOR_REFS} from './worker/yeongnyangi/fortune/reading-v7'; export {products} from './worker/yeongnyangi/payments/catalog'; export {domains} from './worker/yeongnyangi/fortune/index'; export {tenGodFor} from './worker/lib/life-book-ai-saju.js'; export {STEM_HANJA} from './lib/korean-calendar/index.js'; export {aspectBetween} from './worker/lib/swiss-ephemeris.js'; export {relationFromForwardDistance} from './worker/lib/sukuyo-relation-core.js'; export {SUKUYO_MANSIONS} from './worker/lib/sukuyo-premium.js';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-reading-v7-ledger.test.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;
const TIERS=['salmon','flounder','tuna'];
const KINDS={saju:['personal','ask'],ziwei:['personal','ask'],vedic:['personal','ask'],astrology:['personal','ask'],sukuyo:['personal','ask'],tarot:['love','choice']};
const singles=m.products.filter(p=>p.readingKind==='single');
const manifest=(domain,tier,kind)=>m.readingManifestV7(singles.find(p=>p.domain===domain&&p.fishId===tier),{id:kind});
const asOf='2026-09-15T00:00:00Z';
const timed={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const {birthTime:_t,...noTime}=timed;
const {birthPlace:_p,...noPlace}=timed;
async function contextFor(domain,birth,topicId){
 const engine=m.domains[domain];
 const input=engine.validateInput({personA:birth,question:'요즘 마음이 가는 사람과 앞으로 어떻게 될까요?',topicId,readingMode:'personal'});
 return engine.buildContext(await engine.calculate(input,{asOf}));
}
const contexts={};
for(const domain of Object.keys(KINDS))if(domain!=='tarot')contexts[domain]=await contextFor(domain,timed);
contexts['tarot:love']=await contextFor('tarot',timed,'love');
contexts['tarot:choice']=await contextFor('tarot',timed,'general');
contexts['saju:noTime']=await contextFor('saju',noTime);
contexts['ziwei:noPlace']=await contextFor('ziwei',noPlace);
// Salmon is the only saju tier sold without a birth time (design §5 연어 대체 경로).
const cases=Object.entries(KINDS).flatMap(([domain,kinds])=>kinds.flatMap(kind=>TIERS.map(tier=>({domain,kind,tier,fixture:domain==='tarot'?`tarot:${kind}`:domain}))));
cases.push(...['personal','ask'].map(kind=>({domain:'saju',kind,tier:'salmon',fixture:'saju:noTime'})),...['personal','ask'].flatMap(kind=>TIERS.map(tier=>({domain:'ziwei',kind,tier,fixture:'ziwei:noPlace'}))));
const resolved=cases.map(c=>({...c,...m.resolveV7Ledger(manifest(c.domain,c.tier,c.kind),contexts[c.fixture],{asOf})}));
// Must stay a full match of consultation.ts EVIDENCE_ID so a leaked sub-ID is redacted without a tail.
const EVIDENCE_ID=/^(saju|ziwei|vedic|astrology|sukuyo|tarot)\.([A-Za-z][\w[\]-]*(?:\.[A-Za-z0-9][\w[\]-]*)*)$/;
const TIMING_LABELS=/^(yearlyLuck|monthlyLuck|majorLuck|yearlyTimeline|minorLuck|vimshottariDasha)$/;
// Dated derived facts (one per year or luck cycle) are timing facts too; their natal part is not.
const isTiming=f=>TIMING_LABELS.test(f.label)||(/^(movementSignals|romanceTiming)$/.test(f.label)&&!/\.natal$/.test(f.id));
const keysDeep=v=>Array.isArray(v)?v.flatMap(keysDeep):v&&typeof v==='object'?Object.entries(v).flatMap(([k,x])=>[k,...keysDeep(x)]):[];

test('ownership: every chapter owns a concrete fact, no fact has two owners, refs point at anchor-owned facts',()=>{
 for(const {domain,kind,tier,fixture,chapters,ledger} of resolved){
  const where=`${fixture}/${kind}/${tier}`;
  assert.deepEqual(ledger.unclassified,[],`${where}: unclassified labels`);
  assert.deepEqual(ledger.unslugged,[],`${where}: engine values without a slug`);
  const owner=new Map();
  for(const c of chapters){
   assert.ok(c.owns.length,`${where}/${c.key} owns nothing`);
   for(const id of c.owns){
    assert.ok(!owner.has(id),`${where}: ${id} owned by ${owner.get(id)} and ${c.key}`);
    owner.set(id,c.key);
    assert.match(id,EVIDENCE_ID,`${where}: ${id} is not an ASCII evidence id`);
    assert.ok(id.startsWith(`${domain}.`),`${where}: ${id}`);
    if(isTiming(ledger.facts.get(id)))assert.equal(c.theme,'timing',`${where}: timing fact ${id} owned by ${c.key}`);
   }
  }
  const anchor=chapters[0];
  assert.equal(anchor.key,'anchor');
  assert.deepEqual(anchor.refs,[]);
  for(const c of chapters.slice(1)){
   assert.ok(c.refs.length,`${where}/${c.key} has no anchor refs`);
   // saju.seasonalBalance is the one shared ref owned outside the anchor (by health, or nobody in tiers without it).
   for(const id of c.refs)if(id!=='saju.seasonalBalance')assert.equal(owner.get(id),'anchor',`${where}/${c.key}: ref ${id} is not anchor-owned`);
   else assert.notEqual(owner.get(id),c.key,`${where}/${c.key}: owns and refs ${id}`);
  }
 }
});

test('non-premium tiers drop premium labels and keys; prompt keys never reach a chapter',()=>{
 for(const {fixture,kind,tier,chapters,ledger} of resolved){
  // Double defense: below tuna the ledger itself holds no premium facts, owned or not.
  if(tier!=='tuna')for(const f of ledger.facts.values())assert.doesNotMatch(f.label,/usefulGod|jong|majorLuck|vimshottariDasha|dasha|yogas|divisionalCharts|fourTransformations|sanFangSiZheng/,`${fixture}/${tier}: ledger keeps ${f.id}`);
  for(const c of chapters)for(const f of m.selectV7Facts(contexts[fixture],c,{ledger})){
   const keys=keysDeep(f.value);
   assert.ok(!keys.some(k=>/prompt|summaryForPrompt/i.test(k)),`${fixture}/${kind}/${tier}: ${f.id} carries a prompt key`);
   if(tier==='tuna')continue;
   assert.doesNotMatch(f.label,/usefulGod|jong|majorLuck|vimshottariDasha|dasha|yogas|divisionalCharts|fourTransformations|sanFangSiZheng/,`${fixture}/${tier}: ${f.id}`);
   assert.ok(!keys.some(k=>m.PREMIUM_KEY.test(k)),`${fixture}/${kind}/${tier}: ${f.id} keeps ${keys.filter(k=>m.PREMIUM_KEY.test(k))}`);
  }
 }
});

test('selectV7Facts returns owns ∪ refs in order and skips unknown ids with a log',()=>{
 const {fixture,chapters,ledger}=resolved.find(r=>r.fixture==='saju'&&r.tier==='tuna');
 for(const c of chapters)assert.deepEqual(m.selectV7Facts(contexts[fixture],c,{ledger}).map(f=>f.id),[...new Set([...c.owns,...c.refs])]);
 const warn=console.warn,logged=[];
 console.warn=(...a)=>logged.push(a.join(' '));
 try{assert.deepEqual(m.selectV7Facts(contexts.saju,{tier:'tuna',owns:['saju.tenGods.nope'],refs:[]}),[]);}finally{console.warn=warn;}
 assert.match(logged.join('\n'),/saju\.tenGods\.nope/);
});

test('determinism: resolving twice gives identical ownership and values',()=>{
 for(const first of resolved.filter((_,i)=>i%3===0)){
  const again=m.resolveV7Ledger(manifest(first.domain,first.tier,first.kind),contexts[first.fixture],{asOf});
  assert.deepEqual(again.chapters.map(x=>[x.key,x.owns,x.refs]),first.chapters.map(x=>[x.key,x.owns,x.refs]));
  assert.deepEqual([...again.ledger.facts.values()],[...first.ledger.facts.values()]);
 }
});

test('saju: declared absence, pillar and interaction ownership, year ranges',()=>{
 const tuna=resolved.find(r=>r.fixture==='saju'&&r.kind==='personal'&&r.tier==='tuna');
 const own=key=>tuna.chapters.find(c=>c.key===key).owns;
 // This chart has no 정인; the jeongin chapter still owns the declared absence.
 assert.deepEqual(tuna.ledger.facts.get('saju.tenGods.jeongin').value,{name:'정인',count:0,present:false});
 assert.deepEqual(own('jeongin'),['saju.tenGods.jeongin']);
 assert.equal(Object.keys(m.TEN_GOD_SLUGS).filter(ko=>tuna.ledger.facts.has(`saju.tenGods.${m.TEN_GOD_SLUGS[ko]}`)).length,10);
 // A clash between year and day goes to the first owner in manifest order (spouse owns the day pillar).
 const clash=[...tuna.ledger.facts.keys()].find(id=>id.startsWith('saju.natalInteractions.branchClashes.year-day'));
 assert.ok(clash&&own('spouse').includes(clash),clash);
 const luck=key=>own(key).filter(id=>id.startsWith('saju.yearlyLuck.'));
 assert.deepEqual(luck('yearNow'),['saju.yearlyLuck.2026','saju.yearlyLuck.2027']);
 assert.deepEqual(luck('yearsAhead'),[2028,2029,2030,2031,2032,2033,2034,2035].map(y=>`saju.yearlyLuck.${y}`));
 // Movement facts: the natal reading plus one fact per dated year, all owned at tuna.
 const movement=[...tuna.ledger.facts.keys()].filter(id=>id.startsWith('saju.movementSignals.'));
 assert.ok(movement.includes('saju.movementSignals.natal')&&movement.some(id=>/\.20\d\d$/.test(id)),movement.join());
 assert.deepEqual(movement.filter(id=>tuna.unowned.includes(id)),[]);
 assert.equal(own('months').length,12);
 assert.deepEqual(own('majorNow'),['saju.advancedFactors','saju.majorLuck.current']);
 // Tuna gives moves and overseas luck one chapter: the natal reading, every dated year, the luck cycle and 역마살.
 assert.deepEqual(movement.filter(id=>!own('movement').includes(id)),[]);
 assert.ok(own('movement').includes('saju.movementSignals.major')&&own('movement').some(id=>id.startsWith('saju.shinsal.')),own('movement').join());
 // Love and marriage timing split by year; the spouse chapter keeps the natal spouse star and attraction.
 assert.ok(own('spouse').includes('saju.romanceTiming.natal'));
 const rel=kind=>[...tuna.ledger.facts.keys()].filter(id=>id.startsWith(`saju.romanceTiming.${kind}.`));
 assert.ok(rel('love').length&&rel('love').every(id=>own('loveLuck').includes(id)),rel('love').join());
 assert.ok(rel('marriage').length&&rel('marriage').every(id=>own('marriageLuck').includes(id)),rel('marriage').join());
 assert.equal(tuna.ledger.facts.get('saju.majorLuck.current').value.cycle.startYear,2024);
 assert.equal(tuna.ledger.facts.get('saju.majorLuck.next').value.cycle.startYear,2034);
 // Salmon: the month-by-month facts ride along in yearNow; love keeps only 도화·홍염 plus 식상.
 const salmon=resolved.find(r=>r.fixture==='saju'&&r.kind==='personal'&&r.tier==='salmon');
 const sOwn=key=>salmon.chapters.find(c=>c.key===key).owns;
 assert.equal(sOwn('yearNow').filter(id=>id.startsWith('saju.monthlyLuck.')).length,12);
 assert.deepEqual(sOwn('love'),['saju.tenGods.siksin','saju.tenGods.sanggwan','saju.shinsal.dohwa','saju.shinsal.hongyeom']);
 assert.ok(salmon.unowned.includes('saju.shinsal.baekho'));
 // Salmon has no love-timing chapter, so yearNow carries this year's and next year's love, marriage and move signals.
 const dated=[...salmon.ledger.facts.keys()].filter(id=>/^saju\.(romanceTiming\.(love|marriage)|movementSignals)\.(2026|2027)$/.test(id));
 assert.ok(dated.length&&dated.every(id=>sOwn('yearNow').includes(id)),dated.join());
});

test('saju without a birth time: decision 7 rebuilds this year and next, and it matches the engine year luck',()=>{
 for(const r of resolved.filter(r=>r.fixture==='saju:noTime')){
  const yearNow=r.chapters.find(c=>c.key==='yearNow');
  assert.deepEqual(yearNow.owns.filter(id=>id.startsWith('saju.yearlyLuck.')),['saju.yearlyLuck.2026','saju.yearlyLuck.2027']);
  // Movement keeps its natal reading but no dated year without a birth time.
  assert.ok(r.chapters.some(c=>c.owns.includes('saju.movementSignals.natal')),r.tier);
  assert.ok(![...r.ledger.facts.keys()].some(id=>/^saju\.movementSignals\.\d/.test(id)));
  assert.ok(!r.ledger.facts.has('saju.pillarDetails.hour'));
  assert.ok(![...r.ledger.facts.keys()].some(id=>/monthlyLuck|majorLuck/.test(id)));
 }
 const facts=Object.fromEntries(contexts.saju.facts.map(f=>[f.label,f.value]));
 const rebuilt=m.timeFreeYearlyLuck(facts.dayMaster,facts.pillarDetails,[2026,2027]);
 for(const [i,x] of rebuilt.entries())for(const key of ['year','pillar','heavenlyStem','earthlyBranch','stemTenGod','hiddenStems','natalInteractions'])
  assert.deepEqual(x[key],facts.yearlyLuck[i][key],`${x.year}.${key}`);
});

test('ziwei, vedic, astrology, sukuyo, tarot: sub-IDs land on the catalog owners',()=>{
 const pick=(fixture,tier,kind='personal')=>{const r=resolved.find(x=>x.fixture===fixture&&x.tier===tier&&x.kind===kind);return key=>r.chapters.find(c=>c.key===key).owns;};
 const z=pick('ziwei','tuna');
 assert.deepEqual(z('anchor'),['ziwei.lifePalace','ziwei.bodyPalace','ziwei.palaces.myeong','ziwei.bureau']);
 assert.deepEqual(z('hwarok'),['ziwei.fourTransformations.huaLu']);
 assert.deepEqual(z('yearNow'),['ziwei.minorLuck.current','ziwei.yearlyTimeline.2026','ziwei.yearlyTimeline.2027']);
 assert.ok(z('yearsAhead').includes('ziwei.minorLuck.2027')&&!z('yearsAhead').some(id=>/minorLuck\.202[1-6]$/.test(id)));
 assert.deepEqual(z('majorNow'),['ziwei.majorLuck.current']);
 assert.ok(!JSON.stringify(resolved.find(x=>x.fixture==='ziwei').ledger.facts.get('ziwei.minorLuck.current').value).includes('baseYear'));
 const zs=pick('ziwei','salmon');
 assert.deepEqual(zs('relations'),['ziwei.palaces.hyeongje','ziwei.palaces.janyeo','ziwei.palaces.nobok','ziwei.palaces.bumo']);
 const v=pick('vedic','tuna'),vs=pick('vedic','salmon');
 assert.deepEqual(v('nodes'),['vedic.planets.Rahu','vedic.planets.Ketu']);
 // Without the nodes chapter, Rahu (4th house) and Ketu (10th house) fall back to their house owners.
 assert.ok(vs('mind').includes('vedic.planets.Rahu')&&vs('career').includes('vedic.planets.Ketu'));
 assert.deepEqual(v('mdNext').length,1);
 const dasha=resolved.find(x=>x.fixture==='vedic'&&x.tier==='tuna').ledger.facts.get('vedic.vimshottariDasha.arc').value;
 assert.ok(!JSON.stringify(dasha).includes('1997-02-10'),'birth-balance start date must not leak');
 const a=pick('astrology','tuna'),as=pick('astrology','salmon');
 assert.ok(a('tension').every(id=>/-(square|opposition)-|none-tension/.test(id))&&a('tension').length);
 assert.ok(a('harmony').every(id=>/-(trine|sextile)-|none-harmony/.test(id))&&a('harmony').length);
 assert.ok(as('aspects').some(id=>id.includes('-conjunction-')||id.endsWith('none-conjunction')));
 // Tuna has no conjunction chapter: a conjunction goes to the earlier planet owner in manifest order.
 assert.deepEqual(a('uranus'),['astrology.planets.Uranus','astrology.aspects.Neptune-conjunction-Uranus']);
 assert.ok(as('wealth').includes('astrology.planets.Uranus'),'salmon: Uranus (8th house) falls back to the wealth chapter');
 const s=pick('sukuyo','tuna'),ss=pick('sukuyo','salmon');
 assert.ok(s('an').length===3&&s('an').every(id=>/^sukuyo\.relationMap\.an\.\d+$/.test(id)));
 assert.equal(ss('fate').length,3);
 assert.equal(resolved.find(x=>x.fixture==='sukuyo').ledger.facts.size,28);
 const personA=contexts.sukuyo.facts.find(f=>f.label==='personA').value;
 assert.equal(m.SUKUYO_MANSIONS[personA.index].nameKo,personA.nameKo);
 const t=pick('tarot:love','tuna','love');
 const love=resolved.find(x=>x.fixture==='tarot:love'&&x.tier==='tuna');
 const firstCard=love.chapters.find(c=>c.owns.includes('tarot.cards.self_view_of_other')).owns;
 assert.deepEqual(firstCard,['tarot.cards.self_view_of_other','tarot.reading.cards.self_view_of_other','tarot.reading.cardSections.self_view_of_other','tarot.reading.positionReadings.self_view_of_other']);
 assert.deepEqual(t('anchor'),['tarot.spreadId']);
 const reading=contexts['tarot:love'].facts.find(f=>f.label==='reading').value,cards=contexts['tarot:love'].facts.find(f=>f.label==='cards').value;
 assert.deepEqual(reading.positionReadings.map(p=>p.positionKey),cards.map(c=>c.positionKey));
});

test('fail-closed: every value an engine can emit has a slug, and every slug is ASCII and unique',()=>{
 const tables={TEN_GOD_SLUGS:m.TEN_GOD_SLUGS,SHINSAL_SLUGS:m.SHINSAL_SLUGS,PALACE_SLUGS:m.PALACE_SLUGS,SUKUYO_ROLE_SLUGS:m.SUKUYO_ROLE_SLUGS,YOGA_SLUGS:m.YOGA_SLUGS};
 for(const [name,table] of Object.entries(tables)){
  const slugs=Object.values(table);
  assert.equal(new Set(slugs).size,slugs.length,`${name} slugs collide`);
  for(const s of slugs)assert.match(s,/^[A-Za-z0-9][\w-]*$/,`${name}: ${s}`);
 }
 const tenGods=new Set(m.STEM_HANJA.flatMap(a=>m.STEM_HANJA.map(b=>m.tenGodFor(a,b))));
 assert.deepEqual([...tenGods].sort(),Object.keys(m.TEN_GOD_SLUGS).sort());
 const facts=d=>Object.fromEntries(contexts[d].facts.map(f=>[f.label,f.value]));
 assert.deepEqual(Object.keys(facts('saju').shinsal.byName).sort(),Object.keys(m.SHINSAL_SLUGS).sort());
 for(const kind of Object.keys(facts('saju').natalInteractions))assert.ok(m.INTERACTION_KINDS.includes(kind),kind);
 const ziweiSource=readFileSync('worker/lib/ziwei-ai-chart.js','utf8');
 for(const name of Object.keys(m.PALACE_SLUGS))assert.ok(ziweiSource.includes(`"${name}"`),`${name} missing from the ziwei engine`);
 assert.deepEqual(facts('ziwei').palaces.map(p=>p.name).sort(),Object.keys(m.PALACE_SLUGS).sort());
 assert.deepEqual(Object.keys(facts('ziwei').fourTransformations).sort(),[...m.ZIWEI_TRANSFORMS].sort());
 const roles=new Set(Array.from({length:27},(_,d)=>m.relationFromForwardDistance(d).bRole));
 assert.deepEqual([...roles].sort(),Object.keys(m.SUKUYO_ROLE_SLUGS).sort());
 const types=new Set([0,60,90,120,180].map(deg=>m.aspectBetween(0,deg).type));
 assert.deepEqual([...types].sort(),Object.keys(m.ASPECT_FAMILY).sort());
 const yogaNames=[...readFileSync('worker/lib/vedic-ai-chart.js','utf8').matchAll(/yogas\.push\(\{\s*name:\s*"([^"]+)"/g)].map(x=>x[1]);
 assert.ok(yogaNames.length>=4);
 assert.deepEqual([...new Set(yogaNames)].sort(),Object.keys(m.YOGA_SLUGS).sort());
 assert.deepEqual(facts('vedic').planets.map(p=>p.name).sort(),[...m.VEDIC_PLANETS].sort());
 assert.deepEqual(Object.keys(facts('vedic').divisionalCharts).filter(k=>k!=='d1').sort(),[...m.DIVISIONAL_KEYS].sort());
 assert.deepEqual(Object.keys(facts('astrology').planets).sort(),[...m.ASTRO_PLANETS].sort());
});
