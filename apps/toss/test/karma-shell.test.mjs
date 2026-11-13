import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';import {build} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),Module=require('node:module'),root=path.resolve(import.meta.dirname,'../../..');
const source=fs.readFileSync(path.join(root,'apps/toss/src/main.tsx'),'utf8'),tree=ts.createSourceFile('main.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let expression;function walk(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='originalScreen')expression=node.initializer.getText(tree);ts.forEachChild(node,walk);}walk(tree);assert.ok(expression);
test('direct Karma input and result URLs enter the service shell',()=>{
 for(const [pathname,expected] of [['/karma-destiny-ai/',true],['/karma-destiny-ai/result/',true],['/karma-destiny-ai/other/',false]])assert.equal(vm.runInNewContext(expression,{location:{pathname}}),expected);
});
test('direct Maya calendar URLs enter the service shell without capturing other paths',()=>{
 for(const [pathname,expected] of [['/maya',true],['/maya/',true],['/maya/result/',false]])assert.equal(vm.runInNewContext(expression,{location:{pathname}}),expected);
});
const stubs={
 '@/app/_lib/auth-store':"export const useAuthStore=()=>globalThis.__karmaShellAuth;",
 '@/app/_lib/toss-consultation-copy':"export const useTossConsultationCopy=()=>({locale:'ko',copy:{login:'로그인 필요',loginLink:'토스로 로그인하기'}});",
 '@/app/karma-destiny-ai/KarmaDestinyAiClient':"export default function Input(){return 'INPUT_SCREEN';}",
 '@/app/karma-destiny-ai/result/KarmaDestinyAiResultClient':"export default function Result(){return 'RESULT_SCREEN';}",
 './TossAstrologyProfilePicker':"export default function Profile(){return null;}",
 './TossTeaPrice':"export default function Price(){return null;}",
};
const bundle=await build({entryPoints:[path.join(root,'apps/toss/service/TossKarma.tsx')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',plugins:[{name:'mock-boundaries',setup(b){b.onResolve({filter:/.*/},args=>stubs[args.path]?{path:args.path,namespace:'mock'}:null);b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:stubs[args.path],loader:'jsx'}));}}]});
const mod=new Module(path.join(root,'karma-shell-fixture.cjs'));mod.paths=Module._nodeModulePaths(root);mod._compile(bundle.outputFiles[0].text,mod.id);const Shell=mod.exports.default;
test('logged out direct result returns to the same local path after Toss login',()=>{
 globalThis.__karmaShellAuth={isAuthenticated:false};globalThis.location={pathname:'/karma-destiny-ai/result/',search:'?sessionId=owned'};
 try{const html=renderToStaticMarkup(React.createElement(Shell,{result:true}));assert.match(html,/토스로 로그인하기/);assert.match(html,/next=%2Fkarma-destiny-ai%2Fresult%2F%3FsessionId%3Downed/);assert.doesNotMatch(html,/RESULT_SCREEN/);}
 finally{delete globalThis.__karmaShellAuth;delete globalThis.location;}
});
test('authenticated input and result use their respective screens',()=>{
 globalThis.__karmaShellAuth={isAuthenticated:true};globalThis.location={pathname:'/karma-destiny-ai/',search:''};
 try{assert.match(renderToStaticMarkup(React.createElement(Shell)),/INPUT_SCREEN/);assert.match(renderToStaticMarkup(React.createElement(Shell,{result:true})),/RESULT_SCREEN/);}
 finally{delete globalThis.__karmaShellAuth;delete globalThis.location;}
});
