import ts from 'typescript';
import {gzipSync} from 'node:zlib';

function literal(node){
 if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
 if(ts.isNumericLiteral(node))return Number(node.text);
 if(ts.isArrayLiteralExpression(node))return node.elements.map(literal);
 if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.map(property=>{
  if(!ts.isPropertyAssignment(property)||!(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)||ts.isNumericLiteral(property.name)))throw Error('Tarot meaning property is no longer literal');
  return [property.name.text,literal(property.initializer)];
 }));
 throw Error('Tarot meaning table is no longer literal');
}

// Preserve source functions, table order and the warning-card ownership guard.
// Only the original two data literals change transport representation in Toss.
export function compressTarotCopy(source,names=['MAJOR','MINOR']){
 const tree=ts.createSourceFile('rich-card-meanings.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const nodes=tree.statements.filter(ts.isVariableStatement).flatMap(statement=>[...statement.declarationList.declarations]).filter(declaration=>names.includes(declaration.name.getText(tree)));
 if(nodes.length!==names.length||new Set(nodes.map(node=>node.name.getText(tree))).size!==names.length)throw Error('Original tarot meaning tables missing');
 const tables=nodes.map(node=>literal(node.initializer));
 const packed=gzipSync(JSON.stringify(tables),{level:9}).toString('base64');
 for(const [index,node] of [...nodes.entries()].reverse())source=source.slice(0,node.initializer.getStart(tree))+`originalTarotMeanings[${index}]`+source.slice(node.initializer.end);
 return `import {gunzipSync as unpackTarotCopy,strFromU8 as readTarotCopy} from 'fflate';\nconst originalTarotMeanings=JSON.parse(readTarotCopy(unpackTarotCopy(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))));\n`+source;
}
export const tarotCopyTables={
 'rich-card-meanings.mjs':['MAJOR','MINOR'],
 'sun-recovery-card-copy.mjs':['MAJOR_COPY','SWORDS_COPY','CUPS_COPY','WANDS_COPY','PENTACLES_COPY'],
 'tarot-interpretation-engine.mjs':['TAROT_INTERPRETATION_TEXT_TRANSLATIONS','FORBIDDEN_QUALITY_PHRASES','MONTHLY_ZODIAC_FLOW','POSITION_SELF_ESTEEM_CONTEXT','REUNION_ACTION_SCRIPT','REUNION_CAUTION_SCRIPT','REUNION_CARD_SYMBOLS','REUNION_MAJOR_FALLBACK_SYMBOLS','REUNION_SUIT_FALLBACK','REUNION_RANK_FALLBACK','HEALING_POSITION_LABELS','HEALING_POSITION_KEYS','HEALING_SUIT_COPY','HEALING_SUIT_ROUTINES','YEARLY_SUIT_FLOW','YEARLY_RANK_FLOW','YEARLY_ZODIAC_LEAD','YEARLY_ADVICE_ACTION'],
};
export default function compressedTarotCopy(){return {name:'toss-compressed-original-tarot-copy',enforce:'pre',transform(code,id){const path=id.replaceAll('\\','/').split('?')[0];for(const [file,names] of Object.entries(tarotCopyTables))if(path.endsWith('/lib/tarot/'+file))return compressTarotCopy(code,names);}};}
