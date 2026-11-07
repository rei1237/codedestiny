import {getPublishedProfiles} from '../../../lib/famous-saju/profile-publication.js';

// Only project published article fields into the client bundle. Drafts and review metadata stay in the source registry.
export function publishedReadings(){
  return getPublishedProfiles().map(({slug,name,aliases,fields,intro,question,career,reading,sources})=>
    ({slug,name,aliases,fields,intro,question,career,reading,sources:sources.map(({label,url})=>({label,url}))}));
}
export default function famousArchive(){
  const moduleId='virtual:toss-famous-archive';
  return {name:'toss-published-famous-readings',resolveId(id){if(id===moduleId)return '\0'+moduleId;},
    load(id){if(id==='\0'+moduleId)return 'export default '+JSON.stringify(publishedReadings());}};
}
