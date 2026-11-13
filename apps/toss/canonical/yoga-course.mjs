import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const path=fileURLToPath(new URL('../../../yoga-guru.html',import.meta.url));
export function yogaReader(){
  const source=readFileSync(path,'utf8');
  function between(start,end){
    const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
    if(a<0||b<=a)throw Error('Missing Divya Yoga source: '+start);
    return source.slice(a,b);
  }
  const styles=between('<style>','</style>').replace("url('/fuctionassets/india.webp')","none")+'</style>';
  const panel=between('<div id="musicPanelHome">','<div id="errorBox"');
  const script=[between('let selectedDuration =','function _isAdminMeditationSession'),between('function initPageState()','function selectDuration('),
    between('function parkYogaMusic()','function syncYogaOwner()'),between('function formatDuration(seconds)','function restartJourney()'),
    between('function escapeHtml(value)','initPageState();'),'initPageState();',
    `function restartJourney(){parent.postMessage({type:'yoga-new'},'*');}
    addEventListener('message',event=>{
      if(event.source!==parent||event.data?.type!=='yoga-course')return;
      renderCourse(event.data.course);
      const cards=[...document.querySelectorAll('.step-card')];
      if(Number.isInteger(event.data.step)&&cards[event.data.step]){
        cards.forEach((card,i)=>{if(card.classList.contains('expanded')!==(i===event.data.step))toggleStep(card);});
      }
      cards.forEach((card,i)=>card.querySelector('button').addEventListener('click',()=>parent.postMessage({type:'yoga-step',step:i},'*')));
    });
    addEventListener('pagehide',()=>{stopTypingFlow();stopGeneratedMusic();});`].join('\n');
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'">'+styles+
    '<style>html, body{max-width:100%;overflow-x:hidden} .container{width:100%;padding:12px;box-sizing:border-box}.course-output{margin:0}.step-header{width:100%;text-align:left;color:inherit}.step-names,.info-box{min-width:0;overflow-wrap:anywhere}</style></head><body><main class="container">'+panel+
    '<div id="loadingState"></div><div id="courseOutput" class="course-output"></div></main><script>'+script+'</script></body></html>';
}
export default function yogaCourse(){
  const id='virtual:toss-yoga-reader';
  return {name:'toss-yoga-reader',resolveId(value){if(value===id)return '\0'+id;},load(value){if(value==='\0'+id){this.addWatchFile(path);return 'export default '+JSON.stringify(yogaReader());}}};
}
