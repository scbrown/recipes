import { test, expect } from '@playwright/test';
import { publishedRecipeCount } from './helpers.ts';

const HOME = '/recipes/';

test.describe('Navigation', () => {
  test('home page lists all recipes', async ({ page }) => {
    await page.goto(HOME);
    await expect(page.getByRole('heading', { name: 'Recipes', level: 1 })).toBeVisible();
    await expect(page.locator('.recipe-card')).toHaveCount(publishedRecipeCount());
  });

  test('header nav reaches every primary section', async ({ page }) => {
    await page.goto(HOME);
    // Scope to <nav> so the "Recipes" link is not ambiguous with the brand link,
    // whose text ("Recipes / Stainless Kitchen") also contains "Recipes".
    const header = page.locator('.site-header nav');
    await header.getByRole('link', { name: 'Compare' }).click();
    await expect(page).toHaveURL(/\/recipes\/compare\/?$/);
    await header.getByRole('link', { name: 'Ingredients' }).click();
    await expect(page).toHaveURL(/\/recipes\/ingredients\/?$/);
    await header.getByRole('link', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/recipes\/search\/?$/);
    await header.getByRole('link', { name: 'Recipes' }).click();
    await expect(page).toHaveURL(/\/recipes\/recipes\/?$/);
  });

  test('clicking a recipe card opens the recipe page', async ({ page }) => {
    await page.goto(HOME);
    await page.locator('.recipe-card').first().click();
    await expect(page.getByTestId('nutrition-panel')).toBeVisible();
  });
});
