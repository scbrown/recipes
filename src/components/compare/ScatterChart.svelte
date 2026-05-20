<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, ScatterController, PointElement, LinearScale, Tooltip, Title } from 'chart.js';
  import type { CompareRow } from '../../lib/compare.ts';

  type Props = { rows: CompareRow[]; baseUrl: string };
  let { rows, baseUrl }: Props = $props();

  let canvas: HTMLCanvasElement | null = $state(null);
  let chart: Chart<'scatter'> | null = null;

  function buildData(input: CompareRow[]) {
    return {
      datasets: [
        {
          label: 'Recipes',
          data: input
            .filter((r) => {
              const d = r.perServing ?? r.total;
              return d.calories > 0 && d.protein !== undefined;
            })
            .map((r) => {
              const d = r.perServing ?? r.total;
              return {
                x: d.calories,
                y: d.protein ?? 0,
                title: r.title,
                id: r.id,
              };
            }),
          backgroundColor: 'rgb(139 42 31 / 70%)',
          borderColor: 'rgb(139 42 31)',
          pointRadius: 6,
          pointHoverRadius: 9,
        },
      ],
    };
  }

  onMount(() => {
    if (!canvas) return;
    Chart.register(ScatterController, PointElement, LinearScale, Tooltip, Title);
    chart = new Chart(canvas, {
      type: 'scatter',
      data: buildData(rows),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Calories per serving' },
            grid: { color: 'rgb(231 227 216)' },
          },
          y: {
            type: 'linear',
            title: { display: true, text: 'Protein per serving (g)' },
            grid: { color: 'rgb(231 227 216)' },
            beginAtZero: true,
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const raw = ctx.raw as { title: string; x: number; y: number };
                return `${raw.title}: ${String(raw.x)} cal, ${String(raw.y)} g protein`;
              },
            },
          },
        },
        onClick: (_event, elements) => {
          if (elements.length === 0) return;
          const first = elements[0];
          if (!first || chart === null) return;
          const dataset = chart.data.datasets[0];
          if (!dataset) return;
          const point = dataset.data[first.index] as { id: string } | undefined;
          if (point && typeof window !== 'undefined') {
            window.location.href = `${baseUrl}/recipes/${point.id}`;
          }
        },
      },
    });
  });

  $effect(() => {
    if (chart) {
      chart.data = buildData(rows);
      chart.update();
    }
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });
</script>

<div class="chart-wrap" data-testid="scatter-chart">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-wrap {
    position: relative;
    height: 360px;
    background: var(--color-card);
    border: 1px solid var(--color-rule);
    border-radius: 4px;
    padding: 1rem;
  }
</style>
