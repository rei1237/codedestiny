import {skyMoment,calculateQuestionSky} from './question-sky';
import {questionSkyCalculationInput} from './question-sky-locale-input';
import {questionSkyTwoStageManifest} from './question-sky-reading';
import {QUESTION_SKY_TWO_STAGE_VERSION} from './reading-policy';
import {type SkyInput,skyModes,skyTopics,SKY_IMAGE,SKY_TIMING} from './question-sky-contract';
import {consultationClock,createConsultation} from './consultation';
import {conciseReadingManifest} from './concise-reading';
import {withRepeatPolicy} from './reading-restatement';
import type {Product} from '../payments/catalog';
import type {ReadingLocale} from './reading-locale';

export async function questionSkyReading(env:Record<string,unknown>,input:SkyInput,locale:ReadingLocale,product:Product){
  const moment=skyMoment(input);
  const calculated=await calculateQuestionSky(env,questionSkyCalculationInput(input,locale),moment);
  calculated.publicData.relationship=input.relationship;
  product.manifestVersion=QUESTION_SKY_TWO_STAGE_VERSION;product.chapterCount=2;
  const clock=consultationClock(moment.timezone,moment.date);
  const context=calculated.context;
  calculated.publicData.evidenceVersion=QUESTION_SKY_TWO_STAGE_VERSION;
  context.facts.push({id:`${context.domain}.question-calculation`,label:'프라슈나 계산 근거',value:{method:'Lahiri sidereal / Whole Sign',chart:calculated.chart,judgements:calculated.audit,limits:['위계는 본궁·고양·손상·추락만 산출','실제 감정·소재지·사건 시기의 관측 아님']}});
  const manifest=withRepeatPolicy(conciseReadingManifest(questionSkyTwoStageManifest(context)));
  const consultation=createConsultation(input.question,input.topic,clock,manifest);
  // The question is displayed once in the result shell. The generated prose
  // receives it as context but never creates a second question-answer heading.
  consultation.questions=[];
  consultation.questionSky=calculated.publicData;
  consultation.topicLabel=skyTopics[input.topic];
  consultation.period={kind:'default',label:SKY_TIMING};
  const analysis={contexts:{[context.domain]:context},signals:[],themes:[],question:input.question,topicId:input.topic,asOf:clock.asOf,consultation};
  product.name=skyModes[input.mode];product.image=SKY_IMAGE;
  return {moment,calculated,manifest,analysis};
}
