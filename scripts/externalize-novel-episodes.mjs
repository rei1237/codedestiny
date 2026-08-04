import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const NOVEL_PATH = resolve(ROOT, "public/codedestiny-novel.html");
const START = "var EPISODES=[];";
const END = "window.__NOVEL_READY=true;";

const loader = `/* ============================================================
   리마스터 정본 로더
   - 정본: content/novel/episodes.source.json
   - 산출물: /data/novel/manifest.json + 에피소드별 청크
   초기 HTML은 엔진·에셋 맵·진입 UI만 보관하고, 현재 화와 다음 화만 요청한다.
   ============================================================ */
var EPISODES=[];
var NOVEL_MANIFEST=null;
var NOVEL_DATA_READY=null;
var NOVEL_EPISODE_LOADS={};
function episodeMeta(meta){return {id:meta.id,no:meta.no,tag:meta.tag,title:meta.title,beatCount:meta.beatCount,chunkPath:meta.path,beats:null};}
function initNovelData(){
  if(NOVEL_DATA_READY)return NOVEL_DATA_READY;
  NOVEL_DATA_READY=fetch("/data/novel/manifest.json",{cache:"force-cache"}).then(function(response){
    if(!response.ok)throw new Error("manifest HTTP "+response.status);
    return response.json();
  }).then(function(manifest){
    if(!manifest||!Array.isArray(manifest.episodes)||!manifest.episodes.length)throw new Error("invalid manifest");
    NOVEL_MANIFEST=manifest;EPISODES=manifest.episodes.map(episodeMeta);return manifest;
  });
  return NOVEL_DATA_READY;
}
function resolveSavedEpisode(save){
  if(save&&save.episodeId){for(var i=0;i<EPISODES.length;i++)if(EPISODES[i].id===save.episodeId)return i;}
  if(save&&typeof save.ep==="number"&&save.ep>=0&&save.ep<EPISODES.length)return save.ep;
  return 0;
}
function resolveSavedBeat(ep,save){
  var beats=EPISODES[ep]&&EPISODES[ep].beats||[];
  if(save&&save.beatId){for(var i=0;i<beats.length;i++)if(beats[i].id===save.beatId)return i;}
  var fallback=save&&typeof save.bi==="number"?save.bi:0;
  return Math.max(0,Math.min(fallback,Math.max(0,beats.length-1)));
}
function warmNextEpisode(index){
  var next=index+1;if(next>=EPISODES.length)return;
  setTimeout(function(){ensureEpisodeLoaded(next).catch(function(){});},0);
}
function ensureEpisodeLoaded(index){
  return initNovelData().then(function(){
    var episode=EPISODES[index];if(!episode)throw new Error("invalid episode index "+index);
    if(Array.isArray(episode.beats))return episode;
    if(NOVEL_EPISODE_LOADS[index])return NOVEL_EPISODE_LOADS[index];
    NOVEL_EPISODE_LOADS[index]=fetch(episode.chunkPath,{cache:"force-cache"}).then(function(response){
      if(!response.ok)throw new Error("episode HTTP "+response.status);return response.json();
    }).then(function(chunk){
      if(!chunk||chunk.id!==episode.id||chunk.sourceHash!==NOVEL_MANIFEST.sourceHash||!Array.isArray(chunk.beats))throw new Error("invalid episode chunk "+episode.id);
      EPISODES[index]=chunk;warmNextEpisode(index);return chunk;
    }).catch(function(error){delete NOVEL_EPISODE_LOADS[index];throw error;});
    return NOVEL_EPISODE_LOADS[index];
  });
}
initNovelData().then(function(){
  window.__NOVEL_READY=true;
  if(location.hash==="#play"||location.hash==="#novel")bootDirectPlay();
}).catch(function(error){
  window.__NOVEL_READY=false;console.error("[CODE DESTINY VN] data load failed",error);
  var button=document.getElementById("enterBtn");if(button){button.disabled=true;button.textContent="소설 데이터를 불러오지 못했어요";}
});`;

const source = readFileSync(NOVEL_PATH, "utf8");
const start = source.indexOf(START);
const end = source.indexOf(END, start);
if (start < 0 || end < 0) throw new Error("레거시 EPISODES 구간을 찾지 못했습니다.");
const count = (source.slice(start, end).match(/EPISODES\.push\(/g) || []).length;
if (count !== 44) throw new Error(`예상한 44화가 아니라 ${count}화입니다. 정본을 덮어쓰지 않습니다.`);
writeFileSync(NOVEL_PATH, `${source.slice(0, start)}${loader}\n${source.slice(end + END.length)}`, "utf8");
console.log(`정적 플레이어에서 ${count}화 원문을 외부 청크 로더로 교체했습니다.`);
