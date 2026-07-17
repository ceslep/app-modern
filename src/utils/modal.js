const modalInstances = new Map();
let backdropCount = 0;

function createBackdrop() {
  const el = document.createElement('div');
  el.className = 'scrim fixed inset-0 z-[1055] bg-black/40 transition-opacity duration-300';
  el.style.opacity = '0';
  document.body.appendChild(el);
  void el.offsetHeight;
  el.style.opacity = '1';
  return el;
}

function removeBackdrop() {
  const els = document.querySelectorAll('.scrim');
  if (els.length === 0) return;
  const last = els[els.length - 1];
  last.style.opacity = '0';
  setTimeout(() => { if (last.parentNode) last.remove(); }, 300);
}

function lockScroll() {
  if (backdropCount === 0) {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px';
  }
  backdropCount++;
}

function unlockScroll() {
  backdropCount = Math.max(0, backdropCount - 1);
  if (backdropCount === 0) {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

class CustomModal {
  constructor(element) {
    this.element = element;
    this._backdrop = null;
    this._onKeydown = (e) => {
      if (e.key === 'Escape') this.hide();
    };
    this._onBackdropClick = (e) => {
      if (e.target === this._backdrop) this.hide();
    };
  }

  show() {
    if (this.element.classList.contains('show')) return;
    this._backdrop = createBackdrop();
    this._backdrop.addEventListener('click', this._onBackdropClick);
    this.element.classList.remove('hidden');
    this.element.style.display = 'flex';
    this.element.style.opacity = '0';
    this.element.classList.add('show');
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    document.addEventListener('keydown', this._onKeydown);
    lockScroll();
    void this.element.offsetHeight;
    this.element.style.opacity = '1';
    this.element.style.transition = 'opacity 0.3s ease';
    this.element.dispatchEvent(new CustomEvent('shown.bs.modal'));
  }

  hide() {
    if (!this.element.classList.contains('show')) return;
    this.element.style.opacity = '0';
    this.element.style.transition = 'opacity 0.3s ease';
    document.removeEventListener('keydown', this._onKeydown);
    if (this._backdrop) {
      this._backdrop.removeEventListener('click', this._onBackdropClick);
      removeBackdrop();
      this._backdrop = null;
    }
    unlockScroll();
    setTimeout(() => {
      this.element.classList.add('hidden');
      this.element.style.display = '';
      this.element.style.opacity = '';
      this.element.style.transition = '';
      this.element.classList.remove('show');
      this.element.removeAttribute('role');
      this.element.removeAttribute('aria-modal');
      this.element.dispatchEvent(new CustomEvent('hidden.bs.modal'));
    }, 300);
  }

  dispose() {
    this.hide();
    modalInstances.delete(this.element.id);
  }
}

export function getModal(id) {
  if (!modalInstances.has(id)) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`Modal #${id} not found`);
      return null;
    }
    modalInstances.set(id, new CustomModal(el));
  }
  return modalInstances.get(id);
}

export function showModal(id) {
  const modal = getModal(id);
  if (modal) modal.show();
  return modal;
}

export function hideModal(id) {
  const modal = getModal(id);
  if (modal) modal.hide();
  return modal;
}

export function toggleModal(id) {
  const modal = getModal(id);
  if (!modal) return null;
  const el = document.getElementById(id);
  if (el && el.classList.contains('show')) {
    modal.hide();
  } else {
    modal.show();
  }
  return modal;
}

export function initModals() {
  document.querySelectorAll('[data-modal-target]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showModal(btn.dataset.modalTarget);
    });
  });

  document.querySelectorAll('[data-modal-dismiss]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      hideModal(btn.dataset.modalDismiss);
    });
  });
}

export function onModalEvent(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

export function destroyModal(id) {
  const modal = modalInstances.get(id);
  if (modal) {
    modal.dispose();
    modalInstances.delete(id);
  }
}

export function waitForModalHide(id) {
  return new Promise((resolve) => {
    const el = document.getElementById(id);
    if (!el) { resolve(); return; }
    const handler = () => { el.removeEventListener('hidden.bs.modal', handler); resolve(); };
    el.addEventListener('hidden.bs.modal', handler);
  });
}

export function waitForModalShow(id) {
  return new Promise((resolve) => {
    const el = document.getElementById(id);
    if (!el) { resolve(); return; }
    const handler = () => { el.removeEventListener('shown.bs.modal', handler); resolve(); };
    el.addEventListener('shown.bs.modal', handler);
  });
}
