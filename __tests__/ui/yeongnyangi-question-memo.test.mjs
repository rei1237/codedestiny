import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';

// 2026-11-23: a long question must not push the reading off the first screen. Mock only; no API is called.
const require=createRequire(import.meta.url),Module=require('node:module');
const read=file=>readFileSync(file,'utf8').replace(/\r\n/g,'\n');
async function load(entry){
 const bundle=await build({stdin:{contents:`export * from '${entry}';export {default} from '${entry}';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react/jsx-runtime','react-dom']});
 const loaded=new Module(path.resolve(`${path.basename(entry)}-tests.cjs`));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
 return loaded.exports;
}
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {default:QuestionMemo}=await load('./app/yeongnyangi/_components/QuestionMemo');
const {questionMemoCopy}=await load('./app/yeongnyangi/_lib/question-memo-copy');
const row=(question,extra={})=>({id:'a'.repeat(64),locale:'ko',consultation:{question,...extra}});
const render=props=>renderToStaticMarkup(React.createElement(QuestionMemo,props));

test('a long question renders as a clamped memo with an expand button; a short one has no button',()=>{
 const long='제가 지금 다니는 회사에서 3년째 일하고 있는데요.\n\n'+'요즘 팀이 바뀌고 업무가 늘어서 이직을 고민하고 있어요. '.repeat(6);
 const html=render({row:row(long)});
 assert.match(html,/내가 남긴 질문/);
 assert.match(html,/data-clamped="true"/);
 assert.match(html,/aria-expanded="false"/);
 assert.match(html,/질문 전체 보기/);
 assert.ok(html.includes('3년째 일하고 있는데요.'),'the full text stays in the DOM for search and copy');
 assert.match(html,/있는데요\. 요즘/,'folded, paragraphs run on so the clamp fills three lines');
 assert.equal((render({row:row('첫 문단이에요.\n둘째 문단이에요.')}).match(/<span/g)||[]).length,2,'an unfolded question keeps one block per paragraph');
 const short=render({row:row('지금 이직해도 될까요?')});
 assert.doesNotMatch(short,/<button/);
 assert.match(short,/지금 이직해도 될까요\?/);
 assert.doesNotMatch(render({row:row('\n\n\n\n한 줄')}),/\n{3,}/,'paragraph gaps are trimmed to one blank line');
});

test('reading meta stays on the memo and an empty consultation renders nothing unless asked for context',()=>{
 const html=render({row:row('질문',{asOf:'2026-11-23',timezone:'Asia/Seoul',relationship:{participants:{self:'나',partner:'그 사람'}}})});
 assert.match(html,/상담 기준: 2026-11-23 · Asia\/Seoul/);
 assert.match(html,/나 · 그 사람/);
 assert.equal(render({row:{id:'b',locale:'ko',consultation:{}}}),'');
 assert.match(render({row:{id:'b',locale:'ko',consultation:{}},context:true}),/계산 근거/);
});

test('copy is authored in five locales and the rest fall back to English',()=>{
 for(const locale of ['ko','en','ja','zh-CN','zh-TW'])assert.ok(questionMemoCopy(locale).leaveOk.length>15,locale);
 assert.equal(questionMemoCopy('de'),questionMemoCopy('en'));
 assert.equal(questionMemoCopy('ko').leaveOk,'화면을 나가도 괜찮아요. 완성되면 가입하신 메일로 알려 드리고, 보관함에도 저장돼요.');
});

test('the result screen leads with progress and shows the question once',()=>{
 const result=read('app/yeongnyangi/_components/Result.tsx'),book=read('app/yeongnyangi/_components/ReadingBook.tsx'),css=read('app/yeongnyangi/_components/question-memo.module.css');
 assert.doesNotMatch(result,/questionContext/,'the folded duplicate question is gone from the chapter result');
 assert.ok(result.indexOf('id="reading-progress"')<result.indexOf('<QuestionMemo row={row} context/>'),'progress card comes before the question');
 assert.match(result,/row\.state!=='COMPLETED'&&!row\.chapters\.length&&<QuestionMemo/,'once a chapter is saved the memo lives in the reading opening only');
 // The completion-mail note lives inside the progress card, replaces its old leave hint, and stays off the Toss surface.
 assert.match(result,/leaveNote=\{interpreting&&paymentSurface!=='toss'\?questionMemoCopy\(row!\.locale\)\.leaveOk:undefined\}/);
 assert.match(read('app/yeongnyangi/_components/ReadingLoading.tsx'),/leaveHint=stage!=='generating'\?'':leaveNote\|\|/);
 assert.match(book,/<QuestionMemo row=\{row\} question=\{firstQuestion\|\|row\.consultation\?\.question\}\/>/);
 assert.doesNotMatch(book,/originalQuestion/);
 assert.match(css,/-webkit-line-clamp:3/);assert.match(css,/min-height:44px/);
 assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b|!important/i,'night tokens only');
});
