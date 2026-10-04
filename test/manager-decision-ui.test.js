import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('manager decisions use accessible page controls instead of a browser prompt', async () => {
  const source = await readFile(new URL('../src/components/App.js', import.meta.url), 'utf8');
  assert.equal(source.includes('prompt('), false);
  assert.match(source, /Manager decision for/);
  assert.match(source, /Final Richard %/);
  assert.match(source, /Final allocation/);
  assert.match(source, /Save decision/);
});
