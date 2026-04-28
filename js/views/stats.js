import { DB } from '../db.js';
import { $ } from '../utils.js';

export async function renderStats() {
  const [plantios, wiki] = await Promise.all([DB.getAll('plantios'), DB.getAll('wiki')]);
  
  const colhidos = plantios.filter(p => p.status === 'colhido');
  const totalColhido = colhidos.reduce((a, p) => a + (p.qtd_colhida || 0), 0);
  const emCrescimento = plantios.filter(p => p.status === 'ativo').length;
  const variedades = [...new Set(plantios.map(p => wiki.find(w => w.id === p.planta_id)?.nome).filter(Boolean))].length;

  // 1. Lógica para Colheitas Mensais (Ordenada)
  const colheitasPorMes = {};
  colhidos.sort((a, b) => new Date(a.data_colheita) - new Date(b.data_colheita)).forEach(p => {
    if (!p.data_colheita) return;
    const data = new Date(p.data_colheita);
    const mesKey = data.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
    colheitasPorMes[mesKey] = (colheitasPorMes[mesKey] || 0) + (p.qtd_colhida || 0);
  });

  // 2. Lógica para Ranking de Plantas (Top Produtivas)
  const prodPorPlanta = {};
  colhidos.forEach(p => {
    const nome = wiki.find(w => w.id === p.planta_id)?.nome || 'Outros';
    prodPorPlanta[nome] = (prodPorPlanta[nome] || 0) + (p.qtd_colhida || 0);
  });

  const html = `
    <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
      <div class="card" style="text-align:center; padding: 15px 5px;">
        <div style="font-size:1.5rem; font-weight:700; color:var(--primary)">${totalColhido}</div>
        <div class="muted" style="font-size:0.7rem; text-transform: uppercase;">Colhidos</div>
      </div>
      <div class="card" style="text-align:center; padding: 15px 5px;">
        <div style="font-size:1.5rem; font-weight:700; color:#e67e22">${emCrescimento}</div>
        <div class="muted" style="font-size:0.7rem; text-transform: uppercase;">Ativos</div>
      </div>
      <div class="card" style="text-align:center; padding: 15px 5px;">
        <div style="font-size:1.5rem; font-weight:700; color:#3498db">${variedades}</div>
        <div class="muted" style="font-size:0.7rem; text-transform: uppercase;">Espécies</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 16px;">
      <h3 style="margin-bottom:12px">📈 Histórico de Colheitas</h3>
      ${Object.keys(colheitasPorMes).length 
        ? '<div style="height:200px"><canvas id="chart-mensal"></canvas></div>' 
        : '<p class="muted">Sem dados mensais.</p>'}
    </div>

    <div class="card">
      <h3 style="margin-bottom:12px">🏆 Top Produtividade</h3>
      ${Object.keys(prodPorPlanta).length 
        ? '<div style="height:250px"><canvas id="chart-prod"></canvas></div>' 
        : '<p class="muted">Sem dados de produção.</p>'}
    </div>
  `;

  // Inicialização dos Gráficos
  setTimeout(() => {
    if (!window.Chart) return;

    // Gráfico Mensal (Barras)
    const ctxMensal = $('#chart-mensal');
    if (ctxMensal) {
      new Chart(ctxMensal, {
        type: 'bar',
        data: {
          labels: Object.keys(colheitasPorMes),
          datasets: [{
            label: 'Qtd',
            data: Object.values(colheitasPorMes),
            backgroundColor: '#1a7f37',
            borderRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
        }
      });
    }

    // Gráfico de Produtividade (Doughnut)
    const ctxProd = $('#chart-prod');
    if (ctxProd) {
      new Chart(ctxProd, {
        type: 'doughnut',
        data: {
          labels: Object.keys(prodPorPlanta),
          datasets: [{
            data: Object.values(prodPorPlanta),
            backgroundColor: ['#1a7f37', '#2ecc71', '#27ae60', '#a2d149', '#5eba7d'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } 
          },
          cutout: '70%'
        }
      });
    }
  }, 50);

  return html;
}
