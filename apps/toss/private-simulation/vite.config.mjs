import compressedNamingData from './compressed-naming-data.mjs';
import privateYogaReader from './yoga-reader.mjs';
import privateSectionMetadata from './section-metadata.mjs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import base from '../vite.config.ts';
const here=dirname(fileURLToPath(import.meta.url));
const shell=resolve(here,'..');
const sdk=resolve(here,'sdk.mjs');
const release=resolve(shell,'src/release').replaceAll('\\','/');
const banner='<aside id="private-simulation-marker" aria-label="비공개 모의 상담" style="position:sticky;top:0;z-index:999;height:auto;display:flex;align-items:center;justify-content:space-between;background:#39254d;color:white;padding:4px 12px;font:600 12px/1.35 sans-serif"><span>비공개 모의 상담 · 실제 결제 없음</span><select id="private-simulation-person" aria-label="모의 계정" style="font:inherit;color:#211429;background:white;border-radius:4px;padding:4px"><option value="A">모의 계정 A</option><option value="B">모의 계정 B</option></select></aside>';
const csp="default-src 'self' data: blob:; script-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'self'; form-action 'none'; object-src 'none'; base-uri 'self'";
function privateSimulation(){
  return {name:'private-simulation-only',enforce:'pre',
    resolveId(id,importer){
      if(!importer)return;
      const from=importer.replaceAll('\\','/').split('?')[0];
      if(from.endsWith('/worker/toss/tarot-library.js')&&id==='./tarot-library-generator.js')return resolve(here,'free-tarot-generator.mjs');
      if(!from.endsWith('/private-simulation/tarot-links.mjs')&&id.endsWith('/lib/tarot/toss-library-links.mjs'))return resolve(here,'tarot-links.mjs');
      if(id.startsWith('.')&&resolve(dirname(from),id).replaceAll('\\','/')===release)return '\0private-release';
      if(id==='@apps-in-toss/web-framework'&&/\/apps\/toss\/(?:src|service)\//.test(from)){
        if(/\/src\/App\.tsx$|\/service\/Screens\.jsx$/.test(from))return;
        return sdk;
      }
    },
    load(id){if(id==='\0private-release')return 'export const SERVICE_AVAILABLE=true,NEW_PURCHASES_AVAILABLE=true;';},
    transform(code,id){
      const from=id.replaceAll('\\','/').split('?')[0];
      if(from.endsWith('/apps/toss/service/VedicReading.jsx')){const slot='<Reading {...props}/>';if(!code.includes(slot))throw Error('Private Vedic example slot changed');return code.replace(slot,"<Reading {...props} exampleBirth={{date:'1990-02-03',time:'08:35',unknown:false,calendar:'solar',gender:'F',city:'서울'}}/>");}
      if(from.endsWith('/apps/toss/src/platform.ts')){
        const api="const API='https://code-destiny.com/api/toss';";
        if(!code.includes(api))throw Error('Private simulation API boundary changed');
        return code.replace(api,"const API=location.origin+'/private-simulation-api';");
      }
      // Only the original screen and shell keep the real navigation/safe area SDK.
      if(/\/apps\/toss\/(src\/App\.tsx|service\/Screens\.jsx)$/.test(from)){
        const imports=[...code.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]@apps-in-toss\/web-framework['"]/g)].flatMap(match=>match[1].split(',').map(item=>item.trim().split(/\s/)[0]));
        if(imports.length!==3||imports.some(name=>!['SafeArea','Screen','graniteEvent'].includes(name)))throw Error('Private simulation native SDK allowlist changed: '+from);
      }
      if(from.endsWith('/apps/toss/src/main.tsx'))return "import '/private-simulation/bootstrap.mjs';\n"+code;
    },
    transformIndexHtml:{order:'pre',handler(html){return html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">').replace('<body>','<body>'+banner);}},
  };
}
export default async env=>{
  if(env.command!=='build'||env.mode!=='private-simulation')throw Error('Use build:private-simulation for the isolated private archive');
  const config=await base(env);
  return {...config,root:shell,plugins:[privateSimulation(),privateSectionMetadata(),privateYogaReader(),compressedNamingData(),...config.plugins],build:{...config.build,outDir:resolve(here,'dist')}};
};
