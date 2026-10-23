import {renderConsultationMethodGuide} from '@/lib/brand/consultation-methods.mjs';
import '@/styles/consultation-method-guide.css';

export default function ConsultationMethodGuide({id}:{id:string}) {
  return <div className="consultation-methods-host" dangerouslySetInnerHTML={{__html:renderConsultationMethodGuide(id)}}/>;
}
