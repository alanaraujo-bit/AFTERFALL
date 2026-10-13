import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function skipOnboarding(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/boas-vindas/);
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

const hero = (page: Page) => page.locator('section[data-next]');

/** Código (ex.: "T1 · E01") do próximo item mostrado no hero. */
async function heroCode(page: Page) {
  const id = await hero(page).getAttribute('data-next');
  return page.locator(`[id="hero-title-${id}"] > span`).first();
}

/** Clica em “Já assisti” e espera o hero avançar para o próximo item. */
async function markHero(page: Page) {
  const before = await hero(page).getAttribute('data-next');
  await page.locator(`[data-hero-id="${before}"]`).getByRole('button', { name: 'Já assisti' }).click();
  await expect(hero(page)).not.toHaveAttribute('data-next', before!);
}

test.describe('jornada', () => {
  test('onboarding completo grava preferências e leva ao primeiro item', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Começar' }).click();
    await page.getByRole('radio', { name: /Lançamento/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('switch', { name: /Incluir webisódios/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Iniciar jornada' }).click();
    await expect(page).toHaveURL(/\/$/);
    // Ordem de lançamento sem extras começa no piloto de The Walking Dead
    await expect(page.getByRole('link', { name: 'The Walking Dead', exact: true })).toBeVisible();
    await expect(hero(page)).toHaveAttribute('data-next', 'twd-s01e01');
  });

  test('marcar avança o próximo episódio, sobrevive ao reload e permite desfazer', async ({ page }) => {
    await skipOnboarding(page);
    await markHero(page);
    const second = await hero(page).getAttribute('data-next');
    await expect(await heroCode(page)).toBeVisible();

    await page.reload();
    await expect(hero(page)).toHaveAttribute('data-next', second!);
    await expect(page.getByText('1 / 426')).toBeVisible();

    // Desfazer pela notificação
    await markHero(page);
    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect(hero(page)).toHaveAttribute('data-next', second!);
  });

  test('trocar ordem e extras não apaga progresso', async ({ page }) => {
    await skipOnboarding(page);
    await markHero(page);
    await markHero(page);
    await page.goto('/ajustes');
    const extras = page.getByRole('switch', { name: /Incluir extras/ });
    await page.getByRole('radio', { name: 'Lançamento' }).click();
    await extras.click();
    await expect(extras).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('1 de 363 · lançamento')).toBeVisible();
    await page.getByRole('radio', { name: 'Cronológica' }).click();
    await extras.click();
    await expect(extras).toHaveAttribute('aria-checked', 'true');
    await page.goto('/estatisticas');
    await expect(page.getByText('2 de 426 · cronológica')).toBeVisible();
  });

  test('marcar temporada em lote com confirmação', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/biblioteca/twd');
    await page.getByRole('button', { name: 'Marcar temporada' }).first().click();
    await expect(page.getByRole('alertdialog')).toContainText('6 itens');
    await page.getByRole('button', { name: 'Marcar como assistida' }).click();
    await expect(page.getByText('2010 · 6/6')).toBeVisible();
    await page.reload();
    await expect(page.getByText('2010 · 6/6')).toBeVisible();
  });

  test('quem já viu toda a série-mãe continua do primeiro pendente da cronologia', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/biblioteca/twd');
    await page.getByRole('button', { name: 'Série vista' }).click();
    await page.getByRole('button', { name: 'Marcar como assistida' }).click();
    await expect(page.getByText('177 de 177')).toBeVisible();
    await page.goto('/');
    await expect(hero(page)).toHaveAttribute('data-next', 'tales-s01e02');
  });

  test('spoiler shield oculta títulos futuros e permite revelar', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/biblioteca/twd');
    const row = page.locator('[data-episode="twd-s02e01"]');
    await expect(row).toContainText('Título oculto');
    await row.getByRole('button', { name: /Revelar título/ }).click();
    await expect(row).not.toContainText('Título oculto');
  });

  test('backup: exportar e restaurar em outro navegador (round-trip)', async ({ page, browser }) => {
    await skipOnboarding(page);
    await markHero(page);
    await markHero(page);
    await page.goto('/ajustes');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar', exact: true }).click()]);
    const path = await download.path();
    const json = JSON.parse(await readFile(path, 'utf8'));
    expect(json.schemaVersion).toBe(2);
    expect(json.exportedAt).toBeTruthy();
    expect(json.progress).toHaveLength(2);

    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    await skipOnboarding(other);
    await other.goto('/ajustes');
    await other.locator('input[type=file]').setInputFiles(path);
    await expect(other.getByRole('dialog')).toContainText('2 concluídos');
    await other.getByRole('button', { name: 'Substituir' }).click();
    await expect(other.getByText('Progresso substituído pelo backup')).toBeVisible();
    await other.goto('/estatisticas');
    await expect(other.getByText('2 de 426 · cronológica')).toBeVisible();
    await ctx.close();
  });

  test('importação inválida é rejeitada sem alterar dados', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/ajustes');
    await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"oi":1}') });
    await expect(page.getByText('Este arquivo não é um backup do AFTERFALL.')).toBeVisible();
  });
});

