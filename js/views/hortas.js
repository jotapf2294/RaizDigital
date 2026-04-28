import { DB } from '../db.js';
import { $, openModal, closeModal, compressImg } from '../utils.js';

// --- ESTADOS GLOBAIS ---
window._zonasAbertas = window._zonasAbertas || {};
window._filtroHorta = window._filtroHorta || 'todos';

export async function renderHortas() {
  const [zonas, plantios, wiki] = await Promise.all([
    DB.getAll('zonas'),
    DB.getAll('plantios'),
    DB.getAll('wiki')
  ]);

  window._hortaData = { zonas, plantios, wiki };
  const filtro = window._filtroHorta;

  return `
  <div class="card" style="background: transparent; box-shadow: none; padding: 0;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding: 0 4px">
      <h2 style="margin:0; display:flex; align-items:center; gap:8px">🪴 As Minhas Hortas</h2>
      <button class="btn" style="border-radius:50%; width:40px; height:40px; padding:0; display:flex; align-items:center; justify-content:center; font-size:20px" onclick="window.modalZona()">＋</button>
    </div>

    <div style="display:flex; gap:10px; margin-bottom:20px; padding: 0 4px">
      <button class="badge" style="border:none; cursor:pointer; padding: 8px 16px; border-radius: 20px; transition: 0.3s; background:${filtro === 'todos' ? 'var(--p-500)' : 'var(--bg-card)'}; color:${filtro === 'todos' ? '#fff' : 'inherit'}" 
              onclick="window.setFiltroHorta('todos')">Todas</button>
      <button class="badge" style="border:none; cursor:pointer; padding: 8px 16px; border-radius: 20px; transition: 0.3s; background:${filtro === 'sede' ? '#2196F3' : 'var(--bg-card)'}; color:${filtro === 'sede' ? '#fff' : 'inherit'}" 
              onclick="window.setFiltroHorta('sede')">💧 Com Sede</button>
    </div>

    <div style="display: flex; flex-direction: column; gap: 16px">
      ${listarZonas(zonas, plantios, wiki)}
    </div>
  </div>
  `;
}

// --- FUNÇÕES DE INTERFACE ---

window.setFiltroHorta = (f) => {
  window._filtroHorta = f;
  navigate('hortas');
};

window.toggleZona = (id) => {
  window._zonasAbertas[id] = window._zonasAbertas[id] === false ? true : false;
  navigate('hortas');
};

