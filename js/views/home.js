import { DB } from '../db.js';
import { faseLua } from '../utils.js';

export async function renderHome() {
  try {
    const [plantios, wiki, diario, zonas] = await Promise.all([
      DB.getAll('plantios').catch(() => []),
      DB.getAll('wiki').catch(() => []),
      DB.getAll('diario').catch(() => []),
      DB.getAll('zonas').catch(() => [])
    ]);

    const hoje = Date.now();
    const alertas = [];
    const plantasRegar = [];

    if (plantios.length) {
      plantios.forEach(p => {
        if (p.status === 'colhido') return;
        const planta = wiki.find(w => w.id === p.planta_id);
        const zona = zonas.find(z => z.id === p.zona_id);
        const zonaNome = zona?.nome || 'zona';

        if (!planta?.dias_colheita) return;

        const colheita = p.data_plantio + planta.dias_colheita * 86400000;
        const diasColheita = Math.floor((colheita - hoje) / 86400000);
        if (diasColheita <= 7 && diasColheita >= 0) {
          alertas.push(`🧺 Colher: ${planta.nome} em ${zonaNome} - ${diasColheita === 0? 'HOJE' : `em ${diasColheita}d`}`);
        }

        const diasRega = planta.rega === 'diária'? 1 : planta.rega === 'semanal'? 7 : 14;
        const proxRega = (p.ultima_rega || p.data_plantio) + diasRega * 86400000;
        if (proxRega <= hoje) {
          plantasRegar.push(`${planta.nome} em ${zonaNome}`);
        }
      });
    }

    if (plantasRegar.length) {
      alertas.unshift(`💧 Regar hoje: ${plantasRegar.slice(0, 3).join(', ')}${plantasRegar.length > 3? ` +${plantasRegar.length-3}` : ''}`);
    }

    const lua = faseLua(hoje);
    const dicaLua = lua.idx <= 1? 'Semear raízes: cenoura, batata' :
      lua.idx >= 3 && lua.idx <= 5? 'Colher frutos: tomate, pimento' :
      'Manutenção: podar, adubar';

    const mes = new Date().toLocaleString('pt-PT', { month: 'long' });
    const sementeira = wiki.filter(p => p.epoca_plantio?.toLowerCase().includes(mes));
    const ultimasAtiv = diario.sort((a, b) => b.data - a.data).slice(0, 3);

    return `
    <div class="card">
    <h2>☀️ Hoje ${new Date().toLocaleDateString('pt-PT')}</h2>
    ${alertas.length? alertas.map(a => `<div class="alert">${a}</div>`).join('') : '<p class="muted">✅ Tudo em dia! Sem alertas</p>'}
    </div>

    <div class="card">
    <h2>🌙 Calendário Lunar</h2>
    <p style="font-size:2.5rem;text-align:center;margin:8px 0">${lua.emoji}</p>
    <p style="text-align:center;font-weight:600">${lua.nome}</p>
    <p class="muted" style="text-align:center;margin-top:8px">${dicaLua}</p>
    </div>

    <div class="card">
    <h2>🌱 Sementeira de ${mes}</h2>
    <p class="muted">${sementeira.length? sementeira.map(p => p.nome).join(', ') : 'Nenhuma planta na época. Adiciona na Wiki!'}</p>
    </div>

    <div class="card">
    <h2>📝 Últimas Atividades</h2>
    ${ultimasAtiv.length? ultimasAtiv.map(a => `
      <div class="list-item">
      <span>${a.tipo}: ${a.texto}</span>
      <span class="badge">${new Date(a.data).toLocaleDateString('pt-PT')}</span>
      </div>
    `).join('') : '<p class="muted">Sem atividades registadas</p>'}
    </div>
    `;

  } catch (err) {
    console.error('Erro no renderHome:', err);
    return `
    <div class="card">
      <h2>☀️ Hoje ${new Date().toLocaleDateString('pt-PT')}</h2>
      <p class="muted">A carregar dados...</p>
      <p style="color:#d73a49;font-size:12px">Erro: ${err.message}</p>
    </div>
    `;
  }
}
