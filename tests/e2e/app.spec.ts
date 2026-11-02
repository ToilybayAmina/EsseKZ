import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function mailCode(email: string) {
  return JSON.parse(await readFile(`.local/e2e-mail/${encodeURIComponent(email)}.json`, 'utf8'))
    .code as string;
}
test('home, responsive navigation, account, generator, editor, exports, private history and logout', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ойың - қазына/ })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.locator('body').evaluate((el) => el.clientWidth),
  );
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: 'Эссе жазуды бастау' }).click();
  await expect(page.getByRole('button', { name: /Кіріп, жалғастыру/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Өзім жазамын' })).toHaveCount(0);
  await page.getByLabel('Эссе тақырыбы', { exact: false }).fill('Ана тілім — асыл қазынам');
  await page.locator('.aside-login').getByRole('link', { name: 'Кіру' }).click();
  await page.getByRole('link', { name: 'Тіркелу', exact: true }).click();
  const email = `writer-${Date.now()}-${testInfo.project.name}@example.test`;
  await page.getByLabel('Аты-жөнің', { exact: true }).fill('Амина');
  await page.getByLabel('Электрондық пошта').fill(email);
  await page.getByLabel('Құпия сөз', { exact: true }).fill('BrowserPassword123');
  await page.getByLabel('Құпия сөзді растау').fill('BrowserPassword123');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Тіркелу', exact: true }).click();
  await expect(page.getByLabel('Растау коды')).toBeVisible();
  await page.getByLabel('Растау коды').fill(await mailCode(email));
  await page.getByRole('button', { name: 'Поштаны растау', exact: true }).click();
  await expect(page).toHaveURL(/\/generate/);
  await expect(page.getByLabel('Эссе тақырыбы', { exact: false })).toHaveValue(
    'Ана тілім — асыл қазынам',
  );
  await expect(page.getByRole('button', { name: 'Өзім жазамын' })).toHaveCount(0);
  await expect(page.getByLabel('Сенің мәтінің', { exact: true })).toHaveCount(0);
  // Isolate external Gemini in this browser test. Authentication, persistence,
  // editing and exports still use the real API and database.
  await page.route('**/api/health', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), aiConfigured: true } });
  });
  let generationCalls = 0;
  await page.route('**/api/essays/generate', async (route) => {
    generationCalls++;
    const parameters = route.request().postDataJSON();
    expect(parameters.title).toBe('Ана тілім — асыл қазынам');
    expect(parameters).not.toHaveProperty('essayText');
    const response = await page.request.post('/api/essays', {
      data: {
        ...parameters,
        essayText:
          'Қазақ тілінде жазу мен үшін өз ойымды еркін жеткізудің жолы. Ана тілімізді құрметтеу әрбір азаматтың күнделікті әрекетінен көрінеді.',
      },
    });
    expect(response.status()).toBe(201);
    await route.fulfill({ status: 201, json: await response.json() });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Эссе жазу', exact: true }).click();
  await expect(page).toHaveURL(/\/result\//);
  expect(generationCalls).toBe(1);
  await page.getByRole('button', { name: 'Мәтінді өңдеу', exact: true }).click();
  await page
    .getByLabel('Эссе мәтіні', { exact: true })
    .fill(
      [
        'Ұлттық тіліміз — рухани қазына. Әрбір сөздің астарында халықтың тарихы мен үні бар.',
        'Біріншіден, тіл ұрпақтарды байланыстырады. Мысалы, отбасындағы әңгіме балаға дәстүрді танытады.',
        'Екіншіден, тіл білім алуға жол ашады. Нақты мысал ретінде қазақ тіліндегі кітаптарды атауға болады.',
        'Үшіншіден, күнделікті қолданыс тілдің дамуына ықпал етеді. Өз ойымызды анық жеткізу осыдан басталады.',
        'Қорыта айтқанда, тілді сақтау ортақ жауапкершілік. Оны күнделікті қолдану арқылы үлес қоса аламыз.',
      ].join('\n\n'),
    );
  await page.getByRole('button', { name: 'Өзгерістерді сақтау' }).click();
  await expect(page.getByText('Барлық өзгерістер сақталған')).toBeVisible();
  await expect(page.getByText('5 абзац', { exact: true })).toBeVisible();
  expect(
    await page.locator('#result-text').evaluate((el) => el.scrollHeight <= el.clientHeight + 2),
  ).toBe(true);
  await page.reload();
  await expect(page.getByText('5 абзац', { exact: true })).toBeVisible();
  const prose = page.locator('.document-prose');
  await expect(prose.locator('p')).toHaveCount(5);
  await expect(prose.locator('p').nth(1)).toContainText('Біріншіден');
  expect(
    await page.locator('.document-title').evaluate((el) => getComputedStyle(el).textAlign),
  ).toBe('center');
  const paragraphStyle = await prose
    .locator('p')
    .nth(1)
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        indent: parseFloat(style.textIndent),
        gap: parseFloat(style.marginTop),
        fontSize: parseFloat(style.fontSize),
      };
    });
  expect(paragraphStyle.indent).toBeGreaterThan(40);
  expect(paragraphStyle.gap).toBeGreaterThan(0);
  expect(paragraphStyle.gap).toBeLessThanOrEqual(paragraphStyle.fontSize);
  await page.screenshot({
    path: `test-results/paragraphs-${testInfo.project.name}.png`,
    fullPage: true,
  });
  for (const name of ['PDF', 'Word', 'TXT']) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name, exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toContain('EsseKZ-');
    await file.saveAs(
      testInfo.outputPath(`paragraphs.${name === 'Word' ? 'docx' : name.toLowerCase()}`),
    );
  }
  await page.getByRole('link', { name: 'Жұмыстарым', exact: true }).click();
  await expect(page.locator('.essay-card')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Эсселерді іздеу' }).fill('Сәйкессөз');
  await expect(page.getByRole('heading', { name: 'Сәйкес эссе табылмады' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Эсселерді іздеу' }).fill('');
  await expect(page.locator('.essay-card')).toHaveCount(1);
  await page.getByRole('button', { name: /эссесін жою/ }).click();
  await page.getByRole('button', { name: 'Жою', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Жаңа парақтан бастайық' })).toBeVisible();
  await page.goto('/profile');
  await page.getByLabel('Есіміңіз').fill('Амина Қаламгер');
  await page.getByRole('button', { name: 'Өзгерістерді сақтау' }).click();
  await expect(page.getByRole('heading', { name: 'Амина Қаламгер' })).toBeVisible();
  await page.getByRole('button', { name: 'Аккаунттан шығу', exact: true }).last().click();
  await expect(page).toHaveURL('/');
  await page.goto('/history');
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole('link', { name: 'Құпия сөзді ұмыттыңыз ба?' }).click();
  await page.getByLabel('Электрондық пошта').fill(email);
  await page.getByRole('button', { name: 'Код жіберу', exact: true }).click();
  await expect(page.getByLabel('Растау коды')).toBeVisible();
  await page.getByLabel('Растау коды').fill(await mailCode(email));
  await page.getByLabel('Құпия сөз', { exact: true }).fill('ResetBrowserPassword123');
  await page.getByLabel('Құпия сөзді растау').fill('ResetBrowserPassword123');
  await page.getByRole('button', { name: 'Құпия сөзді сақтау', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Электрондық пошта').fill(email);
  await page.getByLabel('Құпия сөз', { exact: true }).fill('ResetBrowserPassword123');
  await page.getByRole('button', { name: 'Кіру', exact: true }).click();
  await expect(page).toHaveURL(/\/generate/);
  expect(errors).toEqual([]);
});
