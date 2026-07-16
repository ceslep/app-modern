import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const chartInstances = new Map();

/**
 * Create a Chart.js instance
 */
export function createChart(canvasId, type, data, options = {}) {
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error('Canvas not found:', canvasId);
    return null;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Canvas context not available:', canvasId);
    return null;
  }

  const chart = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
        ...options.plugins,
      },
      ...options,
    },
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

/**
 * Create a bar chart
 */
export function createBarChart(canvasId, labels, datasets, options = {}) {
  return createChart(
    canvasId,
    'bar',
    {
      labels,
      datasets: datasets.map((ds) => ({
        backgroundColor: 'rgba(84, 51, 145, 0.7)',
        borderColor: 'rgba(84, 51, 145, 1)',
        borderWidth: 1,
        ...ds,
      })),
    },
    options
  );
}

/**
 * Create a line chart
 */
export function createLineChart(canvasId, labels, datasets, options = {}) {
  return createChart(
    canvasId,
    'line',
    {
      labels,
      datasets: datasets.map((ds) => ({
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        ...ds,
      })),
    },
    options
  );
}

/**
 * Create a doughnut chart
 */
export function createDoughnutChart(canvasId, labels, data, options = {}) {
  const colors = [
    'rgba(84, 51, 145, 0.8)',
    'rgba(25, 135, 84, 0.8)',
    'rgba(255, 193, 7, 0.8)',
    'rgba(220, 53, 69, 0.8)',
    'rgba(13, 202, 240, 0.8)',
    'rgba(108, 117, 125, 0.8)',
  ];

  return createChart(
    canvasId,
    'doughnut',
    {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    },
    {
      cutout: '60%',
      ...options,
    }
  );
}

/**
 * Create a pie chart
 */
export function createPieChart(canvasId, labels, data, options = {}) {
  const colors = [
    'rgba(84, 51, 145, 0.8)',
    'rgba(25, 135, 84, 0.8)',
    'rgba(255, 193, 7, 0.8)',
    'rgba(220, 53, 69, 0.8)',
    'rgba(13, 202, 240, 0.8)',
    'rgba(108, 117, 125, 0.8)',
  ];

  return createChart(
    canvasId,
    'pie',
    {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    },
    options
  );
}

/**
 * Destroy a chart instance
 */
export function destroyChart(canvasId) {
  if (chartInstances.has(canvasId)) {
    chartInstances.get(canvasId).destroy();
    chartInstances.delete(canvasId);
  }
}

/**
 * Destroy all chart instances
 */
export function destroyAllCharts() {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances.clear();
}

/**
 * Update chart data
 */
export function updateChartData(canvasId, newData) {
  const chart = chartInstances.get(canvasId);
  if (chart) {
    if (newData.labels) chart.data.labels = newData.labels;
    if (newData.datasets) chart.data.datasets = newData.datasets;
    chart.update();
  }
}

/**
 * Get chart instance
 */
export function getChart(canvasId) {
  return chartInstances.get(canvasId) || null;
}
