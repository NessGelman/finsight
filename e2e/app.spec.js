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
});
