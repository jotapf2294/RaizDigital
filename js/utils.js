export const $ = sel => document.querySelector(sel);
export const $$ = sel => document.querySelectorAll(sel);

export const fmtDate = ts => new Date(ts).toLocaleDateString('pt-PT');

let currentModal = null;

// Agora aceita HTML direto em vez de ID
export function openModal(html) {
  // Fecha modal anterior se existir
  if (currentModal) {
    currentModal.close();
    currentModal.remove();
  }

  const modal = document.createElement('dialog');
  modal.innerHTML = html;
  document.body.appendChild(modal);
  modal.showModal();

  // Guarda referência pra fechar depois
  currentModal = modal;

  // Remove do DOM quando fechar
  modal.addEventListener('close', () => {
    modal.remove();
    if (currentModal === modal) currentModal = null;
  });

  return modal;
}

export function closeModal() {
  if (currentModal) {
    currentModal.close();
  }
}

export async function compressImg(file, maxW = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => img.src = e.target.result;
    reader.onerror = reject;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    reader.readAsDataURL(file);
  });
}

export function faseLua(timestamp = Date.now()) {
  const fases = ['Nova','Crescente','Quarto Crescente','Gibosa Crescente','Cheia','Gibosa Minguante','Quarto Minguante','Minguante'];
  const emojis = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  const lp = 2551443;
  const newMoon = new Date(1970, 0, 7, 20, 35, 0).getTime() / 1000;
  const phase = ((timestamp / 1000 - newMoon) % lp) / lp;
  const idx = Math.floor(phase * 8) % 8;
  return { nome: fases[idx], emoji: emojis[idx], idx };
}
