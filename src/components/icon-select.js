import { escapeHtml } from '../utils/dom.js';

const INSTANCES = new WeakMap();

const DEFAULTS = {
  placeholder: 'Seleccione...',
  searchable: false,
  onChange: null,
  dropUp: false,
};

export class IconSelect {
  constructor(input, opts = {}) {
    const options = { ...DEFAULTS, ...opts };
    const container = input.closest('.icon-select-wrap') || input.parentNode;

    this.id = input.id || `is-${Math.random().toString(36).slice(2, 9)}`;
    this.options = options;
    this.items = [];
    this.selected = null;
    this.open = false;

    const wrap = document.createElement('div');
    wrap.className = 'icon-select-wrap';
    wrap.id = `wrap-${this.id}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-select-btn';
    btn.setAttribute('role', 'combobox');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', `list-${this.id}`);
    btn.setAttribute('aria-labelledby', this.id);
    btn.innerHTML = `<span class="icon-select-placeholder">${escapeHtml(options.placeholder)}</span>
      <i class="bi bi-chevron-down icon-select-arrow"></i>`;

    const dropdown = document.createElement('div');
    dropdown.className = 'icon-select-dropdown';
    dropdown.setAttribute('role', 'listbox');
    dropdown.id = `list-${this.id}`;

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = input.name || input.id;
    hidden.id = `field-${this.id}`;
    hidden.value = '';

    container.insertBefore(wrap, input);
    wrap.appendChild(btn);
    wrap.appendChild(dropdown);
    wrap.appendChild(hidden);
    input.style.display = 'none';

    this.wrap = wrap;
    this.btn = btn;
    this.dropdown = dropdown;
    this.hidden = hidden;

    this.setItems(this.items);

    this._onBtnClick = (e) => {
      e.stopPropagation();
      this.toggle();
    };
    this._onDropdownClick = (e) => {
      if (!this.open) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el && el !== this.dropdown && !this.dropdown.contains(el)) {
          el.dispatchEvent(new MouseEvent('click', {
            clientX: e.clientX,
            clientY: e.clientY,
            bubbles: true,
            cancelable: true,
            view: window,
          }));
        }
        return;
      }
      const opt = e.target.closest('.icon-select-option');
      if (opt) this.select(opt.dataset.value);
    };
    this._onDocumentClick = (e) => {
      if (!this.wrap.contains(e.target)) this.close();
    };
    this._onDocumentKeydown = (e) => {
      if (e.key === 'Escape') this.close();
    };
    this._onCaptureMousedown = (e) => {
      if (!this.open) return;
      const rect = this.wrap.getBoundingClientRect();
      const outsideWrap = e.clientY > rect.bottom || e.clientY < rect.top ||
                          e.clientX < rect.left || e.clientX > rect.right;
      if (!outsideWrap) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.closest('.icon-select-option')) return;
      this.close();
    };

    btn.addEventListener('click', this._onBtnClick);
    dropdown.addEventListener('click', this._onDropdownClick);
    document.addEventListener('click', this._onDocumentClick);
    document.addEventListener('keydown', this._onDocumentKeydown);
    document.addEventListener('mousedown', this._onCaptureMousedown, true);

    INSTANCES.set(input, this);
  }

  setItems(items) {
    this.items = items || [];
    this.render();
  }

  render() {
    const items = this.items;
    if (!items.length) {
      this.dropdown.innerHTML = `<div class="icon-select-empty">Sin opciones</div>`;
      return;
    }

    let html = '';
    let currentGroup = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.divider) {
        if (currentGroup) currentGroup = null;
        html += `<div class="icon-select-divider"></div>`;
        continue;
      }
      if (item.group && item.group !== currentGroup) {
        if (currentGroup !== null) html += `</div>`;
        currentGroup = item.group;
        html += `<div class="icon-select-group">
          <div class="icon-select-group-label">${escapeHtml(item.groupIcon ? `<i class="bi ${escapeHtml(item.groupIcon)}"></i> ` : '')}${escapeHtml(item.group)}</div>`;
      } else if (!item.group && currentGroup !== null) {
        html += `</div>`;
        currentGroup = null;
      }
      const sel = this.selected !== null && String(item.value) === String(this.selected) ? ' selected' : '';
      const icon = item.icon ? `<i class="bi ${escapeHtml(item.icon)} icon-select-option-icon"></i>` : '';
      html += `<div class="icon-select-option${sel}" role="option" data-value="${escapeHtml(String(item.value))}" data-icon="${escapeHtml(item.icon || '')}">
        ${icon}<span>${escapeHtml(item.label)}</span>
        ${sel ? '<i class="bi bi-check-lg icon-select-check"></i>' : ''}
      </div>`;
    }
    if (currentGroup !== null) html += `</div>`;

    this.dropdown.innerHTML = html;
  }

  select(value) {
    const item = this.items.find((i) => String(i.value) === String(value));
    if (!item) return;

    this.selected = value;
    this.hidden.value = value;
    this.hidden.dispatchEvent(new Event('change', { bubbles: true }));

    this.btn.innerHTML = `${item.icon ? `<i class="bi ${escapeHtml(item.icon)} icon-select-btn-icon"></i>` : ''}
      <span class="icon-select-selected">${escapeHtml(item.label)}</span>
      <i class="bi bi-chevron-down icon-select-arrow"></i>`;

    this.dropdown.querySelectorAll('.icon-select-option').forEach((el) => {
      const isSel = el.dataset.value === value;
      el.classList.toggle('selected', isSel);
      el.querySelector('.icon-select-check')?.remove();
      if (isSel) {
        el.insertAdjacentHTML('beforeend', '<i class="bi bi-check-lg icon-select-check"></i>');
      }
    });

    this.close();
    if (this.options.onChange) this.options.onChange(value, item);
  }

  setValue(value) {
    this.select(value);
  }

  getValue() {
    return this.hidden.value;
  }

  toggle() {
    if (this.open) this.close();
    else this.openDropdown();
  }

  openDropdown() {
    if (this.open) return;
    this.open = true;
    this.btn.classList.add('open');
    this.btn.setAttribute('aria-expanded', 'true');

    // Reset constraints to measure content
    this.dropdown.classList.remove('open', 'drop-up');
    this.dropdown.style.overflow = 'visible';
    this.dropdown.style.maxHeight = 'none';
    this.dropdown.style.opacity = '0';
    // Force reflow so scrollHeight is measured correctly
    void this.dropdown.offsetHeight;

    const fullHeight = Math.min(this.dropdown.scrollHeight, 480);
    const rect = this.wrap.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropUp = this.options.dropUp || (spaceBelow < fullHeight + 20 && spaceAbove > spaceBelow);
    const maxH = dropUp
      ? Math.min(fullHeight, Math.max(spaceAbove - 20, 120))
      : Math.min(fullHeight, Math.max(spaceBelow - 20, 120));

    // Apply measured constraints
    this.dropdown.style.overflow = '';
    this.dropdown.style.opacity = '';
    this.dropdown.style.maxHeight = `${maxH}px`;
    this.dropdown.classList.toggle('drop-up', dropUp);

    // Reveal
    void this.dropdown.offsetHeight;
    this.dropdown.classList.add('open');
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.dropdown.classList.remove('open');
    this.dropdown.style.maxHeight = '';
    this.btn.classList.remove('open');
    this.btn.setAttribute('aria-expanded', 'false');
  }

  destroy() {
    document.removeEventListener('click', this._onDocumentClick);
    document.removeEventListener('keydown', this._onDocumentKeydown);
    document.removeEventListener('mousedown', this._onCaptureMousedown, true);
    this.wrap?.remove();
  }
}

export function createIconSelect(el, opts = {}) {
  if (!el) return null;
  if (INSTANCES.has(el)) return INSTANCES.get(el);
  return new IconSelect(el, opts);
}

export function getIconSelect(el) {
  return INSTANCES.get(el) || null;
}

export function initIconSelect(id, { icon, placeholder, onChange } = {}) {
  const el = document.getElementById(id);
  if (!el || getIconSelect(el)) return null;
  let selectedValue = '';
  const items = Array.from(el.options).map((opt) => {
    if (opt.selected && opt.value) selectedValue = opt.value;
    return {
      value: opt.value,
      label: opt.label,
      icon: opt.value ? icon || '' : '',
      group: null,
      disabled: opt.disabled,
    };
  });
  const inst = new IconSelect(el, {
    placeholder: placeholder || 'Seleccione...',
    onChange,
  });
  inst.setItems(items);
  if (selectedValue) inst.setValue(selectedValue);
  return inst;
}
