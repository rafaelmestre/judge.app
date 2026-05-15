const TEAMS_DEF = [
  { id:'azul', name:'Azul', color:'#2563EB' },
  { id:'vermelho', name:'Vermelho', color:'#DC2626' },
  { id:'verde', name:'Verde', color:'#16A34A' },
  { id:'amarelo', name:'Amarelo', color:'#CA8A04' },
  { id:'branco', name:'Sem colete', color:'#9CA3AF' }
];

let selectedTeams = [];
let queue = [];
let playing = [null, null];
let scores = [0, 0];
let consecutiveWins = 0;
let winnerTeam = null;
let roundNumber = 0;
let timerSeconds = 480;
let timerRunning = false;
let timerInterval = null;
let roundEnded = false;
let pendingSorteio = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function renderTeamSelector() {
  const el = document.getElementById('team-selector');
  el.innerHTML = TEAMS_DEF.map(t => `
    <div class="team-slot ${selectedTeams.includes(t.id)?'selected':''}" onclick="toggleTeam('${t.id}')">
      <div class="team-dot" style="background:${t.color}"></div>
      <span class="team-name-label">${t.name}</span>
    </div>`).join('');
}

function toggleTeam(id) {
  if (selectedTeams.includes(id)) {
    selectedTeams = selectedTeams.filter(x => x !== id);
  } else if (selectedTeams.length < 6) {
    selectedTeams.push(id);
  }
  renderTeamSelector();
  renderQueuePreview();
  document.getElementById('btn-start-game').disabled = selectedTeams.length < 2;
}

function getTeam(id) { return TEAMS_DEF.find(t => t.id === id); }

function renderQueuePreview() {
  const el = document.getElementById('queue-preview');
  const list = selectedTeams.length > 0 ? selectedTeams : [];
  el.innerHTML = list.map((id,i) => {
    const t = getTeam(id);
    return `<div class="queue-badge" style="background:${t.color}22;color:${t.color};border:0.5px solid ${t.color}44">
      <div class="dot" style="background:${t.color}"></div>${i+1}. ${t.name}</div>`;
  }).join('');
}

function shuffleQueue() {
  for (let i = selectedTeams.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [selectedTeams[i],selectedTeams[j]] = [selectedTeams[j],selectedTeams[i]];
  }
  renderTeamSelector();
  renderQueuePreview();
}

function startGame() {
  queue = [...selectedTeams];
  playing = [queue.shift(), queue.shift()];
  consecutiveWins = 0;
  winnerTeam = null;
  roundNumber = 1;
  loadRound();
  showScreen('screen-match');
}

function loadRound() {
  scores = [0, 0];
  timerSeconds = 480;
  timerRunning = false;
  roundEnded = false;
  clearInterval(timerInterval);
  updateTimerDisplay();
  document.getElementById('round-label').textContent = `Rodada ${roundNumber}`;
  const ta = getTeam(playing[0]);
  const tb = getTeam(playing[1]);
  document.getElementById('name-a').textContent = ta.name;
  document.getElementById('name-b').textContent = tb.name;
  document.getElementById('bar-a').style.background = ta.color;
  document.getElementById('bar-b').style.background = tb.color;
  document.getElementById('score-a').textContent = '0';
  document.getElementById('score-b').textContent = '0';
  updateWinsBadge();
  updateNextDisplay();
  updateQueueDisplay();
  const btn = document.getElementById('btn-play');
  btn.className = 'ctrl-btn start';
  btn.innerHTML = '<i class="ti ti-player-play" aria-hidden="true"></i> Iniciar';
}

function updateWinsBadge() {
  const el = document.getElementById('wins-badge');
  const w = consecutiveWins;
  el.textContent = w === 0 ? '0 vitórias' : w === 1 ? '1 vitória consecutiva' : `${w} vitórias consecutivas`;
  el.className = `wins-badge wins-${Math.min(w,2)}`;
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds/60);
  const s = timerSeconds % 60;
  const el = document.getElementById('timer-display');
  el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
  el.className = 'timer-big' + (timerSeconds <= 60 && timerSeconds > 0 ? ' warning' : timerSeconds === 0 ? ' done' : '');
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

