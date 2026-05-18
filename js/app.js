/* ═══════════════════════════════════════════════════
   JUDGE APP — app.js
   Paleta: branco + #552583 (roxo) + #FDB927 (ouro)
═══════════════════════════════════════════════════ */

const TEAMS_DEF = [
  { id: 'azul',      name: 'Azul',       color: '#2563EB', textColor: '#fff' },
  { id: 'vermelho',  name: 'Vermelho',   color: '#DC2626', textColor: '#fff' },
  { id: 'verde',     name: 'Verde',      color: '#16A34A', textColor: '#fff' },
  { id: 'amarelo',   name: 'Amarelo',    color: '#CA8A04', textColor: '#fff' },
  { id: 'preto',     name: 'Preto',      color: '#1a1a1a', textColor: '#fff' },
  { id: 'branco',    name: 'Branco',     color: '#e5e7eb', textColor: '#333', border: true },
  { id: 'cinza',     name: 'Cinza',      color: '#6b7280', textColor: '#fff' },
  { id: 'semcolete', name: 'Sem Colete', color: '#d1d5db', textColor: '#555', pattern: 'stripes', border: true },
];

/* ── Estado ── */
let ruleMinutes   = 8;
let ruleGoals     = 2;
let selectedTeams = [];
let queue         = [];
let playing       = [null, null];
let scores        = [0, 0];
let consecutiveWins = 0;
let winnerTeam    = null;
let roundNumber   = 0;
let timerSeconds  = 480;
let timerTotal    = 480;
let timerRunning  = false;
let timerInterval = null;
let roundEnded    = false;
let pendingSorteio = null;

/* ══════════════════════════════════════════════════
   NAVEGAÇÃO
══════════════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════════════
   TELA 1 — REGRAS
══════════════════════════════════════════════════ */
function changeRule(type, delta) {
  if (type === 'minutes') {
    ruleMinutes = Math.max(1, Math.min(30, ruleMinutes + delta));
    document.getElementById('val-minutes').textContent = ruleMinutes;
  } else {
    ruleGoals = Math.max(1, Math.min(10, ruleGoals + delta));
    document.getElementById('val-goals').textContent = ruleGoals;
  }
}

