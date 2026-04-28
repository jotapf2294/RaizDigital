import { DB } from '../db.js';

export async function renderDefs() {
  const lb = localStorage.getItem('lastBackup');
  const dias = lb? Math.floor((Date.now() - lb) / 86400000) : 999;
  const [z, w, p, t] = await Promise.all([
    DB.getAll('zonas'),
    DB.getAll('wiki'),
    DB.getAll('plantios'),
    DB.getAll('forum_top')
  ]);
  return `
  <div class="card">
    <h2>⚙️ Definições</h2>
    <div class="form-group">
      <label>Tema</label>
      <button class="btn btn-block" onclick="toggleTheme()">🌓 Alternar Light/Dark</button>
    </div>
    <div class="form-group">
      <label>Estatísticas</label>
      <p class="muted">🪴 ${z.length} zonas • 📖 ${w.length} plantas • 🌱 ${p.length} plantios • 💬 ${t.length} tópicos</p>
    </div>
    <div class="form-group">
      <label>Backup</label>
      ${dias > 30? `<div class="alert">⚠️ Último backup há ${dias} dias!</div>` : ''}
      <button class="btn btn-block" onclick="exportData()">📥 Exportar Dados</button>
      <button class="btn btn-block" onclick="document.getElementById('imp').click()">📤 Importar Dados</button>
      <input type="file" id="imp" accept=".json" hidden onchange="importData(this)">
    </div>
    <div class="form-group">
      <label>Zona Perigosa</label>
      <button class="btn btn-danger btn-block" onclick="clearAllData()">🗑️ Apagar Todos os Dados</button>
    </div>
  </div>
  `;
}

window.exportData = async () => {
  const data = {
    zonas: await DB.getAll('zonas'),
    wiki: await DB.getAll('wiki'),
    plantios: await DB.getAll('plantios'),
    forum_cat: await DB.getAll('forum_cat'),
    forum_top: await DB.getAll('forum_top'),
    diario: await DB.getAll('diario')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `raizdigital-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  localStorage.setItem('lastBackup', Date.now());
  // Pequeno ajuste para evitar erro se a aba não estiver no DOM
  const tab = document.querySelector('.tab[data-view="defs"]');
  if (tab) tab.click();
};

window.importData = async input => {
  try {
    if (!input.files[0]) return;
    const text = await input.files[0].text();
    const data = JSON.parse(text);
    if (!confirm('Isto vai substituir dados existentes. Continuar?')) return;
    for (let store in data) {
      for (let item of data[store]) await DB.put(store, item);
    }
    alert('Importado com sucesso!');
    location.reload();
  } catch(e) {
    alert('Erro ao importar: ' + e.message);
  }
};

window.clearAllData = async () => {
  if (!confirm('⚠️ APAGAR TUDO? Esta ação é irreversível!')) return;

  try {
    const stores = ['zonas', 'wiki', 'plantios', 'forum_cat', 'forum_top', 'diario'];
    
    // Em vez de apagar a DB toda, vamos apagar os itens de cada tabela
    for (const store of stores) {
      const items = await DB.getAll(store);
      // Cria um array de promessas para apagar tudo em paralelo nessa tabela
      await Promise.all(items.map(item => DB.delete(store, item.id)));
    }

    localStorage.clear();
    alert('Memória limpa com sucesso!');
    location.reload();
  } catch (err) {
    console.error(err);
    alert('Erro ao limpar dados: ' + err.message);
  }
};