function listarZonas(zonas, plantios, wiki) {
  if (!zonas.length) return '<div class="card muted" style="text-align:center; padding:40px">Ainda não criaste zonas de cultivo.</div>';

  return zonas.map(z => {
    const plantiosAtivos = plantios.filter(p => p.zona_id === z.id && p.status !== 'colhido');
    const comSede = plantiosAtivos.filter(p => checkPrecisaRegar(p, wiki.find(w => w.id === p.planta_id))).length;
    const isAberta = window._zonasAbertas[z.id] !== false;

    if (window._filtroHorta === 'sede' && comSede === 0) return '';

    return `
      <div class="card" style="margin-bottom:0; padding:16px; border-left: 6px solid ${z.cor || '#2d5016'};">
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer" onclick="window.toggleZona('${z.id}')">
          <div style="min-width:0">
            <h3 style="margin:0; font-size:17px">${z.nome}</h3>
            <span class="muted" style="font-size:12px">${z.tipo} ${z.area_m2 ? `• ${z.area_m2}m²` : ''}</span>
          </div>
          <div style="display:flex; gap:10px; align-items:center">
            ${comSede ? `<span style="color:#2196F3; font-weight:bold; font-size:14px">💧 ${comSede}</span>` : ''}
            <span class="badge" style="background: var(--bg-hover)">${plantiosAtivos.length}</span>
            <span style="transition: 0.3s; transform: ${isAberta ? 'rotate(180deg)' : 'rotate(0deg)'}">▼</span>
          </div>
        </div>

        <div style="display: ${isAberta ? 'block' : 'none'}; margin-top: 16px; border-top: 1px solid var(--border-subtle); padding-top: 16px">
          ${listarPlantios(z.id, plantiosAtivos, wiki)}
          <div style="margin-top:16px; display:grid; grid-template-columns: 1fr 1fr; gap:12px">
            <button class="btn btn-secondary" onclick="window.verZona('${z.id}')">⚙️ Detalhes</button>
            <button class="btn" onclick="window.modalPlantio('${z.id}')">🌱 + Plantio</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function listarPlantios(zonaId, plantios, wiki) {
  let lista = plantios;
  if (window._filtroHorta === 'sede') {
    lista = plantios.filter(p => checkPrecisaRegar(p, wiki.find(w => w.id === p.planta_id)));
  }

  if (!lista.length) return '<p class="muted" style="font-size:13px; text-align:center">Sem plantas ativas aqui.</p>';

  return `
    <div style="display: flex; flex-direction: column; gap: 10px">
      ${lista.map(p => {
        const pl = wiki.find(w => w.id === p.planta_id);
        const dias = Math.floor((Date.now() - p.data_plantio) / 86400000);
        const diasAlvo = pl?.dias_colheita || 90;
        const progresso = Math.min(Math.round((dias / diasAlvo) * 100), 100);
        const precisaRegar = checkPrecisaRegar(p, pl);

        return `
          <div class="list-item" style="padding:12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius:12px; display:block" onclick="event.stopPropagation(); window.verPlantio('${p.id}')">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px">
              <div style="min-width:0">
                <div style="font-weight:bold; font-size:14px; display:flex; align-items:center; gap:6px">
                  ${pl?.nome || '???'} ${precisaRegar ? '💧' : ''}
                </div>
                <div class="muted" style="font-size:11px">${dias} dias</div>
              </div>
              <span style="font-size:11px; font-weight:bold; color: ${progresso >= 100 ? '#4CAF50' : 'var(--p-500)'}">${progresso}%</span>
            </div>
            <div style="width:100%; height:6px; background:var(--bg-hover); border-radius:10px; overflow:hidden">
              <div style="width:${progresso}%; height:100%; background:${progresso >= 100 ? '#4CAF50' : 'var(--p-500)'}; transition: width 1s"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function checkPrecisaRegar(plantio, planta) {
  if (!planta || plantio.status === 'colhido') return false;
  const ultimaRega = plantio.ultima_rega || plantio.data_plantio;
  const diasSemRega = Math.floor((Date.now() - ultimaRega) / 86400000);
  if (planta.rega === 'diária' && diasSemRega >= 1) return true;
  if (planta.rega === 'semanal' && diasSemRega >= 7) return true;
  if (planta.rega === 'quinzenal' && diasSemRega >= 14) return true;
  return false;
}

// --- MODAIS E CRUD ZONAS ---

window.modalZona = (zona = null) => {
  const modal = openModal(`
    <div class="modal-head">
      <span>${zona ? '✏️ Editar Zona' : '➕ Nova Zona'}</span>
      <button class="close-btn" onclick="window.closeModal()">×</button>
    </div>
    <form id="form-zona" class="modal-body">
      <label>Nome *</label><input id="z_nome" value="${zona?.nome || ''}" required>
      <label>Tipo</label><select id="z_tipo">
        <option ${zona?.tipo === 'horta' ? 'selected' : ''}>horta</option>
        <option ${zona?.tipo === 'estufa' ? 'selected' : ''}>estufa</option>
        <option ${zona?.tipo === 'vasos' ? 'selected' : ''}>vasos</option>
        <option ${zona?.tipo === 'germinação' ? 'selected' : ''}>germinação</option>
      </select>
      <label>Área m²</label><input id="z_area" type="number" min="0" step="0.1" value="${zona?.area_m2 || ''}">
      <label>Cor Identificadora</label><input id="z_cor" type="color" value="${zona?.cor || '#2d5016'}">
      <label>Foto/Mapa</label><input id="z_foto" type="file" accept="image/*" capture="environment">
      ${zona?.foto_mapa ? `<img src="${zona.foto_mapa}" style="width:100%;border-radius:6px;margin-top:8px">` : ''}
      <label>Notas</label><textarea id="z_notas">${zona?.notas || ''}</textarea>
      <div class="flex" style="gap:8px;margin-top:12px">
        <button class="btn btn-block" type="submit">Guardar Zona</button>
        ${zona ? `<button class="btn-danger" type="button" onclick="window.apagarZona('${zona.id}')">Eliminar</button>` : ''}
      </div>
    </form>
  `);

  $('#form-zona').onsubmit = async (e) => {
    e.preventDefault();
    await window.salvarZona(zona?.id || '');
  };
};

window.salvarZona = async (id = '') => {
  const nome = $('#z_nome').value.trim();
  if (!nome) return alert('Nome obrigatório');
  let foto = null;
  try { if ($('#z_foto').files[0]) foto = await compressImg($('#z_foto').files[0]); } catch(e) {}

  const data = {
    id: id || crypto.randomUUID(),
    nome: nome,
    tipo: $('#z_tipo').value,
    area_m2: parseFloat($('#z_area').value) || 0,
    cor: $('#z_cor').value,
    notas: $('#z_notas').value
  };

  if (foto) data.foto_mapa = foto;
  else if (id) {
    const old = await DB.get('zonas', id);
    if (old?.foto_mapa) data.foto_mapa = old.foto_mapa;
    data.created_at = old.created_at;
  } else { data.created_at = Date.now(); }

  id ? await DB.put('zonas', data) : await DB.add('zonas', data);
  closeModal();
  navigate('hortas');
};

window.apagarZona = async id => {
  if (!confirm('Deseja apagar esta zona e todos os seus plantios?')) return;
  const plantios = await DB.getAll('plantios');
  await Promise.all(plantios.filter(p => p.zona_id === id).map(p => DB.delete('plantios', p.id)));
  await DB.delete('zonas', id);
  closeModal();
  navigate('hortas');
};

// --- GESTÃO DE PLANTIOS ---

window.verZona = async id => {
  const zona = await DB.get('zonas', id);
  const plantios = (await DB.getAll('plantios')).filter(p => p.zona_id === id);
  const wiki = await DB.getAll('wiki');
  const plantiosAtivos = plantios.filter(p => p.status !== 'colhido');

  openModal(`
    <div class="modal-head">
      <span>${zona.nome}</span>
      <button class="close-btn" onclick="window.closeModal()">×</button>
    </div>
    <div class="modal-body">
      ${zona.foto_mapa ? `<img src="${zona.foto_mapa}" style="width:100%;border-radius:8px;margin-bottom:12px">` : ''}
      <p class="muted">${zona.tipo} • ${zona.area_m2}m²</p>
      
      <h3 style="margin-top:20px">Plantios Ativos (${plantiosAtivos.length})</h3>
      <div style="display:flex; flex-direction:column; gap:8px">
        ${plantiosAtivos.length ? plantiosAtivos.map(p => {
          const pl = wiki.find(w => w.id === p.planta_id);
          const precisaRegar = checkPrecisaRegar(p, pl);
          return `
            <div class="list-item" onclick="window.verPlantio('${p.id}')">
              <div style="flex:1">
                <strong>${pl?.nome || '?'}</strong> ${precisaRegar ? '💧' : ''}
                <div class="muted" style="font-size:12px">${p.qtd} un • ${p.status}</div>
              </div>
              <span class="badge">></span>
            </div>`;
        }).join('') : '<p class="muted">Nenhum plantio ativo.</p>'}
      </div>

      <div style="margin-top:24px; display:flex; flex-direction:column; gap:10px">
        <button class="btn btn-block" onclick="window.modalPlantio('${id}')">🌱 Novo Plantio</button>
        <button class="btn btn-secondary btn-block" onclick="window.registoRega('${id}')">💧 Regar Toda a Zona</button>
        <button class="btn btn-secondary btn-block" onclick="window.modalZona(window._hortaData.zonas.find(z=>z.id==='${id}'))">✏️ Editar Configuração</button>
      </div>
    </div>
  `);
};

window.modalPlantio = async (zona_id, plantio = null) => {
  const wiki = await DB.getAll('wiki');
  if (!wiki.length) return alert('Adicione plantas à Wiki primeiro.');
  const zona = await DB.get('zonas', zona_id);

  openModal(`
    <div class="modal-head">
      <span>${plantio ? '✏️ Editar' : '🌱 Novo Plantio'}</span>
      <button class="close-btn" onclick="window.verZona('${zona_id}')">×</button>
    </div>
    <form id="form-plantio" class="modal-body">
      <label>Planta</label>
      <select id="pl_planta">${wiki.map(w => `<option value="${w.id}" ${plantio?.planta_id === w.id ? 'selected' : ''}>${w.nome}</option>`).join('')}</select>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px">
        <div><label>Data</label><input id="pl_data" type="date" value="${plantio ? new Date(plantio.data_plantio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" required></div>
        <div><label>Qtd</label><input id="pl_qtd" type="number" value="${plantio?.qtd || 1}"></div>
      </div>

      <label>Estado</label>
      <select id="pl_status">
        <option ${plantio?.status === 'semente' ? 'selected' : ''}>semente</option>
        <option ${plantio?.status === 'ativo' || !plantio ? 'selected' : ''}>ativo</option>
        <option ${plantio?.status === 'producao' ? 'selected' : ''}>producao</option>
        <option ${plantio?.status === 'colhido' ? 'selected' : ''}>colhido</option>
      </select>

      <label>Foto do Progresso</label><input id="pl_foto" type="file" accept="image/*" capture="environment">
      ${plantio?.foto ? `<img src="${plantio.foto}" style="width:100%;border-radius:6px;margin-top:8px">` : ''}
      <label>Notas</label><textarea id="pl_notas">${plantio?.notas || ''}</textarea>

      <div class="flex" style="gap:8px;margin-top:12px">
        <button class="btn btn-block" type="submit">Guardar</button>
        ${plantio ? `<button class="btn-danger" type="button" onclick="window.apagarPlantio('${plantio.id}','${zona_id}')">Apagar</button>` : ''}
      </div>
    </form>
  `);

  $('#form-plantio').onsubmit = async (e) => {
    e.preventDefault();
    await window.salvarPlantio(zona_id, plantio?.id || '');
  };
};

window.salvarPlantio = async (zona_id, id = '') => {
  const planta = await DB.get('wiki', $('#pl_planta').value);
  let foto = null;
  try { if ($('#pl_foto').files[0]) foto = await compressImg($('#pl_foto').files[0]); } catch(e) {}

  const data = {
    id: id || crypto.randomUUID(),
    zona_id,
    planta_id: planta.id,
    data_plantio: new Date($('#pl_data').value).getTime(),
    qtd: +$('#pl_qtd').value || 1,
    status: $('#pl_status').value,
    notas: $('#pl_notas').value,
    ultima_rega: Date.now()
  };

  if (foto) data.foto = foto;
  else if (id) {
    const old = await DB.get('plantios', id);
    if (old?.foto) data.foto = old.foto;
    data.ultima_rega = old?.ultima_rega || Date.now();
  }

  id ? await DB.put('plantios', data) : await DB.add('plantios', data);
  
  window._zonasAbertas[zona_id] = true;
  await navigate('hortas'); 
  window.verZona(zona_id); 
};

window.verPlantio = async id => {
  const p = await DB.get('plantios', id);
  const pl = await DB.get('wiki', p.planta_id);
  const zona = await DB.get('zonas', p.zona_id);
  const dias = Math.floor((Date.now() - p.data_plantio) / 86400000);
  const ultimaRega = p.ultima_rega ? Math.floor((Date.now() - p.ultima_rega) / 86400000) : dias;

  openModal(`
    <div class="modal-head">
      <span>${pl?.nome}</span>
      <button class="close-btn" onclick="window.verZona('${p.zona_id}')">×</button>
    </div>
    <div class="modal-body">
      ${p.foto ? `<img src="${p.foto}" style="width:100%;border-radius:8px;margin-bottom:12px">` : ''}
      <div class="card" style="margin-bottom:16px; background:var(--bg-hover)">
        <p><b>Zona:</b> ${zona?.nome}</p>
        <p><b>Idade:</b> ${dias} dias</p>
        <p><b>Última Rega:</b> há ${ultimaRega} dias</p>
        <p><b>Estado:</b> <span class="badge">${p.status}</span></p>
      </div>
      ${p.notas ? `<p style="margin-bottom:16px"><i>"${p.notas}"</i></p>` : ''}
      
      <div style="display:flex; flex-direction:column; gap:8px">
        <button class="btn btn-block" onclick="window.marcarRegado('${p.id}')">💧 Regar Agora</button>
        <button class="btn btn-secondary btn-block" onclick="window.marcarColhido('${p.id}')">🧺 Registar Colheita</button>
        <button class="btn btn-secondary btn-block" onclick="window.modalPlantio('${p.zona_id}', window._hortaData.plantios.find(x=>x.id==='${p.id}'))">✏️ Editar</button>
      </div>
    </div>
  `);
};

window.marcarRegado = async (plantioId) => {
  const p = await DB.get('plantios', plantioId);
  p.ultima_rega = Date.now();
  await DB.put('plantios', p);
  await navigate('hortas');
  window.verPlantio(plantioId);
  if ('vibrate' in navigator) navigator.vibrate(50);
};

window.marcarColhido = async plantio_id => {
  const qtd = prompt('Quantidade colhida (kg/un):', '1');
  if (!qtd) return;
  const plantio = await DB.get('plantios', plantio_id);
  const planta = await DB.get('wiki', plantio.planta_id);
  
  plantio.status = 'colhido';
  plantio.data_colheita = Date.now();
  plantio.qtd_colhida = parseFloat(qtd);
  await DB.put('plantios', plantio);
  
  await DB.add('diario', {
    id: crypto.randomUUID(),
    tipo: 'Colheita',
    texto: `Colheita de ${qtd} de ${planta.nome} em ${new Date().toLocaleDateString()}`,
    data: Date.now()
  });

  await navigate('hortas');
  window.verZona(plantio.zona_id);
};

window.registoRega = async zona_id => {
  const plantios = (await DB.getAll('plantios')).filter(p => p.zona_id === zona_id && p.status !== 'colhido');
  if (!plantios.length) return alert('Sem plantios ativos.');
  
  const agora = Date.now();
  for (let p of plantios) {
    p.ultima_rega = agora;
    await DB.put('plantios', p);
  }
  
  await DB.add('diario', {
    id: crypto.randomUUID(),
    tipo: 'Rega',
    texto: `Rega geral na zona: ${(await DB.get('zonas', zona_id)).nome}`,
    data: agora
  });
  
  alert('💧 Rega registada!');
  await navigate('hortas');
  window.verZona(zona_id);
};

window.apagarPlantio = async (id, zona_id) => {
  if (!confirm('Eliminar este plantio?')) return;
  await DB.delete('plantios', id);
  await navigate('hortas');
  window.verZona(zona_id);
};
