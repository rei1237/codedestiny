import test from 'node:test';
import assert from 'node:assert/strict';
import {readNeoQuestionDraft,saveNeoQuestionDraft} from '../service/neo-question-draft.mjs';
test('unpaid Neo question survives a new reader, expires, and stays within the owner',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},now=1000;
 saveNeoQuestionDraft(storage,'A','이직 전에 무엇을 정리할까요?',now);
 assert.equal(readNeoQuestionDraft(storage,'A',now),'이직 전에 무엇을 정리할까요?');
 assert.equal(readNeoQuestionDraft(storage,'B',now),'');
 saveNeoQuestionDraft(storage,'B','다른 질문',now);
 assert.equal(readNeoQuestionDraft(storage,'A',now),'이직 전에 무엇을 정리할까요?');
 assert.equal(readNeoQuestionDraft(storage,'A',now+86400000),'');
 assert.equal(readNeoQuestionDraft(storage,'A',now-1),'');
 saveNeoQuestionDraft(storage,'A','',now);
 assert.equal(readNeoQuestionDraft(storage,'A',now),'');
 assert.equal(readNeoQuestionDraft(storage,'B',now),'다른 질문');
});
test('unavailable or damaged storage never blocks Neo input',()=>{
 const storage={getItem(){throw Error('denied');},setItem(){throw Error('denied');},removeItem(){throw Error('denied');}};
 assert.equal(readNeoQuestionDraft(storage,'A'),'');
 assert.doesNotThrow(()=>saveNeoQuestionDraft(storage,'A','새 질문'));
 assert.equal(readNeoQuestionDraft({getItem:()=>'{broken'},'A'),'');
 assert.equal(readNeoQuestionDraft(storage,''),'');
});
