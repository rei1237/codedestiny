import { createHash } from 'node:crypto';
import { isCompleteNovelTranslation } from './novel-translation-contract.mjs';
import { NOVEL_LOCALES } from '../../lib/stories/vn/locales.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const episodeId=episode=>episode.no==='PROLOGUE'?'prologue':episode.no.toLowerCase().replace('.','-');

// Offline assembly only. A draft can never certify a different source sentence.
export function assembleNovelAuthored(sourceRaw, documents, locale, uiCopy) {
  if(!NOVEL_LOCALES.includes(locale)||locale==='ko')throw new Error('Unsupported translation locale');
  const source=JSON.parse(sourceRaw), missing=[], records=new Map(), metadata=new Map();
  const sourceEpisodes=new Map(source.episodes.map(episode=>[episodeId(episode),episode]));
  for(const document of documents){
    if(document.locale&&document.locale!==locale)continue;
    const src=sourceEpisodes.get(document.episodeId);
    if(!src)throw new Error(`Unknown authored episode: ${document.episodeId}`);
    const meta=document.metadata?.[locale]||(document.locale===locale?document:null);
    if(meta?.title||meta?.tag){
      if(document.sourceTitle!==src.title||document.sourceTag!==src.tag)throw new Error(`Stale authored metadata: ${document.episodeId}/${locale}`);
      if(metadata.has(document.episodeId))throw new Error(`Duplicate authored metadata: ${document.episodeId}/${locale}`);
      metadata.set(document.episodeId,meta);
    }
    const sourceBeats=new Map(src.beats.map((beat,index)=>[beat.id||`${document.episodeId}:${index+1}`,beat]));
    for(const row of document.rows||document.beats||[]){
      const translated=row.translations?.[locale]??(document.locale===locale?row.t:undefined);
      if(translated===undefined)continue;
      const original=sourceBeats.get(row.id);
      if(!original||row.source!==original.t||row.sourceHash!==hash(original.t))throw new Error(`Stale authored beat: ${row.id}/${locale}`);
      const key=`${document.episodeId}/${row.id}`;
      if(records.has(key))throw new Error(`Duplicate authored beat: ${key}/${locale}`);
      records.set(key,{...row,...row.fields?.[locale],t:translated});
    }
  }
  const complete=(value,key)=>{
    if(!isCompleteNovelTranslation(value)){missing.push(key);return '';}
    return value;
  };
  const display=(original,translated,key)=>complete(translated??uiCopy?.copy?.[original]?.[uiCopy.locales.indexOf(locale)],key);
  let translatedBeats=0;
  const episodes=source.episodes.map(src=>{
    const id=episodeId(src),meta=metadata.get(id);
    return {
      id,no:src.no,title:complete(meta?.title,`${id}/title`),tag:complete(meta?.tag,`${id}/tag`),
      ...(src.ending?{ending:{label:complete(meta?.ending?.label,`${id}/ending`)}}:{}),
      beats:src.beats.map((beat,index)=>{
        const beatId=beat.id||`${id}:${index+1}`,row=records.get(`${id}/${beatId}`);
        const t=complete(row?.t,`${beatId}/t`);if(t)translatedBeats++;
        return {
          id:beatId,t,
          ...(beat.nm?{nm:display(beat.nm,row?.nm,`${beatId}/nm`)}:{}),
          ...(beat.skill?.name?{skill:{name:display(beat.skill.name,row?.skill?.name,`${beatId}/skill.name`)}}:{}),
          ...(beat.choice?{choice:{options:beat.choice.options.map(option=>({id:option.id,label:display(option.label,row?.choice?.options?.find(item=>item.id===option.id)?.label,`${beatId}/choice/${option.id}`)}))}}:{}),
        };
      }),
    };
  });
  return {translation:{schemaVersion:1,locale,sourceHash:hash(sourceRaw),episodes},missing,translatedBeats,totalBeats:source.episodes.reduce((sum,item)=>sum+item.beats.length,0)};
}
