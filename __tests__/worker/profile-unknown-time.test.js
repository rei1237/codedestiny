import {validateRequiredBirth,toClientProfile} from '../../worker/routes/profile.js';
import {ProfileCard} from '../../worker/lib/models.js';
const birth={year:1990,month:6,day:15,calType:'solar'};
test('unknown time persists as null, and never returns invented midnight',()=>{
 const validation=validateRequiredBirth({birth:{...birth,timeUnknown:true}});
 expect(validation.ok).toBe(true);
 const profile=new ProfileCard({userId:'507f1f77bcf86cd799439011',profileId:'p1',name:'테스트',gender:'F',birth:validation.birth});
 const presented=toClientProfile(profile.toObject());
 expect(presented.timeUnknown).toBe(true);
 expect(presented.birthTime).toBe('');
 expect(presented.birth.hour).toBeNull();
 expect(presented.birth.minute).toBeNull();
});
test('legacy known midnight remains a real midnight',()=>{
 const validation=validateRequiredBirth({birth:{...birth,hour:0,minute:0}});
 expect(validation.ok).toBe(true);
 expect(toClientProfile({birth:validation.birth}).birthTime).toBe('00:00');
});
test('missing or invalid time still requires correction unless explicitly unknown',()=>{
 expect(validateRequiredBirth({birth}).ok).toBe(false);
 expect(validateRequiredBirth({birth:{...birth,hour:25,minute:0}}).ok).toBe(false);
 expect(validateRequiredBirth({birth:{...birth,hour:null,minute:null}}).ok).toBe(false);
 expect(validateRequiredBirth({birth:{...birth,month:2,day:30,timeUnknown:true}}).ok).toBe(false);
});
