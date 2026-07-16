/**
 * Filters Module - populates the cascading form selects used across
 * Informes, Notas and Estadisticas. Runs after authentication.
 */
import { filters } from '@services/filters.js';
import { $ } from '@utils/dom.js';
import { escapeHtml } from '@utils/dom.js';
import { IconSelect, getIconSelect } from '@components/icon-select.js';

const ICON_MAP = {
  year: 'bi-calendar3',
  asignacion: 'bi-building',
  nivel: 'bi-layers',
  numero: 'bi-people',
  periodo: 'bi-calendar-check',
  asignaturaNotas: 'bi-book',
  asignatura: 'bi-book',
  periodoNotas: 'bi-calendar-check',
};

const SELECT_INSTANCES = new Map();

/**
 * Fill a <select> element with { value, label, icon?, group? } options.
 * Auto-converts to IconSelect if the select id has an icon mapping.
 */
function fillSelect(el, options, { placeholder = 'Seleccione...', selected = null } = {}) {
  if (!el) return;
  const icon = ICON_MAP[el.id];

  const items = options.map((o) => ({
    value: o.value,
    label: o.label,
    icon: o.icon || icon || '',
    group: o.group || null,
  }));

  // Build native <select> for form submission fallback
  const opts = [`<option value="">${placeholder}</option>`];
  for (const o of options) {
    const sel = selected != null && String(o.value) === String(selected) ? ' selected' : '';
    opts.push(`<option value="${escapeHtml(o.value)}"${sel}>${escapeHtml(o.label)}</option>`);
  }
  el.innerHTML = opts.join('');

  // Create or update IconSelect
  if (icon) {
    let inst = SELECT_INSTANCES.get(el.id);

    if (!inst) {
      inst = new IconSelect(el, {
        placeholder,
        onChange: (val) => {
          el.value = val;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        },
      });
      SELECT_INSTANCES.set(el.id, inst);
    }

    inst.setItems(items);
    if (selected !== null) inst.setValue(selected);
  }
}

class FiltersModule {
  constructor() {
    this.year = String(new Date().getFullYear());
    this.nombresNiveles = {}; // nivel => nombre
    this.booted = false;
  }

  async boot() {
    if (this.booted) return;
    this.booted = true;

    try {
      await this.loadNombresNiveles();
      await Promise.all([
        this.initInformes(),
        this.initNotas(),
        this.initEstadisticas(),
      ]);
    } catch {
      // Selects stay empty; individual modules surface their own errors.
    }
  }

  async loadNombresNiveles() {
    try {
      const res = await filters.getNombresNiveles();
      (res.data || []).forEach((r) => {
        this.nombresNiveles[String(r.nivel)] = r.nombre;
      });
    } catch {
      // optional labels
    }
  }

  /* ---------------- Informes ---------------- */

  async initInformes() {
    const yearEl = $('year');
    const sedeEl = $('asignacion');
    const nivelEl = $('nivel');
    const numeroEl = $('numero');
    const periodoEl = $('periodo');

    if (!yearEl && !sedeEl) return;

    // Si informes.js ya cargó el form (mismo flujo que @concentrador.js),
    // no duplicamos: solo nos enganchamos a los cambios para mantener
    // sincronizadas las asignaturas de Notas/Estadísticas.
    const frm = $('frmConsultar');
    if (frm && frm.dataset.loadedBy === 'informes') {
      if (sedeEl) {
        sedeEl.addEventListener('change', () => this.syncNotasAsignaturas($('asignaturaNotas')));
      }
      return;
    }

    await this.fillYears(yearEl);
    await this.fillPeriods(periodoEl);
    await this.fillSedes(sedeEl);

    // Reset dependent selects until a sede is chosen
    fillSelect(nivelEl, [], { placeholder: 'Grado' });
    fillSelect(numeroEl, [], { placeholder: 'Grupo' });

    if (sedeEl) {
      sedeEl.addEventListener('change', () => {
        this.onSedeChangeInformes(sedeEl.value, nivelEl, numeroEl);
      });
    }
    if (nivelEl) {
      nivelEl.addEventListener('change', () => {
        this.filterNumeros(nivelEl.value, numeroEl);
      });
    }
  }

