import {readFile} from 'node:fs/promises';
import {secretHouseDocument} from '../service/secret-house-loader.mjs';
export function separateSecretHouseImages(source){
 const images=[];
 const html=secretHouseDocument(source).replace(/data:image\/(png|webp|jpeg);base64,([A-Za-z0-9+/=]+)/g,(_match,format,data)=>{
  const fileName=`assets/private-secret-house-${images.length}.${format}`;
  images.push({fileName,source:Buffer.from(data,'base64')});return '/'+fileName;
 }).replace('img-src data:','img-src \'self\' data:');
 return {html,images};
}
export default function privateSecretHouseDocument(){
 return {name:'private-sandboxed-secret-house',enforce:'pre',
  resolveId(id){if(id==='virtual:secret-house-page')return '\0private-secret-house-document';},
  async load(id){if(id!=='\0private-secret-house-document')return;
   const file=new URL('../../../public/secret-house_real.html',import.meta.url);this.addWatchFile(file.pathname);
   const {html,images}=separateSecretHouseImages(await readFile(file,'utf8'));
   for(const image of images)this.emitFile({type:'asset',...image});
   const ref=this.emitFile({type:'asset',fileName:'assets/private-secret-house.html',source:html});
   return 'export default import.meta.ROLLUP_FILE_URL_'+ref+';';
  },
  transform(code,id){if(!id.replaceAll('\\','/').split('?')[0].endsWith('/apps/toss/src/SecretHouseReading.tsx'))return;
   if(!code.includes('srcDoc={page}'))throw Error('Secret House sandbox boundary changed');
   return code.replace('srcDoc={page}','src={page}');
  },
 };
}
