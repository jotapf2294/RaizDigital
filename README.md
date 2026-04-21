# 🌿 JotaGarden PRO v2

O **JotaGarden PRO** é uma Progressive Web App (PWA) de alto desempenho, desenhada para ser o cérebro digital da tua horta. Focada na simplicidade e eficiência, a aplicação permite gerir plantações, consultar uma Wiki personalizada de espécies e manter um diário técnico, tudo com funcionamento **100% offline**.

![License](https://img.shields.io/badge/license-MIT-green)
![PWA](https://img.shields.io/badge/PWA-Ready-orange)
![Version](https://img.shields.io/badge/version-2.0.0-blue)

## 🚀 Funcionalidades Principais

### 🏠 Painel de Controlo (Dashboard)
- **Fase Lunar Dinâmica:** Cálculo preciso da fase da lua com recomendações agrícolas (Semear, Colher, Podar).
- **Ações Rápidas:** Atalhos para registar novas plantas ou notas sem sair do ecrã inicial.
- **Dica do Dia:** Exibição inteligente de notas do teu "Livro", com sistema de "Ver mais" para textos longos.
- **Próximas Colheitas:** Lista automática das plantas que estão próximas da data de colheita baseada nos dados da Wiki.

### 🌱 Gestão da Horta
- **Registo por Zonas:** Organiza as tuas plantas por localização (Estufa, Canteiro A, etc.).
- **Botão de Rega (💧):** Monitorização em tempo real de há quantas horas cada planta foi regada.
- **Botão de Colheita (✅):** Fluxo de trabalho que move automaticamente a planta para o histórico após a colheita.

### 📖 Wiki & Livro de Notas
- **Base de Dados de Espécies:** Regista tempos de maturação, temperaturas ideais e notas técnicas.
- **Diário de Bordo:** Espaço para dicas, truques e gestão de pragas.

### ⚙️ Configurações & Dados
- **Estatísticas:** Contador total de colheitas e zonas ativas.
- **Dark Mode:** Interface adaptável para uso noturno ou sob luz solar intensa.
- **Backup Total:** Exportação e importação de dados em formato JSON para garantir que nunca perdes o teu progresso.

## 🛠️ Stack Tecnológica

- **Frontend:** HTML5, CSS3 (Flexbox & Grid), JavaScript (Vanilla ES6).
- **Base de Dados Local:** [Dexie.js](https://dexie.org/) (Wrapper robusto para IndexedDB).
- **Offline:** Service Workers e Manifest JSON para suporte PWA total.
- **Ícones:** Emojis nativos para máxima compatibilidade e leveza
