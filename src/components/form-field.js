/**
 * Form field component utilities
 */
import { escapeHtml } from '../utils/dom.js';

/**
 * Create a form group with label and input
 */
export function createFormGroup(options) {
  const {
    id,
    label,
    type = 'text',
    value = '',
    placeholder = '',
    required = false,
    disabled = false,
    helpText = '',
    className = '',
    options: selectOptions = null,
    min = null,
    max = null,
    step = null,
  } = options;

  const group = document.createElement('div');
  group.className = `mb-3 ${className}`;

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';
    labelEl.setAttribute('for', id);
    labelEl.textContent = label;
    if (required) {
      const requiredSpan = document.createElement('span');
      requiredSpan.className = 'text-red-500';
      requiredSpan.textContent = ' *';
      labelEl.appendChild(requiredSpan);
    }
    group.appendChild(labelEl);
  }

  let input;

  if (type === 'select' && selectOptions) {
    input = document.createElement('select');
    input.className = 'custom-select';
    selectOptions.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === value) option.selected = true;
      input.appendChild(option);
    });
  } else if (type === 'textarea') {
    input = document.createElement('textarea');
    input.className = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all';
    input.rows = 3;
    input.value = value;
  } else if (type === 'checkbox') {
    const checkDiv = document.createElement('div');
    checkDiv.className = 'flex items-center gap-2';
    input = document.createElement('input');
    input.className = 'w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391]';
    input.type = 'checkbox';
    input.id = id;
    input.checked = !!value;
    checkDiv.appendChild(input);

    if (label) {
      const checkLabel = document.createElement('label');
      checkLabel.className = 'text-sm text-gray-700';
      checkLabel.setAttribute('for', id);
      checkLabel.textContent = label;
      checkDiv.appendChild(checkLabel);
    }

    group.innerHTML = '';
    group.appendChild(checkDiv);

    if (helpText) {
      const help = document.createElement('div');
      help.className = 'form-text';
      help.textContent = helpText;
      group.appendChild(help);
    }

    return group;
  } else {
    input = document.createElement('input');
    input.type = type;
    input.className = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all';
    input.value = value;
  }

  input.id = id;
  input.name = id;
  if (placeholder) input.placeholder = placeholder;
  if (required) input.required = true;
  if (disabled) input.disabled = true;
  if (min !== null) input.min = min;
  if (max !== null) input.max = max;
  if (step !== null) input.step = step;

  group.appendChild(input);

  if (helpText) {
    const help = document.createElement('div');
    help.className = 'form-text';
    help.textContent = helpText;
    group.appendChild(help);
  }

  return group;
}

/**
 * Create a datalist input
 */
export function createDatalistInput(options) {
  const { id, label, placeholder = '', datalistId, options: listOptions = [], required = false } = options;

  const group = document.createElement('div');
  group.className = 'mb-3';

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';
    labelEl.setAttribute('for', id);
    labelEl.textContent = label;
    if (required) {
      const requiredSpan = document.createElement('span');
      requiredSpan.className = 'text-red-500';
      requiredSpan.textContent = ' *';
      labelEl.appendChild(requiredSpan);
    }
    group.appendChild(labelEl);
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all';
  input.id = id;
  input.name = id;
  input.setAttribute('list', datalistId);
  if (placeholder) input.placeholder = placeholder;
  if (required) input.required = true;
  group.appendChild(input);

  const datalist = document.createElement('datalist');
  datalist.id = datalistId;
  listOptions.forEach((opt) => {
    const option = document.createElement('option');
    option.value = typeof opt === 'string' ? opt : opt.value;
    option.textContent = typeof opt === 'string' ? opt : opt.label;
    datalist.appendChild(option);
  });
  group.appendChild(datalist);

  return group;
}

/**
 * Create a search input with debounce
 */
export function createSearchInput(id, placeholder = 'Buscar...', onSearch) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-center gap-0 mb-3';

  const prepend = document.createElement('span');
  prepend.className = 'px-3 py-2.5 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-400 text-sm';
  prepend.innerHTML = '<i class="bi bi-search"></i>';
  wrapper.appendChild(prepend);

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'flex-1 px-3 py-2.5 border border-gray-200 rounded-r-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all';
  input.id = id;
  input.placeholder = placeholder;
  wrapper.appendChild(input);

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onSearch(input.value);
    }, 300);
  });

  return wrapper;
}

/**
 * Validate a form
 */
export function validateForm(formEl) {
  const requiredFields = formEl.querySelectorAll('[required]');
  let isValid = true;

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      field.classList.add('border-red-400', 'focus:ring-red-400');
      isValid = false;
    } else {
      field.classList.remove('border-red-400', 'focus:ring-red-400');
    }
  });

  return isValid;
}

/**
 * Reset form validation state
 */
export function resetFormValidation(formEl) {
  formEl.querySelectorAll('.border-red-400').forEach((field) => {
    field.classList.remove('border-red-400', 'focus:ring-red-400');
  });
}

/**
 * Get form data as object
 */
export function getFormData(formEl) {
  const formData = new FormData(formEl);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}

/**
 * Set form values from object
 */
export function setFormValues(formEl, data) {
  Object.entries(data).forEach(([key, value]) => {
    const field = formEl.querySelector(`[name="${key}"], #${key}`);
    if (field) {
      if (field.type === 'checkbox') {
        field.checked = !!value;
      } else {
        field.value = value ?? '';
      }
    }
  });
}

/**
 * Clear all form fields
 */
export function clearForm(formEl) {
  formEl.reset();
  formEl.querySelectorAll('.border-red-400').forEach((f) => f.classList.remove('border-red-400', 'focus:ring-red-400'));
}
