// The private fixture needs chapter labels, not the server's prompt/AsyncLocalStorage
// dependency graph. Read the canonical constants at build time, as offline preview does.
export default function privateSectionMetadata(){
 return {name:'private-original-section-metadata',enforce:'pre',
  resolveId(id,importer){if(id.endsWith('/worker/lib/destiny-compass-report-contract.js')&&importer?.replaceAll('\\','/').endsWith('/test/offline/compass.mjs'))return '\0private-compass-sections';},
  async load(id){if(id!=='\0private-compass-sections')return;
   const {COMPASS_SECTIONS}=await import('../../../worker/lib/destiny-compass-report-contract.js');
   return 'export const COMPASS_SECTIONS='+JSON.stringify(COMPASS_SECTIONS.map(({key,title})=>({key,title})))+';';
  },
 };
}
