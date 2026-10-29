import { test, expect } from '@playwright/test';
test('home, responsive navigation, account, manual editor, exports, private history and logout', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ойың — қазына/ })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.locator('body').evaluate((el) => el.clientWidth),
  );
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: 'Эссе жазуды бастау' }).click();
  await expect(page.getByRole('button', { name: /Кіріп, жалғастыру/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Өзім жазамын' }).click();
  await page.getByLabel('Эссе тақырыбы', { exact: false }).fill('Ана тілім — асыл қазынам');
  await page
    .getByLabel('Сенің мәтінің')
    .fill(
      'Қазақ тілінде жазу мен үшін өз ойымды еркін жеткізудің жолы. Ана тілімізді құрметтеу әрбір азаматтың күнделікті әрекетінен көрінеді.',
    );
  await page.getByRole('button', { name: 'Кіріп, жалғастыру' }).click();
  await page.getByRole('link', { name: 'Тіркелу', exact: true }).click();
  const email = `writer-${Date.now()}-${testInfo.project.name}@example.test`;
  await page.getByLabel('Есіміңіз', { exact: true }).fill('Амина');
  await page.getByLabel('Электрондық пошта').fill(email);
  await page.getByLabel('Құпия сөз', { exact: true }).fill('BrowserPassword123');
  await page.getByLabel('Құпия сөзді қайталаңыз').fill('BrowserPassword123');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Аккаунт ашу' }).click();
  await expect(page).toHaveURL(/\/generate/);
  await page.getByRole('button', { name: 'Өзім жазамын' }).click();
  await expect(page.getByLabel('Сенің мәтінің')).toHaveValue(/Қазақ тілінде/);
  await page.getByRole('button', { name: 'Мәтінді сақтау', exact: true }).click();
  await expect(page).toHaveURL(/\/result\//);
  await page
    .getByLabel('Эссе мәтіні', { exact: true })
    .fill(
      'Ұлттық тіліміз — рухани қазына. Әрбір сөздің астарында халықтың тарихы, үні және болашаққа деген сенімі бар.',
    );
  await page.getByRole('button', { name: 'Өзгерістерді сақтау' }).click();
  await expect(page.getByText('Барлық өзгерістер сақталған')).toBeVisible();
  for (const name of ['PDF', 'Word', 'TXT']) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name, exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toContain('EsseKZ-');
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
  expect(errors).toEqual([]);
});
