import { showToast } from '@utils/alert.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { api } from '@services/api.js';
import { auth } from '@services/auth.js';
import Swal from 'sweetalert2';

const SECTION_ID = 'seccionRegistroInasistencias';
const CONTAINER_ID = 'contenedorRegistroInasistencias';

const MATERIAS_URL = 'https://app.iedeoccidente.com/ig/getMaterias.php';

const MOTIVOS = [
  { value: 'Sin excusa', label: 'Sin excusa', icon: '🚫', obligaHoras: true },
  { value: 'Excusa', label: 'Excusa', icon: '📄', obligaHoras: true },
  { value: 'LLegada Tarde', label: 'Llegada Tarde', icon: '⏰', obligaHoras: false },
  { value: 'Transporte Escolar', label: 'Transporte Escolar', icon: '🚌', obligaHoras: true },
  { value: 'Permiso', label: 'Permiso', icon: '✅', obligaHoras: true },
  { value: 'No portar/sin uniforme', label: 'No portar/sin uniforme', icon: '👚', obligaHoras: false },
  { value: 'Pacto de Aula', label: 'Pacto de Aula', icon: '🤝', obligaHoras: false },
  { value: 'Uso del celular', label: 'Uso del celular', icon: '📱', obligaHoras: false },
  { value: 'Desorden en Clase', label: 'Desorden en Clase', icon: '🔊', obligaHoras: false },
  { value: 'Fuga', label: 'Fuga', icon: '🏃', obligaHoras: true },
  { value: 'No realización de Aseo', label: 'No realización de Aseo', icon: '🧹', obligaHoras: false },
  { value: 'Licencia por salud', label: 'Licencia por salud', icon: '🏥', obligaHoras: true },
  { value: 'Incapacidad', label: 'Incapacidad', icon: '🩺', obligaHoras: true },
  { value: 'Reunión interna', label: 'Reunión interna', icon: '👥', obligaHoras: false },
  { value: 'Ignorar', label: 'Ignorar', icon: '🚫', obligaHoras: false },
  { value: 'Psicoorientación', label: 'Psicoorientación', icon: '🧠', obligaHoras: false },
  { value: 'Retirado por el acudiente', label: 'Retirado por el acudiente', icon: '👨', obligaHoras: false },
];

