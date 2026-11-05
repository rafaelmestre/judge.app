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
let sessionHistory = [];   // rodadas do dia de jogo
let sessionStartedAt = null;
let sessionEndedAt = null;
let sessionId = null;       // id da sessão na nuvem

/* ══════════════════════════════════════════════════
   MÓDULO DE SOM — arquivos MP3 em sounds/
══════════════════════════════════════════════════ */
const SoundFX = (() => {
  function play(file) {
    try {
      const audio = new Audio(`sounds/${file}`);
      audio.play().catch(() => {});
    } catch(e) {}
  }

  return {
    apitarInicio: () => play('start.mp3'),
    apitarFim:    () => play('finish.mp3'),
    apitarGol:    () => play('goal.mp3'),
  };
})();

/* ══════════════════════════════════════════════════
   PERSISTÊNCIA — localStorage
══════════════════════════════════════════════════ */
const SAVE_KEY = 'judgeapp_state';

function saveState() {
  const state = {
    ruleMinutes, ruleGoals,
    selectedTeams, queue, playing, scores,
    consecutiveWins, winnerTeam, roundNumber,
    timerSeconds, timerTotal, roundEnded,
    pendingSorteio, draftCounts, draftLog,
    sessionHistory, sessionStartedAt, sessionEndedAt, sessionId,
    currentScreen: document.querySelector('.screen.active')?.id || 'screen-rules'
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {}
}

function clearState() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    ruleMinutes     = s.ruleMinutes     ?? 8;
    ruleGoals       = s.ruleGoals       ?? 2;
    selectedTeams   = s.selectedTeams   ?? [];
    queue           = s.queue           ?? [];
    playing         = s.playing         ?? [null, null];
    scores          = s.scores          ?? [0, 0];
    consecutiveWins = s.consecutiveWins ?? 0;
    winnerTeam      = s.winnerTeam      ?? null;
    roundNumber     = s.roundNumber     ?? 0;
    timerSeconds    = s.timerSeconds    ?? 480;
    timerTotal      = s.timerTotal      ?? 480;
    roundEnded      = s.roundEnded      ?? false;
    pendingSorteio  = s.pendingSorteio  ?? null;
    draftCounts     = s.draftCounts     ?? {};
    draftLog        = s.draftLog        ?? [];
    sessionHistory  = s.sessionHistory  ?? [];
    sessionStartedAt = s.sessionStartedAt ?? null;
    sessionEndedAt  = s.sessionEndedAt  ?? null;
    sessionId       = s.sessionId       ?? null;
    return s.currentScreen || false;
  } catch(e) { return false; }
}

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
  saveState();
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
      <div class="slot-jersey">${jerseysvg(t, 36)}</div>
      <span class="team-name-label">${t.name}</span>
      ${selectedTeams.includes(t.id) ? `<span class="check-badge"><i class="ti ti-check"></i></span>` : ''}
    </div>`).join('');
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
  const draftSec = document.getElementById('draft-section');
  draftSec.style.display = selectedTeams.length >= 2 ? 'block' : 'none';
  resetDraft();
  saveState();
}

function getTeam(id) { return TEAMS_DEF.find(t => t.id === id); }

function renderQueuePreview() {
  const el = document.getElementById('queue-preview');
  const hint = document.getElementById('queue-drag-hint');
  if (hint) hint.style.display = selectedTeams.length >= 2 ? 'block' : 'none';
  if (!selectedTeams.length) {
    el.innerHTML = '<span class="queue-empty">Selecione ao menos 2 times</span>';
    return;
  }
  el.innerHTML = selectedTeams.map((id, i) => {
    const t = getTeam(id);
    return `<div class="queue-item" data-id="${id}">
      <span class="queue-pos">${i + 1}</span>
      ${jerseysvg(t, 28)}
      <span class="queue-name">${t.name}</span>
      <span class="drag-handle" aria-label="Arrastar ${t.name}"><i class="ti ti-grip-vertical" aria-hidden="true"></i></span>
    </div>`;
  }).join('');
}

/* Arrastar e soltar (estilo playlist) — Pointer Events: funciona com dedo e mouse */
let dragItem = null;

function onQueuePointerDown(e) {
  const handle = e.target.closest('.drag-handle');
  if (!handle) return;
  e.preventDefault();
  dragItem = handle.closest('.queue-item');
  dragItem.classList.add('dragging');
  if (navigator.vibrate) navigator.vibrate(10);
  document.addEventListener('pointermove', onQueuePointerMove);
  document.addEventListener('pointerup', onQueuePointerUp);
  document.addEventListener('pointercancel', onQueuePointerUp);
}

function onQueuePointerMove(e) {
  if (!dragItem) return;
  e.preventDefault();
  const list  = document.getElementById('queue-preview');
  const items = [...list.querySelectorAll('.queue-item:not(.dragging)')];
  const before = items.find(it => {
    const r = it.getBoundingClientRect();
    return e.clientY < r.top + r.height / 2;
  });
  if (before) { if (before !== dragItem.nextSibling) list.insertBefore(dragItem, before); }
  else if (list.lastElementChild !== dragItem) list.appendChild(dragItem);
  [...list.querySelectorAll('.queue-pos')].forEach((p, i) => p.textContent = i + 1);
}

function onQueuePointerUp() {
  document.removeEventListener('pointermove', onQueuePointerMove);
  document.removeEventListener('pointerup', onQueuePointerUp);
  document.removeEventListener('pointercancel', onQueuePointerUp);
  if (!dragItem) return;
  dragItem.classList.remove('dragging');
  dragItem = null;
  const list = document.getElementById('queue-preview');
  selectedTeams = [...list.querySelectorAll('.queue-item')].map(el => el.dataset.id);
  renderQueuePreview();
  saveState();
}

function shuffleQueue() {
  for (let i = selectedTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedTeams[i], selectedTeams[j]] = [selectedTeams[j], selectedTeams[i]];
  }
  renderTeamSelector();
  renderQueuePreview();
  saveState();
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
  sessionHistory = [];
  sessionStartedAt = Date.now();
  sessionEndedAt = null;
  sessionId = newId();
  syncSession();
  loadRound();
  showScreen('screen-match');
  saveState();
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
    SoundFX.apitarInicio();
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
  if (delta > 0) SoundFX.apitarGol();
  saveState();
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
  SoundFX.apitarFim();
  roundEnded = true;
  clearInterval(timerInterval);
  timerRunning = false;
  logRound(reason);
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
    const winIdx  = scores[0] > scores[1] ? 0 : 1;
    const loseIdx = 1 - winIdx;
    const winner  = getTeam(playing[winIdx]);
    const loser   = getTeam(playing[loseIdx]);

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
      queue.push(playing[loseIdx]);
      queue.push(playing[winIdx]);
      if (queue.length >= 2) {
        playing[0] = queue.shift();
        playing[1] = queue.shift();
      } else if (queue.length === 1) {
        playing[0] = queue.shift();
        playing[1] = playing[loseIdx];
      }
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

  const nextBox   = document.getElementById('next-game-box');
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

  const sorteioSec = document.getElementById('sorteio-section');
  if (pendingSorteio && pendingSorteio.length === 2) {
    sorteioSec.style.display = 'block';
    document.getElementById('sorteio-resultado').style.display = 'none';
    document.getElementById('btn-next-round').style.display = 'none';
  } else {
    sorteioSec.style.display = 'none';
    document.getElementById('btn-next-round').style.display = 'block';
  }

  saveState();
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
  saveState();
  document.getElementById('btn-next-round').style.display = 'block';
}

function nextRound() {
  showScreen('screen-match');
  loadRound();
  saveState();
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
   INIT — restaura estado salvo ou começa do zero
══════════════════════════════════════════════════ */
let draftCounts = {};
let draftLog    = [];

(function init() {
  const savedScreen = loadState();

  document.getElementById('val-minutes').textContent = ruleMinutes;
  document.getElementById('val-goals').textContent   = ruleGoals;

  renderTeamSelector();
  renderQueuePreview();
  document.getElementById('queue-count').textContent = selectedTeams.length;
  if (selectedTeams.length >= 2) {
    document.getElementById('draft-section').style.display = 'block';
    renderDraftList();
    if (draftLog.length) {
      document.getElementById('draft-reset-btn').style.display = 'block';
      const pool = selectedTeams.filter(id => (draftCounts[id] || 0) < 5);
      if (!pool.length) {
        const btn = document.getElementById('draft-main-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Todos sorteados!';
      }
    }
  }

  document.getElementById('queue-preview').addEventListener('pointerdown', onQueuePointerDown);

  if (savedScreen) {
    showScreen(savedScreen);
    if (savedScreen === 'screen-summary') { renderSummary(); renderCloudStatus(); return; }
    if (savedScreen.startsWith('screen-history')) { showScreen('screen-rules'); return; }

    if (savedScreen === 'screen-match' || savedScreen === 'screen-result') {
      if (!playing[0] || !playing[1]) return;
      const ta = getTeam(playing[0]);
      const tb = getTeam(playing[1]);
      document.getElementById('jersey-a').innerHTML = jerseysvg(ta, 56);
      document.getElementById('jersey-b').innerHTML = jerseysvg(tb, 56);
      document.getElementById('name-a').textContent = ta.name;
      document.getElementById('name-b').textContent = tb.name;
      document.getElementById('score-a').textContent = scores[0];
      document.getElementById('score-b').textContent = scores[1];
      document.getElementById('card-a').style.setProperty('--team-color', ta.color);
      document.getElementById('card-b').style.setProperty('--team-color', tb.color);
      document.getElementById('round-label').textContent = `Rodada ${roundNumber}`;
      updateTimerDisplay();
      updateRingProgress(timerSeconds / timerTotal);
      updateNextDisplay();
      updateQueueDisplay();
      const btn = document.getElementById('btn-play');
      btn.className = 'ctrl-btn start';
      btn.innerHTML = '<i class="ti ti-player-play" aria-hidden="true"></i> Continuar';
      if (savedScreen === 'screen-result') showScreen('screen-match');
    }
  }
})();

/* ══════════════════════════════════════════════════
   SORTEADOR DE COLETES
══════════════════════════════════════════════════ */
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

/* Sorteio em "rodadas": cada cor recebe 1 jogador antes de qualquer cor
   receber o próximo, e a mesma cor nunca sai duas vezes seguidas. */
function sortearJogador() {
  const available = selectedTeams.filter(id => (draftCounts[id] || 0) < 5);
  if (!available.length) return;

  const minCount = Math.min(...available.map(id => draftCounts[id] || 0));
  let pool = available.filter(id => (draftCounts[id] || 0) === minCount);

  const lastId = draftLog.length ? draftLog[draftLog.length - 1].id : null;
  if (pool.length > 1) pool = pool.filter(id => id !== lastId);

  const id   = pool[Math.floor(Math.random() * pool.length)];
  const team = getTeam(id);
  draftCounts[id] = (draftCounts[id] || 0) + 1;
  const num = draftCounts[id];
  draftLog.push({ id, num });

  const result = document.getElementById('draft-result');
  result.style.display = 'flex';
  result.innerHTML = `
    <div class="draft-result-inner">
      ${jerseysvg(team, 64)}
      <span class="draft-result-name">${team.name}</span>
      <span class="draft-result-count">Jogador ${num} de 5</span>
    </div>`;

  renderDraftList();
  saveState();

  document.getElementById('draft-reset-btn').style.display = 'block';

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

  const grouped = {};
  draftLog.forEach(({ id }) => { grouped[id] = (grouped[id] || 0) + 1; });

  el.innerHTML = Object.entries(grouped).map(([id, count]) => {
    const team = getTeam(id);
    const dots = Array.from({ length: count }, () => `<span class="draft-dot"></span>`).join('');
    return `<div class="draft-list-item">
      ${jerseysvg(team, 28)}
      <span class="draft-list-name">${team.name}</span>
      <span class="draft-list-count">${count}/5</span>
      <div class="draft-dots">${dots}</div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════
   SESSÃO — histórico do dia de jogo, saída e resumo
