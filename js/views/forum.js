import { DB } from '../db.js';
import { $ } from '../utils.js';

export async function renderForum() {
  const [cats, tops] = await Promise.all([DB.getAll('forum_cat'), DB.getAll('forum_top')]);
  
  // Cria categoria padrão se não existir
  if (!cats.length) {
    await DB.add('forum_cat', { id: crypto.randomUUID(), emoji: '🌱', titulo: 'Geral', created_at: Date.now() });
  }
  
  const catsFinal = cats.length ? cats : await DB.getAll('forum_cat');
  window._forumData = { cats: catsFinal, tops };
  
  return `
  <div class="card">
    <h2>💬 Fórum Comunitário</h2>
    <input id="forum-search" type="search" placeholder="🔍 Pesquisar tópicos ou categorias..." 
      oninput="window.filtrarForum(this.value)"
      style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin: 12px 0">
    
    <div class="flex" style="margin-bottom:16px">
      <button class="btn btn-block" onclick="window.modalTopico()">➕ Novo Tópico</button>
      <button class="btn btn-block" onclick="window.modalCategoria()">📁 Categoria</button>
    </div>

    <div id="forum-list">
      ${renderForumList(catsFinal, tops)}
    </div>
  </div>
  `;
}

function renderForumList(cats, tops) {
  if (!cats.length) return '<p class="muted">Nenhuma categoria criada.</p>';
  
  return cats.map(c => {
    const topicosCat = tops.filter(t => t.categoria_id === c.id);
    
    return `
      <details class="cat-block" style="margin-bottom: 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background: var(--bg-card)" open>
        <summary style="padding: 12px; list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; border-bottom: 1px solid var(--border-subtle)">
          <div style="display: flex; align-items: center; gap: 8px">
            <span style="font-size: 1.2rem">${c.emoji}</span>
            <span>${c.titulo}</span>
            <span class="badge" style="font-size: 0.7rem; opacity: 0.7">${topicosCat.length}</span>
          </div>
          <button class="btn-icon" onclick="event.preventDefault(); window.modalCategoria('${c.id}')">✏️</button>
        </summary>
        
        <div class="cat-content" style="padding: 4px 0">
          ${topicosCat.length ? 
            topicosCat.map(t => `
              <div class="list-item" onclick="window.verTopico('${t.id}')" style="border-bottom: none; padding-left: 20px">
                <div style="display: flex; flex-direction: column">
                  <span>${t.titulo}</span>
                  <small class="muted" style="font-size: 0.75rem">${new Date(t.created_at).toLocaleDateString()}</small>
                </div>
              </div>
            `).join('') 
            : '<p class="muted" style="padding: 12px; font-size: 0.85rem">Nenhum tópico nesta categoria.</p>'
          }
        </div>
      </details>
    `;
  }).join('');
}

window.filtrarForum = (termo) => {
  const q = termo.toLowerCase().trim();
  const { cats, tops } = window._forumData;

  if (!q) {
    $('#forum-list').innerHTML = renderForumList(cats, tops);
    return;
  }

  const topsFiltrados = tops.filter(t => 
    t.titulo.toLowerCase().includes(q) || 
    t.assunto.toLowerCase().includes(q)
  );

  // No filtro, mostramos apenas as categorias que têm tópicos que batem com a pesquisa
  const idsCatsComTops = [...new Set(topsFiltrados.map(t => t.categoria_id))];
  const catsFiltradas = cats.filter(c => idsCatsComTops.includes(c.id) || c.titulo.toLowerCase().includes(q));

  $('#forum-list').innerHTML = renderForumList(catsFiltradas, topsFiltrados);
};

// --- MODAIS E SALVAMENTO ---

window.modalCategoria = async (id = null) => {
  const cat = id ? await DB.get('forum_cat', id) : null;
  const modal = $('#modal-forum');
  modal.innerHTML = `
    <div class="modal-head">
      <span>${cat ? 'Editar Categoria' : 'Nova Categoria'}</span>
      <button class="close-btn" onclick="document.getElementById('modal-forum').close()">×</button>
    </div>
    <div class="modal-body">
      <label>Emoji</label><input id="c_emoji" value="${cat?.emoji || '📁'}" maxlength="2" style="width: 60px; text-align: center; font-size: 1.5rem">
      <label>Título da Categoria *</label><input id="c_titulo" value="${cat?.titulo || ''}" required placeholder="Ex: Ervas Aromáticas">
      <div class="flex" style="margin-top: 10px">
        <button class="btn btn-block" onclick="window.salvarCategoria('${cat?.id || ''}')">Guardar</button>
        ${cat ? `<button class="btn-danger" onclick="window.apagarCategoria('${cat.id}')">Apagar</button>` : ''}
      </div>
    </div>
  `;
  modal.showModal();
};

