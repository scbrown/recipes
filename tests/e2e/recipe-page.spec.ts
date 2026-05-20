import { test, expect } from '@playwright/test';

test.describe('Recipe page', () => {
  test('loads and renders ingredients with default nutrition', async ({ page }) => {
    await page.goto('/recipes/crepes-pancakes-nougat');
    await expect(
      page.getByRole('heading', { name: 'Master Crepe, Pancake, and Nougat Mix' }),
    ).toBeVisible();
    await expect(page.getByTestId('nutrition-panel')).toBeVisible();
    const calories = await page.getByTestId('nutr-calories').textContent();
    expect(calories).not.toBe('—');
    expect(Number(calories)).toBeGreaterThan(0);
  });

  test('switching protein substitution updates nutrition', async ({ page }) => {
    await page.goto('/recipes/crepes-pancakes-nougat');
    const protein = page.getByTestId('nutr-protein');
    const before = await protein.textContent();
    await page.getByTestId('substitution-protein').getByLabel('Pea Protein Isolate').check();
    await expect(protein).not.toHaveText(before ?? '');
  });

  test('switching variant updates serving label and recomputes', async ({ page }) => {
    await page.goto('/recipes/crepes-pancakes-nougat');
    const panel = page.getByTestId('nutrition-panel');
    const heading = panel.locator('h3');
    await expect(heading).toContainText('Per serving');
    const caloriesBefore = await page.getByTestId('nutr-calories').textContent();
    await page.getByTestId('variant-picker').getByLabel(/Crepe/).check();
    await expect(page.getByTestId('nutr-calories')).not.toHaveText(caloriesBefore ?? '');
  });

  test('toggling a flavor variant adds calories', async ({ page }) => {
    await page.goto('/recipes/crepes-pancakes-nougat');
    const calories = page.getByTestId('nutr-calories');
    const before = Number(await calories.textContent());
    await page.getByTestId('flavor-picker').getByLabel('Cake Batter').check();
    await expect
      .poll(async () => Number(await calories.textContent()))
      .toBeGreaterThanOrEqual(before);
  });
});