══════════════════════════════════════════════════ */
function logRound(reason) {
  // rodada interrompida pelo "Sair" não conta vitória
  const winner = (reason === 'exit' || scores[0] === scores[1]) ? null : playing[scores[0] > scores[1] ? 0 : 1];
  ensureSessionId();
  const entry = {
    id: newId(),
    round: roundNumber,
    teams: [playing[0], playing[1]],
    scores: [scores[0], scores[1]],
    winner,
    reason,                                  // 'time' | 'goals' | 'exit'
    duration: timerTotal - timerSeconds,     // segundos jogados
    endedAt: Date.now(),
  };
  sessionHistory.push(entry);
  Cloud.enqueue('rounds', {
    id: entry.id,
    session_id: sessionId,
    round_number: entry.round,
    team_a: entry.teams[0],
    team_b: entry.teams[1],
    score_a: entry.scores[0],
    score_b: entry.scores[1],
    winner: entry.winner,
    reason: entry.reason,
    duration_sec: entry.duration,
    ended_at: new Date(entry.endedAt).toISOString(),
  });
}

/* sessões iniciadas antes desta versão ainda não têm id */
function ensureSessionId() {
  if (sessionId) return;
  sessionId = newId();
  if (!sessionStartedAt) sessionStartedAt = Date.now();
  syncSession();
}

