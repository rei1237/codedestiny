import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('js/saju-engine.js','utf8');
const ast=ts.createSourceFile('saju-engine.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declarations=new Map();
for(const node of ast.statements){
  if(ts.isFunctionDeclaration(node)&&node.name)declarations.set(node.name.text,node.getText(ast));
  if(ts.isVariableStatement(node))for(const d of node.declarationList.declarations)if(ts.isIdentifier(d.name))declarations.set(d.name.text,`var ${d.getText(ast)};`);
}
const helpers=['sajuHapAssessment','sajuSamhapState'];
const names=['GAN','JI','CD_JANGGAN',...helpers];
for(const name of names)if(!declarations.has(name))throw new Error(`Missing saju rule: ${name}`);
const target='lib/saju/luck-rules.js';
const result='// Generated from js/saju-engine.js by scripts/sync-saju-luck-rules.mjs.\n'+names.map(name=>declarations.get(name)).join('\n\n')+'\nexport { '+helpers.join(', ')+' };\n';
const normalize=s=>s.replace(/\r\n/g,'\n');
if(process.argv.includes('--write')){
  fs.writeFileSync(target,result);
  const powerPath='lib/saju/natal-power.js';
  let power=fs.readFileSync(powerPath,'utf8');
  const powerAst=ts.createSourceFile(powerPath,power,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const old=powerAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='detectJong');
  if(!old)throw new Error('Missing shared detectJong');
  power=power.slice(0,old.getStart(powerAst))+'export '+declarations.get('detectJong')+power.slice(old.end);
  if(!power.includes('import { sajuHapAssessment }'))power="import { sajuHapAssessment } from './luck-rules.js';\n"+power;
  fs.writeFileSync(powerPath,power);
  console.log('Synced saju luck rules and shared natal interpretation');
}else{
  if(normalize(fs.readFileSync(target,'utf8'))!==normalize(result))throw new Error('Saju luck rules drift: run node scripts/sync-saju-luck-rules.mjs --write');
  const powerPath='lib/saju/natal-power.js';
  const powerAst=ts.createSourceFile(powerPath,fs.readFileSync(powerPath,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const sharedJong=powerAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='detectJong');
  if(!sharedJong || normalize(sharedJong.getText(powerAst).replace(/^export\s+/,''))!==normalize(declarations.get('detectJong'))){
    throw new Error('Saju natal interpretation drift: run node scripts/sync-saju-luck-rules.mjs --write');
  }
  console.log('PASS shared saju luck rules match shell');
}
