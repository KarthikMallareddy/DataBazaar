import fs from 'fs';
import { parse } from '@dfinity/candid';

const path = process.argv[2];
if(!path){
  console.error('usage: node validate_did.js <path>');
  process.exit(2);
}

const src = fs.readFileSync(path, 'utf8');
try{
  const ast = parse(src);
  console.log('parsed OK');
  console.log(JSON.stringify(ast, null, 2));
}catch(e){
  console.error('parse error:', e.message);
  process.exit(1);
}
