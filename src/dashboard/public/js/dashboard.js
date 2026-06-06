(function () {
  const root = document.querySelector('[data-dashboard-root]');
  const payloadNode = document.getElementById('dashboard-payload');

  if (!root || !payloadNode) {
    return;
  }

  const endpoint = root.getAttribute('data-dashboard-endpoint') || '/dashboard/data';
  const eventsEndpoint = root.getAttribute('data-dashboard-events-endpoint') || '/dashboard/events';
  const metricNodes = Array.from(document.querySelectorAll('[data-metric-index]'));
  const snapshotNodes = {
    totalProducts: document.querySelector('[data-snapshot="totalProducts"]'),
    totalWarehouses: document.querySelector('[data-snapshot="totalWarehouses"]'),
    inventoryValue: document.querySelector('[data-snapshot="inventoryValue"]'),
    lowStockItems: document.querySelector('[data-snapshot="lowStockItems"]'),
    pendingTransfers: document.querySelector('[data-snapshot="pendingTransfers"]')
  };
  const lowStockList = document.querySelector('[data-dashboard-low-stock-list]');
  const transactionsList = document.querySelector('[data-dashboard-transactions-list]');
  const notificationsList = document.querySelector('[data-dashboard-notifications-list]');
  const stockInTotal = document.querySelector('[data-dashboard-stock-in-total]');
  const stockOutTotal = document.querySelector('[data-dashboard-stock-out-total]');
  const warehouseCountBadge = document.querySelector('[data-dashboard-warehouse-count]');
  const mapList = document.querySelector('[data-dashboard-map-list]');

  let chart;
  let map;
  let markersLayer;
  let eventSource;

  const translations = {
    id: {
      'dashboard.empty_low_stock_title': 'Belum ada produk stok kritis',
      'dashboard.empty_low_stock_note': 'Semua produk masih berada di atas batas minimum saat ini.',
      'dashboard.empty_transactions_title': 'Belum ada transaksi terbaru',
      'dashboard.empty_transactions_note': 'Setelah pergerakan stok berjalan, feed ini akan terisi otomatis.',
      'dashboard.empty_notifications_title': 'Belum ada notifikasi',
      'dashboard.empty_notifications_note': 'Alert akan muncul otomatis saat kondisi penting terdeteksi.',
      'dashboard.by_actor': 'oleh {{actor}}',
      'dashboard.location_count': '{{count}} lokasi',
      'dashboard.total_stock_in': 'Total Stock In',
      'dashboard.total_stock_out': 'Total Stock Out'
    },
    en: {
      'dashboard.empty_low_stock_title': 'No critical stock products yet',
      'dashboard.empty_low_stock_note': 'All products are still above their minimum threshold.',
      'dashboard.empty_transactions_title': 'No recent transactions yet',
      'dashboard.empty_transactions_note': 'Once stock movements happen, this feed will update automatically.',
      'dashboard.empty_notifications_title': 'No notifications yet',
      'dashboard.empty_notifications_note': 'Alerts will appear automatically when important conditions are detected.',
      'dashboard.by_actor': 'by {{actor}}',
      'dashboard.location_count': '{{count}} locations',
      'dashboard.total_stock_in': 'Total Stock In',
      'dashboard.total_stock_out': 'Total Stock Out'
    }
  };

  function parseInitialState() {
    try {
      return JSON.parse(payloadNode.textContent || '{}');
    } catch (error) {
      return {};
    }
  }

  function formatCurrency(value) {
    const locale = document.documentElement.lang === 'en' ? 'en-US' : 'id-ID';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function getLanguage() {
    return document.documentElement.lang === 'en' ? 'en' : 'id';
  }

  function t(key, tokens = {}) {
    const language = getLanguage();
    const template = translations[language]?.[key] || translations.id[key] || key;

    return template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(tokens[token] ?? ''));
  }

  function normalizeText(value, fallback) {
    const resolvedFallback = fallback === undefined ? '' : fallback;
    if (value === undefined || value === null || value === '') {
      return String(resolvedFallback);
    }

    return String(value);
  }

  function severityBadgeClass(severity) {
    if (severity === 'critical') {
      return 'badge--danger';
    }

    if (severity === 'warning') {
      return 'badge--warning';
    }

    return 'badge--info';
  }

  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (textContent !== undefined) {
      element.textContent = normalizeText(textContent);
    }

    return element;
  }

  function replaceChildren(node, children) {
    if (!node) {
      return;
    }

    node.replaceChildren(...children);
  }

  function createEmptyState(title, note) {
    const wrapper = createElement('div', 'dashboard-empty');
    wrapper.append(
      createElement('p', 'dashboard-empty__title', title),
      createElement('p', 'dashboard-empty__note', note)
    );

    return wrapper;
  }

  function createDashboardRow(primaryTitle, primarySubtitle, metaNodes) {
    const row = createElement('div', 'dashboard-table__row');
    const copy = document.createElement('div');
    copy.append(
      createElement('p', 'dashboard-table__title', primaryTitle),
      createElement('p', 'dashboard-table__subtitle', primarySubtitle)
    );

    const meta = createElement('div', 'dashboard-table__meta');
    meta.append(...metaNodes);
    row.append(copy, meta);
    return row;
  }

  function renderLowStockList(items) {
    if (!lowStockList) {
      return;
    }

    if (!items.length) {
      replaceChildren(
        lowStockList,
        [createEmptyState(t('dashboard.empty_low_stock_title'), t('dashboard.empty_low_stock_note'))]
      );
      return;
    }

    replaceChildren(
      lowStockList,
      items.map((product) => {
        const badge = createElement(
          'span',
          'badge badge--warning',
          `${normalizeText(product.current_quantity, '0')} / ${normalizeText(product.threshold, '0')}`
        );

        return createDashboardRow(
          normalizeText(product.name, '-'),
          `${normalizeText(product.sku, '-')} • ${normalizeText(product.category_name, '-')}`,
          [badge]
        );
      })
    );
  }

  function renderTransactionsList(items) {
    if (!transactionsList) {
      return;
    }

    if (!items.length) {
      replaceChildren(
        transactionsList,
        [createEmptyState(t('dashboard.empty_transactions_title'), t('dashboard.empty_transactions_note'))]
      );
      return;
    }

    replaceChildren(
      transactionsList,
      items.map((transaction) => {
        const quantity = createElement('p', 'dashboard-table__value', normalizeText(transaction.quantity, '0'));
        const actor = createElement(
          'p',
          'dashboard-table__subtitle',
          t('dashboard.by_actor', { actor: normalizeText(transaction.performed_by_name, 'System') })
        );

        return createDashboardRow(
          normalizeText(transaction.product_name, '-'),
          `${normalizeText(transaction.sku, '-')} • ${normalizeText(transaction.warehouse_name, '-')} • ${normalizeText(transaction.transaction_type, '-')}`,
          [quantity, actor]
        );
      })
    );
  }

  function renderNotificationsList(items) {
    if (!notificationsList) {
      return;
    }

    if (!items.length) {
      replaceChildren(
        notificationsList,
        [createEmptyState(t('dashboard.empty_notifications_title'), t('dashboard.empty_notifications_note'))]
      );
      return;
    }

    replaceChildren(
      notificationsList,
      items.map((notification) => {
        const badge = createElement(
          'span',
          `badge ${severityBadgeClass(notification.severity)}`,
          normalizeText(notification.severity, 'info')
        );
        const target = createElement(
          'p',
          'dashboard-table__subtitle',
          normalizeText(notification.role_target || notification.user_full_name, '-')
        );

        return createDashboardRow(
          normalizeText(notification.title, '-'),
          normalizeText(notification.message, '-'),
          [badge, target]
        );
      })
    );
  }

  function updateMetrics(summary) {
    const metricValues = [
      String(summary.totalProducts || 0),
      String(summary.totalWarehouses || 0),
      formatCurrency(summary.inventoryValue || 0),
      String(summary.lowStockItems || 0)
    ];

    metricNodes.forEach((node, index) => {
      if (metricValues[index] !== undefined) {
        node.textContent = metricValues[index];
      }
    });

    if (snapshotNodes.totalProducts) snapshotNodes.totalProducts.textContent = metricValues[0];
    if (snapshotNodes.totalWarehouses) snapshotNodes.totalWarehouses.textContent = metricValues[1];
    if (snapshotNodes.inventoryValue) snapshotNodes.inventoryValue.textContent = metricValues[2];
    if (snapshotNodes.lowStockItems) snapshotNodes.lowStockItems.textContent = metricValues[3];
    if (snapshotNodes.pendingTransfers) snapshotNodes.pendingTransfers.textContent = String(summary.pendingTransfers || 0);
  }

  function renderTrend(trend) {
    const canvas = document.querySelector('[data-dashboard-trend-chart]');
    if (!canvas || !window.Chart) {
      return;
    }

    const totalIn = (trend.stockIn || []).reduce((sum, value) => sum + Number(value || 0), 0);
    const totalOut = (trend.stockOut || []).reduce((sum, value) => sum + Number(value || 0), 0);

    if (stockInTotal) {
      stockInTotal.textContent = String(totalIn);
    }

    if (stockOutTotal) {
      stockOutTotal.textContent = String(totalOut);
    }

    const dataset = {
      labels: trend.labels || [],
      datasets: [
        {
          label: 'Stock In',
          data: trend.stockIn || [],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.16)',
          tension: 0.35,
          fill: true
        },
        {
          label: 'Stock Out',
          data: trend.stockOut || [],
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.12)',
          tension: 0.35,
          fill: true
        }
      ]
    };

    if (chart) {
      chart.data = dataset;
      chart.update();
      return;
    }

    chart = new window.Chart(canvas, {
      type: 'line',
      data: dataset,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  function ensureMap() {
    const mapNode = document.querySelector('[data-dashboard-map]');
    if (!mapNode || !window.L) {
      return null;
    }

    if (!map) {
      map = window.L.map(mapNode, {
        zoomControl: false,
        scrollWheelZoom: false
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      markersLayer = window.L.layerGroup().addTo(map);
    }

    return map;
  }

  function buildMarkerPopupContent(warehouse) {
    const wrapper = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = normalizeText(warehouse.name, '-');
    wrapper.append(title, document.createElement('br'), document.createTextNode(normalizeText(warehouse.city, '-')));
    return wrapper;
  }

  function renderMapList(locations) {
    if (!mapList) {
      return;
    }

    replaceChildren(
      mapList,
      locations.map((warehouse) => {
        const item = createElement('div', 'dashboard-map-list__item');
        item.append(
          createElement('strong', null, normalizeText(warehouse.city, '-')),
          createElement('span', null, normalizeText(warehouse.name, '-'))
        );
        return item;
      })
    );
  }

  function renderMap(locations) {
    const mapInstance = ensureMap();

    if (warehouseCountBadge) {
      warehouseCountBadge.textContent = t('dashboard.location_count', { count: locations.length });
    }

    renderMapList(locations);

    if (!mapInstance || !markersLayer) {
      return;
    }

    markersLayer.clearLayers();
    const points = locations
      .filter((warehouse) => warehouse.latitude && warehouse.longitude)
      .map((warehouse) => {
        const marker = window.L.marker([Number(warehouse.latitude), Number(warehouse.longitude)]);
        marker.bindPopup(buildMarkerPopupContent(warehouse));
        markersLayer.addLayer(marker);
        return [Number(warehouse.latitude), Number(warehouse.longitude)];
      });

    if (points.length) {
      mapInstance.fitBounds(points, { padding: [24, 24] });
    } else {
      mapInstance.setView([-2.5489, 118.0149], 4);
    }
  }

  function renderDashboard(state) {
    updateMetrics(state.summary || {});
    renderLowStockList(state.lowStockProducts || []);
    renderTransactionsList(state.recentTransactions || []);
    renderNotificationsList(state.recentNotifications || []);
    renderTrend(state.movementTrend || { labels: [], stockIn: [], stockOut: [] });
    renderMap(state.warehouseLocations || []);
  }

  async function refreshDashboard() {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      if (!result || !result.success || !result.data) {
        return;
      }

      renderDashboard(result.data);
    } catch (error) {
      // Keep the last rendered snapshot if refresh fails.
    }
  }

  renderDashboard(parseInitialState());
  if (window.EventSource) {
    eventSource = new window.EventSource(eventsEndpoint, {
      withCredentials: true
    });

    eventSource.addEventListener('low-stock-update', () => {
      void refreshDashboard();
    });

    eventSource.addEventListener('error', () => {
      if (eventSource && eventSource.readyState === window.EventSource.CLOSED) {
        eventSource.close();
      }
    });
  }
  window.setInterval(refreshDashboard, 30000);
})();
