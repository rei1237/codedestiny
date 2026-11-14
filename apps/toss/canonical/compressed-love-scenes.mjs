import ts from 'typescript';
import {gzipSync} from 'node:zlib';

// Transport the entire original scene table, including every locale and choice.
// Only literal data is accepted: no executable source is evaluated at build time.
function literal(node){
 if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
 if(ts.isNumericLiteral(node))return Number(node.text);
 if(node.kind===ts.SyntaxKind.TrueKeyword)return true;
 if(node.kind===ts.SyntaxKind.FalseKeyword)return false;
 if(node.kind===ts.SyntaxKind.NullKeyword)return null;
 if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isNumericLiteral(node.operand))return -Number(node.operand.text);
 if(ts.isArrayLiteralExpression(node))return node.elements.map(literal);
 if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.map(property=>{
  if(!ts.isPropertyAssignment(property)||!(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)))throw Error('Love scene property is no longer literal');
  return [property.name.text,literal(property.initializer)];
 }));
 throw Error('Love scene table is no longer literal');
}
export function compressLoveScenes(source){
 const parsed=ts.createSourceFile('loveCodeMvp.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const declarations=parsed.statements.filter(ts.isVariableStatement).flatMap(statement=>[...statement.declarationList.declarations]);
 const node=declarations.find(declaration=>declaration.name.getText(parsed)==='LOVE_SCENE_DEFINITIONS')?.initializer;
 if(!node)throw Error('Original love scene table missing');
 const data=literal(node),packed=gzipSync(JSON.stringify(data),{level:9}).toString('base64');
 return "import {gunzipSync as unpackLoveScenes,strFromU8 as loveSceneText} from 'fflate';\n"+source.slice(0,node.getStart(parsed))+`JSON.parse(loveSceneText(unpackLoveScenes(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))))`+source.slice(node.end);
}
export default function compressedLoveScenes(){
 return {name:'toss-compressed-original-love-scenes',enforce:'pre',transform(code,id){
  if(id.replaceAll('\\','/').split('?')[0].endsWith('/app/saju/love-simulation/_data/loveCodeMvp.ts'))return compressLoveScenes(code);
 }};
}
