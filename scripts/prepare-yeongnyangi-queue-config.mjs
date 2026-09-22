import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function queueConfig(target,base){
  if(!['production','staging'].includes(target))throw new Error('target must be production or staging');
  if(/\[\[queues\./.test(base))throw new Error('Queue settings already exist; inspect before replacing them.');
  const name=`yeongnyangi-consultation-${target}`;
  return `${base.replace(/^main\s*=.*$/m,`main = ${JSON.stringify(resolve(root,'worker/index.js').replaceAll('\\','/'))}`)}

# Provision this queue with separate approval before uploading this configuration.
[[queues.producers]]
binding = "YEONGNYANGI_QUEUE"
queue = "${name}"

[[queues.consumers]]
queue = "${name}"
max_batch_size = 1
max_batch_timeout = 1
max_concurrency = 2
max_retries = 5
retry_delay = 30
`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
 if(!args.target||!args.output)throw new Error('Usage: --target=staging|production --output=<reviewable temporary config.toml> (no deployment)');
 const output=resolve(args.output);
 if(output.startsWith(resolve(root,'worker')))throw new Error('Write the reviewable config outside worker/; never overwrite a deployment source.');
 const base=readFileSync(resolve(root,args.target==='production'?'worker/wrangler.toml':'worker/wrangler.staging.toml'),'utf8');
 writeFileSync(output,queueConfig(args.target,base));
 console.log(`Prepared ${args.target} queue config: ${output}. No resources created and no deployment executed.`);
}