function changeScore(team, delta) {
  if (roundEnded) return;
  scores[team] = Math.max(0, scores[team] + delta);
  document.getElementById(team===0?'score-a':'score-b').textContent = scores[team];
  if (scores[0] >= 2 || scores[1] >= 2) {
    clearInterval(timerInterval);
    timerRunning = false;
    endRound('goals');
  }
}

function endRound(reason) {
  if (roundEnded) return;
  roundEnded = true;
  clearInterval(timerInterval);
  timerRunning = false;
  roundNumber++;

  const ta = getTeam(playing[0]);
  const tb = getTeam(playing[1]);
  document.getElementById('res-dot-a').style.background = ta.color;
  document.getElementById('res-dot-b').style.background = tb.color;
  document.getElementById('res-name-a').textContent = ta.name;
  document.getElementById('res-name-b').textContent = tb.name;
  document.getElementById('res-score-a').textContent = scores[0];
  document.getElementById('res-score-b').textContent = scores[1];

  let title, sub, icon, infoHtml;
  let bothOut = false;
  pendingSorteio = null;

  if (scores[0] === scores[1]) {
    title = 'Empate!';
    sub = `${ta.name} ${scores[0]} × ${scores[1]} ${tb.name}`;
    icon = '🤝';
    bothOut = true;
    consecutiveWins = 0;
    winnerTeam = null;
    infoHtml = `<strong>Ambos saem.</strong> Os próximos da fila entram.`;
  } else {
    const winIdx = scores[0] > scores[1] ? 0 : 1;
    const loseIdx = 1 - winIdx;
    const winner = getTeam(playing[winIdx]);
    const loser = getTeam(playing[loseIdx]);

    if (winnerTeam === playing[winIdx]) {
      consecutiveWins++;
    } else {
      consecutiveWins = 1;
      winnerTeam = playing[winIdx];
    }

    if (consecutiveWins >= 3) {
      title = '3 vitórias consecutivas!';
      sub = `${winner.name} dominou — ambos saem.`;
      icon = '🏆';
      bothOut = true;
      consecutiveWins = 0;
      winnerTeam = null;
      infoHtml = `<strong>${winner.name}</strong> atingiu 3 vitórias seguidas. Ambos vão para o final da fila.`;
    } else {
      title = `${winner.name} venceu!`;
      sub = reason === 'time' ? 'Tempo esgotado' : '2 gols marcados';
      icon = '⚽';
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
    }
  }

  document.getElementById('result-icon').textContent = icon;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-sub').textContent = sub;
  document.getElementById('result-info').innerHTML = infoHtml;

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
  el.innerHTML = `<div class="mini-dot" style="background:${ta.color}"></div>
    <span class="next-name">${ta.name} entra antes de ${tb.name}</span>`;
  pendingSorteio = null;
  document.getElementById('btn-next-round').style.display = 'block';
}

function nextRound() {
  showScreen('screen-match');
  loadRound();
}

function updateNextDisplay() {
  const el = document.getElementById('next-teams-display');
  const sec = document.getElementById('next-section');
  if (queue.length >= 2) {
    const ta = getTeam(queue[0]);
    const tb = getTeam(queue[1]);
    el.innerHTML = `<div class="mini-dot" style="background:${ta.color}"></div>
      <span class="next-name">${ta.name}</span>
      <span style="color:var(--color-text-secondary);font-size:12px">vs</span>
      <div class="mini-dot" style="background:${tb.color}"></div>
      <span class="next-name">${tb.name}</span>`;
    sec.style.display = 'block';
  } else if (queue.length === 1) {
    const ta = getTeam(queue[0]);
    el.innerHTML = `<div class="mini-dot" style="background:${ta.color}"></div>
      <span class="next-name">${ta.name} aguarda</span>`;
    sec.style.display = 'block';
  } else {
    sec.style.display = 'none';
  }
}

function updateQueueDisplay() {
  const el = document.getElementById('queue-display');
  el.innerHTML = queue.map((id,i) => {
    const t = getTeam(id);
    return `<div class="queue-badge" style="background:${t.color}22;color:${t.color};border:0.5px solid ${t.color}44">
      <div class="dot" style="background:${t.color}"></div>${i+1}. ${t.name}</div>`;
  }).join('') || `<span style="font-size:13px;color:var(--color-text-secondary)">Fila vazia</span>`;
}

renderTeamSelector();
renderQueuePreview();