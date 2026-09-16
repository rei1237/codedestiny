/** Additive release migration. No document or existing index is removed. */
import {config} from 'dotenv';
import {connectDb,mongoose} from '../../worker/lib/db.js';
import {YeongnyangiRequest} from '../../worker/lib/yeongnyangi-models.js';
const database=process.argv[process.argv.indexOf('--db')+1];
if(!['code_destiny_staging','code_destiny'].includes(database))throw new Error('Explicit --db code_destiny_staging or --db code_destiny is required.');
config({path:'.env.local',quiet:true});
const env={...process.env,MONGO_DB_NAME:database,MONGODB_DB_NAME:database};
try{
 await connectDb(env);
 if(process.argv.includes('--apply'))await YeongnyangiRequest.collection.createIndex({userId:1,createdAt:-1,_id:-1},{name:'userId_1_createdAt_-1__id_-1'});
 const indexes=await YeongnyangiRequest.collection.listIndexes().toArray();
 const ok=indexes.some(i=>JSON.stringify(i.key)===JSON.stringify({userId:1,createdAt:-1,_id:-1}));
 if(!ok)throw new Error('Consultation listing index is absent.');
 console.log(JSON.stringify({database,collection:'yeongnyangi_requests',indexReady:ok,applied:process.argv.includes('--apply')}));
}finally{await mongoose.disconnect();}
