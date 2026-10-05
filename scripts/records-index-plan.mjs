// Read-only by construction. Does not read credentials or connect to a DB.
import { recordIndexPlan } from '../worker/lib/record-indexes.js';
console.log(JSON.stringify({ apply: false, dataMigration: false, indexes: recordIndexPlan() }, null, 2));