  async onSedeChangeInformes(sede, nivelEl, numeroEl) {
    fillSelect(nivelEl, [], { placeholder: 'Grado' });
    fillSelect(numeroEl, [], { placeholder: 'Grupo' });
    if (!sede) return;

    const res = await filters.getGrupos(sede, this.year).catch(() => null);
    const grupos = res?.data || [];
    this._grupos = grupos;

    const niveles = [...new Set(grupos.map((g) => g.nivel))].sort((a, b) => a - b);
    fillSelect(
      nivelEl,
      niveles.map((n) => ({
        value: n,
        label: this.nombresNiveles[String(n)] ? `${n} · ${this.nombresNiveles[String(n)]}` : String(n),
      })),
      { placeholder: 'Grado' }
    );
  }

  filterNumeros(nivel, numeroEl) {
    fillSelect(numeroEl, [], { placeholder: 'Grupo' });
    if (!nivel || !this._grupos) return;
    const numeros = this._grupos
      .filter((g) => String(g.nivel) === String(nivel))
      .map((g) => g.numero)
      .sort((a, b) => a - b);
    fillSelect(
      numeroEl,
      numeros.map((n) => ({ value: n, label: String(n) })),
      { placeholder: 'Grupo' }
    );
  }

  /* ---------------- Notas ---------------- */

  async initNotas() {
    const asigEl = $('asignaturaNotas');
    const periodoEl = $('periodoNotas');
    if (!asigEl && !periodoEl) return;

    await this.fillPeriods(periodoEl);
    // Asignaturas for Notas depend on the group selected in Informes.
    // Repopulate whenever the Informes sede/grade/group changes.
    fillSelect(asigEl, [], { placeholder: 'Seleccione grupo en Informes' });

    ['asignacion', 'nivel', 'numero'].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('change', () => this.syncNotasAsignaturas(asigEl));
    });
  }

  async syncNotasAsignaturas(asigEl) {
    const sede = $('asignacion')?.value;
    const nivel = $('nivel')?.value;
    const numero = $('numero')?.value;
    if (!sede || !nivel || !numero) {
      fillSelect(asigEl, [], { placeholder: 'Seleccione grupo en Informes' });
      return;
    }
    const res = await filters.getAsignaturas(sede, nivel, numero, this.year).catch(() => null);
    const list = (res?.data || []).map((a) => ({
      value: a.asignatura,
      label: a.asignatura,
    }));
    fillSelect(asigEl, list, { placeholder: 'Asignatura' });
  }

  /* ---------------- Estadisticas ---------------- */

  async initEstadisticas() {
    const asigEl = $('asignatura');
    if (!asigEl) return;
    // Mirror the Notas asignatura list.
    ['asignacion', 'nivel', 'numero'].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('change', () => this.syncNotasAsignaturas(asigEl));
    });
    fillSelect(asigEl, [], { placeholder: 'Seleccione grupo en Informes' });
  }

  /* ---------------- shared fillers ---------------- */

  async fillYears(el) {
    if (!el) return;
    const res = await filters.getYears().catch(() => null);
    const years = res?.data || [];
    fillSelect(el, years, { placeholder: 'Año', selected: this.year });
    if (el.value === '' && years.length) el.value = this.year;
    el.addEventListener('change', () => {
      this.year = el.value || this.year;
    });
  }

  async fillPeriods(el) {
    if (!el) return;
    const res = await filters.getPeriods().catch(() => null);
    const periods = res?.data || [];
    const current = periods.find((p) => p.current);
    fillSelect(el, periods, { placeholder: 'Periodo', selected: current?.value });
  }

  async fillSedes(el) {
    if (!el) return;
    const res = await filters.getSedes().catch(() => null);
    fillSelect(el, res?.data || [], { placeholder: 'Sede' });
  }
}

export const filtersModule = new FiltersModule();

// Populate selects once the user is authenticated.
document.addEventListener('app:authenticated', () => {
  filtersModule.boot();
});
