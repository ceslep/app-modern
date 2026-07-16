import { TabulatorFull as Tabulator } from 'tabulator-tables';
import { escapeHtml } from './dom.js';

/**
 * Default Tabulator options
 */
const defaultOptions = {
  layout: 'fitColumns',
  responsiveLayout: 'collapse',
  pagination: true,
  paginationSize: 25,
  paginationSizeSelector: [10, 25, 50, 100],
  placeholder: 'No hay datos disponibles',
  selectable: false,
  langs: {
    es: {
      pagination: {
        page: 'Página',
        pages: 'páginas',
        first: 'Primera',
        last: 'Última',
        prev: 'Anterior',
        next: 'Siguiente',
        all: 'Todo',
        of: 'de',
      },
      headerFilters: {
        default: 'Filtrar...',
      },
    },
  },
  locale: 'es',
};

/**
 * Create a Tabulator instance with defaults
 */
export function createTable(container, columns, data = [], options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) {
    console.error('Table container not found:', container);
    return null;
  }

  return new Tabulator(el, {
    ...defaultOptions,
    columns,
    data,
    ...options,
  });
}

/**
 * Build columns from header definitions
 */
export function buildColumns(headers) {
  return headers.map((header) => ({
    title: header.label,
    field: header.field,
    width: header.width,
    headerFilter: header.filter ? 'input' : undefined,
    formatter: header.formatter || 'plaintext',
    hozAlign: header.align || 'left',
    headerSort: header.sortable !== false,
    formatterParams: header.params || {},
    ...header.options,
  }));
}

/**
 * Create a column with custom formatter
 */
export function columnWithActions(label, actions) {
  return {
    title: label,
    formatter: (cell) => {
      const container = document.createElement('div');
      container.className = 'flex gap-1';

      actions.forEach((action) => {
        const btn = document.createElement('button');
        btn.className = `px-2 py-1 text-xs font-medium rounded-lg transition-colors ${action.class || 'text-[#543391] hover:bg-[#543391]/10 border border-[#543391]/20'}`;
        btn.innerHTML = `<i class="bi ${action.icon}"></i>`;
        btn.title = action.label;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          action.handler(cell.getRow());
        });
        container.appendChild(btn);
      });

      return container;
    },
    hozAlign: 'center',
    headerSort: false,
    width: actions.length * 50,
  };
}

/**
 * Create a status column
 */
export function statusColumn(label, statusMap) {
  return {
    title: label,
    field: 'status',
    formatter: (cell) => {
      const value = cell.getValue();
      const config = statusMap[value] || { class: 'bg-gray-100 text-gray-600', text: value };
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.class}">${escapeHtml(config.text)}</span>`;
    },
  };
}

/**
 * Create a date column
 */
export function dateColumn(label, field, format = 'DD/MM/YYYY') {
  return {
    title: label,
    field,
    formatter: (cell) => {
      const value = cell.getValue();
      if (!value) return '';
      const date = new Date(value);
      return date.toLocaleDateString('es-CO');
    },
    sorter: 'datetime',
    sorterParams: { format: 'iso' },
  };
}

/**
 * Create a number column
 */
export function numberColumn(label, field, decimals = 2) {
  return {
    title: label,
    field,
    hozAlign: 'right',
    formatter: (cell) => {
      const value = cell.getValue();
      if (value === null || value === undefined) return '';
      return Number(value).toFixed(decimals);
    },
    sorter: 'number',
  };
}

/**
 * Export table to CSV
 */
export function exportToCsv(table, filename = 'export') {
  if (table) {
    table.download('csv', `${filename}.csv`);
  }
}

/**
 * Export table to PDF
 */
export function exportToPdf(table, filename = 'export') {
  if (table) {
    table.download('pdf', `${filename}.pdf`, {
      orientation: 'portrait',
      title: filename,
    });
  }
}

/**
 * Export table to Excel (requires xlsx)
 */
export function exportToExcel(table, filename = 'export') {
  if (table) {
    table.download('xlsx', `${filename}.xlsx`, { sheetName: filename });
  }
}

/**
 * Add export buttons container
 */
export function createExportButtons(table, filename = 'export') {
  const container = document.createElement('div');
  container.className = 'flex gap-1';

  const csvBtn = document.createElement('button');
  csvBtn.className = 'px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors';
  csvBtn.innerHTML = '<i class="bi bi-file-earmark-excel"></i> CSV';
  csvBtn.addEventListener('click', () => exportToCsv(table, filename));

  const pdfBtn = document.createElement('button');
  pdfBtn.className = 'px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors';
  pdfBtn.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> PDF';
  pdfBtn.addEventListener('click', () => exportToPdf(table, filename));

  container.appendChild(csvBtn);
  container.appendChild(pdfBtn);

  return container;
}
