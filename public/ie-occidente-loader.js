/**
 * <ie-occidente-loader>
 * Web Component loader reutilizable con el aro giratorio multicolor
 * y escudo de la I.E. de Occidente - Anserma Caldas.
 *
 * Uso:
 *   <ie-occidente-loader></ie-occidente-loader>
 *   document.querySelector('ie-occidente-loader').show()
 *   document.querySelector('ie-occidente-loader').hide()
 *
 * Atributos:
 *   logo-src   - Ruta de la imagen del escudo (default: 'uescudo.png')
 *   text       - Texto mostrado debajo del spinner (default: 'Cargando...')
 *   duration   - Duración de transiciones en ms (default: 300)
 *
 * Métodos:
 *   show()  - Muestra el loader
 *   hide()  - Oculta el loader
 *
 * Eventos:
 *   ie-loader-shown  - Se dispara al mostrar
 *   ie-loader-hidden - Se dispara al ocultar
 */
class IeOccidenteLoader extends HTMLElement {
  static get observedAttributes() {
    return ['logo-src', 'text', 'duration', 'contained'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._render();
    this._overlay = this.shadowRoot.querySelector('.loader-overlay');
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (!this.shadowRoot.host) return;

    switch (name) {
      case 'logo-src':
        this._updateLogo();
        break;
      case 'text':
        this._updateText();
        break;
      case 'contained':
        this._updateContainment();
        break;
    }
  }

  get logoSrc() {
    return this.getAttribute('logo-src') || 'uescudo.png';
  }

  get text() {
    return this.getAttribute('text') || 'Cargando...';
  }

  get duration() {
    return parseInt(this.getAttribute('duration') || '300', 10);
  }

  show() {
    this._overlay.style.transition = `opacity ${this.duration}ms ease-in-out`;
    this._overlay.classList.add('active');
    this.dispatchEvent(new CustomEvent('ie-loader-shown'));
  }

  hide() {
    this._overlay.style.transition = `opacity ${this.duration}ms ease-in-out`;
    this._overlay.classList.remove('active');
    this.dispatchEvent(new CustomEvent('ie-loader-hidden'));
  }

  _updateLogo() {
    const img = this.shadowRoot.querySelector('.escudo-img');
    if (img) img.src = this.logoSrc;
  }

  _updateText() {
    const p = this.shadowRoot.querySelector('.loader-text');
    if (p) p.textContent = this.text;
  }

  _updateContainment() {
    const overlay = this.shadowRoot.querySelector('.loader-overlay');
    if (!overlay) return;
    if (this.hasAttribute('contained')) {
      overlay.classList.add('contained');
    } else {
      overlay.classList.remove('contained');
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 200px;
        }

        .loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease-in-out;
        }

        .loader-overlay.active {
          opacity: 1;
          pointer-events: all;
        }

        .loader-overlay.contained {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: inherit;
        }

        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .loader-ring-wrap {
          position: relative;
          width: 140px;
          height: 140px;
        }

        .loader-spinner {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 5px solid transparent;
          border-top-color: #2d72b8;
          border-right-color: #ebd047;
          border-bottom-color: #d62438;
          border-left-color: #1b8a43;
          animation: spin 1.2s linear infinite;
        }

        .loader-logo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 1.5s ease-in-out infinite alternate;
        }

        .escudo-img {
          width: 90px;
          height: 90px;
          object-fit: contain;
          display: block;
        }

        .loader-text {
          margin-top: 20px;
          font-weight: 700;
          font-size: 0.95rem;
          color: #1b8a43;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.85; }
          100% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
        }
      </style>

      <div class="loader-overlay${this.hasAttribute('contained') ? ' contained' : ''}">
        <div class="loader-container">
          <div class="loader-ring-wrap">
            <div class="loader-spinner"></div>
            <div class="loader-logo">
              <img src="${this.logoSrc}" alt="Escudo I.E. Occidente" class="escudo-img">
            </div>
          </div>
          <p class="loader-text">${this.text}</p>
        </div>
      </div>
    `;
  }
}

customElements.define('ie-occidente-loader', IeOccidenteLoader);

/**
 * Helper global: acceso rápido sin querySelector
 *   IELoader.show()
 *   IELoader.hide()
 */
window.IELoader = (() => {
  let _instance = null;

  function _get() {
    if (!_instance) {
      _instance = document.querySelector('ie-occidente-loader');
    }
    return _instance;
  }

  return {
    show() { _get()?.show(); },
    hide() { _get()?.hide(); },
    get el() { return _get(); }
  };
})();
