import { DB } from './db.js';

export async function pedirPermissaoNotificacao() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export async function verificarNotificacoes() {
  if (Notification.permission!== 'granted') return;

  const [plantios, wiki, zonas] = await Promise.all([
    DB.getAll('plantios'),
    DB.getAll('wiki'),
    DB.getAll('zonas')
  ]);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (const p of plantios.filter(p => p.status!== 'colhido')) {
    const planta = wiki.find(w => w.id === p.planta_id);
    const zona = zonas.find(z => z.id === p.zona_id);
    if (!planta ||!zona) continue;

    // COLHEITA
    const dataColheita = new Date(p.data_plantio);
    dataColheita.setDate(dataColheita.getDate() + (planta.dias_colheita || 90));
    const diasParaColheita = Math.ceil((dataColheita - hoje) / 86400000);

    if (diasParaColheita === 0) {
      notificar(`🧺 ${planta.nome} pronto!`, `${p.qtd} un em ${zona.nome}`, `colheita_${p.id}`);
    } else if (diasParaColheita === 3) {
      notificar(`⏰ ${planta.nome} quase pronto`, `Faltam 3 dias • ${zona.nome}`, `colheita3_${p.id}`);
    }

    // REGA
    const ultimaRega = new Date(p.ultima_rega || p.data_plantio);
    const diasSemRega = Math.floor((hoje - ultimaRega) / 86400000);

    let precisaRegar = false;
    if (planta.rega === 'diária' && diasSemRega >= 1) precisaRegar = true;
    if (planta.rega === 'semanal' && diasSemRega >= 7) precisaRegar = true;
    if (planta.rega === 'quinzenal' && diasSemRega >= 14) precisaRegar = true;

    if (precisaRegar) {
      notificar(`💧 Regar ${zona.nome}`, `${planta.nome} há ${diasSemRega} dias sem água`, `rega_${p.id}`);
    }
  }
}

function notificar(titulo, corpo, tag) {
  const key = `notif_${tag}_${new Date().toDateString()}`;
  if (localStorage.getItem(key)) return;

  new Notification(titulo, {
    body: corpo,
    icon: '/icon-192.png',
    tag: tag
  });

  localStorage.setItem(key, '1');
}

export function agendarVerificacaoDiaria() {
  const agora = new Date();
  const proxima9h = new Date();
  proxima9h.setHours(9, 0, 0, 0);
  if (agora > proxima9h) proxima9h.setDate(proxima9h.getDate() + 1);

  setTimeout(() => {
    verificarNotificacoes();
    setInterval(verificarNotificacoes, 86400000);
  }, proxima9h - agora);
}
