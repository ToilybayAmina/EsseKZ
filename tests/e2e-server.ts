// Browser-test-only entrypoint: mail is captured on disk, never exposed by the app.
import { mkdir, writeFile } from 'node:fs/promises';
import { openDatabase } from '../server/db.ts';
import { createApp } from '../server/app.ts';

const db = await openDatabase('', '.local/e2e-postgres');
await mkdir('.local/e2e-mail', { recursive: true });
const server = createApp(db, {
  configured: true,
  async send(mail) {
    await writeFile(`.local/e2e-mail/${encodeURIComponent(mail.email)}.json`, JSON.stringify(mail));
  },
}).listen(3001, '127.0.0.1');
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    }),
  );
}
