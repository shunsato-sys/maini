import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const project=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=spawnSync(process.execPath,[
  '--import',path.join(project,'scripts/sites-env.mjs'),
  path.join(project,'node_modules/wrangler/bin/wrangler.js'),
  'd1','execute','DB','--local',
  '--config',path.join(project,'wrangler.local.json'),
  '--persist-to',path.join(project,'.wrangler/state'),
  '--file',path.join(project,'drizzle/0000_kitchen.sql'),
],{stdio:'inherit',cwd:project});
process.exit(result.status??1);