function syncSession() {
  Cloud.enqueue('sessions', {
    id: sessionId,
    started_at: new Date(sessionStartedAt).toISOString(),
    ended_at: sessionEndedAt ? new Date(sessionEndedAt).toISOString() : null,
    rule_minutes: ruleMinutes,
    rule_goals: ruleGoals,
    teams: [...new Set([...selectedTeams, ...queue, ...playing].filter(Boolean))],
  });
}

function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* Etapa 1: botão Sair → abre a confirmação flutuante (o jogo pausa) */
function askExitSession() {
  if (timerRunning) toggleTimer();
  const n = sessionHistory.length;
  document.getElementById('exit-text').textContent = n
    ? `${n} ${n === 1 ? 'rodada jogada' : 'rodadas jogadas'} hoje. Todas as rodadas serão finalizadas e você verá o resumo da sessão.`
    : 'Todas as rodadas deste dia de jogo serão finalizadas e você verá o resumo da sessão.';
  document.getElementById('exit-modal').style.display = 'flex';
}

function closeExitModal() {
  document.getElementById('exit-modal').style.display = 'none';
}

/* Etapa 2: confirmou → encerra a sessão e mostra o resumo */
function confirmExitSession() {
  const onMatch = document.getElementById('screen-match').classList.contains('active');
  const started = scores[0] > 0 || scores[1] > 0 || timerSeconds < timerTotal;
  if (onMatch && !roundEnded && started) logRound('exit'); // registra a rodada interrompida
  clearInterval(timerInterval);
  timerRunning = false;
  roundEnded = true;
  sessionEndedAt = Date.now();
  ensureSessionId();
  syncSession();
  closeExitModal();
  renderSummary();
  showScreen('screen-summary');
  saveState();
}

