import ts from 'typescript';
import {gzipSync} from 'node:zlib';

function literal(node){
 if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
 if(ts.isNumericLiteral(node))return Number(node.text);
 if(node.kind===ts.SyntaxKind.TrueKeyword)return true;
 if(node.kind===ts.SyntaxKind.FalseKeyword)return false;
 if(node.kind===ts.SyntaxKind.NullKeyword)return null;
 if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isNumericLiteral(node.operand))return -Number(node.operand.text);
 if(ts.isArrayLiteralExpression(node))return node.elements.map(literal);
 if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.map(property=>{
  if(!ts.isPropertyAssignment(property)||!(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)||ts.isNumericLiteral(property.name)))throw Error('Psychotest property is no longer literal');
  return [property.name.text,literal(property.initializer)];
 }));
 throw Error('Psychotest table is no longer literal');
}

// Change only the transport of the web's original questions, scores and copy.
export function compressPsychotestCopy(source){
 const tree=ts.createSourceFile('testData.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 // AURA_RESULTS contains the original scoring predicates; leave that table as code.
 const nodes=tree.statements.filter(ts.isVariableStatement).flatMap(statement=>[...statement.declarationList.declarations]).filter(node=>node.name.getText(tree)!=='AURA_RESULTS');
 if(!nodes.some(node=>node.name.getText(tree)==='ALL_TESTS')||!nodes.some(node=>node.name.getText(tree)==='IDEALSIGNAL_RESULTS'))throw Error('Original psychotest tables missing');
 const packed=gzipSync(JSON.stringify(nodes.map(node=>literal(node.initializer))),{level:9}).toString('base64');
 for(const [index,node] of [...nodes.entries()].reverse())source=source.slice(0,node.initializer.getStart(tree))+`originalPsychotestData[${index}]`+source.slice(node.initializer.end);
 return `import {gunzipSync as unpackPsychotestCopy,strFromU8 as readPsychotestCopy} from 'fflate';\nconst originalPsychotestData=JSON.parse(readPsychotestCopy(unpackPsychotestCopy(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))));\n`+source;
}
export default function compressedPsychotestCopy(){return {name:'toss-compressed-original-psychotest-copy',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').split('?')[0].endsWith('/src/features/psychotest/data/testData.ts'))return compressPsychotestCopy(code);}};}
