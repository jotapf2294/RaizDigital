import { DB } from '../db.js';
import { $, openModal, closeModal, compressImg } from '../utils.js';

// Estado global para pesquisa e categorias abertas
window._searchWiki = '';
window._categoriasAbertas = window._categoriasAbertas || { 'Hortícolas': true }; // Hortícolas aberta por defeito

export async function renderWiki() {
  const plantas = await DB.getAll('wiki');
  window._wikiData = plantas;

  return `
  <div class="card" style="background: transparent; box-shadow: none; padding: 0;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding: 0 4px">
      <h2 style="margin:0">📚 Biblioteca Botânica</h2>
      <button class="btn" style="border-radius:50%; width:40px; height:40px; padding:0; display:flex; align-items:center; justify-content:center; font-size:20px" onclick="window.modalPlanta()">＋</button>
    </div>

    <div style="position: sticky; top: 0; z-index: 10; background: var(--bg-body); padding: 8px 4px 16px 4px">
      <input type="search" id="search-wiki" placeholder="🔍 Procurar planta, tag ou praga..."
        oninput="window.filtrarWiki(this.value)"
        style="width:100%; padding:14px 16px; border-radius:14px; border:1px solid var(--border-subtle); background:var(--bg-card); color:var(--text-main); font-size:15px; box-shadow: var(--shadow-sm)">
    </div>

    <div id="wiki-list-container">
      ${organizarPorCategorias(plantas)}
    </div>
  </div>
  `;
}