function renderSummary() {
  renderCloudStatus();
  renderSessionView('sum', sessionHistory, sessionStartedAt, sessionEndedAt || Date.now());
}

/* Desenha um resumo de sessão (usado no fim do dia e no histórico).
   prefix: 'sum' (tela de resumo) ou 'hd' (detalhe do histórico) */
function renderSessionView(prefix, h, startTs, endTs) {
  const $ = id => document.getElementById(`${prefix}-${id}`);
  const totalSec   = h.reduce((acc, r) => acc + r.duration, 0);
  const totalGoals = h.reduce((acc, r) => acc + r.scores[0] + r.scores[1], 0);

  $('period').textContent = startTs ? `${fmtClock(startTs)} – ${fmtClock(endTs || Date.now())}` : '';

  $('stats').innerHTML = `
    <div class="sum-stat"><span class="sum-stat-num">${h.length}</span><span class="sum-stat-lbl">Rodadas</span></div>
    <div class="sum-stat"><span class="sum-stat-num">${fmtDuration(totalSec)}</span><span class="sum-stat-lbl">Tempo jogado</span></div>
    <div class="sum-stat"><span class="sum-stat-num">${totalGoals}</span><span class="sum-stat-lbl">Gols</span></div>`;

  const wins = {};
  h.forEach(r => { if (r.winner) wins[r.winner] = (wins[r.winner] || 0) + 1; });
  const ranking = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  $('wins').innerHTML = ranking.length
    ? ranking.map(([id, n]) => {
        const t = getTeam(id);
        return `<div class="sum-win-chip">${jerseysvg(t, 22)}<span>${t.name}</span><strong>${n}</strong></div>`;
      }).join('')
    : '<span class="queue-empty">Nenhuma vitória registrada</span>';

  const reasonLbl = { time: 'Tempo', goals: 'Gols', exit: 'Interrompida', manual: 'Encerrada' };
  $('rounds').innerHTML = h.length
    ? h.map(r => {
        const ta = getTeam(r.teams[0]), tb = getTeam(r.teams[1]);
        const wa = r.winner === r.teams[0] ? 'win' : '', wb = r.winner === r.teams[1] ? 'win' : '';
        return `<div class="sum-round">
          <span class="sum-round-n">R${r.round}</span>
          <span class="sum-team ${wa}">${jerseysvg(ta, 20)}${ta.name}</span>
          <span class="sum-score">${r.scores[0]} × ${r.scores[1]}</span>
          <span class="sum-team right ${wb}">${tb.name}${jerseysvg(tb, 20)}</span>
          <span class="sum-meta">${fmtDuration(r.duration)} · ${reasonLbl[r.reason] || ''}</span>
        </div>`;
      }).join('')
    : '<span class="queue-empty">Nenhuma rodada jogada</span>';
}

