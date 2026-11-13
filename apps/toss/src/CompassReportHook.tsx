export function useCompassReport(){
  return {phase:'locked',reportId:'',sections:{},systemConfidence:[],error:null,isPaying:false,canRetryWaveB:false,restore:()=>{},retryWaveB:undefined,unlock:undefined};
}
