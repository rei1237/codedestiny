import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {lottoRuntime} from './saju-lotto-runtime.mjs';
import ts from 'typescript';
import postcss from 'postcss';
import sharp from 'sharp';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';
import {extractSajuCompatClosure} from '../../../scripts/lib/saju-compat-closure.mjs';

const root=new URL('../../../',import.meta.url);
const sources=['js/saju-engine.js','js/core/saju/reportDashboard.js','js/core/saju/dopamineResult.js','js/core/saju/extremeTResult.js','styles/fortune-ui.css','js/entertain-engine.js','js/saju-engine-tarot-sukuyo-quantum.js','worker/lib/saju-section/paid-extreme-t.src.js','scripts/extract-saju-section-runtime.mjs'];
const virtual='virtual:saju-dashboard';
const art=['도파민 중독','극T테스트','테토VS에겐','사주 네컷','사주 로또','사주 프롬프트'];

function declarations(source,names){
  const {order,decl}=extractSajuCompatClosure(source,names);
  const entries=order.map(name=>decl.get(name)).sort((a,b)=>a.node.pos-b.node.pos);
  const used=new Set();
  function visit(node){
    if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&/^_(sajuEngine|sajuQuantum|entertain|reportDashboard)Text$/.test(node.expression.text)){
      const argument=node.arguments[0];
      if(!argument||!ts.isStringLiteral(argument))throw Error('Dashboard translation key must be resolved before bundling');
      used.add(argument.text);
    }
    ts.forEachChild(node,visit);
  }
  entries.forEach(row=>visit(row.node));
  return entries.map(({node,text})=>{
    if(!ts.isVariableDeclaration(node)||!/_TEXT_TRANSLATIONS$/.test(node.name.text))return text;
    const ko=node.initializer.properties.find(item=>item.name?.text==='ko');
    const values=Object.fromEntries(ko.initializer.properties.filter(item=>used.has(item.name.text)).map(item=>[item.name.text,item.initializer.text]));
    return 'var '+node.name.text+'='+JSON.stringify({ko:values})+';';
  }).join('\n');
}
function between(source,first,last){
  const start=source.indexOf(first),end=source.indexOf(last,start+first.length);
  if(start<0||end<0)throw Error('Web dashboard source boundary changed: '+first);
  return source.slice(start,end);
}
function stylesForDashboard(css){
  const sheet=postcss.parse(css);
  const wanted=/(#dopamineCard|#dopamineResult|\.hv-|#hormone-vibe-section|\.s4c-|#sajuFourCutResult|#lottoCard|\.lc-|\.lr-|\.lotto-|\.tetogen-|\.t-(?:test|panel|score|stat|val|mission|hero|summary|type|info|bullet|saju|catchphrase|scan|kicker|copy)|#tTestCard)/;
  sheet.walkRules(rule=>{
    if(rule.parent.type==='atrule'&&rule.parent.name==='keyframes')return;
    const selectors=rule.selectors.filter(selector=>wanted.test(selector));
    if(selectors.length)rule.selectors=selectors;else rule.remove();
  });
  sheet.walkAtRules(rule=>{
    if(rule.name==='keyframes'&&!/^(dp|hv|s4c)/i.test(rule.params)||!['keyframes','media','supports'].includes(rule.name)||!rule.nodes?.length)rule.remove();
  });
  sheet.walkComments(comment=>comment.remove());
  return sheet.toString();
}

export async function buildDashboardModule(){
  const [engine,dashboard,dopamine,extreme,styles,entertain,quantum,relationship,sectionGenerator]=await Promise.all(sources.map(name=>readFile(new URL(name,root),'utf8')));
  const promptList=between(sectionGenerator,'const IMAGE_PROMPTS = [','];');
  const prompts=[...promptList.matchAll(/\["([^"]+)","([^"]+)","(\w+)"\]/g)].map(match=>match.slice(1));
  if(prompts.length!==13)throw Error('Check changed saju prompt manifest');
  const basis=declarations(engine,['GAN','JI','ANIMAL_EMOJI','calcNatalElement','calcPower','analyzeJohu','getTenGod','cdTwelveStage','_sajuVillainExtractMajorSinsal','_sajuVillainBuildBranchRelations','renderHormoneVibe','detectJong','_coreEightChar','attachKasiDaewunBridge',...prompts.map(row=>row[2])]);
  const four=declarations(dashboard,['S4C_TAG_TEXT','_reportDashboardText','renderSajuFourCutContent']);
  // The web Worker serves the relationship panels without reading a profile or payment.
  // Only bundle these two deterministic expansions while their reviewed keys are public.
  if(!['saju_fun_shared','tetogen_deep_report','sukuyo-extreme-t-relationship','fun.quantumLotto.ritualReport'].every(isFreeFortuneFeatureKey))throw Error('Saju dashboard access policy changed');
  const extra=declarations(between(entertain,'  var ENTERTAIN_ENGINE_TEXT_TRANSLATIONS','})(window);'),['calcQuantumHap','buildTetogenDeepReportBody','buildXTLogicHiddenSection']);
  const summary=between(quantum,"  function renderParagraphs(items)","  function renderTTestPanelLock(")
    +between(quantum,"      var stats = builtResult.stats","      var tTestFeature =")
    +"      const hasExtremeTRelationshipAccess=true,relationshipGateHtmlFromBuilder='';\n"
    +between(quantum,"      var builderHtml = '<div class=\"t-test-wrapper","      bindExtremeTRelationshipUnlock(area,");
  const sticker=between(dashboard,'window.addS4CSticker = function','function _s4cEnsureCanvasLib()');
  const shareFour=between(dashboard,'window.shareSajuFourCutKakao = function','  if (navigator.share)').trimEnd()+'\n bridge.share(text.trim()); };';
  // Keep the original copy generator. Replace only web download, Kakao and clipboard actions.
  const dopamineAdapter=dopamine.replace('  w.buildDopamineResult =','  w.dopamineShareText = function(){return _dpShareText(_dpResult).trim();};\n  w.buildDopamineResult =');
  return `import * as SajuNatalCore from '@/lib/saju/natal-core/index.mjs';
import * as KoreanCalendar from '@/lib/korean-calendar/index.js';
export const styles=${JSON.stringify(stylesForDashboard(styles))};
export function prepareDashboard(p, document, bridge){
  const window={get localStorage(){return globalThis.localStorage;},location:{href:'',search:'',pathname:'/',hostname:''},document,cdGetCurrentLanguage:()=> 'ko',
    matchMedia:globalThis.matchMedia?.bind(globalThis),setTimeout:setTimeout.bind(globalThis),clearTimeout:clearTimeout.bind(globalThis),setInterval:setInterval.bind(globalThis),clearInterval:clearInterval.bind(globalThis)};
  const w=window;
  ${basis}
  Object.assign(window,{GAN,JI,ANIMAL_EMOJI,getTenGod,cdTwelveStage,_sajuVillainExtractMajorSinsal,_sajuVillainBuildBranchRelations,
    G_PILLARS:p,G_NATAL:calcNatalElement(p),G_POWER:calcPower(p)});
  const natal=window.G_NATAL,power=window.G_POWER,johu=analyzeJohu(p);
  ${dopamineAdapter}
  ${extreme}
  ${extra}
  ${relationship}
  ${four}
  ${sticker}
  ${shareFour}
  ${lottoRuntime(quantum,declarations,between)}
  function fourCut(id){
    if(id){window.__sajuFourCutVariant=id;try{window.localStorage.setItem(S4C_VARIANT_STORAGE_KEY,id);}catch{/* Preference storage is optional. */}}
    renderSajuFourCutContent();
    const host=document.getElementById('sajuFourCutResult');
    const variants=_s4cGetVariantDefs();
    host.querySelectorAll('button[onclick]').forEach(btn=>btn.removeAttribute('onclick'));
    host.querySelectorAll('.s4c-variant-btn').forEach((btn,i)=>btn.onclick=()=>fourCut(variants[i].id));
    host.querySelector('.s4c-btn--sticker').onclick=e=>window.addS4CSticker(e.currentTarget);
    host.querySelector('.s4c-actions button').onclick=()=>bridge.save(host.querySelector('[data-s4c-capture]'),'saju-four-cut');
    host.querySelector('.s4c-btn--kakao').onclick=e=>window.shareSajuFourCutKakao(e.currentTarget);
    host.querySelector('.s4c-variant-row').setAttribute('aria-label',_reportDashboardText('rd.aria-label.001'));
  }
  return {prompts(gender){if(!['M','F'].includes(gender))throw Error('Saju prompt gender required');GENDER=gender;return [${prompts.map(([id,title,fn])=>'{id:'+JSON.stringify(id)+',title:'+JSON.stringify(title)+',prompt:'+fn+'(p,natal)}').join(',')}];},lotto:mountLotto,data:{p,natal,power,johu},extreme(){
      const builtResult=window.buildExtremeTResult({p,natal,johu,pw:power});
      const area=document.getElementById('tTestResult');
      ${summary}
      const panels=window.renderExtremeTPaidPanels(p,natal,johu);
      for(const [slot,content] of [['main',panels.html],['sajuBase',panels.sajuBaseHtml],['prescription',panels.prescriptionHtml]]){
        const part=area.querySelector('[data-sy-extreme-t-slot="'+slot+'"]');
        part.outerHTML=content;
      }
      area.insertAdjacentHTML('beforeend',buildXTLogicHiddenSection(p,natal,johu,builtResult.finalScore,calcQuantumHap(p)));
    },
    hormone(){
      const vibe=calculateHormoneVibe(p,power);
      renderHormoneVibe(p,power);
      const details=document.createElement('details'),heading=document.createElement('summary');
      heading.textContent='숨은 매력 심화 리포트';details.appendChild(heading);
      details.insertAdjacentHTML('beforeend',buildTetogenDeepReportBody(vibe,p,power,calcQuantumHap(p)));
      document.getElementById('hormoneVibeResult').appendChild(details);
    },
    dopamine(){
      const host=document.getElementById('dopamineResult');
      host.addEventListener('click',e=>{
        if(e.target.closest('[data-dp-save]')){e.stopImmediatePropagation();bridge.save(host.querySelector('[data-dp-capture]'),'saju-focus');}
        if(e.target.closest('[data-dp-share]')){e.stopImmediatePropagation();bridge.share(window.dopamineShareText());}
      },true);
      window.renderDopamineReport(p,natal,power,johu);
    },fourCut};
}`;
}

export default function sajuDashboard(){
  return {name:'saju-dashboard-original',resolveId(id){if(id===virtual)return '\0'+id;},
    async load(id){
      if(id!=='\0'+virtual)return;
      sources.forEach(name=>this.addWatchFile(fileURLToPath(new URL(name,root))));
      return buildDashboardModule();
    },
    configureServer(server){
      server.middlewares.use(async(req,res,next)=>{
        let path;try{path=decodeURI((req.url||'').split('?')[0]);}catch{return next();}
        const name=art.find(item=>path==='/fuctionassets/'+item+'.webp');
        if(!name)return next();
        res.setHeader('Content-Type','image/webp');res.end(await readFile(new URL('public'+path,root)));
      });
    },
    async generateBundle(){
      for(const name of art){
        const path='fuctionassets/'+name+'.webp';
        const source=fileURLToPath(new URL('public/'+path,root));
        this.emitFile({type:'asset',fileName:path,source:await sharp(source).resize({width:name===art[0]?400:144,withoutEnlargement:true}).webp({quality:74}).toBuffer()});
      }
    }};
}
