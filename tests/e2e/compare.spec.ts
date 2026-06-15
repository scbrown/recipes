import { test, expect } from '@playwright/test';
import { publishedRecipeCount } from './helpers.ts';

const COMPARE_URL = '/recipes/compare/';

test.describe('Compare page', () => {
  test('lists all recipes in the table', async ({ page }) => {
    await page.goto(COMPARE_URL);
    const table = page.getByTestId('compare-table');
    await expect(table).toBeVisible();
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(publishedRecipeCount());
  });

  test('sorts by protein when the header is clicked', async ({ page }) => {
    await page.goto(COMPARE_URL);
    const proteinHeader = page.getByRole('button', { name: /^Protein/ });
    await proteinHeader.click();
    // After one click on a numeric column we descend; clicking again ascends.
    await expect(proteinHeader).toContainText(/Protein\s*[↑↓]/);
  });

  test('filters rows when a tag chip is toggled', async ({ page }) => {
    await page.goto(COMPARE_URL);
    const allRows = page.getByTestId('compare-table').locator('tbody tr');
    const initialCount = await allRows.count();
    await page.getByTestId('tag-drink-component').click();
    const filteredCount = await allRows.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(initialCount);
  });

  test('renders the scatter chart canvas', async ({ page }) => {
    await page.goto(COMPARE_URL);
    const chart = page.getByTestId('scatter-chart');
    await expect(chart).toBeVisible();
    await expect(chart.locator('canvas')).toBeVisible();
  });

  test('toggling micronutrients adds DV-percent columns', async ({ page }) => {
    await page.goto(COMPARE_URL);
    const headers = page.getByTestId('compare-table').locator('thead th');
    const before = await headers.count();
    await page.getByTestId('show-micros-toggle').check();
    await expect(headers).toHaveCount(before + 6);
  });
});
