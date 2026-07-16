/**
 * Explorador Module — file explorer for generated xlsx/ and pdfs/ reports.
 *
 * Features:
 * - Two tabs: XLSX and PDFs
 * - Breadcrumb navigation through folder hierarchy
 * - Folder grid with icons and student count
 * - File table with name, size, date, and download button
 * - Search/filter within files
 * - Back navigation and refresh
 */
import { explorador } from '@services/explorador.js';
import { showToast } from '@utils/alert.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { formatDateTime } from '@utils/format.js';

const SECTION_ID = 'seccionDescargas';
const CONTAINER_ID = 'contenedorDescargas';

class ExploradorModule {
  constructor() {
    this.currentFolder = 'xlsx';
    this.currentPath = '';
    this.historyStack = []; // for breadcrumb navigation
    this.dataCache = {}; // cache by folder+path key
    this.searchTerm = '';
    this.busy = false;

    if (document.readyState !== 'loading') {
      this.setupListener();
    } else {
      document.addEventListener('DOMContentLoaded', () => this.setupListener());
    }
  }

  setupListener() {
    document.addEventListener('app:authenticated', () => this.watchNavigation());
    this.watchNavigation();
  }

  watchNavigation() {
    const section = $(SECTION_ID);
    if (!section) return;

    if (!section.classList.contains('hidden') && !this._loaded) {
      this.load();
    }

    if (!this._observer) {
      this._observer = new MutationObserver(() => {
        if (!section.classList.contains('hidden') && !this._loaded) {
          this.load();
        }
      });
      this._observer.observe(section, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // ── Navigation helpers ───────────────────────────────────────────

  /** Build a breadcrumb trail from the current path array. */
  getBreadcrumbs() {
    const crumbs = [{ label: 'Raíz', path: '' }];
    if (!this.currentPath) return crumbs;

    const parts = this.currentPath.split('/');
    let accumulated = '';
    parts.forEach((part) => {
      accumulated = accumulated ? accumulated + '/' + part : part;
      crumbs.push({ label: part, path: accumulated });
    });
    return crumbs;
  }

  /** Navigate to a subfolder. */
  navigateToFolder(path) {
    this.currentPath = path;
    this.searchTerm = '';
    this.loadFolderContents();
  }

  /** Navigate to a breadcrumb level. */
  navigateToBreadcrumb(path) {
    this.currentPath = path;
    this.searchTerm = '';
    if (path === '') {
      // Root: show initial tab view via load()
      this._loaded = false;
      this.load();
    } else {
      this.loadFolderContents();
    }
  }

  /** Switch between xlsx and pdfs tabs. */
  switchTab(folder) {
    if (this.currentFolder === folder) return;
    this.currentFolder = folder;
    this.currentPath = '';
    this.searchTerm = '';
    this._loaded = false;
    this.load();
  }

  // ── Data loading ─────────────────────────────────────────────────

  async load() {
    if (this.busy) return;
    this.busy = true;
    this._loaded = false;

    const container = $(CONTAINER_ID);
    if (!container) return;

    // Show the tab bar immediately
    this.renderShell(container);

    try {
      // Load both root folders to show summary
      const [xlsxData, pdfsData] = await Promise.all([
        explorador.list('xlsx'),
        explorador.list('pdfs'),
      ]);

      this.dataCache['xlsx/'] = xlsxData;
      this.dataCache['pdfs/'] = pdfsData;

      this.renderContent(container, {
        xlsx: { ...xlsxData, folders: xlsxData.folders || [], files: xlsxData.files || [] },
        pdfs: { ...pdfsData, folders: pdfsData.folders || [], files: pdfsData.files || [] },
      });
      this._loaded = true;
    } catch (error) {
      this.renderError(container, error);
    } finally {
      this.busy = false;
    }
  }

  async loadFolderContents() {
    const container = $(CONTAINER_ID);
    if (!container) return;

    const cacheKey = `${this.currentFolder}/${this.currentPath}`;

    // Show loading state
    const contentArea = $('exploradorContent');
    if (contentArea) {
      contentArea.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="w-8 h-8 border-4 border-[#543391] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm text-gray-400">Cargando...</p>
          </div>
        </div>
      `;
    }

    try {
      // Check cache first
      if (!this.dataCache[cacheKey]) {
        this.dataCache[cacheKey] = await explorador.list(this.currentFolder, this.currentPath);
      }

      const data = this.dataCache[cacheKey];
      const folderCount = (data.folders || []).length;
      const fileCount = (data.files || []).length;

      // Calculate total files across all subfolders (for display)
      let totalFiles = fileCount;
      if (folderCount > 0 && !this.currentPath) {
        // At root level, show summary from the cached root data
        const rootKey = `${this.currentFolder}/`;
        const rootData = this.dataCache[rootKey];
        if (rootData) {
          totalFiles = rootData.files?.length || 0;
        }
      }

      this.renderFolderContent(container, data, folderCount, fileCount);
    } catch (error) {
      const contentArea = $('exploradorContent');
      if (contentArea) {
        contentArea.innerHTML = `
          <div class="glass-card p-12 text-center">
            <i class="bi bi-exclamation-circle text-5xl text-red-300 block mb-3"></i>
            <p class="text-gray-500 mb-2">Error al cargar la carpeta</p>
            <p class="text-xs text-gray-400 mb-4">${escapeHtml(error.message || '')}</p>
            <button class="inline-flex items-center gap-2 px-4 py-2 bg-[#543391] hover:bg-[#6f4ab3]
                           text-white font-medium rounded-lg transition-all text-sm" id="btnReintentarExplorador">
              <i class="bi bi-arrow-clockwise"></i> Reintentar
            </button>
          </div>
        `;
        const retry = $('btnReintentarExplorador');
        if (retry) retry.addEventListener('click', () => this.loadFolderContents());
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  /** Render the shell (tab bar + breadcrumbs + content area). */
  renderShell(container) {
    container.innerHTML = `
      <!-- Tab bar -->
      <div class="flex items-center gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit" id="exploradorTabs">
        <button class="tab-btn-explorador inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                       ${this.currentFolder === 'xlsx' ? 'bg-[#543391] text-white shadow-sm' : 'text-gray-500 hover:text-[#543391] hover:bg-[#543391]/5'}"
                data-folder="xlsx">
          <i class="bi bi-file-earmark-excel"></i>
          XLSX
        </button>
        <button class="tab-btn-explorador inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                       ${this.currentFolder === 'pdfs' ? 'bg-[#543391] text-white shadow-sm' : 'text-gray-500 hover:text-[#543391] hover:bg-[#543391]/5'}"
                data-folder="pdfs">
          <i class="bi bi-file-earmark-pdf"></i>
          PDFs
        </button>
      </div>

      <!-- Toolbar -->
      <div class="glass-card p-3 mb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2 flex-wrap min-w-0" id="exploradorBreadcrumbs"></div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input type="search" id="exploradorSearch"
                     class="w-40 lg:w-56 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs
                            focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                     placeholder="Buscar archivos..." autocomplete="off">
            </div>
            <button id="btnRefrescarExplorador"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs
                           text-gray-600 hover:text-[#543391] hover:border-[#543391]/30 transition-all bg-white">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Content area -->
      <div id="exploradorContent">
        <div class="flex items-center justify-center py-16">
          <div class="text-center">
            <div class="w-10 h-10 border-4 border-[#543391] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm text-gray-400">Cargando explorador de archivos...</p>
          </div>
        </div>
      </div>
    `;

    // Wire refresh button
    const refreshBtn = $('btnRefrescarExplorador');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        // Clear cache for current path
        const cacheKey = `${this.currentFolder}/${this.currentPath}`;
        delete this.dataCache[cacheKey];
        // Also clear root cache for tab
        const rootKey = `${this.currentFolder}/`;
        delete this.dataCache[rootKey];
        this._loaded = false;
        this.load();
      });
    }

    // Wire search
    const searchInput = $('exploradorSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        this.applySearchFilter();
      });
    }

    // Wire tab clicks
    delegate(container, 'click', '.tab-btn-explorador', (e, target) => {
      const folder = target.dataset.folder;
      if (folder) this.switchTab(folder);
    });

    // Wire breadcrumb clicks
    delegate(container, 'click', '[data-breadcrumb-path]', (e, target) => {
      const path = target.dataset.breadcrumbPath;
      if (path !== undefined) this.navigateToBreadcrumb(path);
    });
  }

  /** Render the initial content view (root-level summary with institution folders). */
  renderContent(container, data) {
    const contentArea = $('exploradorContent');
    if (!contentArea) return;

    const currentData = data[this.currentFolder];
    const folders = currentData.folders || [];
    const files = currentData.files || [];
    const totalFolders = folders.length;
    const totalFiles = files.length;

    // Breadcrumbs for root
    const breadcrumbEl = $('exploradorBreadcrumbs');
    if (breadcrumbEl) {
      breadcrumbEl.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#543391]/10 text-[#543391] rounded-full">
          <i class="bi ${this.currentFolder === 'xlsx' ? 'bi-file-earmark-excel' : 'bi-file-earmark-pdf'}"></i>
          ${this.currentFolder === 'xlsx' ? 'XLSX' : 'PDFs'}
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          Raíz
        </span>
        <span class="text-xs text-gray-400 ml-1">
          ${totalFolders} carpeta(s) · ${totalFiles} archivo(s)
        </span>
      `;
    }

    // Build content
    if (totalFolders === 0 && totalFiles === 0) {
      contentArea.innerHTML = `
        <div class="glass-card p-12 text-center">
          <i class="bi bi-folder2-open text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Carpeta vacía</p>
          <p class="text-xs text-gray-300 mt-1">No hay archivos en esta sección</p>
        </div>
      `;
      return;
    }

    let html = '';

    // Institution folders grid
    if (folders.length > 0) {
      html += `
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Carpetas</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          ${folders.map((folder) => `
            <button class="explorador-folder-btn glass-card p-4 flex items-center gap-3 text-left
                           hover:border-[#543391]/30 hover:shadow-md transition-all cursor-pointer group">
              <div class="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center
                          text-amber-600 flex-shrink-0 group-hover:bg-amber-100 group-hover:border-amber-300 transition-all">
                <i class="bi bi-folder text-lg"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-700 truncate group-hover:text-[#543391] transition-colors">
                  ${escapeHtml(folder.name)}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">${escapeHtml(folder.path)}</p>
              </div>
              <i class="bi bi-chevron-right text-gray-300 group-hover:text-[#543391] transition-all text-sm"></i>
            </button>
          `).join('')}
        </div>
      `;
    }

    // Files in root (shouldn't normally have files at root, but handle it)
    if (files.length > 0) {
      html += `
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Archivos</h3>
        ${this.buildFileTable(files)}
      `;
    }

    contentArea.innerHTML = html;

    // Wire folder clicks
    contentArea.querySelectorAll('.explorador-folder-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this.navigateToFolder(folders[i].path);
      });
    });
  }

  /** Render the content view for a subfolder (grade-group level). */
  renderFolderContent(container, data, folderCount, fileCount) {
    const contentArea = $('exploradorContent');
    const breadcrumbEl = $('exploradorBreadcrumbs');
    if (!contentArea) return;

    const folders = data.folders || [];
    const files = data.files || [];

    // Breadcrumbs
    if (breadcrumbEl) {
      const crumbs = this.getBreadcrumbs();
      breadcrumbEl.innerHTML = crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        if (i === 0) {
          return `
            <button class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                           ${isLast ? 'bg-[#543391]/10 text-[#543391]' : 'bg-gray-100 text-gray-600 hover:bg-[#543391]/10 hover:text-[#543391]'}
                           rounded-full transition-all"
                    data-breadcrumb-path="${crumb.path}">
              <i class="bi ${this.currentFolder === 'xlsx' ? 'bi-file-earmark-excel' : 'bi-file-earmark-pdf'}"></i>
              ${this.currentFolder === 'xlsx' ? 'XLSX' : 'PDFs'}
            </button>
          `;
        }
        return `
          <i class="bi bi-chevron-right text-gray-300 text-xs flex-shrink-0"></i>
          <button class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                         ${isLast ? 'bg-[#543391]/10 text-[#543391]' : 'bg-gray-100 text-gray-600 hover:bg-[#543391]/10 hover:text-[#543391]'}
                         rounded-full transition-all"
                  data-breadcrumb-path="${crumb.path}">
            ${escapeHtml(crumb.label)}
          </button>
        `;
      }).join('') + `
        <span class="text-xs text-gray-400 ml-1">
          ${folderCount} carpeta(s) · ${fileCount} archivo(s)
        </span>
      `;
    }

    let html = '';

    // Subfolders grid
    if (folders.length > 0) {
      html += `
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Subcarpetas</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          ${folders.map((f) => `
            <button class="explorador-subfolder-btn glass-card p-4 flex items-center gap-3 text-left
                           hover:border-[#543391]/30 hover:shadow-md transition-all cursor-pointer group">
              <div class="w-10 h-10 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center
                          text-violet-600 flex-shrink-0 group-hover:bg-violet-100 group-hover:border-violet-300 transition-all">
                <i class="bi bi-folder2 text-lg"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-700 truncate group-hover:text-[#543391] transition-colors">
                  ${escapeHtml(f.name)}
                </p>
              </div>
              <i class="bi bi-chevron-right text-gray-300 group-hover:text-[#543391] transition-all text-sm"></i>
            </button>
          `).join('')}
        </div>
      `;
    }

    // Files table
    if (files.length > 0) {
      html += `
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Archivos</h3>
        <div class="glass-card overflow-hidden">
          <div class="overflow-x-auto">
            ${this.buildFileTable(files)}
          </div>
        </div>
      `;
    }

    // Empty state
    if (folders.length === 0 && files.length === 0) {
      html = `
        <div class="glass-card p-12 text-center">
          <i class="bi bi-inbox text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Carpeta vacía</p>
          <p class="text-xs text-gray-300 mt-1">No hay archivos en esta ubicación</p>
        </div>
      `;
    }

    contentArea.innerHTML = html;

    // Wire subfolder clicks
    contentArea.querySelectorAll('.explorador-subfolder-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this.navigateToFolder(folders[i].path);
      });
    });
  }

