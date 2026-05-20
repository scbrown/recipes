<script lang="ts">
  import type { CompareRow } from '../../lib/compare.ts';
  import ScatterChart from './ScatterChart.svelte';

  type Props = { rows: CompareRow[]; baseUrl: string };
  let { rows, baseUrl }: Props = $props();

  type SortKey =
    | 'title'
    | 'calories'
    | 'protein'
    | 'net_carbs'
    | 'fat'
    | 'fiber'
    | 'sodium_mg'
    | 'proteinPerHundredCal';
  type SortDir = 'asc' | 'desc';

  let sortKey = $state<SortKey>('calories');
  let sortDir = $state<SortDir>('desc');
  let activeTags = $state<string[]>([]);

  const allTags = $derived([...new Set(rows.flatMap((r) => r.tags))].sort());

  const filtered = $derived(
    activeTags.length === 0
      ? rows
      : rows.filter((r) => activeTags.every((t) => r.tags.includes(t))),
  );

  function nutrientValue(row: CompareRow, key: SortKey): number | null {
    if (key === 'title') return null;
    if (key === 'proteinPerHundredCal') return row.proteinPerHundredCal;
    const display = row.perServing ?? row.total;
    const v = display[key as keyof typeof display];
    return v ?? null;
  }

  const sorted = $derived(
    [...filtered].sort((a, b) => {
      if (sortKey === 'title') {
        return sortDir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      const av = nutrientValue(a, sortKey);
      const bv = nutrientValue(b, sortKey);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortDir === 'asc' ? av - bv : bv - av;
    }),
  );

  function setSort(key: SortKey) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = key === 'title' ? 'asc' : 'desc';
    }
  }

  function toggleTag(tag: string) {
    if (activeTags.includes(tag)) {
      activeTags = activeTags.filter((t) => t !== tag);
    } else {
      activeTags = [...activeTags, tag];
    }
  }

  function fmt(v: number | undefined | null): string {
    if (v === undefined || v === null) return '—';
    return v < 10 ? v.toFixed(1) : Math.round(v).toString();
  }

  function sortIndicator(key: SortKey): string {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }
</script>

<section class="filters ui" data-testid="tag-filters">
  <h2 class="filter-label">Filter by tag</h2>
  <div class="tag-list">
    {#each allTags as tag (tag)}
      <button
        type="button"
        class="tag-button"
        class:active={activeTags.includes(tag)}
        onclick={() => toggleTag(tag)}
        data-testid="tag-{tag}"
      >
        {tag}
      </button>
    {/each}
    {#if activeTags.length > 0}
      <button type="button" class="clear-button" onclick={() => (activeTags = [])}> Clear </button>
    {/if}
  </div>
  <p class="count muted">
    Showing {sorted.length} of {rows.length} recipes
  </p>
</section>

<section class="chart-section">
  <h2>Protein efficiency</h2>
  <p class="muted">
    Each dot is a recipe at its default serving. Up and to the left means more protein per calorie.
  </p>
  <ScatterChart rows={sorted} {baseUrl} />
</section>

<section class="table-wrapper" data-testid="compare-table">
  <table>
    <thead>
      <tr>
        <th class="sticky-col">
          <button type="button" class="sort-btn" onclick={() => setSort('title')}>
            Recipe{sortIndicator('title')}
          </button>
        </th>
        <th
          ><button type="button" class="sort-btn" onclick={() => setSort('calories')}
            >Calories{sortIndicator('calories')}</button
          ></th
        >
        <th
          ><button type="button" class="sort-btn" onclick={() => setSort('protein')}
            >Protein{sortIndicator('protein')}</button
          ></th
        >
        <th
          ><button type="button" class="sort-btn" onclick={() => setSort('net_carbs')}
            >Net carbs{sortIndicator('net_carbs')}</button
          ></th
        >
        <th
          ><button type="button" class="sort-btn" onclick={() => setSort('fat')}
            >Fat{sortIndicator('fat')}</button
          ></th
        >
        <th
          ><button type="button" class="sort-btn" onclick={() => setSort('fiber')}
            >Fiber{sortIndicator('fiber')}</button
          ></th
        >
        <th
          ><button type="button" class="sort-btn" onclick={() => setSort('sodium_mg')}
            >Sodium{sortIndicator('sodium_mg')}</button
          ></th
        >
        <th
          ><button type="button" class="sort-btn" onclick={() => setSort('proteinPerHundredCal')}
            >P / 100 cal{sortIndicator('proteinPerHundredCal')}</button
          ></th
        >
      </tr>
    </thead>
    <tbody>
      {#each sorted as row (row.id)}
        {@const d = row.perServing ?? row.total}
        <tr data-testid="row-{row.id}">
          <td class="sticky-col">
            <a href={`${baseUrl}/recipes/${row.id}`}>{row.title}</a>
            {#if row.serving}<span class="serving muted">{row.serving}</span>{/if}
          </td>
          <td class="num">{fmt(d.calories)}</td>
          <td class="num">{fmt(d.protein)} g</td>
          <td class="num">{fmt(d.net_carbs)} g</td>
          <td class="num">{fmt(d.fat)} g</td>
          <td class="num">{fmt(d.fiber)} g</td>
          <td class="num">{fmt(d.sodium_mg)} mg</td>
          <td class="num">{fmt(row.proteinPerHundredCal)}</td>
        </tr>
      {/each}
      {#if sorted.length === 0}
        <tr><td colspan="8" class="empty muted">No recipes match the selected tags.</td></tr>
      {/if}
    </tbody>
  </table>
</section>

<style>
  .filters {
    margin-bottom: 2rem;
  }
  .filter-label {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    font-weight: 600;
    margin: 0 0 0.5rem;
  }
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .tag-button,
  .clear-button {
    font-family: var(--font-ui);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.6rem;
    background: var(--color-code-bg);
    color: var(--color-muted);
    border: 1px solid transparent;
    border-radius: 2px;
    cursor: pointer;
  }
  .tag-button.active {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
  }
  .clear-button {
    background: transparent;
    text-decoration: underline;
  }
  .count {
    margin: 0.75rem 0 0;
    font-size: 0.85rem;
  }
  .chart-section {
    margin-block: 3rem;
  }
  .chart-section h2 {
    margin-block: 0 0.25rem;
    font-size: 1.25rem;
  }
  .chart-section .muted {
    margin-block: 0 1rem;
    font-size: 0.9rem;
  }
  .table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--color-rule);
    border-radius: 4px;
    background: var(--color-card);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-ui);
    font-variant-numeric: tabular-nums;
  }
  th {
    text-align: left;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-rule);
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 0;
    font-weight: 600;
  }
  .sort-btn {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 0.75rem 1rem;
    font: inherit;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .sort-btn:hover {
    color: var(--color-accent);
  }
  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-rule);
    vertical-align: top;
  }
  tbody tr:last-child td {
    border-bottom: 0;
  }
  .num {
    text-align: right;
    white-space: nowrap;
  }
  .sticky-col {
    position: sticky;
    left: 0;
    background: var(--color-card);
    z-index: 1;
  }
  th.sticky-col {
    background: var(--color-bg);
    z-index: 3;
  }
  .serving {
    display: block;
    font-size: 0.78rem;
    margin-top: 0.15rem;
  }
  .empty {
    text-align: center;
    padding: 2rem;
  }
</style>
