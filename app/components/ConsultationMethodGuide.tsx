import {renderConsultationMethodGuide} from '@/lib/brand/consultation-methods.mjs';
import '@/styles/consultation-method-guide.css';

export default function ConsultationMethodGuide({id,variant = "full"}:{id:string;variant?:"entry"|"full"}) {
  return <div className="consultation-methods-host" dangerouslySetInnerHTML={{__html:renderConsultationMethodGuide(id, variant)}}/>;
}
