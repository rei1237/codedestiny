import {useCallback,useState} from 'react';

// The original gate needs local progress state; entitlement and purchase UI
// remain owned by the authenticated Toss adapter and SDK.
export function usePayment(){
 const [isPaymentLoading,setLoading]=useState(false);
 const [paymentMessage,setPaymentMessage]=useState('');
 const startPayment=useCallback(message=>{setPaymentMessage(message||'');setLoading(true);},[]);
 const endPayment=useCallback(()=>{setLoading(false);setPaymentMessage('');},[]);
 return {isPaymentLoading,paymentMessage,startPayment,endPayment,setPaymentMessage};
}
