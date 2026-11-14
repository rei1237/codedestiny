import ts from 'typescript';
import {gzipSync} from 'node:zlib';
// Keep the original locale functions and object shape. Pack only string-valued
// properties, with no evaluation or alteration of translations or policy copy.
export function compressLocaleCopy(source){
 const tree=ts.createSourceFile('copy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),tables=[],edits=[];
 function visit(node){
  if(ts.isObjectLiteralExpression(node)){
   const entries=node.properties.filter(property=>ts.isPropertyAssignment(property)&&ts.isStringLiteral(property.initializer)&&(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)));
   if(entries.length>10){
    const slot=tables.push(Object.fromEntries(node.properties.map(property=>{if(!ts.isPropertyAssignment(property)||!(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)))throw Error('Original translation shape changed');return [property.name.text,ts.isStringLiteral(property.initializer)?property.initializer.text:null];})))-1;
    const retained=node.properties.filter(property=>!entries.includes(property)).map(property=>source.slice(property.getStart(tree),property.end));
    edits.push({start:node.getStart(tree),end:node.end,text:`{...originalLocaleText[${slot}],${retained.join(',')}}`});return;
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);
 if(tables.length<1)throw Error('Original locale translation table missing');
 const packed=gzipSync(JSON.stringify(tables),{level:9}).toString('base64');
 for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
 return `import {gunzipSync as unpackLocaleText,strFromU8 as readLocaleText} from 'fflate';\nconst originalLocaleText=JSON.parse(readLocaleText(unpackLocaleText(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))));\n`+source;
}

export default function compressedLocaleCopy(){return {name:'toss-compressed-original-locale-copy',enforce:'pre',transform(code,id){if(['nakshatra','destiny-compass','palm-reading'].some(feature=>id.replaceAll('\\','/').split('?')[0].endsWith('/app/'+feature+'/_lib/copy.ts')))return compressLocaleCopy(code);}};}