/* ══════════════════════════════════════════════════
   HISTÓRICO — sessões da nuvem + estatísticas por time
══════════════════════════════════════════════════ */
const HISTORY_CACHE_KEY = 'judgeapp_history_cache';
let historyData = [];       // sessões no formato do app
let historyTab  = 'sessions';

/* converte uma linha do banco para o formato usado nas telas */
function fromCloudSession(s) {
  const rounds = (s.rounds || [])
    .slice()
    .sort((a, b) => a.round_number - b.round_number)
    .map(r => ({
      id: r.id, round: r.round_number,
      teams: [r.team_a, r.team_b], scores: [r.score_a, r.score_b],
      winner: r.winner, reason: r.reason, duration: r.duration_sec,
      endedAt: Date.parse(r.ended_at),
    }));
  return {
    id: s.id,
    startedAt: Date.parse(s.started_at),
    endedAt: s.ended_at ? Date.parse(s.ended_at) : null,
    rules: { minutes: s.rule_minutes, goals: s.rule_goals },
    rounds,
  };
}

function openHistory() {
  if (!Cloud.status().loggedIn) { openLogin(); return; }
  showScreen('screen-history');
  try { historyData = JSON.parse(localStorage.getItem(HISTORY_CACHE_KEY)) || []; } catch (e) { historyData = []; }
  renderHistory();
  refreshHistory();
}

async function refreshHistory() {
  const info = document.getElementById('hist-info');
  info.textContent = 'Atualizando…';
  try {
    await Cloud.flush(); // envia o que estiver pendente antes de ler
    const rows = await Cloud.listSessions(200);
    historyData = rows.map(fromCloudSession).filter(s => s.rounds.length);
    try { localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(historyData)); } catch (e) {}
    info.textContent = `Atualizado às ${fmtClock(Date.now())}`;
  } catch (e) {
    console.warn(e);
    info.textContent = navigator.onLine
      ? 'Não foi possível atualizar — mostrando a última versão'
      : 'Sem internet — mostrando a última versão salva';
  }
  renderHistory();
}

function setHistoryTab(tab) {
  historyTab = tab;
  renderHistory();
}

