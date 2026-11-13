// Package the original browser quest selectors and renderer without the global web dashboard.
export function extractRpgEngine(entertain,profile){
 const part=(source,start,end)=>{
   const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
   if(a<0||b<=a)throw Error('Web RPG source changed at '+start);
   return source.slice(a,b);
 };
 const e=(a,b)=>part(entertain,a,b),p=(a,b)=>part(profile,a,b);
 const labels=Object.fromEntries([...entertain.matchAll(/"(ee_51[5-9]_prop_label|ee_520_prop_label)":\s*"([^"]+)"/g)].map(m=>[m[1],m[2]]));
 if(Object.keys(labels).length!==6)throw Error('Missing web RPG level titles');
 return [
  p('  var CD_LEVEL_BASE_EXP','  // 곡선을 바꿀 때마다'),p('  var CD_LEVEL_AWARD =','  /* 레벨 마일스톤'),p('  function _cdLevelExpToNext','  /* 해당 레벨'),
  'export const questRule=CD_LEVEL_AWARD.quest;export const levelState=_cdLevelState;',
  'export function characterSheet({stem,element,name,progress,completed,stored,document,account}){',
  'const w={GAN:{[stem]:{e:element}},USER_NAME:name};const _entertainText=key=>('+JSON.stringify(labels)+')[key];',
  e('  function seededShuffle','  // 오늘 날짜 문자열'),e('  var QUEST_DB','  // 비밀 팁 데이터'),
  e('  var RPG_STYLE_ID','  function ensureRpgUiStyles'),e('  function ensureRpgUiStyles','  function resolveRpgProfileId'),
  e('  function getKstDateString','  function getRpgLocalProfileId'),e('  function getRpgLocalMilestoneKeys','  function buildRpgLocalState'),
  e('  function buildRpgTemplate','  function syncRpgLayoutHeight'),
  `function getRpgLevelApi(){return {awardRules:CD_LEVEL_AWARD};}
   function getRpgStorageNotice(){return account?'내 계정에 저장됩니다':'이 기기에만 저장됩니다';}
   const pillars={d:{g:stem}},meta=buildRpgFallbackMeta({},pillars),generated=buildRpgFallbackQuests(meta);
   let quests=alignRpgQuestsToStore(generated,stored);
   if(account&&(!stored||!stored.length)&&completed.length){
     const catalogue=Object.values(QUEST_DB).flat();
     const restored=quests.map(q=>({id:q.questId,text:q.text,icon:q.icon}));
     for(const id of completed){
       if(restored.some(q=>q.id===id))continue;
       const definition=catalogue.find(q=>id==='daily-'+getKstDateString()+'-'+q.id);
       const index=restored.findIndex(q=>!completed.includes(q.id));
       if(definition&&index>=0)restored[index]={id,text:definition.text,icon:definition.icon};
     }
     quests=alignRpgQuestsToStore(generated,restored);
   }
   const completedQuestIds=quests.map(q=>q.questId).filter(id=>completed.includes(id));
   const state={...progress,quests,generationMeta:meta,completedQuestIds,questDateKst:getKstDateString(),
    todayMaxExp:questRule.exp*questRule.dailyLimit,todayEarnedExp:completedQuestIds.length*questRule.exp,
    unlockedMilestoneRewards:getRpgLocalMilestoneKeys(progress.currentLevel)};
   ensureRpgUiStyles();
   return {html:buildRpgTemplate(state,pillars,{}),quests,date:state.questDateKst};
  }`,
 ].join('\n');
}
