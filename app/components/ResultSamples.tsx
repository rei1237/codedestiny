import {renderResultSamples} from '@/lib/marketing/render-result-samples.mjs';
import '@/styles/result-samples.css';
import SampleSurface from './SampleSurface';

export default function ResultSamples({ids=[],prefix='service-samples',mode=ids.length?'detail':'comparison'}:{ids?:string[];prefix?:string;mode?:'comparison'|'detail'}) {
  return <SampleSurface><div dangerouslySetInnerHTML={{__html:renderResultSamples({ids,compact:ids.length>0,prefix,mode})}}/></SampleSurface>;
}