class RegistroInasistenciasModule {
  constructor() {
    this.docentes = [];
    this.materias = [];
    this.estudiantes = [];
    this.assignments = [];

    this.formData = {
      docente: localStorage.getItem('lastDocenteRI') || '',
      materia: '',
      horas: '',
      nivel: '',
      grupo: '',
      fecha: new Date().toLocaleDateString('en-CA'),
      observaciones: '',
    };

    this.inasistencias = [];
    this.individualHours = {};
    this.selectedMaterias = [];
    this.customMotivos = [];
    this.allMotivos = [...MOTIVOS];

    this.isLoading = false;
    this.showFieldErrors = false;
    this._loaded = false;
    this._observer = null;

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

  async load() {
    if (this._loaded) return;
    const container = $(CONTAINER_ID);
    if (!container) return;
    this.renderShell(container);
    await this.loadData();
    this._loaded = true;
  }

  async loadData() {
    try {
      const [docentesData, materiasData, estudiantesData] = await Promise.all([
        api.get('teachers/all'),
        fetch(MATERIAS_URL).then(r => r.json()),
        api.get('students/list'),
      ]);
      const rawDocentes = Array.isArray(docentesData) ? docentesData : docentesData?.data || [];
      this.docentes = rawDocentes.filter(d => d.acceso_total === 'N');
      const rawMaterias = Array.isArray(materiasData) ? materiasData : materiasData?.data || [];
      this.materias = rawMaterias.filter(m => (m.materia || m.nombre || m.value || '') !== 'COMPS');
      this.estudiantes = Array.isArray(estudiantesData) ? estudiantesData : estudiantesData?.data || [];

      this.populateSelects();

      const user = auth.getUser();
      if (user && user.acceso_total !== 'S') {
        await this.loadTeacherMaterias();
      }
      await this.loadCustomMotivos();
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error cargando datos', 'error');
    }
  }

  async loadTeacherMaterias() {
    try {
      const user = auth.getUser();
      if (!user) return;
      const res = await fetch(`/app-modern/api.php/v1/teachers/assignments?docente=${user.identificacion}&year=${new Date().getFullYear()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      this.assignments = data?.data || [];
      const subjectSet = new Set(this.assignments.map(a => a.materia || a.asignatura).filter(Boolean));
      this.materias = [...subjectSet].filter(m => m !== 'COMPS').map(m => ({ materia: m }));
      this.populateMaterias();
    } catch {
      console.warn('No se pudieron cargar materias del docente');
    }
  }

  async loadCustomMotivos() {
    try {
      const res = await api.get('motivos/custom');
      const list = res?.data || [];
      this.customMotivos = list.map(m => ({
        value: m.value,
        label: m.label,
        icon: m.icon || '+',
        obligaHoras: m.obligaHoras,
        _id: m.id,
        _custom: true,
      }));
      this.allMotivos = [...MOTIVOS];
      const ignIndex = this.allMotivos.findIndex(m => m.value === 'Ignorar');
      if (ignIndex >= 0) {
        this.allMotivos.splice(ignIndex, 0, ...this.customMotivos);
      } else {
        this.allMotivos.push(...this.customMotivos);
      }
    } catch {
      this.allMotivos = [...MOTIVOS];
    }
    if (this._loaded) this.renderEstudiantes();
  }

  getDocenteNumber(docente) {
    const match = docente ? docente.match(/-(\d+)$/) : null;
    return match ? match[1] : null;
  }

  get nivelesDisponibles() {
    if (!this.formData.materia) return [];
    return [...new Set(
      this.assignments
        .filter(a => (a.materia || a.asignatura) === this.formData.materia)
        .map(a => a.nivel)
        .filter(Boolean)
    )].sort((a, b) => a - b);
  }

  get gruposDisponibles() {
    if (!this.formData.materia || !this.formData.nivel) return [];
    return [...new Set(
      this.assignments
        .filter(a => (a.materia || a.asignatura) === this.formData.materia && String(a.nivel) === String(this.formData.nivel))
        .map(a => a.numero)
        .filter(Boolean)
    )].sort((a, b) => a - b);
  }

  get gradoCompuesto() {
    if (!this.formData.nivel || !this.formData.grupo) return '';
    return `${this.formData.nivel}${String(this.formData.grupo).padStart(2, '0')}`;
  }

  get estudiantesFiltrados() {
    const g = this.gradoCompuesto;
    if (!g) return [];
    return this.estudiantes.filter(e => {
      const eg = String(e.grado || '').trim();
      return eg === g || eg === `${this.formData.nivel}-${this.formData.grupo}`;
    });
  }

  get docenteHasDash() {
    return this.formData.docente && this.formData.docente.includes('-');
  }

  get missingFields() {
    const fields = [];
    if (!this.formData.docente) fields.push('docente');
    if (!this.formData.fecha) fields.push('fecha');
    if (!this.formData.nivel) fields.push('nivel');
    if (!this.formData.grupo) fields.push('grupo');
    if (this.docenteHasDash) {
      if (this.selectedMaterias.length === 0) fields.push('materias');
      else {
        const sinHoras = this.selectedMaterias.filter(m => !m.horas);
        if (sinHoras.length > 0) fields.push('horas');
      }
    } else {
      if (!this.formData.materia) fields.push('materia');
      if (!this.formData.horas) fields.push('horas');
    }
    return fields;
  }

  populateSelects() {
    this.populateDocentes();
    this.populateMaterias();
    this.populateNiveles();
    this.populateGrupos();
  }

  populateDocentes() {
    const sel = $('riDocente');
    if (!sel) return;
    const user = auth.getUser();
    const isRestricted = user && user.acceso_total !== 'S';
    let preselected = this.formData.docente;

    if (isRestricted) {
      const match = this.docentes.find(d => {
        const dn = (d.nombres || '').toLowerCase().trim();
        const un = (user.nombres || '').toLowerCase().trim();
        return dn === un || dn.includes(un) || un.includes(dn);
      });
      if (match) preselected = match.nombres || match.nombre || '';
      this.formData.docente = preselected;
    }

    let html = '<option value="">Seleccione docente</option>';
    this.docentes.forEach(d => {
      const v = d.nombres || d.nombre || d.docente || d.value || '';
      const s = v === preselected ? ' selected' : '';
      html += `<option value="${escapeHtml(v)}"${s}>${escapeHtml(v)}</option>`;
    });
    sel.innerHTML = html;
    if (isRestricted) sel.disabled = true;
  }

  populateMaterias() {
    const sel = $('riMateria');
    const container = $('riMateriasMulti');
    if (!sel && !container) return;

    const sorted = [...this.materias].sort((a, b) => {
      const an = (a.materia || a.nombre || a.value || '').toLowerCase();
      const bn = (b.materia || b.nombre || b.value || '').toLowerCase();
      return an.localeCompare(bn);
    });

    if (sel) {
      const current = this.formData.materia;
      let html = '<option value="">Seleccione materia</option>';
      sorted.forEach(m => {
        const v = m.materia || m.nombre || m.value || '';
        const s = v === current ? ' selected' : '';
        html += `<option value="${escapeHtml(v)}"${s}>${escapeHtml(v)}</option>`;
      });
      sel.innerHTML = html;
    }

    if (container) {
      let html = '';
      sorted.forEach(m => {
        const v = m.materia || m.nombre || m.value || '';
        const isSelected = this.selectedMaterias.some(sm => sm.materia === v);
        const idx = this.selectedMaterias.findIndex(sm => sm.materia === v);
        const checked = isSelected ? ' checked' : '';
        html += `<div class="flex items-center gap-2 px-3 py-2 rounded-lg border ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}" data-materia="${escapeHtml(v)}">
          <input type="checkbox" value="${escapeHtml(v)}"${checked} class="ri-materia-cb w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500">
          <span class="text-sm flex-1">${escapeHtml(v)}</span>
          ${isSelected ? `<select data-idx="${idx}" class="ri-materia-horas w-20 px-2 py-1 text-sm rounded border border-gray-200"><option value="">Horas...</option><option value="0">0</option><option value="1">1h</option><option value="2">2h</option><option value="3">3h</option><option value="4">4h</option></select>` : ''}
        </div>`;
      });
      container.innerHTML = html;
    }

    this.renderMateriaSection();
  }

  renderMateriaSection() {
    const single = $('riMateriaGroup');
    const multi = $('riMateriasMultiGroup');
    if (!single || !multi) return;
    if (this.docenteHasDash) {
      single.classList.add('hidden');
      multi.classList.remove('hidden');
    } else {
      single.classList.remove('hidden');
      multi.classList.add('hidden');
    }
  }

  populateNiveles() {
    const sel = $('riNivel');
    if (!sel) return;
    const current = this.formData.nivel;
    let html = '<option value="">Seleccione nivel</option>';
    this.nivelesDisponibles.forEach(n => {
      const s = String(n) === String(current) ? ' selected' : '';
      html += `<option value="${escapeHtml(String(n))}"${s}>${escapeHtml(String(n))}</option>`;
    });
    sel.innerHTML = html;
  }

  populateGrupos() {
    const sel = $('riGrupo');
    if (!sel) return;
    const current = this.formData.grupo;
    let html = '<option value="">Seleccione grupo</option>';
    this.gruposDisponibles.forEach(g => {
      const s = String(g) === String(current) ? ' selected' : '';
      html += `<option value="${escapeHtml(String(g))}"${s}>${escapeHtml(String(g))}</option>`;
    });
    sel.innerHTML = html;
  }

  renderEstudiantes() {
    const container = $('riEstudiantes');
    if (!container) return;
    if (!this.gradoCompuesto || this.formData.horas === '') {
      container.innerHTML = '';
      return;
    }

    const list = this.estudiantesFiltrados;
    if (list.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">No hay estudiantes en este grado.</p>';
      return;
    }

    let html = `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">`;
    list.forEach(e => {
      const nombre = e.nombre || e.nombres || '';
      const estudianteId = String(e.estudiante || '');
      const inicial = (nombre.charAt(0) || '?').toUpperCase();
      const studentInas = this.inasistencias.filter(i => String(i.estudiante_id) === estudianteId);
      const hasAny = studentInas.length > 0;
      const hasObliga = studentInas.some(i => {
        const m = this.allMotivos.find(mot => mot.value === i.motivo);
        return m && m.obligaHoras;
      });

      html += `<div class="rounded-2xl border transition-all duration-300 ${hasAny ? 'ring-2 ring-[#543391] ring-offset-2 shadow-xl scale-[1.02]' : 'shadow-sm hover:shadow-lg hover:scale-[1.01]'}" style="background: white; border-color: ${hasAny ? '#543391' : '#e5e7eb'};">
        <div class="p-3 sm:p-4 space-y-2 sm:space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#543391] to-[#7c3aed] flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md flex-shrink-0">
              ${escapeHtml(inicial)}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-800 text-sm truncate">${escapeHtml(nombre)}</p>
              ${hasAny ? `<p class="text-xs text-[#543391] font-medium mt-0.5">${studentInas.length} inasistencia(s)</p>` : `<p class="text-xs text-gray-400 mt-0.5">Sin marcar</p>`}
            </div>
          </div>`;

      if (hasAny) {
        html += `<div class="flex flex-wrap gap-1.5">`;
        studentInas.forEach(inas => {
          const m = this.allMotivos.find(mot => mot.value === inas.motivo);
          if (m) {
            const bgColors = {
              'Sin excusa': 'bg-red-50 border-red-200 text-red-700',
              'Excusa': 'bg-blue-50 border-blue-200 text-blue-700',
              'LLegada Tarde': 'bg-indigo-50 border-indigo-200 text-indigo-700',
              'Permiso': 'bg-green-50 border-green-200 text-green-700',
              'Fuga': 'bg-red-100 border-red-300 text-red-800',
              'Incapacidad': 'bg-pink-50 border-pink-200 text-pink-700',
            };
            const style = bgColors[m.value] || 'bg-gray-50 border-gray-200 text-gray-700';
            html += `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${style}">
              <span>${m.icon}</span>${m.label}
              <button type="button" class="ri-remove-motivo ml-1 hover:opacity-60 text-current font-bold leading-none" data-estudiante="${escapeHtml(estudianteId)}" data-nombre="${escapeHtml(nombre)}" data-motivo="${escapeHtml(inas.motivo)}" title="Eliminar motivo">&times;</button>
            </span>`;
          }
        });
        html += `</div>`;
      }

      html += `<div class="flex flex-col sm:flex-row gap-2">
            <select class="ri-motivo-select w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white" data-estudiante="${escapeHtml(estudianteId)}" data-nombre="${escapeHtml(nombre)}">
              <option value="">Añadir motivo...</option>
              <option value="Ignorar">Limpiar todo</option>`;

      this.allMotivos.forEach(m => {
        const isSelected = studentInas.some(i => i.motivo === m.value);
        html += `<option value="${escapeHtml(m.value)}"${isSelected ? ' disabled' : ''}>${m.icon} ${m.label}${isSelected ? ' ✓' : ''}</option>`;
      });

      html += `</select>
            <select class="ri-hora-individual w-full sm:w-28 px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white ${!hasObliga ? 'opacity-40' : ''}" data-estudiante="${escapeHtml(estudianteId)}" data-nombre="${escapeHtml(nombre)}" ${!hasObliga ? 'disabled' : ''}>
              <option value="" ${this.individualHours[estudianteId] == null ? 'selected' : ''}>Hrs</option>
              <option value="0" ${this.individualHours[estudianteId] === '0' ? 'selected' : ''}>0</option>
              <option value="1" ${this.individualHours[estudianteId] === '1' ? 'selected' : ''}>1</option>
              <option value="2" ${this.individualHours[estudianteId] === '2' ? 'selected' : ''}>2</option>
              <option value="3" ${this.individualHours[estudianteId] === '3' ? 'selected' : ''}>3</option>
              <option value="4" ${this.individualHours[estudianteId] === '4' ? 'selected' : ''}>4</option>
            </select>
          </div>`;

      if (hasAny) {
        html += `<div class="flex items-center gap-2 pt-1">
              <button type="button" class="ri-toggle-obs text-xs text-gray-500 hover:text-[#543391] transition-colors flex items-center gap-1" data-estudiante="${escapeHtml(estudianteId)}" data-nombre="${escapeHtml(nombre)}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                ${studentInas[0]?.observaciones ? 'Editar observación' : 'Agregar observación'}
              </button>
            </div>`;
        if (studentInas[0]?.observaciones) {
          html += `<textarea class="ri-obs-textarea w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all resize-none" data-estudiante="${escapeHtml(estudianteId)}" data-nombre="${escapeHtml(nombre)}" rows="2">${escapeHtml(studentInas[0].observaciones)}</textarea>`;
        }
      }

      html += `</div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  handleMotivoChange(estudianteId, nombre, motivoValue) {
    if (motivoValue === '' || motivoValue === 'Ignorar') {
      this.inasistencias = this.inasistencias.filter(i => String(i.estudiante_id) !== estudianteId);
      this.renderEstudiantes();
      this.updateCounter();
      return;
    }

    const selectedMotivo = this.allMotivos.find(m => m.value === motivoValue);
    if (!selectedMotivo) return;

    let hourToUse = this.individualHours[estudianteId] || this.formData.horas;
    if (!selectedMotivo.obligaHoras) hourToUse = '0';

    if (selectedMotivo.obligaHoras) {
      if (!this.individualHours[estudianteId]) {
        this.individualHours[estudianteId] = this.formData.horas;
      }
      this.inasistencias = this.inasistencias.filter(i => {
        if (String(i.estudiante_id) !== estudianteId) return true;
        const m = this.allMotivos.find(mot => mot.value === i.motivo);
        return m && !m.obligaHoras;
      });
    }

    const alreadyHas = this.inasistencias.some(i => String(i.estudiante_id) === estudianteId && i.motivo === motivoValue);
    if (!alreadyHas) {
      const existingObs = this.inasistencias.find(i => String(i.estudiante_id) === estudianteId)?.observaciones || '';
      this.inasistencias.push({ estudiante_id: estudianteId, nombre, motivo: motivoValue, horas: hourToUse, observaciones: existingObs });
    }

    this.renderEstudiantes();
    this.updateCounter();
  }

  handleRemoveMotivo(estudianteId, motivo) {
    this.inasistencias = this.inasistencias.filter(i => !(String(i.estudiante_id) === estudianteId && i.motivo === motivo));
    this.renderEstudiantes();
    this.updateCounter();
  }

  handleIndividualHourChange(estudianteId, horas) {
    this.individualHours[estudianteId] = horas;
    this.inasistencias = this.inasistencias.map(i => {
      if (String(i.estudiante_id) === estudianteId) {
        const m = this.allMotivos.find(mot => mot.value === i.motivo);
        if (m && m.obligaHoras) return { ...i, horas };
      }
      return i;
    });
  }

  handleObservationChange(estudianteId, obs) {
    this.inasistencias = this.inasistencias.map(i => {
      if (String(i.estudiante_id) === estudianteId) return { ...i, observaciones: obs };
      return i;
    });
  }

  updateCounter() {
    const el = $('riCount');
    if (el) el.textContent = String(this.inasistencias.length);
  }

  async handleSubmit() {
    if (this.isLoading) return;
    this.showFieldErrors = true;

    const campos = [];
    if (!this.formData.docente) campos.push('Docente');
    if (!this.formData.fecha) campos.push('Fecha');
    if (!this.formData.nivel) campos.push('Nivel');
    if (!this.formData.grupo) campos.push('Grupo');

    if (this.docenteHasDash) {
      if (this.selectedMaterias.length === 0) campos.push('Materia(s)');
      else {
        const sinHoras = this.selectedMaterias.filter(m => !m.horas);
        if (sinHoras.length > 0) campos.push(`Horas para: ${sinHoras.map(m => m.materia).join(', ')}`);
      }
    } else {
      if (!this.formData.materia) campos.push('Materia');
      if (!this.formData.horas) campos.push('Horas');
    }

    if (campos.length > 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        html: `Complete los siguientes campos:<br><br><strong>${campos.join('<br>')}</strong>`,
        confirmButtonColor: '#543391',
      });
      return;
    }

    if (this.inasistencias.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Sin inasistencias',
        text: 'Debe seleccionar al menos un estudiante con un motivo de inasistencia',
        confirmButtonColor: '#543391',
      });
      return;
    }

    this.isLoading = true;
    const btn = $('riSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span> Guardando...';
    }

    try {
      const user = auth.getUser();
      const docenteId = user?.identificacion || '0';
      const materiasToSave = this.docenteHasDash
        ? this.selectedMaterias
        : [{ materia: this.formData.materia, horas: this.formData.horas }];

      const sinHoras = materiasToSave.filter(m => !m.horas);
      if (sinHoras.length > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: `Seleccione horas para: ${sinHoras.map(m => m.materia).join(', ')}`,
          confirmButtonColor: '#543391',
        });
        this.isLoading = false;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Guardar'; }
        return;
      }

      const filtered = this.inasistencias.filter(i => i.motivo && i.motivo !== 'Ignorar');

      const docNombre = this.formData.docente;
      const materiaCount = materiasToSave.length;
      const totalEst = filtered.length;
      const motivoCounts = {};
      filtered.forEach(i => { motivoCounts[i.motivo] = (motivoCounts[i.motivo] || 0) + 1; });

      let resumenHtml = `<div class="text-left text-sm leading-relaxed">
        <div class="mb-2"><strong>Fecha:</strong> ${escapeHtml(this.formData.fecha)}</div>
        <div class="mb-2"><strong>Docente:</strong> ${escapeHtml(docNombre)}</div>
        <div class="mb-2"><strong>Materia(s):</strong> ${materiasToSave.map(m => `${escapeHtml(m.materia)} (${m.horas}h)`).join(', ')}</div>
        <div class="mb-2"><strong>Estudiantes:</strong> ${totalEst}</div>`;

      if (Object.keys(motivoCounts).length > 0) {
        resumenHtml += `<div class="mt-1"><strong>Motivos:</strong><br>`;
        Object.entries(motivoCounts).forEach(([mot, cnt]) => {
          const motivoLabel = (this.allMotivos.find(m => m.value === mot)?.label) || mot;
          resumenHtml += `<span class="inline-block mr-2">${escapeHtml(motivoLabel)}: ${cnt}</span><br>`;
        });
        resumenHtml += `</div>`;
      }

      resumenHtml += '</div>';

      const confirm = await Swal.fire({
        icon: 'question',
        title: '¿Confirmar registro?',
        html: resumenHtml,
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#543391',
      });

      if (!confirm.isConfirmed) {
        this.isLoading = false;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Guardar'; }
        return;
      }

      const materiasPayload = materiasToSave.map(md => ({
        materia: md.materia,
        horas: md.horas,
        registros: filtered.map(item => ({
          estudiante_id: item.estudiante_id,
          motivo: item.motivo,
          horas: item.horas || md.horas,
          observaciones: item.observaciones || this.formData.observaciones,
        })),
      }));

      const result = await api.post('attendance/batch', {
        docente_id: docenteId,
        fecha: this.formData.fecha,
        materias: materiasPayload,
      });

      if (result.success !== false) {
        localStorage.setItem('lastDocenteRI', this.formData.docente);
        const count = result.data?.count || filtered.length;
        await Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: `${count} inasistencia(s) registrada(s) exitosamente`,
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          position: 'top-end',
          toast: true,
        });

        this.formData.nivel = '';
        this.formData.grupo = '';
        this.formData.fecha = new Date().toLocaleDateString('en-CA');
        this.formData.observaciones = '';
        this.formData.horas = '';
        this.inasistencias = [];
        this.individualHours = {};
        this.selectedMaterias = [];
        this.showFieldErrors = false;

        this.populateSelects();
        this.renderEstudiantes();
        this.updateCounter();
        this.renderMateriaSection();
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error saving:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al registrar la inasistencia',
        confirmButtonColor: '#543391',
      });
    } finally {
      this.isLoading = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Guardar';
      }
    }
  }

  renderShell(container) {
    container.innerHTML = `
      <div class="glass-card p-4 sm:p-6">
        <form id="riForm" class="space-y-6">
              <!-- Info alert -->
              <div id="riInfoAlert" class="p-4 rounded-xl border bg-green-50 border-green-200 hidden sm:flex items-start gap-3">
                <div class="p-2 rounded-lg bg-green-100 text-green-700 flex-shrink-0">
                  <i class="bi bi-info-circle"></i>
                </div>
                <div class="flex-1 text-sm text-green-800">
                  <strong>Información:</strong> Selecciona un grado y una asignatura para comenzar a registrar inasistencias. Puedes marcar motivos individuales y observaciones específicas por estudiante.
                </div>
                <button type="button" id="riDismissInfo" class="text-green-600 hover:text-green-800">&times;</button>
              </div>

              <!-- Row 1: Docente + Materia -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Docente</label>
                  <select id="riDocente" class="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] outline-none transition-all text-sm">
                    <option value="">Cargando...</option>
                  </select>
                </div>
                <div class="space-y-1.5">
                  <div id="riMateriaGroup">
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Materia</label>
                    <select id="riMateria" class="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] outline-none transition-all text-sm">
                      <option value="">Cargando...</option>
                    </select>
                  </div>
                  <div id="riMateriasMultiGroup" class="hidden">
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Materias</label>
                    <div id="riMateriasMulti" class="border rounded-xl p-3 space-y-1 border-gray-200"></div>
                  </div>
                </div>
              </div>

              <!-- Row 2: Horas + Grado -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Cantidad de Horas</label>
                  <select id="riHoras" class="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] outline-none transition-all text-sm">
                    <option value="">Seleccione horas</option>
                    <option value="0">Sin hora específica</option>
                    <option value="1">1 Hora</option>
                    <option value="2">2 Horas</option>
                    <option value="3">3 Horas</option>
                    <option value="4">4 Horas</option>
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Nivel</label>
                  <select id="riNivel" class="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] outline-none transition-all text-sm">
                    <option value="">Seleccione materia primero</option>
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Grupo</label>
                  <select id="riGrupo" class="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] outline-none transition-all text-sm">
                    <option value="">Seleccione nivel primero</option>
                  </select>
                </div>
              </div>

              <!-- Students -->
              <div id="riEstudiantesContainer" class="${this.gradoCompuesto && this.formData.horas !== '' ? '' : 'hidden'}">
                <div id="riEstudiantes"></div>
              </div>

              <!-- Row 3: Fecha + Observaciones -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</label>
                  <input type="date" id="riFecha" value="${this.formData.fecha}"
                    class="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] outline-none transition-all text-sm">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Observaciones</label>
                  <textarea id="riObservaciones" rows="3" placeholder="Opcional..."
                    class="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] outline-none transition-all text-sm resize-none"></textarea>
                </div>
              </div>

              <!-- Counter -->
              <div class="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                <div class="flex items-center gap-3">
                  <span class="text-sm text-gray-500">
                    Inasistencias marcadas: <strong class="text-[#543391]" id="riCount">0</strong>
                  </span>
                  <button type="button" id="riManageMotivosBtn" class="text-xs font-medium text-white bg-[#543391] hover:bg-[#432a75] transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Crear motivo
                  </button>
                </div>
              </div>
            </form>
      </div>

      <!-- Floating save button -->
      <button id="riSubmitBtn"
        class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-green-600 hover:bg-green-700 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:shadow-green-500/20 transition-all hover:scale-110 active:scale-95 z-50">
        <i class="bi bi-check-lg text-lg sm:text-xl"></i>
      </button>
    `;

    this.bindEvents();
    this.populateSelects();
    this.renderMateriaSection();
    this.renderEstudiantes();
    this.updateCounter();
  }

  bindEvents() {
    const form = $('riForm');

    // Docente
    delegate(form, 'change', '#riDocente', e => {
      this.formData.docente = e.target.value;
      this.formData.nivel = '';
      this.formData.grupo = '';
      this.selectedMaterias = [];
      localStorage.setItem('lastDocenteRI', this.formData.docente);
      this.populateMaterias();
      this.populateNiveles();
      this.populateGrupos();
      this.renderMateriaSection();
      this.renderEstudiantes();
    });

    // Materia (single)
    delegate(form, 'change', '#riMateria', e => {
      this.formData.materia = e.target.value;
      this.formData.nivel = '';
      this.formData.grupo = '';
      this.populateNiveles();
      this.populateGrupos();
      this.renderEstudiantes();
    });

    // Materias (multi) - checkbox changes
    delegate(form, 'change', '.ri-materia-cb', e => {
      const val = e.target.value;
      if (e.target.checked) {
        this.selectedMaterias.push({ materia: val, horas: '' });
      } else {
        this.selectedMaterias = this.selectedMaterias.filter(m => m.materia !== val);
      }
      this.populateMaterias();
    });

    // Materias (multi) - horas changes
    delegate(form, 'change', '.ri-materia-horas', e => {
      const idx = parseInt(e.target.dataset.idx);
      if (!isNaN(idx) && this.selectedMaterias[idx]) {
        this.selectedMaterias[idx].horas = e.target.value;
      }
    });

    // Horas
    delegate(form, 'change', '#riHoras', e => {
      this.formData.horas = e.target.value;
      const container = $('riEstudiantesContainer');
      if (container) {
        container.classList.toggle('hidden', !(this.gradoCompuesto && this.formData.horas !== ''));
      }
      this.renderEstudiantes();
    });

    // Nivel
    delegate(form, 'change', '#riNivel', e => {
      this.formData.nivel = e.target.value;
      this.formData.grupo = '';
      this.populateGrupos();
      const container = $('riEstudiantesContainer');
      if (container) {
        container.classList.toggle('hidden', !(this.gradoCompuesto && this.formData.horas !== ''));
      }
      this.renderEstudiantes();
    });

    // Grupo
    delegate(form, 'change', '#riGrupo', e => {
      this.formData.grupo = e.target.value;
      const container = $('riEstudiantesContainer');
      if (container) {
        container.classList.toggle('hidden', !(this.gradoCompuesto && this.formData.horas !== ''));
      }
      this.renderEstudiantes();
    });

    // Fecha
    delegate(form, 'change', '#riFecha', e => {
      this.formData.fecha = e.target.value;
    });

    // Observaciones
    delegate(form, 'input', '#riObservaciones', e => {
      this.formData.observaciones = e.target.value;
    });

    // Motivo select (delegated to riEstudiantes)
    delegate(form, 'change', '.ri-motivo-select', e => {
      this.handleMotivoChange(e.target.dataset.estudiante, e.target.dataset.nombre, e.target.value);
      e.target.value = '';
    });

    // Remove motivo
    delegate(form, 'click', '.ri-remove-motivo', e => {
      this.handleRemoveMotivo(e.target.dataset.estudiante, e.target.dataset.motivo);
    });

    // Gestionar motivos
    delegate(form, 'click', '#riManageMotivosBtn', e => {
      e.preventDefault();
      this.openMotivoManager();
    });

    // Delete custom motivo (from SweetAlert modal)
    delegate(document, 'click', '.ri-del-custom-motivo', e => {
      const btn = e.target.closest('.ri-del-custom-motivo');
      if (!btn) return;
      const id = parseInt(btn.dataset.id, 10);
      const label = btn.dataset.label || '';
      if (id) this.handleDeleteCustomMotivo(id, label);
    });

    // Individual hour
    delegate(form, 'change', '.ri-hora-individual', e => {
      this.handleIndividualHourChange(e.target.dataset.estudiante, e.target.value);
    });

    // Toggle observation
    delegate(form, 'click', '.ri-toggle-obs', e => {
      const targetEstudiante = e.target.dataset.estudiante;
      const existing = this.inasistencias.find(i => String(i.estudiante_id) === targetEstudiante);
      const container = e.target.closest('.flex.flex-col');
      if (!container) return;

      let textarea = container.querySelector('.ri-obs-textarea');
      if (textarea) {
        textarea.remove();
        return;
      }
      const ta = document.createElement('textarea');
      ta.className = 'ri-obs-textarea mt-2 w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm';
      ta.dataset.estudiante = targetEstudiante;
      ta.dataset.nombre = e.target.dataset.nombre;
      ta.rows = 2;
      ta.placeholder = 'Escribe una observación...';
      ta.value = existing?.observaciones || '';
      ta.addEventListener('input', e2 => {
        this.handleObservationChange(targetEstudiante, e2.target.value);
      });
      container.appendChild(ta);
    });

    // Observation textarea
    delegate(form, 'input', '.ri-obs-textarea', e => {
      this.handleObservationChange(e.target.dataset.estudiante, e.target.value);
    });

    // Info dismiss
    delegate(form, 'click', '#riDismissInfo', () => {
      const alert = $('riInfoAlert');
      if (alert) alert.remove();
    });

    // Submit
    delegate(document, 'click', '#riSubmitBtn', e => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  async openMotivoManager() {
    const custom = this.customMotivos;
    let listHtml = '';
    if (custom.length === 0) {
      listHtml = '<p class="text-sm text-gray-400">No has creado motivos personalizados.</p>';
    } else {
      listHtml = '<div class="space-y-2">';
      custom.forEach(m => {
        listHtml += `<div class="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200">
          <div class="flex items-center gap-2 text-sm">
            <span>${m.icon}</span>
            <span>${escapeHtml(m.label)}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${m.obligaHoras ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}">${m.obligaHoras ? 'Requiere horas' : 'Horas 0'}</span>
          </div>
          <button type="button" class="ri-del-custom-motivo text-red-400 hover:text-red-600 transition-colors text-lg leading-none" data-id="${m._id}" data-label="${escapeHtml(m.label)}">&times;</button>
        </div>`;
      });
      listHtml += '</div>';
    }

    const { value: action } = await Swal.fire({
      title: 'Gestionar motivos personalizados',
      html: `
        <div class="text-left text-sm mb-4">
          <p class="text-gray-500 mb-3">Crea motivos adicionales para registrar inasistencias. Solo son visibles para ti.</p>
          ${listHtml}
        </div>`,
      showCancelButton: true,
      confirmButtonText: '+ Crear nuevo',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#543391',
      reverseButtons: true,
    });

    if (action === true) {
      await this.showCreateMotivoModal();
    }
  }

  async showCreateMotivoModal() {
    const { value: formValues, isConfirmed } = await Swal.fire({
      title: 'Crear motivo personalizado',
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del motivo</label>
            <input id="swal-input-motivo" class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none text-sm" placeholder="Ej: Salida anticipada">
          </div>
          <div class="flex items-center gap-2">
            <input id="swal-input-obligahoras" type="checkbox" class="w-4 h-4 rounded text-[#543391] focus:ring-[#543391]">
            <label for="swal-input-obligahoras" class="text-sm text-gray-700">Requiere registro de horas</label>
          </div>
        </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#543391',
      preConfirm: () => {
        const label = document.getElementById('swal-input-motivo').value.trim();
        if (!label) {
          Swal.showValidationMessage('El nombre del motivo es requerido');
          return false;
        }
        const obligaHoras = document.getElementById('swal-input-obligahoras').checked;
        return { label, obligaHoras };
      },
    });

    if (isConfirmed && formValues) {
      try {
        const res = await api.post('motivos/custom/create', {
          label: formValues.label,
          obligaHoras: formValues.obligaHoras,
        });
        if (res.success !== false) {
          await this.loadCustomMotivos();
          await Swal.fire({
            icon: 'success',
            title: 'Motivo creado',
            text: `"${formValues.label}" se ha agregado a tus motivos`,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        } else {
          throw new Error(res.error || 'Error al crear');
        }
      } catch (err) {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'No se pudo crear el motivo',
          confirmButtonColor: '#543391',
        });
      }
    }
  }

  async handleDeleteCustomMotivo(id, label) {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar motivo?',
      text: `"${label}" se eliminará permanentemente.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!isConfirmed) return;

    try {
      const res = await api.post('motivos/custom/delete', { id });
      if (res.success !== false) {
        await this.loadCustomMotivos();
        await Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: `"${label}" ha sido eliminado`,
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
          position: 'top-end',
          toast: true,
        });
      }
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar el motivo',
        confirmButtonColor: '#543391',
      });
    }
  }
}

const registroInasistenciasModule = new RegistroInasistenciasModule();
export default registroInasistenciasModule;