/* ══════════════════════════════════════════════════
   JERSEY SVG
══════════════════════════════════════════════════ */
function jerseysvg(team, size = 48) {
  const c = team.color;
  const hasBorder = team.border ? `stroke="#9ca3af" stroke-width="1.5"` : '';
  if (team.pattern === 'stripes') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="stripe-${team.id}" patternUnits="userSpaceOnUse" width="6" height="48">
          <rect width="3" height="48" fill="#d1d5db"/>
          <rect x="3" width="3" height="48" fill="#9ca3af"/>
        </pattern>
      </defs>
      <path d="M14 6 L6 14 L12 16 L12 42 L36 42 L36 16 L42 14 L34 6 L28 9 Q24 11 20 9 Z"
        fill="url(#stripe-${team.id})" stroke="#9ca3af" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 6 L6 14 L12 16 L12 42 L36 42 L36 16 L42 14 L34 6 L28 9 Q24 11 20 9 Z"
      fill="${c}" ${hasBorder} stroke-linejoin="round"/>
  </svg>`;
}

/* ══════════════════════════════════════════════════
   TELA 2 — SELEÇÃO DE TIMES
══════════════════════════════════════════════════ */
function renderTeamSelector() {
  const el = document.getElementById('team-selector');
  el.innerHTML = TEAMS_DEF.map(t => `
    <div class="team-slot ${selectedTeams.includes(t.id) ? 'selected' : ''}" onclick="toggleTeam('${t.id}')">
      <div class="slot-jersey">${jerseysvg_small(t)}</div>
      <span class="team-name-label">${t.name}</span>
      ${selectedTeams.includes(t.id) ? `<span class="check-badge"><i class="ti ti-check"></i></span>` : ''}
    </div>`).join('');
}

function jerseysvg_small(team) {
  return jerseysvg(team, 36);
}

function toggleTeam(id) {
  if (selectedTeams.includes(id)) {
    selectedTeams = selectedTeams.filter(x => x !== id);
  } else if (selectedTeams.length < 8) {
    selectedTeams.push(id);
  }
  renderTeamSelector();
  renderQueuePreview();
  const btn = document.getElementById('btn-start-game');
  btn.disabled = selectedTeams.length < 2;
  document.getElementById('queue-count').textContent = selectedTeams.length;
  /* Mostra/esconde sorteador conforme times selecionados */
  const draftSec = document.getElementById('draft-section');
  draftSec.style.display = selectedTeams.length >= 2 ? 'block' : 'none';
  resetDraft();
}

function getTeam(id) { return TEAMS_DEF.find(t => t.id === id); }

function renderQueuePreview() {
  const el = document.getElementById('queue-preview');
  if (!selectedTeams.length) {
    el.innerHTML = '<span class="queue-empty">Selecione ao menos 2 times</span>';
    return;
  }
  el.innerHTML = selectedTeams.map((id, i) => {
    const t = getTeam(id);
    return `<div class="queue-item">
      <span class="queue-pos">${i + 1}</span>
      ${jerseysvg(t, 28)}
      <span class="queue-name">${t.name}</span>
    </div>`;
  }).join('');
}

function shuffleQueue() {
  for (let i = selectedTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedTeams[i], selectedTeams[j]] = [selectedTeams[j], selectedTeams[i]];
  }
  renderTeamSelector();
  renderQueuePreview();
}

/* ══════════════════════════════════════════════════
   INÍCIO DO JOGO
══════════════════════════════════════════════════ */
function startGame() {
  queue = [...selectedTeams];
  playing = [queue.shift(), queue.shift()];
  consecutiveWins = 0;
  winnerTeam = null;
  roundNumber = 1;
  timerTotal = ruleMinutes * 60;
  loadRound();
  showScreen('screen-match');
}

function loadRound() {
  scores = [0, 0];
  timerSeconds = timerTotal;
  timerRunning = false;
  roundEnded = false;
  clearInterval(timerInterval);
  updateTimerDisplay();
  updateRingProgress(1);

  document.getElementById('round-label').textContent = `Rodada ${roundNumber}`;

  const ta = getTeam(playing[0]);
  const tb = getTeam(playing[1]);

  document.getElementById('jersey-a').innerHTML = jerseysvg(ta, 56);
  document.getElementById('jersey-b').innerHTML = jerseysvg(tb, 56);
  document.getElementById('name-a').textContent = ta.name;
  document.getElementById('name-b').textContent = tb.name;
  document.getElementById('score-a').textContent = '0';
  document.getElementById('score-b').textContent = '0';

  const ca = document.getElementById('card-a');
  const cb = document.getElementById('card-b');
  ca.style.setProperty('--team-color', ta.color);
  cb.style.setProperty('--team-color', tb.color);

  const btn = document.getElementById('btn-play');
  btn.className = 'ctrl-btn start';
  btn.innerHTML = '<i class="ti ti-player-play" aria-hidden="true"></i> Iniciar';

  updateNextDisplay();
  updateQueueDisplay();
}

/* ══════════════════════════════════════════════════
   TIMER
══════════════════════════════════════════════════ */
function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  const el = document.getElementById('timer-display');
  el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  el.className = 'timer-big' +
    (timerSeconds <= 60 && timerSeconds > 0 ? ' warning' : '') +
    (timerSeconds === 0 ? ' done' : '');
}

function updateRingProgress(ratio) {
  const ring = document.getElementById('ring-fill');
  if (!ring) return;
  const r = 52;
  const circ = 2 * Math.PI * r;
  ring.style.strokeDasharray = `${circ}`;
  ring.style.strokeDashoffset = `${circ * (1 - ratio)}`;
}

function toggleTimer() {
  if (roundEnded) return;
  timerRunning = !timerRunning;
  const btn = document.getElementById('btn-play');
  if (timerRunning) {
    btn.className = 'ctrl-btn pause';
    btn.innerHTML = '<i class="ti ti-player-pause" aria-hidden="true"></i> Pausar';
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        updateTimerDisplay();
        updateRingProgress(timerSeconds / timerTotal);
        if (timerSeconds === 0) {
          clearInterval(timerInterval);
          timerRunning = false;
          endRound('time');
        }
      }
    }, 1000);
  } else {
    clearInterval(timerInterval);
    btn.className = 'ctrl-btn start';
    btn.innerHTML = '<i class="ti ti-player-play" aria-hidden="true"></i> Continuar';
  }
}

/* ══════════════════════════════════════════════════
   PLACAR
══════════════════════════════════════════════════ */
function changeScore(team, delta) {
  if (roundEnded) return;
  scores[team] = Math.max(0, scores[team] + delta);
  document.getElementById(team === 0 ? 'score-a' : 'score-b').textContent = scores[team];
  if (scores[0] >= ruleGoals || scores[1] >= ruleGoals) {
    clearInterval(timerInterval);
    timerRunning = false;
    endRound('goals');
  }
}

/* ══════════════════════════════════════════════════
   FIM DE RODADA
══════════════════════════════════════════════════ */
function endRound(reason) {
  if (roundEnded) return;
  roundEnded = true;
  clearInterval(timerInterval);
  timerRunning = false;
  roundNumber++;

  const ta = getTeam(playing[0]);
  const tb = getTeam(playing[1]);

  document.getElementById('res-jersey-a').innerHTML = jerseysvg(ta, 52);
  document.getElementById('res-jersey-b').innerHTML = jerseysvg(tb, 52);
  document.getElementById('res-name-a').textContent = ta.name;
  document.getElementById('res-name-b').textContent = tb.name;
  document.getElementById('res-score-a').textContent = scores[0];
  document.getElementById('res-score-b').textContent = scores[1];

  let title, sub, icon, infoHtml;
  let bothOut = false;
  pendingSorteio = null;

  if (scores[0] === scores[1]) {
    title = 'Empate!';
    sub = reason === 'time' ? 'Tempo esgotado' : `${scores[0]} × ${scores[1]}`;
    icon = '🤝';
    bothOut = true;
    consecutiveWins = 0;
    winnerTeam = null;
    infoHtml = `<strong>${ta.name}</strong> e <strong>${tb.name}</strong> empataram. Ambos saem da quadra.`;
  } else {
    const winIdx   = scores[0] > scores[1] ? 0 : 1;
    const loseIdx  = 1 - winIdx;
    const winner   = getTeam(playing[winIdx]);
    const loser    = getTeam(playing[loseIdx]);

    if (winnerTeam === playing[winIdx]) {
      consecutiveWins++;
    } else {
      consecutiveWins = 1;
      winnerTeam = playing[winIdx];
    }

    if (consecutiveWins >= 3) {
      title = '3 Vitórias Seguidas!';
      sub = `${winner.name} dominou — ambos saem.`;
      icon = '🏆';
      consecutiveWins = 0;
      winnerTeam = null;
      infoHtml = `<strong>${winner.name}</strong> atingiu 3 vitórias consecutivas. <strong>${loser.name}</strong> entra na fila antes de <strong>${winner.name}</strong>.`;
      /* Perdedor entra antes do vencedor — ordem garantida, sem sorteio */
      queue.push(playing[loseIdx]);
      queue.push(playing[winIdx]);
      if (queue.length >= 2) {
        playing[0] = queue.shift();
        playing[1] = queue.shift();
      } else if (queue.length === 1) {
        playing[0] = queue.shift();
        playing[1] = playing[loseIdx];
      }
      /* bothOut permanece false — não aciona sorteio */
    } else {
      title = `${winner.name} Venceu!`;
      sub = reason === 'time' ? 'Tempo esgotado' : `${ruleGoals} gols marcados`;
      icon = '🏆';
      infoHtml = `<strong>${winner.name}</strong> permanece na quadra. <strong>${loser.name}</strong> vai para o final da fila.`;
      queue.push(playing[loseIdx]);
      playing[loseIdx] = queue.shift();
    }
  }

  if (bothOut) {
    const outA = playing[0];
    const outB = playing[1];
    pendingSorteio = [outA, outB];
    if (queue.length >= 2) {
      playing[0] = queue.shift();
      playing[1] = queue.shift();
    } else if (queue.length === 1) {
      playing[0] = queue.shift();
      playing[1] = outA;
      pendingSorteio = null;
    } else {
      playing[0] = outA;
      playing[1] = outB;
      pendingSorteio = null;
    }
  }

  document.getElementById('result-icon').textContent = icon;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-sub').textContent = sub;
  document.getElementById('result-info').innerHTML = infoHtml;

  /* Próximo jogo */
  const nextBox = document.getElementById('next-game-box');
  const nextTeams = document.getElementById('next-game-teams');
  if (playing[0] && playing[1]) {
    const pA = getTeam(playing[0]);
    const pB = getTeam(playing[1]);
    nextTeams.innerHTML = `
      <div class="next-game-team">${jerseysvg(pA, 40)}<span>${pA.name}</span></div>
      <span class="next-vs">VS</span>
      <div class="next-game-team">${jerseysvg(pB, 40)}<span>${pB.name}</span></div>`;
    nextBox.style.display = 'block';
  } else {
    nextBox.style.display = 'none';
  }

  /* Sorteio */
  const sorteioSec = document.getElementById('sorteio-section');
  if (pendingSorteio && pendingSorteio.length === 2) {
    sorteioSec.style.display = 'block';
    document.getElementById('sorteio-resultado').style.display = 'none';
    document.getElementById('btn-next-round').style.display = 'none';
  } else {
    sorteioSec.style.display = 'none';
    document.getElementById('btn-next-round').style.display = 'block';
  }

  showScreen('screen-result');
}

function realizarSorteio() {
  if (!pendingSorteio) return;
  const shuffled = [...pendingSorteio].sort(() => Math.random() - 0.5);
  queue.push(...shuffled);
  const ta = getTeam(shuffled[0]);
  const tb = getTeam(shuffled[1]);
  const el = document.getElementById('sorteio-resultado');
  el.style.display = 'flex';
  el.innerHTML = `${jerseysvg(ta, 28)}<span class="next-name">${ta.name} entra antes de ${tb.name}</span>`;
  pendingSorteio = null;
  document.getElementById('btn-next-round').style.display = 'block';
}

function nextRound() {
  showScreen('screen-match');
  loadRound();
}

/* ══════════════════════════════════════════════════
   DISPLAYS — fila e próximo na tela de jogo
══════════════════════════════════════════════════ */
function updateNextDisplay() {
  const el  = document.getElementById('next-teams-display');
  const sec = document.getElementById('next-section');
  if (queue.length >= 2) {
    const ta = getTeam(queue[0]);
    const tb = getTeam(queue[1]);
    el.innerHTML = `
      ${jerseysvg(ta, 20)}<span class="next-name">${ta.name}</span>
      <span class="vs-mini">vs</span>
      ${jerseysvg(tb, 20)}<span class="next-name">${tb.name}</span>`;
    sec.style.display = 'block';
  } else if (queue.length === 1) {
    const ta = getTeam(queue[0]);
    el.innerHTML = `${jerseysvg(ta, 20)}<span class="next-name">${ta.name} aguarda</span>`;
    sec.style.display = 'block';
  } else {
    sec.style.display = 'none';
  }
}

function updateQueueDisplay() {
  const el = document.getElementById('queue-display');
  el.innerHTML = queue.map((id, i) => {
    const t = getTeam(id);
    return `<div class="q-chip" style="background:${t.color}22;border:0.5px solid ${t.color}55">
      ${jerseysvg(t, 18)}<span style="color:${t.color};font-weight:700;font-size:12px">${i + 1}. ${t.name}</span>
    </div>`;
  }).join('') || `<span style="font-size:13px;color:#888">Fila vazia</span>`;
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
renderTeamSelector();
renderQueuePreview();

/* ══════════════════════════════════════════════════
   SORTEADOR DE COLETES
   Máx 5 jogadores por time, apenas times selecionados
══════════════════════════════════════════════════ */
let draftCounts = {};   /* { teamId: count } */
let draftLog    = [];   /* [ { teamId, num } ] */

function resetDraft() {
  draftCounts = {};
  draftLog    = [];
  const result = document.getElementById('draft-result');
  const list   = document.getElementById('draft-list');
  const reset  = document.getElementById('draft-reset-btn');
  const btn    = document.getElementById('draft-main-btn');
  if (result) { result.style.display = 'none'; result.innerHTML = ''; }
  if (list)   list.innerHTML = '';
  if (reset)  reset.style.display = 'none';
  if (btn)    { btn.disabled = false; btn.innerHTML = '<i class="ti ti-arrows-shuffle" aria-hidden="true"></i> Sortear Colete'; }
}

function sortearJogador() {
  /* Monta pool de times disponíveis (selecionados e com < 5 jogadores) */
  const pool = selectedTeams.filter(id => (draftCounts[id] || 0) < 5);

  if (!pool.length) return; /* não deve acontecer mas protege */

  /* Sorteia aleatoriamente */
  const id   = pool[Math.floor(Math.random() * pool.length)];
  const team = getTeam(id);
  draftCounts[id] = (draftCounts[id] || 0) + 1;
  const num = draftCounts[id];
  draftLog.push({ id, num });

  /* Mostra resultado animado */
  const result = document.getElementById('draft-result');
  result.style.display = 'flex';
  result.innerHTML = `
    <div class="draft-result-inner">
      ${jerseysvg(team, 64)}
      <span class="draft-result-name">${team.name}</span>
      <span class="draft-result-count">Jogador ${num} de 5</span>
    </div>`;

  /* Atualiza lista de todos sorteados */
  renderDraftList();

  /* Mostra botão refazer */
  document.getElementById('draft-reset-btn').style.display = 'block';

  /* Verifica se todos os times lotaram */
  const newPool = selectedTeams.filter(id => (draftCounts[id] || 0) < 5);
  if (!newPool.length) {
    const btn = document.getElementById('draft-main-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Todos sorteados!';
  }
}

function renderDraftList() {
  const el = document.getElementById('draft-list');
  if (!draftLog.length) { el.innerHTML = ''; return; }

  /* Agrupa por time */
  const grouped = {};
  draftLog.forEach(({ id }) => {
    grouped[id] = (grouped[id] || 0) + 1;
  });

  el.innerHTML = Object.entries(grouped).map(([id, count]) => {
    const team = getTeam(id);
    const dots = Array.from({ length: count }, (_, i) =>
      `<span class="draft-dot"></span>`
    ).join('');
    return `<div class="draft-list-item">
      ${jerseysvg(team, 28)}
      <span class="draft-list-name">${team.name}</span>
      <span class="draft-list-count">${count}/5</span>
      <div class="draft-dots">${dots}</div>
    </div>`;
  }).join('');
}
