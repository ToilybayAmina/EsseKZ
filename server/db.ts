import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
export type Row = Record<string, any>;
export interface Database {
  query<T extends Row = Row>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
}
export async function openDatabase(
  url = process.env.DATABASE_URL,
  localPath = process.env.LOCAL_DB_PATH || '.local/postgres',
): Promise<Database> {
  let db: Database;
  if (url) {
    const pool = new pg.Pool({ connectionString: url, max: 10 });
    db = { query: (sql, params) => pool.query(sql, params), close: () => pool.end() };
  } else {
    if (localPath !== 'memory://') await mkdir(path.resolve(localPath), { recursive: true });
    const local = new PGlite(localPath);
    await local.waitReady;
    db = { query: (sql, params) => local.query(sql, params), close: () => local.close() };
  }
  const sql = await readFile(new URL('./migrations/001_initial.sql', import.meta.url), 'utf8');
  // Both native PostgreSQL and PGlite execute the same idempotent schema.
  for (const statement of sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean))
    await db.query(statement);
  await db.query('SELECT 1');
  return db;
}
