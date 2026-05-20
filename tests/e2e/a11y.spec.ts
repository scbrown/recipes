import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES: { name: string; url: string }[] = [
  { name: 'home', url: '/recipes/' },
  { name: 'recipe list', url: '/recipes/recipes/' },
  { name: 'recipe detail', url: '/recipes/recipes/crepes-pancakes-nougat/' },
  { name: 'compare', url: '/recipes/compare/' },
  { name: 'ingredients', url: '/recipes/ingredients/' },
  { name: 'search', url: '/recipes/search/' },
];

for (const p of PAGES) {
  test(`${p.name} has no serious axe violations`, async ({ page }) => {
    await page.goto(p.url);
    // Wait for any client-island hydration before scanning.
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    if (serious.length > 0) {
      console.error('Axe violations:', JSON.stringify(serious, null, 2));
    }
    expect(serious).toEqual([]);
  });
}
