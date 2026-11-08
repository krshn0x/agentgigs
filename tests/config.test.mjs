import test from 'node:test';
import assert from 'node:assert/strict';
import {readConfig} from '../src/config.mjs';

test('Render assigned HTTPS origin is used when APP_ORIGIN is absent or empty',()=>{
  const assigned='https://orbit-tasks-example.onrender.com';
  assert.equal(readConfig({RENDER_EXTERNAL_URL:assigned}).origin,assigned);
  assert.equal(readConfig({APP_ORIGIN:'',RENDER_EXTERNAL_URL:assigned}).origin,assigned);
  assert.equal(readConfig({}).origin,'http://localhost:3000');
});
test('explicit origin overrides the platform origin for custom domains',()=>{
  assert.equal(readConfig({APP_ORIGIN:'https://tasks.example.com',RENDER_EXTERNAL_URL:'https://orbit-tasks-example.onrender.com'}).origin,'https://tasks.example.com');
});
test('platform fallback still rejects an origin containing a path or trailing slash',()=>{
  assert.throws(()=>readConfig({RENDER_EXTERNAL_URL:'https://orbit-tasks-example.onrender.com/'}));
  assert.throws(()=>readConfig({RENDER_EXTERNAL_URL:'https://orbit-tasks-example.onrender.com/path'}));
});
