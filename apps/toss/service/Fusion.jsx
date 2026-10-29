import React from 'react';
import {FusionFortuneClient} from '@/app/fusion-fortune/FusionFortuneClient';
import {FusionValuePreview} from '@/app/fusion-fortune/FusionValuePreview';
import {FusionFortuneSeoContent} from '@/app/fusion-fortune/FusionFortuneSeoContent';
import {SERVICE_AVAILABLE} from '../src/release';
import {ExpertGuide} from '@/app/fusion-fortune/ExpertGuide';

export default function Fusion(){
 const paymentNotice=SERVICE_AVAILABLE?'토스 단건 결제로 상담을 시작해요. 기존 웹 이용권과 월정석은 이 결제에 적용되지 않아요.':'상품 등록과 검수가 완료되면 토스 단건 결제로 상담을 시작할 수 있어요.';
 return <FusionFortuneClient paymentNotice={paymentNotice} seoContent={<><FusionFortuneSeoContent/><ExpertGuide mode="usage" paymentNotice={paymentNotice}/></>} valuePreview={<FusionValuePreview/>}/>;
}
