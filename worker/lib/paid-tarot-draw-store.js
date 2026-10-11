import { connectDb, mongoose } from "./db.js";
import { scopeConnection } from "./db-scope-connection.js";

// The server-held draws of paid love and mindscan readings (paid-tarot-draw.js). A native
// collection like the tea house drafts; route tests replace this module with an in-memory one.
export async function paidTarotDrawCollection(env) {
  await connectDb(env);
  return (scopeConnection() || mongoose.connection).db.collection("paid_tarot_draws");
}