function fmtDay(ts) {
  const d = new Date(ts);
  const wd = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return `${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}

function renderHistory() {
  const sessions = historyData;
  const allRounds = sessions.flatMap(s => s.rounds);
  const goals = allRounds.reduce((a, r) => a + r.scores[0] + r.scores[1], 0);

  document.getElementById('hist-overview').innerHTML = `
    <div class="sum-stat"><span class="sum-stat-num">${sessions.length}</span><span class="sum-stat-lbl">Sessões</span></div>
    <div class="sum-stat"><span class="sum-stat-num">${allRounds.length}</span><span class="sum-stat-lbl">Rodadas</span></div>
    <div class="sum-stat"><span class="sum-stat-num">${goals}</span><span class="sum-stat-lbl">Gols</span></div>`;

  document.querySelectorAll('.hist-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === historyTab));
  const body = document.getElementById('hist-body');

  if (!sessions.length) {
    body.innerHTML = `<div class="hist-empty"><i class="ti ti-calendar-off" aria-hidden="true"></i>
      <p>Nenhuma sessão salva ainda.</p><p class="hist-empty-sub">Jogue e encerre uma sessão logado para ela aparecer aqui.</p></div>`;
    return;
  }

  body.innerHTML = historyTab === 'sessions' ? renderHistorySessions(sessions) : renderTeamStats(allRounds);
}

function renderHistorySessions(sessions) {
  return sessions.map((s, i) => {
    const goals = s.rounds.reduce((a, r) => a + r.scores[0] + r.scores[1], 0);
    const wins = {};
    s.rounds.forEach(r => { if (r.winner) wins[r.winner] = (wins[r.winner] || 0) + 1; });
    const top = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];
    const topHtml = top
      ? `<span class="hist-top">${jerseysvg(getTeam(top[0]), 18)} ${getTeam(top[0]).name} · ${top[1]}V</span>` : '';
    const period = `${fmtClock(s.startedAt)} – ${s.endedAt ? fmtClock(s.endedAt) : 'em andamento'}`;
    return `<button class="hist-session" onclick="openHistoryDetail(${i})">
      <div class="hist-session-main">
        <span class="hist-day">${fmtDay(s.startedAt)}</span>
        <span class="hist-period">${period}</span>
        <span class="hist-meta">${s.rounds.length} ${s.rounds.length === 1 ? 'rodada' : 'rodadas'} · ${goals} gols</span>
      </div>
      ${topHtml}
      <i class="ti ti-chevron-right hist-chevron" aria-hidden="true"></i>
    </button>`;
  }).join('');
}

/* Estatística por time: interrompidas não contam */
function computeTeamStats(rounds) {
  const st = {};
  const get = id => (st[id] ||= { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 });
  rounds.filter(r => r.reason !== 'exit').forEach(r => {
    [0, 1].forEach(side => {
      const t = get(r.teams[side]);
      const mine = r.scores[side], theirs = r.scores[1 - side];
      t.j++; t.gp += mine; t.gc += theirs;
      if (mine > theirs) t.v++; else if (mine === theirs) t.e++; else t.d++;
    });
  });
  return Object.values(st)
    .map(t => ({ ...t, aprov: t.j ? Math.round((t.v * 3 + t.e) / (t.j * 3) * 100) : 0 }))
    .sort((a, b) => b.v - a.v || b.aprov - a.aprov || (b.gp - b.gc) - (a.gp - a.gc));
}

function renderTeamStats(rounds) {
  const rows = computeTeamStats(rounds);
  if (!rows.length) return '<span class="queue-empty">Sem partidas concluídas</span>';
  return `<div class="ts-table">
    <div class="ts-row ts-head"><span>Time</span><span>J</span><span>V</span><span>E</span><span>D</span><span>%</span></div>
    ${rows.map((t, i) => {
      const team = getTeam(t.id);
      return `<div class="ts-row">
        <span class="ts-team"><span class="ts-pos">${i + 1}</span>${jerseysvg(team, 22)}<span class="ts-name">${team.name}<small>GP ${t.gp} · GC ${t.gc}</small></span></span>
        <span>${t.j}</span><span class="ts-v">${t.v}</span><span>${t.e}</span><span>${t.d}</span>
        <span class="ts-aprov">${t.aprov}</span>
      </div>`;
    }).join('')}
  </div>
  <p class="ts-note">% = aproveitamento (vitória 3 pts, empate 1). Rodadas interrompidas não entram.</p>`;
}

function openHistoryDetail(i) {
  const s = historyData[i];
  if (!s) return;
  document.getElementById('hd-day').textContent = fmtDay(s.startedAt);
  renderSessionView('hd', s.rounds, s.startedAt, s.endedAt);
  showScreen('screen-history-detail');
}

/* ══════════════════════════════════════════════════
   NUVEM — status, login
══════════════════════════════════════════════════ */
function renderCloudStatus() {
  const st = Cloud.status();
  const card = document.getElementById('cloud-card');
  const sum  = document.getElementById('sum-cloud');
  if (!card) return;

  const histBtn = document.getElementById('btn-history');
  if (histBtn) histBtn.style.display = st.configured ? 'flex' : 'none';
  if (!st.configured) { card.style.display = 'none'; if (sum) sum.style.display = 'none'; return; }
  card.style.display = 'flex';

  let icon, title, sub, action;
  if (!st.loggedIn) {
    icon = 'ti-cloud-off'; title = 'Entre para salvar na nuvem';
    sub = 'E veja seu histórico em qualquer aparelho';
    action = `<button class="cloud-btn" onclick="openLogin()">Entrar</button>`;
  } else {
    icon = st.pending ? 'ti-cloud-upload' : 'ti-cloud-check';
    title = st.email;
    sub = st.pending
      ? (st.online ? `Enviando ${st.pending} ${st.pending === 1 ? 'item' : 'itens'}…` : `${st.pending} pendente(s) — envia quando tiver internet`)
      : 'Tudo salvo na nuvem';
    if (st.error) sub = 'Erro ao enviar — tentaremos de novo';
    action = `<button class="cloud-btn" onclick="openHistory()"><i class="ti ti-history" aria-hidden="true"></i> Histórico</button>
      <button class="cloud-btn ghost icon" onclick="logoutCloud()" aria-label="Sair da conta" title="Sair da conta"><i class="ti ti-logout"></i></button>`;
  }
  card.innerHTML = `
    <i class="ti ${icon} cloud-icon" aria-hidden="true"></i>
    <div class="cloud-info"><p class="cloud-title">${title}</p><p class="cloud-sub">${sub}</p></div>
    ${action}`;

  if (sum) {
    sum.style.display = 'flex';
    sum.className = 'sum-cloud ' + (st.loggedIn && !st.pending ? 'ok' : '');
    sum.innerHTML = !st.loggedIn
      ? `<i class="ti ti-cloud-off" aria-hidden="true"></i> Ainda não enviada. <button class="link-btn" onclick="openLogin()">Entrar</button> para salvar na nuvem.`
      : st.pending
        ? `<i class="ti ti-cloud-upload" aria-hidden="true"></i> Enviando para a nuvem… (${st.pending} pendente${st.pending === 1 ? '' : 's'})`
        : `<i class="ti ti-cloud-check" aria-hidden="true"></i> Sessão salva na nuvem`;
  }
}

let loginMode = 'signin'; // 'signin' | 'signup'

function openLogin() {
  setLoginMode('signin');
  document.getElementById('login-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('login-email').focus(), 50);
}

function closeLogin() {
  document.getElementById('login-modal').style.display = 'none';
}

function setLoginMode(mode) {
  loginMode = mode;
  const signup = mode === 'signup';
  document.getElementById('login-step-form').style.display = 'block';
  document.getElementById('login-step-confirm').style.display = 'none';
  document.getElementById('login-title').textContent = signup ? 'Criar conta' : 'Salvar na nuvem';
  document.getElementById('login-text').textContent = signup
    ? 'Crie uma conta com seu e-mail e uma senha.'
    : 'Entre com sua conta para salvar as sessões na nuvem.';
  document.getElementById('login-submit-btn').textContent = signup ? 'Criar conta' : 'Entrar';
  document.getElementById('login-switch').textContent = signup ? 'Já tenho conta — entrar' : 'Ainda não tenho conta — criar';
  document.getElementById('login-password').autocomplete = signup ? 'new-password' : 'current-password';
  document.getElementById('login-error').textContent = '';
}

function toggleLoginMode() {
  setLoginMode(loginMode === 'signin' ? 'signup' : 'signin');
}

function loginErrorMsg(e) {
  const code = e?.code || '';
  const msg  = (e?.message || '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada ou spam).';
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'Esse e-mail já tem conta. Toque em "entrar".';
  if (code === 'weak_password' || msg.includes('password should')) return 'Senha fraca: use pelo menos 6 caracteres.';
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (!navigator.onLine) return 'Sem internet no momento.';
  return 'Não foi possível concluir. Tente de novo.';
}

async function loginSubmit() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  const btn = document.getElementById('login-submit-btn');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Digite um e-mail válido'; return; }
  if (password.length < 6) { err.textContent = 'A senha precisa ter pelo menos 6 caracteres'; return; }
  err.textContent = '';
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Aguarde…';
  try {
    if (loginMode === 'signup') {
      const result = await Cloud.signUp(email, password);
      if (result === 'confirm') {
        document.getElementById('login-sent-to').textContent = email;
        document.getElementById('login-step-form').style.display = 'none';
        document.getElementById('login-step-confirm').style.display = 'block';
        return;
      }
    } else {
      await Cloud.signIn(email, password);
    }
    closeLogin();
  } catch (e) {
    err.textContent = loginErrorMsg(e);
    console.warn(e);
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

async function logoutCloud() {
  if (!confirm('Sair da conta neste aparelho? O que ainda não foi enviado continua guardado aqui.')) return;
  await Cloud.signOut();
}

function newSession() {
  clearState();
  location.reload();
}