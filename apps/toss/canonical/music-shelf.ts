import {allTracks} from '../../../app/music/_data/musicManifest';
import {getMusicTrackAccessPolicy} from '../../../lib/music-access-policy.js';

export function publicStreamList(tracks=allTracks){
  return tracks.flatMap(track=>{
    const current=getMusicTrackAccessPolicy(track.audioSourceKey);
    if(track.accessTier!=='free_full'||!current.hasFreeFullAccess)return [];
    const url=new URL(track.audioUrl);
    if(url.protocol!=='https:'||url.username||url.password||!['music.code-destiny.com','assets.code-destiny.com'].includes(url.hostname))throw new Error('Unexpected public music origin');
    return [{id:track.id,title:track.title,artist:track.artistName,artistKey:track.artistKey,stream:url.href}];
  });
}
export default function musicShelf(){
  const id='virtual:toss-music-shelf';
  return {name:'toss-public-music-streams',resolveId(name:string){if(name===id)return '\0'+id;},
    load(name:string){if(name==='\0'+id)return 'export default '+JSON.stringify(publicStreamList());}};
}