test.describe('rotas e PWA', () => {
  for (const route of ['/linha-do-tempo', '/biblioteca/dd', '/episodio/twd-s05e10', '/estatisticas', '/ajustes/fontes', '/rota-inexistente']) {
    test(`acesso direto com refresh: ${route}`, async ({ page }) => {
      await skipOnboarding(page);
      await page.goto(route);
      await page.reload();
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }

  test('funciona offline após o primeiro carregamento', async ({ page, context }) => {
    await skipOnboarding(page);
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.active?.state;
    });
    // espera o controle do service worker
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await markHero(page);

    await context.setOffline(true);
    await page.goto('/episodio/dd-s01e01');
    await expect(page.locator('h1').first()).toContainText('T1 · E01');
    await page.goto('/linha-do-tempo');
    await expect(page.getByText('Offline — tudo continua funcionando')).toBeVisible();
    await page.goto('/');
    await expect(page.getByText('1 / 426')).toBeVisible();
    await context.setOffline(false);
  });

  test('página aponta para o manifest e registra o service worker', async ({ page }) => {
    await page.goto('/boas-vindas');
    await expect(page.locator('link[rel=manifest]')).toHaveCount(1);
    await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()))).toBe(true);
  });

  test('manifest e ícones', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.display).toBe('standalone');
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    for (const icon of m.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
  });
});

test.describe('responsividade e acessibilidade', () => {
  const routes = ['/', '/linha-do-tempo', '/biblioteca', '/biblioteca/twd', '/episodio/ftwd-s01e01', '/estatisticas', '/ajustes', '/ajustes/fontes'];
  for (const width of [360, 390, 768, 1440]) {
    test(`sem overflow horizontal em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 860 });
      await skipOnboarding(page);
      for (const r of routes) {
        await page.goto(r);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${r} @ ${width}px`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `screenshots/${width}${r.replace(/\//g, '_') || '_home'}.png` });
      }
    });
  }

  test('onboarding sem overflow em 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/boas-vindas');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: 'screenshots/360_onboarding.png' });
  });

  test('tema claro sem violações de acessibilidade', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/ajustes');
    await page.getByRole('radio', { name: /Claro/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    for (const r of ['/', '/linha-do-tempo', '/biblioteca/twd', '/estatisticas', '/ajustes']) {
      await page.goto(r);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await page.waitForTimeout(700);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(serious.map((v) => `${r} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
      await page.screenshot({ path: `screenshots/light${r.replace(/\//g, '_')}.png` });
    }
  });

  test('tema claro renderiza', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/ajustes');
    await page.getByRole('radio', { name: /Claro/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.goto('/');
    await page.waitForTimeout(700);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('navegação por teclado', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await skipOnboarding(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
    // Chega ao link da timeline pela navegação lateral
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      if (await page.getByRole('navigation', { name: 'Principal' }).first().getByRole('link', { name: 'Linha do tempo' }).evaluate((el) => el === document.activeElement)) break;
    }
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/linha-do-tempo/);
  });

  for (const r of ['/', '/linha-do-tempo', '/biblioteca/twd', '/episodio/twd-s01e01', '/estatisticas', '/ajustes']) {
    test(`sem violações críticas de acessibilidade: ${r}`, async ({ page }) => {
      await skipOnboarding(page);
      await page.goto(r);
      await page.waitForTimeout(500);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }
});
