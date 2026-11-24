// A projection of the original Swiss response, captured from local ephemeris files.
import example from './star-hug-chart.json' with {type:'json'};
export function privateStarHugChart(body){
 const keys=['year','month','day','hour','minute','timezone','lat','lon','birthDate','birthTime','timezoneName'];
 if(!keys.every(key=>body?.[key]===example.input[key]))return Response.json({error:'MOCK_STAR_HUG_CHART_INPUT',message:'정밀 차트 모의 예시는 1990년 1월 1일 오전 8시 35분 서울 출생 프로필에서 확인할 수 있어요.'},{status:422});
 return Response.json(example.chart,{headers:{'Cache-Control':'no-store'}});
}
