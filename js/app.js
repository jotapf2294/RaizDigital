import { $, $$, openModal, closeModal } from './utils.js';
import { DB, initDB } from './db.js';
import { renderHome } from './views/home.js';
import { renderHortas } from './views/hortas.js';
import { renderWiki } from './views/wiki.js';
import { renderForum } from './views/forum.js';
import { renderStats } from './views/stats.js';
import { renderDefs } from './views/defs.js';
import { pedirPermissaoNotificacao, agendarVerificacaoDiaria, verificarNotificacoes } from './notifications.js';

// Globais para acesso via HTML (onclick)
window.openModal = openModal;
window.closeModal = closeModal;

// Sistema de tratamento de erros visual
window.showError = (err, view = '') => {
  const stack = err.stack || '';
  const match = stack.match(/at.*? \((.+?):(\d+):(\d+)\)/) || stack.match(/@(.+?):(\d+):(\d+)/);
  
  let file = 'desconhecido';
  let line = '?';
  let col = '?';
  
  if (match) {
    file = match[1].split('/').pop();
    line = match[2];
    col = match[3];
  }

  const modal = document.createElement('dialog');
  modal.style.cssText = 'max-width:90vw;padding:0;border:none;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.3);z-index:9999';
  modal.innerHTML = `
    <div class="modal-head" style="background:#d73a49;color:#fff">
      <span>💥 Erro em ${view}</span>
      <button class="close-btn" onclick="this.closest('dialog').close()">×</button>
    </div>
    <div class="modal-body" style="font-family:monospace;font-size:13px">
      <p style="color:#d73a49;font-weight:600;margin:0 0 8px">${err.message}</p>
      <p class="muted" style="margin:0 0 12px">Ficheiro: ${file} | Linha: ${line} | Col: ${col}</p>
      <details>
        <summary style="cursor:pointer;margin-bottom:8px">Ver stack completo</summary>
        <pre style="background:#f6f8fa;padding:8px;border-radius:6px;overflow:auto;max-height:200px;margin:0">${stack}</pre>
      </details>
      <button class="btn btn-block" style="margin-top:12px" onclick="location.reload()">Recarregar App</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.showModal();
  modal.addEventListener('close', () => modal.remove());
};

const views = {
  home: renderHome,
  hortas: renderHortas,
  wiki: renderWiki,
  forum: renderForum,
  stats: renderStats,
  defs: renderDefs
};

const app = $('#app');
const tabs = $$('.tab');
let currentView = 'home';

// Atualiza o contador de notificações na aba Hortas
window.updateNotificationBadge = async () => {
  try {
    const [plantios, wiki] = await Promise.all([DB.getAll('plantios'), DB.getAll('wiki')]);
    const comSede = plantios.filter(p => {
      const planta = wiki.find(w => w.id === p.planta_id);
      if (!planta || p.status === 'colhido') return false;
      const ultimaRega = p.ultima_rega || p.data_plantio;
      const diasSemRega = Math.floor((Date.now() - ultimaRega) / 86400000);
      if (planta.rega === 'diária' && diasSemRega >= 1) return true;
      if (planta.rega === 'semanal' && diasSemRega >= 7) return true;
      if (planta.rega === 'quinzenal' && diasSemRega >= 14) return true;
      return false;
    }).length;

    const tabHortas = document.querySelector('.tab[data-view="hortas"]');
    if (tabHortas) {
      let badge = tabHortas.querySelector('.notif-badge');
      if (comSede > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'notif-badge';
          badge.style.cssText = 'position:absolute;top:4px;right:4px;background:#2196F3;color:#fff;border-radius:10px;padding:2px 6px;font-size:10px;font-weight:600';
          tabHortas.style.position = 'relative';
          tabHortas.appendChild(badge);
        }
        badge.textContent = comSede;
      } else if (badge) {
        badge.remove();
      }
    }
  } catch (e) {
    console.warn('Erro ao atualizar badge:', e);
  }
};

// Navegação entre views
async function navigate(view) {
  try {
    const render = views[view] || views.home; 
    app.innerHTML = await render(); 
  } catch (err) {
    console.error('Erro ao renderizar view:', err);
    window.showError(err, view);
    app.innerHTML = `<div class="card"><h2>Erro</h2><p class="muted">Ver detalhes acima</p></div>`;
  } finally {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.view === view));
    currentView = view;
    localStorage.setItem('raizdigital.view', view);
    updateNotificationBadge();
  }
}

window.navigate = navigate;

// Event Listeners das Tabs
tabs.forEach(tab => {
  tab.addEventListener('click', () => navigate(tab.dataset.view));
});

// Gestão de Temas
function applyTheme() {
  const theme = localStorage.getItem('raizdigital.theme') || 'light';
  document.body.classList.toggle('dark', theme === 'dark');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = theme === 'dark'? '#0d1117' : '#f6f8fa';
}

window.toggleTheme = () => {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('raizdigital.theme', isDark? 'dark' : 'light');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = isDark? '#0d1117' : '#f6f8fa';
};

// Captura de erros globais
window.addEventListener('error', e => {
  window.showError(e.error || new Error(e.message), 'global');
});

window.addEventListener('unhandledrejection', e => {
  window.showError(new Error(e.reason), 'promise');
});

// Inicialização da App
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();
    applyTheme();
    
    // Carrega a última view ou a home por defeito
    const lastView = localStorage.getItem('raizdigital.view') || 'home';
    await navigate(lastView);

    if (await pedirPermissaoNotificacao()) {
      agendarVerificacaoDiaria();
      verificarNotificacoes();
    }
  } catch (err) {
    console.error('Erro ao iniciar:', err);
    window.showError(err, 'init');
    document.getElementById('app').innerHTML = `
      <div class="card">
        <h2>💥 Erro Crítico</h2>
        <p class="muted">Não consegui iniciar a base de dados.</p>
        <button class="btn btn-block" onclick="location.reload()">Tentar Novamente</button>
      </div>
    `;
  }
});

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}
