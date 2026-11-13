import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SEASON_ONE} from '../../../lib/yeongnyangi/season-1.mjs';
import {PROLOGUE,PROLOGUE_DIR} from '../../../lib/yeongnyangi/prologue.mjs';
import {publishedEpisodes,nextRelease,formatKst,serialNow} from '../../../lib/yeongnyangi/serial.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
export function publishedMoonlightSeason(now=serialNow()){
  const options={root:resolve(root,'content')};
  const next=nextRelease(now,options);
  const chapters=[{...PROLOGUE,dir:PROLOGUE_DIR},...publishedEpisodes(now,options)].map(episode=>({
    no:episode.no,title:episode.title,slug:episode.slug,logline:episode.logline,
    pages:episode.pages.map(({n,alt})=>({alt,image:new URL(episode.dir+'/'+String(n).padStart(2,'0')+'-720.webp','https://code-destiny.com').href})),
  }));
  return {title:SEASON_ONE.title,chapters,next:next?.publishAt?next.no+'화 · '+formatKst(next.publishAt):''};
}
export default function moonlightSeason(){
  const id='virtual:toss-moonlight-season';
  return {name:'toss-moonlight-season',resolveId(name){if(name===id)return '\0'+id;},load(name){if(name==='\0'+id)return 'export default '+JSON.stringify(publishedMoonlightSeason());}};
}
