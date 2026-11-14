import test from 'node:test';
import assert from 'node:assert/strict';
import famousArchive,{publishedReadings} from '../canonical/famous-archive.mjs';
import profiles from '../../../lib/famous-saju/public-profile-records.json' with {type:'json'};
import {isProfilePublished} from '../../../lib/famous-saju/profile-publication.js';
import {chartFixture} from './chart-fixture.mjs';

test('the shipped famous archive contains published readings and no draft text',()=>{
  const articles=publishedReadings();
  assert.deepEqual(articles.map(a=>a.slug),profiles.filter(isProfilePublished).map(p=>p.slug));
  assert.ok(articles.length>0);
  for(const p of profiles.filter(p=>!isProfilePublished(p)))assert.equal(articles.find(a=>a.slug===p.slug),undefined);
  assert.ok(articles.every(a=>a.sources.every(s=>new URL(s.url).protocol==='https:')));
});
test('search by alias, read the original article, and go back to the filtered list',async()=>{
  const plugin=famousArchive(),moduleId='virtual:toss-famous-archive';
  const {dom,React,createRoot,Component}=await chartFixture('FamousSaju.tsx','/insights/famous-saju',[{name:'article-module',setup(b){
    b.onResolve({filter:/^virtual:toss-famous-archive$/},()=>({path:moduleId,namespace:'articles'}));
    b.onLoad({filter:/.*/,namespace:'articles'},()=>({contents:plugin.load(plugin.resolveId(moduleId))}));
  }}]);
  let root=createRoot(document.getElementById('chart'));
  const article=publishedReadings().find(a=>a.aliases.length);
  try{
    await React.act(()=>root.render(React.createElement(Component)));
    const field=document.querySelector('input');
    await React.act(()=>{
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(field,article.aliases[0]);
      field.dispatchEvent(new window.Event('input',{bubbles:true}));
    });
    await React.act(()=>document.getElementById('article-'+article.slug).click());
    assert.equal(new URLSearchParams(window.location.search).get('article'),article.slug);
    await React.act(()=>root.unmount());root=createRoot(document.getElementById('chart'));await React.act(()=>root.render(React.createElement(Component)));
    assert.ok(document.body.textContent.includes(article.reading));assert.equal(document.querySelectorAll('details a').length,article.sources.length);
    await React.act(()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})),false));
    assert.equal(document.querySelector('input').value,article.aliases[0]);assert.equal(new URLSearchParams(window.location.search).get('q'),article.aliases[0]);
    const filter=document.querySelector('select');await React.act(()=>{filter.value=article.fields[0];filter.dispatchEvent(new window.Event('change',{bubbles:true}));});assert.equal(new URLSearchParams(window.location.search).get('field'),article.fields[0]);
    window.history.replaceState({},'', '/insights/famous-saju?article=unpublished-draft');await React.act(()=>window.dispatchEvent(new window.PopStateEvent('popstate')));assert.match(document.querySelector('[role=alert]').textContent,/공개된 글을 찾을 수 없어요/);
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});
