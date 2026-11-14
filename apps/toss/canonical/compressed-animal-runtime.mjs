import ts from 'typescript';
import {gzipSync} from 'node:zlib';

function literal(node){
 if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
 if(ts.isNumericLiteral(node))return Number(node.text);
 if(node.kind===ts.SyntaxKind.TrueKeyword)return true;
 if(node.kind===ts.SyntaxKind.FalseKeyword)return false;
 if(node.kind===ts.SyntaxKind.NullKeyword)return null;
 if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isNumericLiteral(node.operand)&&Number(node.operand.text)!==0)return -Number(node.operand.text);
 if(ts.isArrayLiteralExpression(node))return node.elements.map(literal);
 if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.map(property=>{
  if(!ts.isPropertyAssignment(property)||!(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)||ts.isNumericLiteral(property.name)))throw Error('not literal');
  return [property.name.text,literal(property.initializer)];
 }));
 throw Error('not literal');
}
export function compressAnimalRuntime(source){
 const tree=ts.createSourceFile('runtime.generated.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const factory=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createAnimalDestinyRuntime');
 if(!factory?.body)throw Error('Original animal runtime missing');
 const tables=[],edits=[];
 function visit(node){
  if(ts.isTemplateExpression(node)&&!ts.isTaggedTemplateExpression(node.parent)&&node.head.text.length+node.templateSpans.reduce((sum,span)=>sum+span.literal.text.length,0)>32){
   const part=text=>'${originalAnimalData['+(tables.push(text)-1)+']}';
   const expression='`'+part(node.head.text)+node.templateSpans.map(span=>'${'+source.slice(span.expression.getStart(tree),span.expression.end)+'}'+part(span.literal.text)).join('')+'`';
   edits.push({start:node.getStart(tree),end:node.end,text:expression});return;
  }
  if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))&&node.text.length>24&&node.parent?.name!==node&&!ts.isTaggedTemplateExpression(node.parent)){
   const index=tables.push(node.text)-1;
   edits.push({start:node.getStart(tree),end:node.end,text:`originalAnimalData[${index}]`});return;
  }
  if(ts.isObjectLiteralExpression(node)||ts.isArrayLiteralExpression(node)){
   let value;try{value=literal(node);}catch{/* Expressions and functions remain authored code. */}
   if(value&&JSON.stringify(value).length>256){
    const index=tables.push(value)-1;
    // A fresh copy at every original expression preserves mutation and identity boundaries.
    edits.push({start:node.getStart(tree),end:node.end,text:`structuredClone(originalAnimalData[${index}])`});return;
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(factory.body);if(tables.length<1)throw Error('Original animal literal tables missing');
 for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
 const packed=gzipSync(JSON.stringify(tables),{level:9}).toString('base64');
 return `import {gunzipSync as unpackAnimalData,strFromU8 as readAnimalData} from 'fflate';\nconst originalAnimalData=JSON.parse(readAnimalData(unpackAnimalData(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))));\n`+source;
}
