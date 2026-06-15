<script lang="ts">
  import type { RecipePayload, Selection } from '../../lib/recipe-payload.ts';
  import {
    computeForSelection,
    defaultSelection,
    resolvedIngredientLines,
  } from '../../lib/recipe-payload.ts';
  import NutritionPanel from './NutritionPanel.svelte';
  import MacroBar from './MacroBar.svelte';
  import ContributionDonut from './ContributionDonut.svelte';
  import MicronutrientRadar from './MicronutrientRadar.svelte';

  type Props = { payload: RecipePayload };
  let { payload }: Props = $props();

  let selection: Selection = $state(defaultSelection(payload));
  let nutrition = $derived(computeForSelection(payload, selection));
  let lines = $derived(resolvedIngredientLines(payload, selection));
  let activeVariant = $derived(payload.variants.find((v) => v.id === selection.variantId));

  function toggleFlavor(id: string) {
    if (selection.flavorIds.includes(id)) {
      selection.flavorIds = selection.flavorIds.filter((f) => f !== id);
    } else {
      selection.flavorIds = [...selection.flavorIds, id];
    }
  }

  function slotOptions(role: string): { id: string; name: string }[] {
    const acc: { id: string; name: string }[] = [];
    const seen: Record<string, true> = {};
    const push = (id: string, name: string) => {
      if (!seen[id]) {
        seen[id] = true;
        acc.push({ id, name });
      }
    };
    const scan = (lines: import('../../lib/recipe-payload.ts').IngredientLine[]) => {
      for (const line of lines) {
        if (line.kind === 'slot' && line.role === role) {
          const def = payload.library[line.defaultId];
          if (def) push(def.id, def.name);
          for (const alt of line.alternatives) {
            const a = payload.library[alt.ingredientId];
            if (a) push(a.id, a.name);
          }
        }
      }
    };
    scan(payload.ingredients);
    for (const v of payload.variants) scan(v.additions);
    return acc;
  }

  function uniqueRoles(): string[] {
    const acc: string[] = [];
    const scan = (lines: import('../../lib/recipe-payload.ts').IngredientLine[]) => {
      for (const line of lines)
        if (line.kind === 'slot' && !acc.includes(line.role)) acc.push(line.role);
    };
    scan(payload.ingredients);
    for (const v of payload.variants) scan(v.additions);
    return acc;
  }
</script>

