import 'dotenv/config';
import { openDatabase } from './db.ts';
import { createApp } from './app.ts';
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL)
  throw new Error('Production requires DATABASE_URL for external PostgreSQL.');
if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN?.startsWith('https://'))
  throw new Error('Production requires an HTTPS APP_ORIGIN.');
const db = await openDatabase();
const port = Number(process.env.PORT) || 3001;
const server = createApp(db).listen(port, '0.0.0.0', () =>
  console.log(
    `EsseKZ API: port ${port}; database connected; Gemini ${process.env.GEMINI_API_KEY ? 'configured' : 'not connected'}`,
  ),
);
async function shutdown() {
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