  /** Build a file table HTML. */
  buildFileTable(files) {
    if (files.length === 0) return '';

    // Apply search filter
    const filteredFiles = this.searchTerm
      ? files.filter((f) => f.name.toLowerCase().includes(this.searchTerm))
      : files;

    if (filteredFiles.length === 0) {
      return `
        <div class="text-center py-8">
          <i class="bi bi-search text-3xl text-gray-300 block mb-2"></i>
          <p class="text-xs text-gray-400">No se encontraron archivos con "${escapeHtml(this.searchTerm)}"</p>
        </div>
      `;
    }

    return `
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th class="text-left py-3 px-4">Nombre</th>
            <th class="text-center py-3 px-4 w-24">Tamaño</th>
            <th class="text-center py-3 px-4 w-36">Modificado</th>
            <th class="text-center py-3 px-4 w-20">Tipo</th>
            <th class="text-center py-3 px-4 w-20">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${filteredFiles.map((file, i) => `
            <tr class="border-t border-gray-50 hover:bg-[#543391]/[0.03] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}">
              <td class="py-3 px-4">
                <div class="flex items-center gap-2.5">
                  <i class="bi ${file.ext === 'pdf' ? 'bi-file-earmark-pdf text-red-400' : 'bi-file-earmark-excel text-emerald-500'} text-lg"></i>
                  <span class="text-gray-700 font-medium text-xs truncate max-w-[300px]" title="${escapeHtml(file.name)}">
                    ${escapeHtml(file.name)}
                  </span>
                </div>
              </td>
              <td class="py-3 px-4 text-center text-gray-500 text-xs font-mono">${escapeHtml(file.sizeHR)}</td>
              <td class="py-3 px-4 text-center text-gray-400 text-xs">${escapeHtml(file.modified)}</td>
              <td class="py-3 px-4 text-center">
                <span class="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md
                             ${file.ext === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
                  ${file.ext.toUpperCase()}
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <a href="${escapeHtml(file.url)}" target="_blank" download="${escapeHtml(file.name)}"
                   class="inline-flex items-center justify-center w-8 h-8 rounded-lg
                          text-gray-400 hover:text-white hover:bg-[#543391] transition-all"
                   title="Descargar ${escapeHtml(file.name)}">
                  <i class="bi bi-download text-sm"></i>
                </a>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /** Re-apply the search filter to the currently visible files. */
  applySearchFilter() {
    const contentArea = $('exploradorContent');
    if (!contentArea) return;

    // Simple approach: reload current folder contents (the filter is applied in buildFileTable)
    this.loadFolderContents();
  }

  /** Render error state. */
  renderError(container, error) {
    const contentArea = $('exploradorContent');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="glass-card p-12 text-center">
        <i class="bi bi-exclamation-triangle text-5xl text-red-300 block mb-3"></i>
        <p class="text-gray-500 font-medium mb-2">Error al cargar el explorador</p>
        <p class="text-xs text-gray-400 mb-4">${escapeHtml(error.message || '')}</p>
        <button class="inline-flex items-center gap-2 px-4 py-2 bg-[#543391] hover:bg-[#6f4ab3]
                       text-white font-medium rounded-lg transition-all text-sm" id="btnReintentarExploradorInit">
          <i class="bi bi-arrow-clockwise"></i> Reintentar
        </button>
      </div>
    `;

    const retry = $('btnReintentarExploradorInit');
    if (retry) retry.addEventListener('click', () => {
      this._loaded = false;
      this.load();
    });
  }
}

// Initialize module (auto-instantiates on import)
const exploradorModule = new ExploradorModule();
export default exploradorModule;
