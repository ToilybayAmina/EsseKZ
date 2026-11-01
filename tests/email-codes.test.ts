import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/db.ts';
import { createApp } from '../server/app.ts';
import { type VerificationMail } from '../server/mail.ts';
import { verifyPassword } from '../server/auth.ts';

test('email codes gate registration and reset, expire, limit guesses, and cannot be reused', async () => {
  const db = await openDatabase('', 'memory://');
  const messages: VerificationMail[] = [];
  let failDelivery = false;
  const mailer = {
    configured: true,
    async send(message: VerificationMail) {
      if (failDelivery) throw new Error('Private provider details must not be exposed');
      messages.push(message);
    },
  };
  const server = createApp(db, mailer).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const post = (route: string, data: unknown, cookie = '') =>
    fetch(`${base}/api/auth/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(data),
    });
  const account = { name: 'Амина', email: 'writer@gmail.com', password: 'OriginalPassword123' };
  const verify = (challengeId: string, code: string) =>
    post('verify-registration', { challengeId, code });
  try {
    const requested = await post('register', account);
    assert.equal(requested.status, 202);
    assert.equal(requested.headers.get('set-cookie'), null);
    const challenge = await requested.json();
    assert.ok(!JSON.stringify(challenge).includes(messages[0].code));
    assert.match(messages[0].code, /^\d{6}$/);
    assert.equal(messages[0].purpose, 'register');
    assert.equal((await db.query('SELECT * FROM users')).rows.length, 0);
    assert.equal((await post('login', account)).status, 401);
    assert.equal((await post('register', account)).status, 429);
    const wrong = messages[0].code === '000000' ? '111111' : '000000';
    assert.equal((await verify(challenge.challengeId, wrong)).status, 400);
    const registered = await verify(challenge.challengeId, messages[0].code);
    assert.equal(registered.status, 201);
    const cookie = registered.headers.get('set-cookie')!.split(';')[0];
    const user = (await registered.json()).user;
    assert.equal(user.email, account.email);
    assert.equal(user.password_hash, undefined);
    assert.equal((await verify(challenge.challengeId, messages[0].code)).status, 400);

    const forgotten = await post('forgot-password', { email: account.email });
    assert.equal(forgotten.status, 200);
    const reset = await forgotten.json();
    const resetMail = messages.at(-1)!;
    assert.equal(resetMail.purpose, 'reset');
    assert.equal((await verify(reset.challengeId, resetMail.code)).status, 400);
    const newPassword = 'ChangedPassword123';
    assert.equal(
      (
        await post('reset-password', {
          challengeId: reset.challengeId,
          code: resetMail.code,
          password: newPassword,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post('reset-password', {
          challengeId: reset.challengeId,
          code: resetMail.code,
          password: newPassword,
        })
      ).status,
      400,
    );
    const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal((await me.json()).user, null);
    assert.equal((await post('login', account)).status, 401);
    assert.equal((await post('login', { ...account, password: newPassword })).status, 200);
    assert.ok(
      await verifyPassword(
        newPassword,
        (await db.query('SELECT password_hash FROM users WHERE id=$1', [user.id])).rows[0]
          .password_hash,
      ),
    );
    assert.equal((await db.query('SELECT * FROM password_resets')).rows.length, 0);

    const unknown = await post('forgot-password', { email: 'missing@mail.ru' });
    assert.equal(unknown.status, 200);
    assert.deepEqual(Object.keys(await unknown.json()).sort(), Object.keys(reset).sort());
    assert.equal(messages.length, 2);
    assert.equal((await post('forgot-password', { email: 'missing@mail.ru' })).status, 429);

    const expired = await (
      await post('register', { ...account, email: 'expired@yandex.ru' })
    ).json();
    const expiredCode = messages.at(-1)!.code;
    await db.query("UPDATE email_codes SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1", [
      expired.challengeId,
    ]);
    assert.equal((await verify(expired.challengeId, expiredCode)).status, 400);

    const guesses = await (
      await post('register', { ...account, email: 'guesses@outlook.com' })
    ).json();
    const correctCode = messages.at(-1)!.code;
    // Simulate four previous guesses to check the boundary without tripping the IP limiter.
    await db.query('UPDATE email_codes SET attempts=4 WHERE id=$1', [guesses.challengeId]);
    assert.equal(
      (await verify(guesses.challengeId, correctCode === '000000' ? '111111' : '000000')).status,
      400,
    );
    assert.equal((await verify(guesses.challengeId, correctCode)).status, 400);
    await db.query("UPDATE email_codes SET created_at=NOW()-INTERVAL '2 minutes' WHERE id=$1", [
      guesses.challengeId,
    ]);
    const resent = await (
      await post('register', { ...account, email: 'guesses@outlook.com' })
    ).json();
    assert.notEqual(resent.challengeId, guesses.challengeId);
    assert.equal((await verify(guesses.challengeId, correctCode)).status, 400);
    const results = await Promise.all([
      verify(resent.challengeId, messages.at(-1)!.code),
      verify(resent.challengeId, messages.at(-1)!.code),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);

    failDelivery = true;
    const failure = await post('register', { ...account, email: 'delivery@example.com' });
    assert.equal(failure.status, 503);
    assert.ok(!(await failure.text()).includes('Private provider'));
    assert.equal(
      (await db.query("SELECT * FROM email_codes WHERE email='delivery@example.com'")).rows.length,
      0,
    );
    mailer.configured = false;
    assert.equal(
      (await post('register', { ...account, email: 'disabled@example.com' })).status,
      503,
    );
    assert.equal((await post('forgot-password', { email: account.email })).status, 503);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
  }
});
