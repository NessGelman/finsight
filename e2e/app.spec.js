import { expect, test } from '@playwright/test';

test.describe('FinSight E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/finsight/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Compare' })).toBeVisible();
  });

  test('renders compare experience and strategy controls', async ({ page }) => {
    await expect(page.getByText('Optimization Strategy:')).toBeVisible();
    const lowestCostBtn = page.getByRole('button', { name: 'Lowest Cost' });
    await lowestCostBtn.click();
    await expect(lowestCostBtn).toHaveClass(/active/);
    await expect(page.locator('.comparison-table tbody tr')).toHaveCount(8);
  });

  test('can open and close amortization schedule modal', async ({ page }) => {
    const firstRow = page.locator('.comparison-table tbody tr').first();
    await firstRow.click();
    await firstRow.getByRole('button', { name: /view payment schedule/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Schedule/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('supports filtering and shows visible counts', async ({ page }) => {
    const lowMonthly = page.getByRole('button', { name: /Low Monthly/i });
    await lowMonthly.click();
    await expect(lowMonthly).toHaveClass(/active/);
    await expect(page.getByText(/Showing \d+ of \d+/)).toBeVisible();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(lowMonthly).not.toHaveClass(/active/);
  });

  test('ai advisor tab renders as client-side chat ui', async ({ page }) => {
    await page.getByRole('button', { name: 'AI Advisor' }).click();
    await expect(page.getByRole('heading', { name: /AI Advisor \(In-Browser LLM\)/ })).toBeVisible();
    const input = page.locator('.ai-advisor-input textarea');
    await input.fill('What is my cheapest option and why?');
    await expect(page.getByRole('button', { name: 'Ask Advisor' })).toBeEnabled();
  });

  test('ai advisor gives hybrid greeting + follow-up prompt', async ({ page }) => {
    await page.getByRole('button', { name: 'AI Advisor' }).click();
    await page.locator('.ai-advisor-input textarea').fill('hi');
    await page.getByRole('button', { name: 'Ask Advisor' }).click();
    const lastAdvisor = page.locator('.ai-msg--assistant .ai-msg-body').last();
    await expect(lastAdvisor).toContainText(/lowest total cost|help you pick/i);
    await expect(lastAdvisor).toContainText(/want to continue\?|next:/i);
  });

  test('quality fallback path shows deterministic answer when rewrite is bad', async ({ page }) => {
    await page.addInitScript(() => {
      window.__FINSIGHT_AI_TEST__ = { forceBadRewrite: true };
    });
    await page.goto('/finsight/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'AI Advisor' }).click();
    await page.locator('.ai-advisor-input textarea').fill('compare top options');
    await page.getByRole('button', { name: 'Ask Advisor' }).click();
    const lastAdvisor = page.locator('.ai-msg--assistant .ai-msg-body').last();
    await expect(lastAdvisor).toContainText(/metrics:|total cost|monthly burden/i);
    await expect(lastAdvisor).not.toContainText(/i\.e\., i\.e\./i);
  });

  test('mode switching updates controls and response shape', async ({ page }) => {
    await page.getByRole('button', { name: 'AI Advisor' }).click();
    await page.selectOption('#advisor-style', 'concise');
    await page.selectOption('#advisor-quality', 'fast');
    await expect(page.locator('#advisor-style')).toHaveValue('concise');
    await expect(page.locator('#advisor-quality')).toHaveValue('fast');
    await expect(page.getByText(/Mode: Fast mode/i)).toBeVisible();
    await page.locator('.ai-advisor-input textarea').fill('explain in beginner terms');
    await page.getByRole('button', { name: 'Ask Advisor' }).click();
    await expect(page.locator('.ai-msg--assistant .ai-msg-body').last()).toContainText(/key metrics|next:/i);
  });
});
