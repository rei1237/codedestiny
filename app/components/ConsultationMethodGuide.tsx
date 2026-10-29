import {renderConsultationMethodGuide} from '@/lib/brand/consultation-methods.mjs';
import '@/styles/consultation-method-guide.css';
import {NativeHomeHtml} from './NativeHomeCopy';

export default function ConsultationMethodGuide({id,variant = "full"}:{id:string;variant?:"entry"|"full"}) {
  return <NativeHomeHtml className="consultation-methods-host" html={renderConsultationMethodGuide(id, variant)}/>;
}
