import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';

const source=new URL('../../../public/',import.meta.url);
const read=path=>readFileSync(new URL(path,source),'utf8');
export function novelBook(){
  const manifest=JSON.parse(read('data/novel/manifest.json'));
  const shell=read('codedestiny-novel.html');
  const namesLiteral=/var NAME=(\{[^}]+\});/.exec(shell)?.[1];
  if(!namesLiteral)throw new Error('Novel cast table missing');
  const names=JSON.parse(namesLiteral.replace(/([{,]\s*)(\w+):/g,'$1"$2":'));
  const episodes=[],text={};
  let neoForm='lion';
  for(const item of manifest.episodes){
    if(!/^[a-z0-9-]+$/.test(item.id)||item.path!=='/data/novel/episodes/'+item.id+'.json')throw new Error('Invalid novel episode path');
    const chapter=JSON.parse(read(item.path.slice(1)));
    if(chapter.id!==item.id||chapter.sourceHash!==manifest.sourceHash||chapter.beats.length!==item.beatCount)throw new Error('Novel source mismatch: '+item.id);
    const lines=chapter.beats.map(beat=>{
      if(beat.neoForm)neoForm=beat.neoForm;
      if(!Object.hasOwn(names,beat.s)||typeof beat.t!=='string')throw new Error('Invalid novel line: '+beat.id);
      return [beat.nm||(beat.s==='neo'&&neoForm!=='human'?'영냥이':names[beat.s]),beat.t];
    });
    const choices=chapter.beats.filter(beat=>beat.choice);
    if(choices.length>1||(choices.length&&choices[0]!==chapter.beats.at(-1)))throw new Error('Unsupported mid-chapter choice');
    const options=choices[0]?.choice.options.map(({label,target})=>({label,target}))||[];
    if(options.some(o=>!manifest.episodes.some(e=>e.id===o.target)))throw new Error('Missing novel branch');
    episodes.push({id:item.id,rev:item.rev||1,title:item.tag,ending:item.ending?.label??null,branch:item.branch??null,options,count:lines.length});
    text[item.id]=lines;
  }
  return {episodes,text};
}
export default function novelReader(){
  const moduleId='virtual:toss-novel-book';
  return {name:'toss-novel-reader',resolveId(id){if(id===moduleId)return '\0'+id;},
    load(id){if(id==='\0'+moduleId){
      const packed=gzipSync(JSON.stringify(novelBook()),{level:9}).toString('base64');
      return `import {gunzipSync,strFromU8} from 'fflate';export default JSON.parse(strFromU8(gunzipSync(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))));`;
    }}};
}
