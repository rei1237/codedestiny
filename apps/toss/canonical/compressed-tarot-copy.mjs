import ts from 'typescript';
import {gzipSync} from 'node:zlib';

function literal(node){
 if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
 if(ts.isArrayLiteralExpression(node))return node.elements.map(literal);
 if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.map(property=>{
  if(!ts.isPropertyAssignment(property)||!(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)))throw Error('Tarot meaning property is no longer literal');
  return [property.name.text,literal(property.initializer)];
 }));
 throw Error('Tarot meaning table is no longer literal');
}

// Preserve source functions, table order and the warning-card ownership guard.
// Only the original two data literals change transport representation in Toss.
export function compressTarotCopy(source){
 const tree=ts.createSourceFile('rich-card-meanings.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const nodes=tree.statements.filter(ts.isVariableStatement).flatMap(statement=>[...statement.declarationList.declarations]).filter(declaration=>['MAJOR','MINOR'].includes(declaration.name.getText(tree)));
 if(nodes.length!==2||new Set(nodes.map(node=>node.name.getText(tree))).size!==2)throw Error('Original tarot meaning tables missing');
 const tables=nodes.map(node=>literal(node.initializer));
 const packed=gzipSync(JSON.stringify(tables),{level:9}).toString('base64');
 for(const [index,node] of [...nodes.entries()].reverse())source=source.slice(0,node.initializer.getStart(tree))+`originalTarotMeanings[${index}]`+source.slice(node.initializer.end);
 return `import {gunzipSync as unpackTarotCopy,strFromU8 as readTarotCopy} from 'fflate';\nconst originalTarotMeanings=JSON.parse(readTarotCopy(unpackTarotCopy(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))));\n`+source;
}
export default function compressedTarotCopy(){return {name:'toss-compressed-original-tarot-copy',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').split('?')[0].endsWith('/lib/tarot/rich-card-meanings.mjs'))return compressTarotCopy(code);}};}
