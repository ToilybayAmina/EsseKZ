import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);

test('diagnostic output exposes safe Google status codes, never the key or raw provider message', async () => {
  const key = 'private-diagnostic-test-key';
  const code = `globalThis.fetch = async () => Response.json({error:{status:'INVALID_ARGUMENT',message:'${key}',details:[{reason:'API_KEY_INVALID'},{reason:'${key}'}]}},{status:400}); await import('./scripts/check-gemini.mjs');`;
  try {
    await execute(process.execPath, ['--input-type=module', '-e', code], {
      env: { ...process.env, GEMINI_API_KEY: key },
    });
    assert.fail('Expected diagnostic to exit nonzero for rejected key');
  } catch (error) {
    const result = error as { stdout: string; code: number };
    assert.equal(result.code, 1);
    assert.match(result.stdout, /GOOGLE_HTTP: 400/);
    assert.match(result.stdout, /GOOGLE_REASON: API_KEY_INVALID/);
    assert.ok(!result.stdout.includes(key));
  }
});

test('diagnostic follows pagination and only lists generateContent-compatible models', async () => {
  const code = `let count=0; globalThis.fetch=async()=>Response.json(++count===1?{models:[{name:'models/embedding-only',supportedGenerationMethods:['embedContent']}],nextPageToken:'page-two'}:{models:[{name:'models/test-flash',supportedGenerationMethods:['generateContent']}]}); await import('./scripts/check-gemini.mjs');`;
  const { stdout } = await execute(process.execPath, ['--input-type=module', '-e', code], {
    env: { ...process.env, GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-flash' },
  });
  assert.match(stdout, /MODEL_AVAILABLE: yes/);
  assert.match(stdout, /test-flash/);
  assert.ok(!stdout.includes('embedding-only'));
});

test('generation probe tests a real POST-shaped request once, without printing text or secrets', async () => {
  const code = `globalThis.fetch=async(url,options)=>{if(options.method!=='POST'||!url.endsWith(':generateContent'))throw new Error('Wrong probe'); return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({title:'Private title',essay:'Private text',wordCount:2})}]}}]});}; process.argv.push('--generate'); await import('./scripts/check-gemini.mjs');`;
  const { stdout } = await execute(process.execPath, ['--input-type=module', '-e', code], {
    env: { ...process.env, GEMINI_API_KEY: 'private-probe-key' },
  });
  assert.match(stdout, /GENERATION_HTTP: 200/);
  assert.match(stdout, /GENERATION_RESULT: valid JSON/);
  assert.ok(!stdout.includes('Private text'));
  assert.ok(!stdout.includes('private-probe-key'));
});

test('generation probe reports a safe transport error instead of mislabeling every failure as a timeout', async () => {
  const code = `globalThis.fetch=async()=>{throw new TypeError('private-probe-key',{cause:{code:'ECONNRESET'}});}; process.argv.push('--generate'); await import('./scripts/check-gemini.mjs');`;
  try {
    await execute(process.execPath, ['--input-type=module', '-e', code], {
      env: { ...process.env, GEMINI_API_KEY: 'private-probe-key' },
    });
    assert.fail('Expected nonzero probe exit');
  } catch (error) {
    const result = error as { stdout: string; code: number };
    assert.equal(result.code, 1);
    assert.match(result.stdout, /NETWORK_ERROR: ECONNRESET/);
    assert.ok(!result.stdout.includes('private-probe-key'));
  }
});
