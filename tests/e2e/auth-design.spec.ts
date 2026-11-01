import { test, expect, type Page } from '@playwright/test';

async function checkOrnaments(page: Page) {
  const corners = page.locator('.auth-shell > .auth-corner');
  await expect(corners).toHaveCount(4);
  const center = page.locator('.auth-brand-divider');
  await expect(center).toHaveAttribute('src', '/ornaments/EsseKZ_center_ornament.png');
  await expect(page.locator('.auth-shell svg.auth-ornament, .auth-light-trails')).toHaveCount(0);
  for (const image of [...(await corners.all()), center]) {
    await image.evaluate((el) => (el as HTMLImageElement).decode());
    const stats = await image.evaluate((el) => {
      const img = el as HTMLImageElement;
      const box = img.getBoundingClientRect();
      const shell = img.closest('.auth-shell')!.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      for (let i = 3; i < alpha.length; i += 4) if (alpha[i] === 0) transparent++;
      return {
        ratio: box.width / box.height,
        intrinsic: img.naturalWidth / img.naturalHeight,
        inside:
          box.left >= shell.left &&
          box.right <= shell.right &&
          box.top >= shell.top &&
          box.bottom <= shell.bottom,
        transparent,
      };
    });
    expect(stats.ratio).toBeCloseTo(stats.intrinsic, 2);
    expect(stats.inside).toBe(true);
    expect(stats.transparent).toBeGreaterThan(0);
  }
  const boxes = await corners.evaluateAll((images) =>
    images.map((image) => {
      const box = image.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
  );
  for (const box of boxes) {
    expect(box.width).toBeCloseTo(boxes[0].width, 1);
    expect(box.height).toBeCloseTo(boxes[0].height, 1);
  }
  const alignment = await center.evaluate((img) => {
    const box = img.getBoundingClientRect();
    const brand = img.closest('.auth-brand')!.getBoundingClientRect();
    const slogan = img.previousElementSibling!.getBoundingClientRect();
    return {
      offset: Math.abs((box.left + box.right - brand.left - brand.right) / 2),
      below: box.top >= slogan.bottom,
    };
  });
  expect(alignment.offset).toBeLessThan(2);
  expect(alignment.below).toBe(true);
}

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
    await checkOrnaments(page);
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
      await checkOrnaments(page);
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
