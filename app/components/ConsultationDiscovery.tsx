import {renderConsultationDiscovery} from '@/lib/marketing/consultation-discovery.mjs';
import '@/styles/consultation-discovery.css';

export default function ConsultationDiscovery() {
  return <div dangerouslySetInnerHTML={{__html:renderConsultationDiscovery()}}/>;
}
