import spring from './yeoni-spring-declaration.json' with {type:'json'};
import {publicationDate} from './ledger-date.mjs';

const original = 'https://github.com/rei1237/codedestiny/blob/a0050173d211a04516c0afc115705d3e85ad92ae/lib/editions/yeoni-spring-declaration.json';

// Match known codes too: changing a certificate's series ID must not bypass comparison.
export function compareDeclaration(proof,entry,rows) {
  const receipt=spring.records.find(row=>row.code===proof.code);
  if(entry.editionId!==spring.editionId && !receipt)return null;
  const matches=entry.editionId===spring.editionId && proof.cap===spring.cap &&
    proof.title===spring.title && proof.character===spring.character &&
    spring.records.every(saved=>{
      const row=rows[saved.serial-1];
      return row?.code===saved.code && row.pin===saved.pin && publicationDate(row)===saved.publishedOn;
    }) && (!receipt || (proof.serial===receipt.serial && proof.tx===receipt.tx &&
      proof.blockHash===receipt.blockHash && proof.digest===receipt.digest));
  return {matches,url:original,confirmed:spring.publishedCount,cap:spring.cap};
}
