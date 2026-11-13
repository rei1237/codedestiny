import {readFile, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import {extractSajuCompatClosure} from '../../../scripts/lib/saju-compat-closure.mjs';

const root=new URL('../../../',import.meta.url);
const file=(name)=>fileURLToPath(new URL(name,root));
const text=(name)=>readFile(file(name),'utf8');
const ids=['virtual:myeongri-one-card','virtual:self-esteem-tarot','virtual:sun-tarot.css'];

export function oneCardModule(engine,shell){
  const roots=['TAROT_DATA','pickOneCardForMingri','combineTarotAndTenGod','removeRepeatedMyeongriTarotPhrases','tarotCaretaroUrl','TAROT_SHORT_TO_FILENAME'];
  const {order,decl}=extractSajuCompatClosure(engine,roots);
  const code=order.map(name=>decl.get(name)).sort((a,b)=>a.node.pos-b.node.pos).map(item=>item.text).join('\n');
  const categories=[...shell.matchAll(/data-action="selectTarotCategory" data-action-args="([^"]+)"[^>]*>([^<]+)<\/div>/g)].map(m=>[m[1],m[2]]);
  if(categories.length!==8)throw Error('Single card category controls changed');
  return code+'\nexport const categories='+JSON.stringify(categories)+';\n'+
    `export function readOne(category, drawn=pickOneCardForMingri()){
      if(!categories.some(([id])=>id===category))throw Error('Unknown reading category');
      const {card,isReversed}=drawn;
      const reading=combineTarotAndTenGod(card,'',category,isReversed?'reversed':'upright');
      return {reading,oracle:removeRepeatedMyeongriTarotPhrases(reading.oracleMessage),image:tarotCaretaroUrl(card.short),fallback:'/tarot-cards/'+TAROT_SHORT_TO_FILENAME[card.short.toLowerCase()]};
    }
    export {TAROT_DATA};`;
}

export function selfEsteemDocument(shell,styles,cardCopy,experience){
  const start=shell.indexOf('<div id="tarotSelfEsteemOverlay"');
  const end=shell.indexOf('</section>',shell.indexOf('class="tarot-self-esteem-result-actions"',start));
  if(start<0||end<start)throw Error('Self-esteem modal boundaries changed');
  const markup=shell.slice(start,end+'</section>'.length)+'</div></div></div>';
  const shareLine='    text += tarotSelfEsteemText("shareLinkLabel")';
  const shareStart=experience.indexOf(shareLine),shareEnd=experience.indexOf('\n  }',shareStart);
  if(shareStart<0||shareEnd<0)throw Error('Web self-esteem share handler changed');
  const adapted=experience.slice(0,shareStart)+'    send("share", text);'+experience.slice(shareEnd);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src __ORIGIN__ data:; style-src 'unsafe-inline' __ORIGIN__; script-src 'unsafe-inline'; form-action 'none'">
    <style>*{box-sizing:border-box}body{margin:0}button{font:inherit;cursor:pointer}${styles}</style></head><body>${markup}<script>
    const send=(action,text='')=>parent.postMessage({channel:'cd-self-esteem',action,text},'__ORIGIN__');
    ${cardCopy}
    ${adapted}
    const commands={startTarotSelfEsteemReading,flipTarotSelfEsteemCard,resetTarotSelfEsteemFlow,showTarotSelfEsteemFinalReading,shareTarotSelfEsteemResult,copyTarotSelfEsteemAiPrompt,closeTarotSelfEsteemModal:()=>send('exit')};
    function activate(event){
      const button=event.target.closest('[data-action]');
      if(!button||button.dataset.actionSelfOnly&&button!==event.target)return;
      const action=commands[button.dataset.action];if(!action)return;
      action(button.dataset.actionPassSelf?button:button.dataset.actionArgs);
      if(button.dataset.action==='startTarotSelfEsteemReading')document.querySelectorAll('.tarot-self-esteem-card').forEach((card,index)=>{
        card.setAttribute('role','button');card.tabIndex=0;card.setAttribute('aria-label',(index+1)+'번째 카드');
      });
    }
    document.addEventListener('click',activate);
    document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.tarot-self-esteem-card')){e.preventDefault();e.target.click();}});
    window.addEventListener('message',event=>{
      if(event.source!==parent||event.origin!=='__ORIGIN__'||event.data!=='self-esteem-back')return;
      if(document.querySelector('#tarotSelfEsteemIntroStage').classList.contains('is-active'))send('exit');
      else resetTarotSelfEsteemFlow();
    });
    // The source stylesheet is already inline, so initialize the original intro directly.
    const overlay=document.querySelector('#tarotSelfEsteemOverlay');overlay.classList.add('is-open');resetTarotSelfEsteemFlow();
    </script></body></html>`;
}

export default function coreTarot(){
 const cardsDir='public/tarot-cards/',styles='public/styles/tarot-self-esteem-quest.css';
 return {name:'original-core-tarot',resolveId(id){if(ids.includes(id))return '\0'+id;},
   async load(id){
     if(!ids.some(name=>id==='\0'+name))return;
     if(id.endsWith('sun-tarot.css')){
       const source='app/components/SunHealingTarot.tsx';this.addWatchFile(file(source));
       const css=await postcss([tailwind({content:[{raw:await text(source),extension:'tsx'}],important:'.sun-toss-reading',corePlugins:{preflight:false}})]).process('@tailwind utilities;', {from:undefined});
       return css.css;
     }
     const names=id.endsWith('one-card')?['js/saju-engine-tarot-sukuyo-quantum.js','index.html']:['index.html',styles,'js/tarot-self-esteem-card-copy.js','js/tarot-self-esteem-experience.js'];
     names.forEach(name=>this.addWatchFile(file(name)));
     const sources=await Promise.all(names.map(text));
     return id.endsWith('one-card')?oneCardModule(...sources):'export default '+JSON.stringify(selfEsteemDocument(...sources));
   },
   async generateBundle(){
     const cards=(await readdir(file(cardsDir))).filter(name=>name.endsWith('.webp'));
     if(cards.length!==78)throw Error('Original tarot art count changed');
     for(const name of [...cards.map(name=>'tarot-cards/'+name),'fuctionassets/healing.webp','fuctionassets/jajongam.webp']){
       const src=file('public/'+name);
       const width=name.startsWith('tarot-cards/')?240:480;
       this.emitFile({type:'asset',fileName:name,source:await sharp(src).resize({width,withoutEnlargement:true}).webp({quality:70}).toBuffer()});
     }
   }};
}
