export default function CompassProductInfo({featureKey}:{featureKey:string}){
  return featureKey==='destiny-compass-deep-report'?<p style={{padding:'1rem'}}>심층 리포트는 토스 상품 등록을 기다리고 있어요.</p>:null;
}