window.salvarCategoria = async (id = '') => {
  const titulo = $('#c_titulo').value.trim();
  if (!titulo) return alert('Título obrigatório');
  
  const data = {
    emoji: $('#c_emoji').value || '📁',
    titulo: titulo,
    updated_at: Date.now()
  };

  if (id) {
    const old = await DB.get('forum_cat', id);
    await DB.put('forum_cat', { ...old, ...data });
  } else {
    await DB.add('forum_cat', { ...data, id: crypto.randomUUID(), created_at: Date.now() });
  }
  
  document.getElementById('modal-forum').close();
  document.querySelector('main').innerHTML = await renderForum();
};

window.modalTopico = async (id = null) => {
  const topico = id ? (window._forumData.tops.find(t => t.id === id) || await DB.get('forum_top', id)) : null;
  const cats = await DB.getAll('forum_cat');
  const modal = $('#modal-forum');
  
  modal.innerHTML = `
    <div class="modal-head">
      <span>${topico ? 'Editar Tópico' : 'Novo Tópico'}</span>
      <button class="close-btn" onclick="document.getElementById('modal-forum').close()">×</button>
    </div>
    <div class="modal-body">
      <label>Categoria</label>
      <select id="t_cat">
        ${cats.map(c => `<option value="${c.id}" ${topico?.categoria_id === c.id ? 'selected' : ''}>${c.emoji} ${c.titulo}</option>`).join('')}
      </select>
      <label>Título da Discussão *</label><input id="t_titulo" value="${topico?.titulo || ''}" placeholder="O que queres partilhar?">
      <label>Mensagem / Assunto</label>
      <textarea id="t_assunto" rows="6" placeholder="Escreve aqui os detalhes...">${topico?.assunto || ''}</textarea>
      <div class="flex" style="margin-top: 10px">
        <button class="btn btn-block" onclick="window.salvarTopico('${topico?.id || ''}')">Publicar</button>
        ${topico ? `<button class="btn-danger" onclick="window.apagarTopico('${topico.id}')">Apagar</button>` : ''}
      </div>
    </div>
  `;
  modal.showModal();
};

window.salvarTopico = async (id = '') => {
  const titulo = $('#t_titulo').value.trim();
  if (!titulo) return alert('O título é obrigatório');

  const agora = Date.now(); // Captura o momento exato do clique em "Publicar"

  const data = {
    categoria_id: $('#t_cat').value,
    titulo: titulo,
    assunto: $('#t_assunto').value.trim(),
    updated_at: agora // Atualiza sempre a data de modificação
  };

  if (id) {
    const old = await DB.get('forum_top', id);
    // Ao editar, mantemos a data de criação original e atualizamos a de modificação
    await DB.put('forum_top', { 
      ...old, 
      ...data, 
      created_at: old.created_at || agora // Garante que não perdemos a data original
    });
  } else {
    // Se for novo, as duas datas são iguais
    await DB.add('forum_top', { 
      ...data, 
      id: crypto.randomUUID(), 
      created_at: agora 
    });
  }

  document.getElementById('modal-forum').close();
  document.querySelector('main').innerHTML = await renderForum();
};

window.verTopico = async id => {
  const t = await DB.get('forum_top', id);
  const cats = await DB.getAll('forum_cat');
  const cat = cats.find(c => c.id === t.categoria_id);
  
  const dataCriacao = new Date(t.created_at).toLocaleString();
  const dataEdicao = new Date(t.updated_at).toLocaleString();
  const foiEditado = t.updated_at > t.created_at + 1000; // Se a diferença for > 1 seg

  const modal = $('#modal-forum');
  modal.innerHTML = `
    <div class="modal-head">
      <span>${t.titulo}</span>
      <button class="close-btn" onclick="document.getElementById('modal-forum').close()">×</button>
    </div>
    <div class="modal-body">
      <div class="muted" style="margin-bottom: 8px; font-size: 0.8rem">
        Em ${cat?.emoji} ${cat?.titulo}<br>
        Postado em: ${dataCriacao}
        ${foiEditado ? `<br><span style="color:var(--primary)">📝 Editado em: ${dataEdicao}</span>` : ''}
      </div>
      <div style="white-space:pre-wrap; line-height: 1.6; margin-bottom: 20px; border-top: 1px solid var(--border-subtle); padding-top: 10px">
        ${t.assunto || '<p class="muted">Sem conteúdo.</p>'}
      </div>
      <button class="btn btn-block" onclick="window.modalTopico('${t.id}')">✏️ Editar Publicação</button>
    </div>
  `;
  modal.showModal();
};

window.apagarTopico = async id => {
  if (!confirm('Desejas apagar este tópico permanentemente?')) return;
  await DB.delete('forum_top', id);
  document.getElementById('modal-forum').close();
  document.querySelector('main').innerHTML = await renderForum();
};

window.apagarCategoria = async id => {
  const tops = await DB.getAll('forum_top');
  const temTops = tops.some(t => t.categoria_id === id);
  
  if (temTops) return alert('Não podes apagar uma categoria que contém tópicos. Move ou apaga os tópicos primeiro.');
  if (!confirm('Desejas apagar esta categoria?')) return;
  
  await DB.delete('forum_cat', id);
  document.getElementById('modal-forum').close();
  document.querySelector('main').innerHTML = await renderForum();
};
