import { api } from '@services/api.js';
import { alertSuccess, alertError, alertWarning, showLoading, closeLoading } from '@utils/alert.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';

class CertificadosModule {
  constructor() {
    this.students = [];
    this.puestosIE = [];
    this.puestosGrupo = [];
    this.init();
  }

  init() {
    const section = $('seccionCertificados');
    if (!section) return;

    delegate(section, 'keydown', '#codigoBusqueda', (e) => {
      if (e.key === 'Enter') this.buscar();
    });

    delegate(section, 'click', '#btnBuscarEstudiante', () => this.buscar());
    delegate(section, 'click', '#btnGenCert', () => this.generarCertificados());
    delegate(section, 'click', '#btnGenConst', () => this.generarConstancias());
    delegate(section, 'click', '#checkTodo', (e) => this.toggleAll(e.target.checked));
    delegate(section, 'click', '.checkItem', () => this.actualizarContador());
    delegate(section, 'click', '#btnLimpiar', () => this.limpiar());
    delegate(section, 'click', '.btn-cert-individual', (e, target) => {
      this.generarCertificadoIndividual(parseInt(target.dataset.idx));
    });
    delegate(section, 'click', '.btn-const-individual', (e, target) => {
      this.generarConstanciaIndividual(parseInt(target.dataset.idx));
    });
  }

  async buscar() {
    const codigo = $('codigoBusqueda')?.value?.trim();
    if (!codigo) {
      alertWarning('Ingrese un código o documento');
      return;
    }

    this.mostrarLoader(true);
    this.ocultarResultados();
    this.limpiarLinks();

    try {
      const data = await api.post('students/search', { valor: codigo });
      this.students = Array.isArray(data) ? data : (data?.data || []);

      if (this.students.length === 0) {
        this.mostrarSinResultados(true);
        alertWarning('No se encontraron estudiantes');
        return;
      }

      await this.cargarPuestos(this.students[0]);
      this.renderizarTabla();
      this.mostrarResultados(true);
    } catch (err) {
      alertError('Error al buscar', err.message);
    } finally {
      this.mostrarLoader(false);
    }
  }

  async cargarPuestos(student) {
    if (!student) return;
    const year = student.anio || student.year || new Date().getFullYear();

    try {
      const [puestosIE, puestosGrupo] = await Promise.all([
        api.post('puestos/institution', {
          asignacion: student.asignacion,
          year,
          periodo: 'CINCO',
        }),
        api.post('puestos/group', {
          asignacion: student.asignacion,
          nivel: student.nivel,
          numero: student.numero,
          periodo: 'CINCO',
          year,
        }),
      ]);

      this.puestosIE = Array.isArray(puestosIE) ? puestosIE : [];
      this.puestosGrupo = Array.isArray(puestosGrupo) ? puestosGrupo : [];
    } catch {
      this.puestosIE = [];
      this.puestosGrupo = [];
    }
  }

