import { test, expect } from '@playwright/test';

const SEARCH_URL = '/recipes/search/';

test.describe('Search page', () => {
  test('renders the page shell with a search root', async ({ page }) => {
    await page.goto(SEARCH_URL);
    await expect(page.getByRole('heading', { name: 'Search', level: 1 })).toBeVisible();
    await expect(page.getByTestId('search-root')).toBeVisible();
  });

  test('Pagefind UI mounts an input after the bundle loads', async ({ page }) => {
    await page.goto(SEARCH_URL);
    // Pagefind UI injects an .pagefind-ui__search-input element when ready.
    const input = page.locator('.pagefind-ui__search-input');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill('cranberry');
    const results = page.locator('.pagefind-ui__result');
    await expect(results.first()).toBeVisible({ timeout: 5_000 });
  });
});
