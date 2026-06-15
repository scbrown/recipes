import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Number of non-draft recipes — i.e. the count rendered on the home and compare
 * pages (both filter with `!data.draft`). Derived from the content directory so
 * the assertion never goes stale as recipes are added.
 */
export function publishedRecipeCount(): number {
  const dir = join(process.cwd(), 'src/content/recipes');
  return readdirSync(dir).filter(
    (f) => f.endsWith('.md') && !/^draft:\s*true\s*$/m.test(readFileSync(join(dir, f), 'utf8')),
  ).length;
}
