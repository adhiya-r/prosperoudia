document.addEventListener('DOMContentLoaded', () => {
  const payloadElement = document.getElementById('dashboard-payload');
  const chartElement = document.getElementById('dashboard-order-trend');

  if (!payloadElement || !chartElement || typeof window.Chart === 'undefined') {
    return;
  }

  let payload;

  try {
    payload = JSON.parse(payloadElement.textContent || '{}');
  } catch (error) {
    console.error('Failed to parse dashboard payload:', error);
    return;
  }

  const trend = payload.orderTrend || {};
  const labels = Array.isArray(trend.labels) ? trend.labels : [];
  const orderSeries = Array.isArray(trend.orders) ? trend.orders : [];
  const revenueSeries = Array.isArray(trend.revenue) ? trend.revenue : [];

  const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  });

  new window.Chart(chartElement, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Order',
          data: orderSeries,
          backgroundColor: 'rgba(16, 185, 129, 0.24)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 34,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Pendapatan',
          data: revenueSeries,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.14)',
          pointBackgroundColor: '#0f766e',
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.34,
          fill: true,
          yAxisID: 'yRevenue'
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            color: '#1e293b',
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              if (context.dataset.yAxisID === 'yRevenue') {
                return `${context.dataset.label}: ${currencyFormatter.format(context.parsed.y || 0)}`;
              }

              return `${context.dataset.label}: ${context.parsed.y || 0}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#5b6475'
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(223, 231, 235, 0.8)'
          },
          ticks: {
            color: '#5b6475',
            precision: 0
          }
        },
        yRevenue: {
          beginAtZero: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: '#5b6475',
            callback(value) {
              return currencyFormatter.format(value);
            }
          }
        }
      }
    }
  });
});
