// Reuse Consultation's existing tab-local draft restoration. Never put private
// question text in a URL, analytics payload, or a server request at this step.
export const CONSULTATION_DRAFT_KEY='yeongnyangi:consultation-login-draft';
export const QUESTION_ENTRY_HREF='/yeongnyangi/fortune/?flow=question';
export const QUESTION_ENTRY_LIMIT=1000;

export function saveQuestionEntry(question:string):boolean {
 const text=question.trim();
 if(!text||text.length>QUESTION_ENTRY_LIMIT)return false;
 try {
  sessionStorage.setItem(CONSULTATION_DRAFT_KEY,JSON.stringify({
   path:QUESTION_ENTRY_HREF,question:text,chatStep:'question',savedAt:Date.now(),
  }));
  return true;
 } catch {
  return false;
 }
}
