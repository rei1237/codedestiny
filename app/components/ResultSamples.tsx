import {renderResultSamples} from '@/lib/marketing/render-result-samples.mjs';
import '@/styles/result-samples.css';

export default function ResultSamples({ids=[],prefix='service-samples'}:{ids?:string[];prefix?:string}) {
  return <div dangerouslySetInnerHTML={{__html:renderResultSamples({ids,compact:ids.length>0,prefix})}}/>;
}
