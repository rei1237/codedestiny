import '../../../js/core/saju/destiny-anatomy/engine.js';
import '../../../js/core/saju/destiny-anatomy/hd-copy.generated.js';
import '../../../js/core/saju/destiny-anatomy/copy.js';
import '../../../js/core/saju/destiny-anatomy/render.js';
import '../../../js/core/saju/destiny-anatomy/share-card.js';
import '../../../styles/destiny-anatomy.css';

export function buildBrainModel(scope,hdChart,vedicBasis){
 const model=window.DestinyAnatomyEngine.buildDestinyAnatomy({scope,lang:'ko',copy:window.DestinyAnatomyCopy,hdChart,vedicBasis});
 if(!model?.text)throw Error('BRAIN_READING_UNAVAILABLE');
 return model;
}
