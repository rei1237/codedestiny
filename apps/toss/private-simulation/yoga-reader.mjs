import {yogaReader} from '../canonical/yoga-course.mjs';
// srcdoc inherits the private shell's strict script CSP. Emit the unchanged
// canonical reader as its own sandboxed document with its original restrictive
// CSP, instead of weakening the shell's script policy for inline scripts.
export default function privateYogaReader(){
 return {name:'private-sandboxed-yoga-document',enforce:'pre',
  resolveId(id){if(id==='virtual:toss-yoga-reader')return '\0private-yoga-document';},
  load(id){if(id!=='\0private-yoga-document')return;
   const ref=this.emitFile({type:'asset',fileName:'assets/private-yoga-reader.html',source:yogaReader()});
   return 'export default import.meta.ROLLUP_FILE_URL_'+ref+';';
  },
  transform(code,id){if(!id.replaceAll('\\','/').split('?')[0].endsWith('/apps/toss/src/YogaGuru.tsx'))return;
   if(!code.includes('srcDoc={reader}'))throw Error('Canonical Yoga iframe boundary changed');
   return code.replace('srcDoc={reader}','src={reader}');
  },
 };
}
