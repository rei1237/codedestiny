import React from 'react';
import {FusionFortuneClient} from '@/app/fusion-fortune/FusionFortuneClient';
import {FusionValuePreview} from '@/app/fusion-fortune/FusionValuePreview';
import {FusionFortuneSeoContent} from '@/app/fusion-fortune/FusionFortuneSeoContent';
import TossPrice from './TossTeaPrice';
import {ExpertGuide} from '@/app/fusion-fortune/ExpertGuide';

export default function Fusion(){
 const paymentNotice='상품 가격을 확인한 뒤 토스 단건 결제로 상담을 시작해요.';
 return <FusionFortuneClient paymentSurface="toss" TossPrice={TossPrice} paymentNotice={paymentNotice} seoContent={<><FusionFortuneSeoContent/><ExpertGuide mode="usage" paymentNotice={paymentNotice}/></>} valuePreview={<FusionValuePreview/>}/>;
}
