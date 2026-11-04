export function initialSelection(params,readings,selectionFor){
 return params.get('product')||(params.get('adviser')==='yeoni'?selectionFor('yeoni','saju','mackerel'):undefined)||readings[0].id;
}
