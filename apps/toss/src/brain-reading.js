import '../../../js/core/saju/destiny-anatomy/engine.js';
import '../../../js/core/saju/destiny-anatomy/copy.js';
import '../../../js/core/saju/destiny-anatomy/render.js';
import '../../../styles/destiny-anatomy.css';

export function showBrainReading(node,scope){
 const model=window.DestinyAnatomyEngine.buildDestinyAnatomy({scope,lang:'ko',copy:window.DestinyAnatomyCopy});
 if(!model?.text)throw Error('BRAIN_READING_UNAVAILABLE');
 window.DestinyAnatomyRender.renderSajuSections(node,model);
}
