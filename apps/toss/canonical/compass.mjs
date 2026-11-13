import {fileURLToPath} from 'node:url';
const modules={
  '../_lib/rpg-bridge':'CompassRuntime',
  '../_lib/archive':'CompassRuntime',
  '../data/assets':'CompassArt',
  './PigFace':'CompassArt',
  './ReportActions':'CompassActions',
  '../_hooks/useCompassReport':'CompassReportHook',
  '@/app/_lib/free-reading-access':'CompassRuntime',
  '@/app/hooks/useAiProfileSeed':'CompassRuntime',
  '@/app/components/SavedBirthProfilePicker':'CompassProfiles',
  '@/app/components/CraftedProductDisclosure':'CompassProductInfo',
};
function adapter(name) {
  return fileURLToPath(new URL('../src/'+name+'.tsx',import.meta.url)).replaceAll(String.fromCharCode(92),'/');
}
function swapImport(code,from,to) {
  for(const quote of ['"',"'"])code=code.replaceAll(quote+from+quote,JSON.stringify(adapter(to)));
  return code;
}
export default function compass() {
  return {name:'toss-compass',enforce:'pre',transform(code,path){
    const id=path.replaceAll(String.fromCharCode(92),'/');
    if(id.endsWith('/lib/sukuyo-engine-server.ts'))return swapImport(code,'@/worker/lib/sukuyo-astronomy.js','CompassRuntime');
    if(id.includes('/app/destiny-compass/')) {
      for(const [from,to] of Object.entries(modules))code=swapImport(code,from,to);
    }
    if(id.endsWith('/app/destiny-compass/_components/CompassReport.tsx')||id.endsWith('/app/saju/animal-destiny/lib/sajuAdapter.ts')) {
      return 'import {compassFetch} from '+JSON.stringify(adapter('CompassRuntime'))+';\n'+code
        .replace('fetch("/api/destiny-compass/narrate",','compassFetch("/api/destiny-compass/narrate",')
        .replace('fetchWithTimeout(KASI_CALENDAR_ENDPOINT,','compassFetch(KASI_CALENDAR_ENDPOINT,');
    }
    if(id.includes('/app/destiny-compass/'))return code;
  }};
}