  renderizarTabla() {
    const tbody = $('certTableBody');
    if (!tbody) return;

    tbody.innerHTML = this.students.map((s, i) => {
      const prom = this.obtenerPromedio(s);
      const promClass = prom >= 4.5 ? 'bg-emerald-100 text-emerald-700'
        : prom >= 3.5 ? 'bg-blue-100 text-blue-700'
        : prom >= 3.0 ? 'bg-yellow-100 text-yellow-700'
        : prom > 0 ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-500';

      return `<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
        <td class="px-4 py-2.5"><input type="checkbox" class="checkItem" data-idx="${i}"></td>
        <td class="px-4 py-2.5 text-gray-700 font-mono text-xs">${escapeHtml(s.codigo || '')}</td>
        <td class="px-4 py-2.5 text-gray-700">${escapeHtml(s.nombres || '')}</td>
        <td class="px-4 py-2.5 text-gray-500">${escapeHtml(s.nivel || '')}</td>
        <td class="px-4 py-2.5 text-gray-500">${escapeHtml(s.numero || '')}</td>
        <td class="px-4 py-2.5">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${promClass}">
            ${prom > 0 ? prom.toFixed(2) : '—'}
          </span>
        </td>
        <td class="px-4 py-2.5">
          <div class="flex gap-1">
            <button class="btn-cert-individual text-xs px-2 py-1 bg-[#543391]/10 text-[#543391] rounded-lg hover:bg-[#543391]/20 transition-colors" data-idx="${i}" title="Certificado">
              <i class="bi bi-file-earmark-pdf"></i>
            </button>
            <button class="btn-const-individual text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors" data-idx="${i}" title="Constancia">
              <i class="bi bi-file-text"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

    $('checkTodo').checked = false;
    this.actualizarContador();
  }

  obtenerPromedio(student) {
    const found = this.puestosIE.find(p => p.estudiante === student.estudiante)
      || this.puestosGrupo.find(p => p.estudiante === student.estudiante);
    return found ? parseFloat(found.promedio) || 0 : 0;
  }

  toggleAll(checked) {
    document.querySelectorAll('#seccionCertificados .checkItem').forEach(cb => cb.checked = checked);
    this.actualizarContador();
  }

  actualizarContador() {
    const checked = document.querySelectorAll('#seccionCertificados .checkItem:checked').length;
    const contador = $('certContador');
    const btnCert = $('btnGenCert');
    const btnConst = $('btnGenConst');
    if (contador) contador.textContent = `${checked} seleccionados`;
    if (btnCert) btnCert.disabled = checked === 0;
    if (btnConst) btnConst.disabled = checked === 0;
  }

  async generarCertificados() {
    const items = document.querySelectorAll('#seccionCertificados .checkItem:checked');
    if (items.length === 0) return;

    showLoading(`Generando ${items.length} certificados...`);
    let ok = 0;
    for (const cb of items) {
      try {
        await this.generarCertificadoIndividual(parseInt(cb.dataset.idx), true);
        ok++;
      } catch { }
    }
    closeLoading();
    if (ok > 0) alertSuccess(`${ok} certificado(s) generado(s)`);
    if (ok < items.length) alertError('Algunos certificados fallaron');
  }

  async generarCertificadoIndividual(idx, silent = false) {
    const s = this.students[idx];
    if (!s) return;

    try {
      const year = s.anio || s.year || new Date().getFullYear();
      const puestoIE = (this.puestosIE.findIndex(p => p.estudiante === s.estudiante) + 1) || 0;
      const puestoGrupo = (this.puestosGrupo.findIndex(p => p.estudiante === s.estudiante) + 1) || 0;
      const promedio = this.obtenerPromedio(s);

      const response = await api.post('certificates/generate', {
        estudiante: s.estudiante,
        year,
        nivel: parseInt(s.nivel),
        nombres: s.nombres,
        codigo: s.codigo,
        asignacion: s.asignacion,
        puesto_ie: puestoIE,
        puesto_grupo: puestoGrupo,
        promedio,
        establecimiento: s.asignacion,
        numero: s.numero,
      });

      if (response?.href) {
        this.agregarLink(response.href, s.nombres);
      }
    } catch (err) {
      if (!silent) alertError('Error', err.message);
      throw err;
    }
  }

  async generarConstancias() {
    const items = document.querySelectorAll('#seccionCertificados .checkItem:checked');
    if (items.length === 0) return;

    showLoading(`Generando ${items.length} constancias...`);
    let ok = 0;
    for (const cb of items) {
      try {
        await this.generarConstanciaIndividual(parseInt(cb.dataset.idx), true);
        ok++;
      } catch { }
    }
    closeLoading();
    if (ok > 0) alertSuccess(`${ok} constancia(s) generada(s)`);
    if (ok < items.length) alertError('Algunas constancias fallaron');
  }

  async generarConstanciaIndividual(idx, silent = false) {
    const s = this.students[idx];
    if (!s) return;

    try {
      const year = s.anio || s.year || new Date().getFullYear();

      const response = await api.post('certificates/constancia', {
        estudiante: s.estudiante,
        year,
        nivel: parseInt(s.nivel),
        nombres: s.nombres,
        asignacion: s.asignacion,
        establecimiento: s.asignacion,
        numero: s.numero,
      });

      if (response?.href) {
        this.agregarLink(response.href, s.nombres + ' (Constancia)');
      }
    } catch (err) {
      if (!silent) alertError('Error', err.message);
      throw err;
    }
  }

  _resolveHref(href) {
    if (!href || href.startsWith('http')) return href;
    const base = api.routerBase.replace(/router\.php$/, 'legacy/');
    return base + href.replace(/^\.?\//, '');
  }

  agregarLink(href, label) {
    const container = $('certLinksList');
    const section = $('certLinks');
    if (!container || !section) return;

    section.classList.remove('hidden');
    const link = document.createElement('a');
    link.href = this._resolveHref(href);
    link.target = '_blank';
    link.className =
      'flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-[#543391] text-sm';
    link.innerHTML = `<i class="bi bi-file-earmark"></i> ${escapeHtml(label)}`;
    container.appendChild(link);
  }

  mostrarLoader(show) {
    const el = $('certLoader');
    if (el) el.classList.toggle('hidden', !show);
  }

  mostrarResultados(show) {
    const el = $('certResultados');
    if (el) el.classList.toggle('hidden', !show);
  }

  ocultarResultados() {
    this.mostrarResultados(false);
    this.mostrarSinResultados(false);
    const tbody = $('certTableBody');
    if (tbody) tbody.innerHTML = '';
    const contador = $('certContador');
    if (contador) contador.textContent = '0 seleccionados';
  }

  mostrarSinResultados(show) {
    const el = $('certSinResultados');
    if (el) el.classList.toggle('hidden', !show);
  }

  limpiarLinks() {
    const links = $('certLinks');
    const list = $('certLinksList');
    if (links) links.classList.add('hidden');
    if (list) list.innerHTML = '';
  }

  limpiar() {
    const input = $('codigoBusqueda');
    if (input) input.value = '';
    this.students = [];
    this.puestosIE = [];
    this.puestosGrupo = [];
    this.ocultarResultados();
    this.mostrarSinResultados(true);
    this.limpiarLinks();
    const btnCert = $('btnGenCert');
    const btnConst = $('btnGenConst');
    if (btnCert) btnCert.disabled = true;
    if (btnConst) btnConst.disabled = true;
  }
}

new CertificadosModule();
