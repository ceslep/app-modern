import { estudiantes } from '@services/estudiantes.js';
import { escapeHtml, $ } from '@utils/dom.js';
import { alertSuccess, alertWarning, alertError } from '@utils/alert.js';
import { showModal, hideModal } from '@utils/modal.js';

class ChangeGroupModal {
  constructor() {
    this._currentData = null;
    this._onSuccess = null;
    this._bound = false;
    this._inject();
    this._bindEvents();
  }

  _inject() {
    if (document.getElementById('modalCHGgrupos')) return;
    const container = document.getElementById('modal-container');
    if (!container) return;
    container.insertAdjacentHTML('beforeend', `
<div id="modalCHGgrupos" class="modal fixed inset-0 z-[1056] flex items-center justify-center hidden">
  <div class="relative z-[1060] w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100" style="background: linear-gradient(135deg, #D83B01 0%, #B32D00 100%);">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
          <i class="bi bi-shuffle text-sm"></i>
        </div>
        <div>
          <h5 class="text-base font-semibold text-white">Cambiar Grupo</h5>
          <p class="text-xs text-white/70" id="chgest">Seleccione un nuevo grupo</p>
        </div>
      </div>
      <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" data-modal-dismiss="modalCHGgrupos">
        <i class="bi bi-x-lg text-sm"></i>
      </button>
    </div>
    <div class="p-6">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nuevo Grupo</label>
          <select id="nuevo_grado" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#D83B01]/30 focus:border-[#D83B01] outline-none transition-all">
            <option value="">Cargando grados disponibles...</option>
          </select>
        </div>
        <div class="flex items-center gap-2 mt-4">
          <input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-[#D83B01] focus:ring-[#D83B01]" id="chkChangeGroupConfirm">
          <label class="text-sm text-gray-600" for="chkChangeGroupConfirm">Confirmar cambio de grupo</label>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
      <button type="button" data-modal-dismiss="modalCHGgrupos"
              class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all">
        Cancelar
      </button>
      <button type="button" id="btnConfirmChangeGroup"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D83B01] hover:bg-[#B32D00] text-white font-medium rounded-xl shadow-sm transition-all text-sm"
              disabled>
        <i class="bi bi-shuffle"></i> Cambiar Grupo
        <span class="spinner-border spinner-border-sm hidden"></span>
      </button>
    </div>
  </div>
</div>`);
  }

  _bindEvents() {
    if (this._bound) return;
    this._bound = true;

    document.addEventListener('change', (e) => {
      if (e.target.id === 'chkChangeGroupConfirm') {
        const btn = $('btnConfirmChangeGroup');
        if (btn) btn.disabled = !e.target.checked;
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.id === 'nuevo_grado') {
        const checkbox = $('chkChangeGroupConfirm');
        if (checkbox) checkbox.checked = false;
        const btn = $('btnConfirmChangeGroup');
        if (btn) btn.disabled = true;
      }
    });

    document.addEventListener('click', async (e) => {
      const target = e.target.closest('#btnConfirmChangeGroup');
      if (!target) return;
      e.preventDefault();
      await this._onConfirm(target);
    });
  }

  async open(data) {
    if (!data) return;
    this._currentData = data;
    this._onSuccess = data.onSuccess || null;

    const { estudiante, asignacion, nivel, numero, year } = data;

    const labelEl = $('chgest');
    if (labelEl) labelEl.textContent = `Cambiando: ${data.nombres || ''} (${nivel}-${numero})`;

    const select = $('nuevo_grado');
    if (select) {
      select.innerHTML = '<option value="">Cargando...</option>';
      select.disabled = true;
    }

    const confirmBtn = $('btnConfirmChangeGroup');
    if (confirmBtn) confirmBtn.disabled = true;
    const checkbox = $('chkChangeGroupConfirm');
    if (checkbox) checkbox.checked = false;

    showModal('modalCHGgrupos');

    try {
      const targetYear = year || new Date().getFullYear();
      const nivelsel = await estudiantes.getGroupTargets({ asignacion, nivel, numero, year: targetYear });

      if (!Array.isArray(nivelsel) || nivelsel.length === 0) {
        if (select) {
          select.innerHTML = '<option value="">No hay grupos disponibles</option>';
          select.disabled = true;
        }
        return;
      }

      if (select) {
        select.innerHTML = '<option value="">Seleccione un grupo...</option>' + nivelsel.map(n => {
          const optData = JSON.stringify({ ...n, asignacion, estudiante, year: targetYear, grado: n.grado || `${n.nivel}-${n.numero}` });
          return `<option value='${escapeHtml(optData)}'>${n.nivel}-${n.numero}</option>`;
        }).join('');
        select.disabled = false;
      }
    } catch (error) {
      if (select) {
        select.innerHTML = '<option value="">Error al cargar grupos</option>';
      }
      alertError('Error', error.message);
    }
  }

  async _onConfirm(target) {
    const select = $('nuevo_grado');
    if (!select || !select.value) {
      alertWarning('Seleccione un grupo', 'Debe seleccionar un grupo destino.');
      return;
    }

    const spinner = target.querySelector('.spinner-border');
    if (spinner) spinner.classList.remove('hidden');
    target.disabled = true;

    try {
      const opt = JSON.parse(select.value);
      const res = await estudiantes.changeGroup({
        estudiante: opt.estudiante,
        asignacion: opt.asignacion,
        nivel: opt.nivel,
        numero: opt.numero,
        grado: opt.grado || `${opt.nivel}-${opt.numero}`,
        year: opt.year,
      });
      if (res && res.exito === false) {
        alertError('Error', res.mensaje || res.detalle || 'Error al cambiar grupo');
        return;
      }
      alertSuccess('Grupo cambiado', `Estudiante movido a ${opt.nivel}-${opt.numero}.`);
      hideModal('modalCHGgrupos');
      if (this._onSuccess) this._onSuccess();
    } catch (error) {
      alertError('Error', error.message);
    } finally {
      if (spinner) spinner.classList.add('hidden');
      target.disabled = false;
    }
  }
}

export const changeGroupModal = new ChangeGroupModal();
