# ⚽ JUDEGE APP

> Gerencie peladas com seus amigos — sorteio de coletes, timer, placar e fila de times, tudo no celular como um app nativo.

---

## 📱 Acesso

🔗 **[judgeapp.netlify.app](https://appjudge.netlify.app/)**

Funciona direto no navegador. Para instalar como app nativo:

- **iPhone (Safari):** botão compartilhar `⬆` → *Adicionar à Tela de Início*
- **Android (Chrome):** menu `⋮` → *Adicionar à tela inicial*

---

## 🎯 O que é

O **Judge App** nasceu de uma necessidade real: gerenciar partidas de futebol de quadra entre amigos de forma simples, rápida e justa. Sem papel, sem confusão, sem discussão sobre quem entra a seguir.

Com ele você:
- Define as regras antes de começar (tempo e gols)
- Sorteia qual colete cada jogador usa
- Sorteia a ordem da fila de times
- Controla o timer e o placar durante a partida
- Gerencia automaticamente a fila com as regras da pelada

---

## 🖥️ Telas

### Tela 1 — Definir Regras
Configure os critérios de encerramento de cada partida:
- **Duração:** de 1 a 30 minutos (padrão: 8 min)
- **Gols:** de 1 a 10 gols (padrão: 2 gols)

O jogo encerra quando o **primeiro critério** for atingido.

### Tela 2 — Times & Fila
- Selecione quais times (cores de colete) participarão
- **Sortear Coletes:** sorteio individual de colete por jogador — máximo 5 por cor
- **Sortear Fila:** define a ordem dos times aleatoriamente

Times disponíveis: Azul, Vermelho, Verde, Amarelo, Preto, Branco, Cinza e Sem Colete.

### Tela 3 — Partida
- Cronômetro com anel de progresso visual
- Placar com botões `+` e `−` por time
- Camisas coloridas identificando cada time
- Fila e próximo jogo visíveis durante a partida
- Botões de pausar e encerrar manualmente

### Tela 4 — Resultado
- Exibe o vencedor, placar final e motivo do encerramento
- Indica o próximo jogo automaticamente
- Gerencia a fila conforme as regras

---

## 📋 Regras da Fila

| Situação | O que acontece |
|---|---|
| Time vence | Permanece na quadra, perdedor vai ao final da fila |
| Empate | Ambos saem, sorteio define quem entra antes |
| 3 vitórias seguidas | Ambos saem, **perdedor entra antes do vencedor** |

---

## 🛠️ Tecnologias

- **HTML5** — estrutura e semântica
- **CSS3** — layout, animações, variáveis CSS, safe area (iPhone notch)
- **JavaScript** — lógica de jogo, timer, fila, sorteios
- **localStorage** — persistência de estado (recarregar não perde nada)
- **PWA** — instalável, offline-ready, ícone nativo
- **Service Worker** — cache offline
- **Web App Manifest** — integração nativa com iOS e Android
- **Google Fonts** — Nunito (fonte arredondada e esportiva)
- **Tabler Icons** — ícones via webfont

---

## 📁 Estrutura do Projeto

```
judge_app/
├── index.html              # Estrutura das 4 telas
├── manifest.json           # Configuração PWA
├── sw.js                   # Service Worker (cache offline)
├── css/
│   └── style.css           # Estilos, paleta, componentes
├── js/
│   └── app.js              # Toda a lógica da aplicação
└── icons/                  # Ícones PWA em múltiplos tamanhos
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    ├── icon-512x512.png
    ├── apple-touch-icon.png
    └── favicon-32x32.png
```

---

## 🎨 Design

| Elemento | Valor |
|---|---|
| Cor primária | `#552583` (roxo Lakers) |
| Cor de destaque | `#FDB927` (dourado Lakers) |
| Cor base | `#ffffff` (branco) |
| Fonte | Nunito (800/900) |
| Estilo | Flat, arredondado, esportivo |

---

## 🚀 Como Rodar Localmente

```bash
# Clone o repositório
git clone https://github.com/rafaelmestre/judge.app.git

# Entre na pasta
cd judge.app

# Abra no navegador (sem necessidade de build)
open index.html
```

> Para testar o PWA e o Service Worker corretamente, use um servidor local:
> ```bash
> npx serve .
> ```

---

## 🔄 Deploy

O projeto usa deploy contínuo via **GitHub → Netlify**:

```bash
# Qualquer push na branch main publica automaticamente
git add .
git commit -m "descrição da mudança"
git push
```

---

## ✅ Funcionalidades Implementadas

- [x] Definição de regras (minutos e gols)
- [x] Seleção de até 8 times com camisas coloridas em SVG
- [x] Sorteador de coletes por jogador (máx. 5 por cor)
- [x] Sorteio de ordem da fila
- [x] Timer com anel de progresso animado
- [x] Placar com controle por time
- [x] Encerramento automático por tempo ou gols
- [x] Lógica completa de fila (vitória, empate, 3 vitórias seguidas)
- [x] Tela de resultado com próximo jogo
- [x] Persistência de estado (localStorage)
- [x] PWA instalável (iOS e Android)
- [x] Funcionamento offline (Service Worker)
- [x] Safe area para iPhone (notch / Dynamic Island)
- [x] Deploy automático via GitHub + Netlify

## 🗺️ Roadmap

- [ ] Som de apito ao encerrar partida
- [ ] Histórico de partidas da sessão
- [ ] Modo escuro
- [ ] Suporte a múltiplas quadras simultâneas
- [ ] Estatísticas por time (aproveitamento, gols marcados)

---

## 👤 Autor

**Rafael Mestre A. Araujo**
- GitHub: [@rafaelmestre](https://github.com/rafaelmestre)
