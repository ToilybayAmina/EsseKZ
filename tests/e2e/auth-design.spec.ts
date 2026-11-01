import { test, expect } from '@playwright/test';

test('auth pages share the brand layout, adapt without overflow, and honor reduced motion', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const [route, title] of [
    ['/login', 'Қайта оралғаныңа қуаныштымыз.'],
    ['/register', 'Өз кеңістігіңді баста.'],
    ['/forgot-password', 'Құпия сөзіңді қалпына келтір.'],
  ]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const logo = page.locator('.auth-brand-logo');
    await expect(logo).toHaveAttribute('src', '/logo.svg');
    expect(
      await logo.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);
    await expect(page.locator('.auth-perks, .auth-form-icon')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
    const brand = await page.locator('.auth-brand').boundingBox();
    const form = await page.locator('.auth-form-panel').boundingBox();
    if (testInfo.project.name === 'mobile') expect(form!.y).toBeGreaterThan(brand!.y);
    else expect(form!.x).toBeGreaterThan(brand!.x);
    await page.screenshot({
      path: `test-results/auth-${route.slice(1)}-${testInfo.project.name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  if (testInfo.project.name === 'desktop') {
    for (const width of [834, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/register');
      expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({
        path: `test-results/auth-register-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  expect(
    await page.locator('.auth-brand-logo').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  expect(
    await page
      .locator('.auth-particles i')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  expect(errors).toEqual([]);
});

test('auth fields retain password visibility and accessible validation feedback', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Электрондық пошта').fill('invalid-email');
  await page.getByLabel('Құпия сөз', { exact: true }).fill('TestPassword123');
  await page.getByRole('button', { name: 'Құпия сөзді көрсету', exact: true }).click();
  await expect(page.getByLabel('Құпия сөз', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Құпия сөзді жасыру', exact: true }).click();
  await expect(page.getByLabel('Құпия сөз', { exact: true })).toHaveAttribute('type', 'password');
  await page.locator('.auth-submit').click();
  await expect(page.getByLabel('Электрондық пошта')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#email-error')).toHaveText('Email мекенжайын дұрыс енгізіңіз.');
  await page.getByLabel('Электрондық пошта').fill('valid@example.test');
  await expect(page.locator('#email-error')).toHaveCount(0);

  await page.goto('/register');
  await page.getByLabel('Аты-жөнің').fill('Амина');
  await page.getByLabel('Электрондық пошта').fill('valid@example.test');
  await page.getByLabel('Құпия сөз', { exact: true }).fill('TestPassword123');
  await page.getByLabel('Құпия сөзді растау').fill('DifferentPassword123');
  await page.getByRole('checkbox').check();
  await page.locator('.auth-submit').click();
  await expect(page.getByLabel('Құпия сөзді растау')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#confirm-error')).toHaveText('Құпия сөздер сәйкес келмейді.');
});