<div class="layout">
  <section class="ingredients">
    <h2>Ingredients</h2>
    <table>
      <tbody>
        {#each lines.base as line (line.ingredientId + line.quantityDisplay)}
          <tr>
            <td class="qty mono">{line.quantityDisplay}</td>
            <td>
              {line.name}
              {#if line.line.note}<span class="note muted">— {line.line.note}</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if uniqueRoles().length > 0}
      <h3 class="ui">Substitutions</h3>
      <div class="picker-group">
        {#each uniqueRoles() as role (role)}
          {@const options = slotOptions(role)}
          <fieldset class="picker" data-testid="substitution-{role}">
            <legend class="ui muted">{role}</legend>
            {#each options as opt (opt.id)}
              <label class="option">
                <input
                  type="radio"
                  name="role-{role}"
                  value={opt.id}
                  checked={selection.substitutions[role] === opt.id}
                  onchange={() =>
                    (selection.substitutions = { ...selection.substitutions, [role]: opt.id })}
                />
                <span>{opt.name}</span>
              </label>
            {/each}
          </fieldset>
        {/each}
      </div>
    {/if}

    {#if payload.variants.length > 0}
      <h3 class="ui">Preparation</h3>
      <fieldset class="picker" data-testid="variant-picker">
        <legend class="ui muted sr-only">Variant</legend>
        {#each payload.variants as v (v.id)}
          <label class="option">
            <input
              type="radio"
              name="variant"
              value={v.id}
              checked={selection.variantId === v.id}
              onchange={() => (selection.variantId = v.id)}
            />
            <span>{v.name} <span class="muted">— {v.serving}</span></span>
          </label>
        {/each}
      </fieldset>
    {/if}

    {#if activeVariant && activeVariant.additions.length > 0}
      <h3 class="ui">For the {activeVariant.name.toLowerCase()}</h3>
      <table>
        <tbody>
          {#each lines.variant as line (line.ingredientId + line.quantityDisplay)}
            <tr>
              <td class="qty mono">{line.quantityDisplay}</td>
              <td>
                {line.name}
                {#if line.line.note}<span class="note muted">— {line.line.note}</span>{/if}
              </td>
            </tr>
          {/each}
          {#each lines.variantReductions as r (r.ingredientId + r.quantityDisplay)}
            <tr class="reduction">
              <td class="qty mono">−{r.quantityDisplay}</td>
              <td>{r.name} <span class="note muted">— removed</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}

    {#if payload.flavors.length > 0}
      <h3 class="ui">Flavor variants</h3>
      <fieldset class="picker" data-testid="flavor-picker">
        <legend class="ui muted sr-only">Flavors</legend>
        {#each payload.flavors as f (f.id)}
          <label class="option">
            <input
              type="checkbox"
              checked={selection.flavorIds.includes(f.id)}
              onchange={() => toggleFlavor(f.id)}
            />
            <span>{f.name}</span>
          </label>
        {/each}
      </fieldset>

      {#each lines.flavors as f (f.flavorId)}
        <details class="flavor-details" open>
          <summary class="ui">{f.flavorName}</summary>
          <table>
            <tbody>
              {#each f.additions as line (line.ingredientId + line.quantityDisplay)}
                <tr>
                  <td class="qty mono">{line.quantityDisplay}</td>
                  <td>{line.name}</td>
                </tr>
              {/each}
              {#each f.reductions as r (r.ingredientId + r.quantityDisplay)}
                <tr class="reduction">
                  <td class="qty mono">−{r.quantityDisplay}</td>
                  <td>{r.name} <span class="note muted">— removed</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </details>
      {/each}
    {/if}
  </section>

  <aside class="rail">
    <NutritionPanel {nutrition} serving={activeVariant?.serving} />
    <MacroBar nutrients={nutrition.perServing ?? nutrition.total} />
    <ContributionDonut contributions={nutrition.contributions} library={payload.library} />
  </aside>
</div>

<section class="micros">
  <MicronutrientRadar nutrients={nutrition.perServing ?? nutrition.total} />
</section>

<style>
  .layout {
    display: grid;
    gap: 2rem;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    margin-bottom: 3rem;
  }
  @media (max-width: 768px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  h2 {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 1.5rem;
    margin-block: 0 1rem;
  }
  h3 {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-block: 2rem 0.75rem;
    color: var(--color-muted);
    font-weight: 600;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  td {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-rule);
  }
  .qty {
    width: 8rem;
    white-space: nowrap;
    vertical-align: top;
    color: var(--color-muted);
  }
  .note {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.85rem;
    margin-top: 0.15rem;
  }
  .picker-group {
    display: grid;
    gap: 0.75rem;
  }
  .picker {
    border: 1px solid var(--color-rule);
    border-radius: 0;
    padding: 0.75rem 1rem;
    margin: 0;
    display: grid;
    gap: 0.5rem;
    background: var(--color-card);
  }
  legend {
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    padding: 0 0.5rem;
    color: var(--color-accent);
    background: var(--color-bg);
  }
  .option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.95rem;
  }
  .option input {
    margin: 0;
    accent-color: var(--color-accent);
  }
  .reduction {
    color: var(--color-muted);
    font-style: italic;
  }
  .flavor-details {
    margin-top: 1rem;
  }
  .flavor-details summary {
    cursor: pointer;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .rail {
    position: sticky;
    top: 1.5rem;
    align-self: start;
    display: grid;
    gap: 1rem;
  }
  .micros {
    margin-bottom: 3rem;
  }
</style>
