import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../server/db.ts';
test('local PostgreSQL survives closing and reopening, with idempotent migrations', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'essekz-db-'));
  const id = randomUUID();
  let db = await openDatabase('', dir);
  try {
    await db.query('INSERT INTO users(id,email,password_hash,name) VALUES($1,$2,$3,$4)', [
      id,
      'persistent@example.test',
      'test-only-hash',
      'Қаламгер',
    ]);
    await db.close();
    db = await openDatabase('', dir);
    const { rows } = await db.query('SELECT name FROM users WHERE id=$1', [id]);
    assert.equal(rows[0].name, 'Қаламгер');
  } finally {
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
});
