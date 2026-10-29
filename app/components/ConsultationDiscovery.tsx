import {renderConsultationDiscovery} from '@/lib/marketing/consultation-discovery.mjs';
import '@/styles/consultation-discovery.css';
import {NativeHomeHtml} from './NativeHomeCopy';

export default function ConsultationDiscovery() {
  return <NativeHomeHtml html={renderConsultationDiscovery()}/>;
}
