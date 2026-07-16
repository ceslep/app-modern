import { delegate } from '../utils/dom.js';
import { auth } from '../services/auth.js';

const STYLE = document.createElement('style');
STYLE.textContent = `
  @media (min-width: 1024px) {
    #app-layout.sidebar-collapsed #sidebar { transform: translateX(-100%) !important; }
    #app-layout.sidebar-collapsed #main-content { margin-left: 0 !important; }
    #main-content { margin-left: 16rem; }
  }
  .nav-admin-badge {
    display:inline-flex; align-items:center; gap:.25rem;
    padding:.15rem .45rem; margin-left:.35rem;
    border-radius:9999px;
    background:linear-gradient(135deg,#f59e0b,#d97706);
    color:#fff; font-size:.65rem; font-weight:700;
    text-transform:uppercase; letter-spacing:.04em;
    box-shadow:0 2px 6px -1px rgba(245,158,11,.5);
    vertical-align:middle;
  }
  .nav-admin-badge i { font-size:.75rem; line-height:1; }
`;
document.head.appendChild(STYLE);

export function initNavbar() {
  renderNavbar();
  startTimer();

  delegate(document, 'click', '#sidebarToggle', () => {
    if (window.innerWidth >= 1024) {
      const layout = document.getElementById('app-layout');
      if (layout) layout.classList.toggle('sidebar-collapsed');
    } else {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return;
      sidebar.classList.toggle('-translate-x-full');
      let backdrop = document.getElementById('sidebar-backdrop');
      if (!sidebar.classList.contains('-translate-x-full')) {
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.id = 'sidebar-backdrop';
          backdrop.className = 'fixed inset-0 bg-black/30 z-20';
          backdrop.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            backdrop.remove();
          });
          document.body.appendChild(backdrop);
        }
      } else {
        if (backdrop) backdrop.remove();
      }
    }
  });

  delegate(document, 'click', '#btnLogout', (e) => {
    e.preventDefault();
    auth.logout().finally(() => window.location.reload());
  });
}

function renderNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const user = auth.getUser();
  const isAdmin = auth.isAccesoTotal();
  const adminBadge = isAdmin
    ? `<span class="nav-admin-badge" title="Acceso total — puede configurar porcentajes de notas">
         <i class="bi bi-shield-fill-check"></i>Admin
       </span>`
    : '';

  navbar.innerHTML = `
    <div class="flex items-center justify-between w-full">
      <div class="flex items-center gap-3">
        <button id="sidebarToggle"
                class="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                title="Mostrar/Ocultar menú lateral">
          <i class="bi bi-list text-xl"></i>
        </button>
        <a href="#" class="flex items-center gap-2.5">
          <img src="uescudo.png" alt="" class="h-8 w-auto">
          <span class="font-bold text-gray-800 text-base hidden sm:inline">IEdeOccidente</span>
        </a>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-400 font-mono hidden md:inline" id="timer"></span>
        <div class="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-gray-700 leading-tight inline-flex items-center">
              <span>${user?.nombres || ''}</span>${adminBadge}
            </p>
            <p class="text-xs text-gray-400">${user?.identificacion || ''}</p>
          </div>
          <div class="w-8 h-8 rounded-full bg-[#543391] flex items-center justify-center text-white text-xs font-bold">
            ${user?.nombres ? user.nombres.charAt(0).toUpperCase() : '?'}
          </div>
          <button id="btnLogout"
                  class="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Cerrar sesión">
            <i class="bi bi-box-arrow-right text-lg"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function startTimer() {
  const timerEl = document.getElementById('timer');
  if (!timerEl) return;
  function update() {
    const now = new Date();
    timerEl.textContent = now.toLocaleTimeString('es-CO');
  }
  update();
  setInterval(update, 1000);
}

export function refreshNavbar() {
  renderNavbar();
  startTimer();
}
