import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {DAY_COPY} from '../../../lib/saju/career-style/copy.mjs';
import {chartFixture} from './chart-fixture.mjs';

test('public career preview explores six work conditions without importing the private report or taking birth inputs',async()=>{
  const webPage=readFileSync(new URL('../../../app/saju/career-style/page.tsx',import.meta.url),'utf8');
  const {dom,React,createRoot,Component}=await chartFixture('CareerStylePreview.tsx','/saju/career-style',[{
    name:'public-career-preview',
    setup(builder){
      builder.onLoad({filter:/\.webp$/},()=>({contents:"export default 'career-art.webp';"}));
      builder.onResolve({filter:/worker\/|lib\/saju\/career-style\//},({path})=>{
        throw new Error('Public preview cannot ship private career or server modules: '+path);
      });
    },
  }]);
  const root=createRoot(document.getElementById('chart'));
  try{
    await React.act(()=>root.render(React.createElement(Component)));
    const options=[...document.querySelectorAll('input[type=radio]')];
    const titles=options.map(option=>option.labels[0].textContent);
    assert.deepEqual(titles,['자율성','구조와 규칙','협업','몰입','변화 속도','성과 피드백']);
    assert.ok(webPage.includes(titles.join('·')));
    const questions=new Set();
    for(const [index,option] of options.entries()){
      await React.act(()=>option.click());
      assert.equal(option.checked,true);
      const active=document.querySelector('[aria-live]');
      assert.equal(active.querySelector('h2').textContent,titles[index]+'에 관한 질문');
      questions.add(active.querySelector('p').textContent);
      assert.match(active.textContent,/작게 해볼 일/);
    }
    assert.equal(questions.size,6);
    const sample=document.querySelector('details');
    sample.querySelector('summary').click();
    assert.equal(sample.open,true);
    assert.equal(sample.querySelector('h2').textContent,DAY_COPY['甲'][0]);
    assert.ok(webPage.includes(sample.querySelector('blockquote').textContent));
    assert.equal(document.querySelector('form, a, input:not([type=radio]), textarea'),null);
    assert.equal(window.localStorage.length+window.sessionStorage.length,0);
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});