function organizarPorCategorias(plantas) {
  if (!plantas.length) return '<p class="muted" style="text-align:center; padding:40px">Ainda não tens plantas registadas.</p>';

  // Definir categorias padrão caso a planta não tenha
  const grupos = plantas.reduce((acc, p) => {
    const cat = p.categoria || 'Geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const listaCategorias = ['Hortícolas', 'Leguminosas', 'Cereais', 'Aromáticas', 'Fruteiras', 'Geral'];
  // Adicionar categorias personalizadas que o utilizador possa ter criado
  Object.keys(grupos).forEach(c => { if(!listaCategorias.includes(c)) listaCategorias.push(c); });

  return listaCategorias.map(cat => {
    const plantasNoGrupo = grupos[cat];
    if (!plantasNoGrupo || plantasNoGrupo.length === 0) return '';

    const isAberta = window._categoriasAbertas[cat];

    return `
      <div style="margin-bottom: 12px;">
        <div onclick="window.toggleCategoria('${cat}')" style="display:flex; justify-content:space-between; align-items:center; padding: 12px 16px; background: var(--bg-card); border-radius: 12px; cursor:pointer; border: 1px solid var(--border-subtle)">
          <h3 style="margin:0; font-size:16px; display:flex; align-items:center; gap:8px">
            ${getIconeCategoria(cat)} ${cat} 
            <small class="muted" style="font-size:12px; font-weight:normal">(${plantasNoGrupo.length})</small>
          </h3>
          <span>${isAberta ? '▼' : '▶'}</span>
        </div>
        
        <div style="display: ${isAberta ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px 4px">
          ${listarCardsPlantas(plantasNoGrupo)}
        </div>
      </div>
    `;
  }).join('');
}

function getIconeCategoria(cat) {
  const icons = {
    'Hortícolas': '🥬',
    'Leguminosas': '🫛',
    'Cereais': '🌾',
    'Aromáticas': '🌿',
    'Fruteiras': '🍎',
    'Geral': '🌱'
  };
  return icons[cat] || '🍃';
}

function listarCardsPlantas(plantas) {
  return plantas.map(p => {
    const solIcon = p.sol === 'total' ? '☀️' : p.sol === 'meia' ? '⛅' : '☁️';
    // Lógica visual para dificuldade baseada na rega/notas
    const dificuldade = p.rega === 'diária' ? '🟠 Médio' : '🟢 Fácil';

    return `
    <div class="card" style="padding:0; overflow:hidden; display:flex; flex-direction:column; margin:0; border: 1px solid var(--border-subtle); position:relative" onclick="window.verPlanta('${p.id}')">
      <div style="width:100%; height:110px; background: ${p.foto ? `url(${p.foto})` : 'var(--bg-hover)'}; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center">
        ${!p.foto ? '<span style="font-size:30px">🌿</span>' : ''}
        <div style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.5); padding:2px 6px; border-radius:4px; font-size:10px; color:white">
          ${p.dias_colheita} dias
        </div>
      </div>
      
      <div style="padding:10px; flex:1">
        <strong style="font-size:14px; display:block; margin-bottom:2px">${p.nome}</strong>
        <span class="muted" style="font-size:10px; display:block; margin-bottom:8px">${p.nome_cientifico || '---'}</span>
        
        <div style="display:flex; flex-direction:column; gap:6px">
          <div style="display:flex; justify-content:space-between; align-items:center">
             <span style="font-size:11px">${solIcon} ${p.sol}</span>
             <span style="font-size:11px">💧 ${p.rega.charAt(0)}</span>
          </div>
          <div style="border-top:1px solid var(--border-subtle); pt:4px; font-size:10px; color:var(--text-muted)">
            ${dificuldade}
          </div>
        </div>
      </div>
    </div>
  `}).join('');
}

window.toggleCategoria = (cat) => {
  window._categoriasAbertas[cat] = !window._categoriasAbertas[cat];
  // Re-renderiza apenas a lista para manter a posição do scroll e pesquisa
  $('#wiki-list-container').innerHTML = organizarPorCategorias(window._wikiData);
};

window.filtrarWiki = (termo) => {
  const q = termo.toLowerCase().trim();
  const todas = window._wikiData || [];
  
  if (!q) {
    $('#wiki-list-container').innerHTML = organizarPorCategorias(todas);
    return;
  }

  const filtradas = todas.filter(p =>
    p.nome.toLowerCase().includes(q) ||
    p.categoria?.toLowerCase().includes(q) ||
    p.tags?.some(t => t.toLowerCase().includes(q))
  );

  // Se houver pesquisa, forçamos a abertura das categorias que têm resultados
  const gruposFiltrados = filtradas.reduce((acc, p) => {
    acc[p.categoria || 'Geral'] = true;
    return acc;
  }, {});
  Object.assign(window._categoriasAbertas, gruposFiltrados);

  $('#wiki-list-container').innerHTML = organizarPorCategorias(filtradas);
};

// --- CRUD E MODAIS (IGUAIS AO ANTERIOR COM CAMPO CATEGORIA) ---

window.verPlanta = async id => {
  const p = window._wikiData.find(x => x.id === id) || await DB.get('wiki', id);

  openModal(`
    <div class="modal-head">
    <span>📖 Ficha Técnica: ${p.nome}</span>
    <button class="close-btn" onclick="window.closeModal()">×</button>
    </div>
    <div class="modal-body" style="padding-top:0">
    ${p.foto ? `<img src="${p.foto}" style="width:calc(100% + 32px); margin: 0 -16px 16px -16px; max-height:200px; object-fit:cover">`: ''}

    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px">
    <div>
    <h2 style="margin:0">${p.nome}</h2>
    <small class="muted"><i>${p.nome_cientifico || 'Nome científico não registado'}</i></small>
    </div>
    <span class="badge" style="background:var(--p-500); color:white">${p.categoria}</span>
    </div>

    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-bottom:20px">
    <div style="background:var(--bg-hover); padding:8px; border-radius:8px; text-align:center">
    <small class="muted" style="display:block; font-size:10px; text-transform:uppercase">Rega</small>
    <strong style="font-size:12px">${p.rega}</strong>
    </div>
    <div style="background:var(--bg-hover); padding:8px; border-radius:8px; text-align:center">
    <small class="muted" style="display:block; font-size:10px; text-transform:uppercase">Luz</small>
    <strong style="font-size:12px">${p.sol}</strong>
    </div>
    <div style="background:var(--bg-hover); padding:8px; border-radius:8px; text-align:center">
    <small class="muted" style="display:block; font-size:10px; text-transform:uppercase">Ciclo</small>
    <strong style="font-size:12px">${p.dias_colheita}d</strong>
    </div>
    </div>

    <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px; padding:15px; margin-bottom:15px">
    <h4 style="margin:0 0 10px 0; font-size:14px; display:flex; align-items:center; gap:8px">📅 Planeamento de Cultivo</h4>
    <p style="margin:0; font-size:13px"><b>Época Ideal:</b> ${p.epoca_plantio || 'Não definida'}</p>
    <p style="margin:5px 0 0 0; font-size:13px"><b>Tags:</b> ${p.tags?.length ? p.tags.join(', '): '---'}</p>
    </div>

    <div style="margin-bottom:15px">
    <h4 style="margin:0 0 5px 0; font-size:14px; color:#ff4444">⚠️ Alerta de Pragas</h4>
    <p class="muted" style="font-size:13px; margin:0">${p.pragas_comuns || 'Sem pragas críticas registadas.'}</p>
    </div>

    <div style="margin-bottom:20px">
    <h4 style="margin:0 0 5px 0; font-size:14px; color:var(--p-500)">🌱 Guia de Sucesso</h4>
    <div style="background:var(--bg-body); padding:12px; border-radius:8px; font-size:13px; line-height:1.5">
    ${p.notas || 'Sem instruções adicionais.'}
    </div>
    </div>

    <button class="btn btn-block btn-secondary" onclick="window.modalPlanta('${p.id}')">✏️ Editar Informações</button>
    </div>
    `);
};

window.modalPlanta = async (id = null) => {
  const p = id ? (window._wikiData.find(x => x.id === id) || await DB.get('wiki', id)) : null;
  
  openModal(`
    <div class="modal-head">
      <span>${p ? '✏️ Editar Ficha' : '🌿 Nova Planta na Wiki'}</span>
      <button class="close-btn" onclick="window.closeModal()">×</button>
    </div>
    <form id="form-wiki" class="modal-body">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px">
        <div style="grid-column: span 2">
          <label>Nome Comum *</label>
          <input id="p_nome" value="${p?.nome || ''}" required placeholder="Ex: Tomate Cherry">
        </div>
        
        <div style="grid-column: span 2">
          <label>Nome Científico</label>
          <input id="p_cient" value="${p?.nome_cientifico || ''}" placeholder="Ex: Solanum lycopersicum">
        </div>

        <div>
          <label>Categoria</label>
          <select id="p_cat">
            <option ${p?.categoria === 'Hortícolas' ? 'selected' : ''}>Hortícolas</option>
            <option ${p?.categoria === 'Leguminosas' ? 'selected' : ''}>Leguminosas</option>
            <option ${p?.categoria === 'Cereais' ? 'selected' : ''}>Cereais</option>
            <option ${p?.categoria === 'Aromáticas' ? 'selected' : ''}>Aromáticas</option>
            <option ${p?.categoria === 'Fruteiras' ? 'selected' : ''}>Fruteiras</option>
            <option ${p?.categoria === 'Geral' ? 'selected' : ''}>Geral</option>
          </select>
        </div>

        <div>
          <label>Época Ideal</label>
          <input id="p_epoca" value="${p?.epoca_plantio || ''}" placeholder="Ex: Março-Maio">
        </div>

        <div>
          <label>Rega</label>
          <select id="p_rega">
            <option value="diária" ${p?.rega === 'diária' ? 'selected' : ''}>Diária</option>
            <option value="semanal" ${p?.rega === 'semanal' || !p ? 'selected' : ''}>Semanal</option>
            <option value="quinzenal" ${p?.rega === 'quinzenal' ? 'selected' : ''}>Quinzenal</option>
          </select>
        </div>

        <div>
          <label>Sol</label>
          <select id="p_sol">
            <option value="total" ${p?.sol === 'total' || !p ? 'selected' : ''}>Sol Total</option>
            <option value="meia" ${p?.sol === 'meia' ? 'selected' : ''}>Meia Sombra</option>
            <option value="sombra" ${p?.sol === 'sombra' ? 'selected' : ''}>Sombra</option>
          </select>
        </div>

        <div>
          <label>Dias p/ Colheita</label>
          <input id="p_dias" type="number" value="${p?.dias_colheita || 90}">
        </div>

        <div>
          <label>Tags (vírgulas)</label>
          <input id="p_tags" value="${p?.tags?.join(', ') || ''}" placeholder="verão, vaso">
        </div>
      </div>

      <label style="margin-top:12px; display:block">⚠️ Pragas e Doenças Comuns</label>
      <textarea id="p_pragas" rows="2" placeholder="Ex: Pulgão, Míldio...">${p?.pragas_comuns || ''}</textarea>

      <label>📝 Notas e Dicas de Cultivo</label>
      <textarea id="p_notas" rows="3" placeholder="PH do solo, adubação necessária...">${p?.notas || ''}</textarea>

      <label>Foto de Referência</label>
      <input id="p_foto" type="file" accept="image/*" capture="environment">
      
      <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px">
        <button class="btn btn-block" type="submit">💾 Guardar na Biblioteca</button>
        ${p ? `<button type="button" class="btn-danger btn-block" onclick="window.apagarPlanta('${p.id}')">🗑️ Apagar Planta</button>` : ''}
      </div>
    </form>
  `);

  $('#form-wiki').onsubmit = async (e) => {
    e.preventDefault();
    await window.salvarPlanta(p?.id || '');
  };
};

window.salvarPlanta = async (id = '') => {
  let foto = null;
  const fileInput = $('#p_foto');
  if (fileInput.files[0]) {
    try { foto = await compressImg(fileInput.files[0]); } catch(e) { console.error("Erro na foto:", e); }
  }

  const data = {
    id: id || crypto.randomUUID(),
    nome: $('#p_nome').value.trim(),
    nome_cientifico: $('#p_cient').value.trim(),
    categoria: $('#p_cat').value,
    epoca_plantio: $('#p_epoca').value.trim(),
    rega: $('#p_rega').value,
    sol: $('#p_sol').value,
    dias_colheita: +$('#p_dias').value || 90,
    tags: $('#p_tags').value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    pragas_comuns: $('#p_pragas').value.trim(),
    notas: $('#p_notas').value.trim(),
    updated_at: Date.now()
  };

  if (foto) data.foto = foto;
  else if (id) {
    const old = await DB.get('wiki', id);
    if (old?.foto) data.foto = old.foto;
  }

  await (id ? DB.put('wiki', data) : DB.add('wiki', data));
  window.closeModal();
  
  // Refresh da UI
  const plantas = await DB.getAll('wiki');
  window._wikiData = plantas;
  document.querySelector('main').innerHTML = await renderWiki();
};

window.apagarPlanta = async id => {
  if (!confirm('Eliminar?')) return;
  await DB.delete('wiki', id);
  window.closeModal();
  document.querySelector('main').innerHTML = await renderWiki();
};
  
