export const runtime = "nodejs";
const GONE = new Response(JSON.stringify({ok:false,error:"deprecated"}),{status:410,headers:{"Content-Type":"application/json"}});
export function GET()    { return GONE; }
export function POST()   { return GONE; }
export function PUT()    { return GONE; }
export function PATCH()  { return GONE; }
export function DELETE() { return GONE; }