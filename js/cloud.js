/* ═══════════════════════════════════════════════════
   JUDGE APP — cloud.js
   Login por e-mail e senha + sincronização offline-first.

   Como funciona:
   - Tudo que precisa ir pra nuvem entra numa "caixa de saída"
     (outbox) guardada no aparelho.
   - Quando há internet E usuário logado, a caixa é enviada em
     ordem. Sem internet, nada se perde: envia depois.
   - Os IDs são gerados no app, então reenviar não duplica (upsert).
═══════════════════════════════════════════════════ */
const Cloud = (() => {
  const OUTBOX_KEY = 'judgeapp_outbox';
  let client   = null;
  let user     = null;
  let flushing = false;
  let lastError = null;
  let outbox   = loadOutbox();

  function loadOutbox() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || []; } catch (e) { return []; }
  }
  function saveOutbox() {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox)); } catch (e) {}
  }

  const configured = () =>
    typeof SUPABASE_URL !== 'undefined' && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

  async function init() {
    if (!configured() || !window.supabase) { notify(); return; }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    client.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      notify();
      if (user) flush();
    });
    const { data } = await client.auth.getSession();
    user = data.session?.user || null;
    notify();
    flush();
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) flush(); });
  }

  /* ── fila de envio ── */
  function enqueue(table, row) {
    // se já existe um item pendente pro mesmo registro, substitui (mantém o mais novo)
    const i = outbox.findIndex(it => it.table === table && it.row.id === row.id);
    if (i >= 0) outbox[i] = { table, row };
    else outbox.push({ table, row });
    saveOutbox();
    notify();
    flush();
  }

  async function flush() {
    if (!client || !user || flushing || !navigator.onLine) return;
    flushing = true;
    lastError = null;
    try {
      while (outbox.length) {
        const { table, row } = outbox[0];
        const { error } = await client.from(table).upsert(row);
        if (error) {
          // 23503 = a sessão desse item foi excluída: descarta e segue
          if (error.code === '23503') { console.warn('[Cloud] descartado', error); outbox.shift(); saveOutbox(); continue; }
          lastError = error.message; console.warn('[Cloud]', error); break;
        }
        outbox.shift();
        saveOutbox();
      }
    } catch (e) {
      lastError = String(e);
    } finally {
      flushing = false;
      notify();
      // deu erro? tenta de novo daqui a 30s
      if (outbox.length && lastError) setTimeout(flush, 30000);
    }
  }

  /* ── login por e-mail + senha ── */
  async function signIn(email, password) {
    if (!client) throw new Error('Nuvem não configurada');
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /* retorna 'ok' (já logado) ou 'confirm' (precisa confirmar no e-mail) */
  async function signUp(email, password) {
    if (!client) throw new Error('Nuvem não configurada');
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    if (error) throw error;
    // e-mail já cadastrado: o Supabase devolve usuário sem identidades
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const e = new Error('already registered'); e.code = 'user_already_exists'; throw e;
    }
    return data.session ? 'ok' : 'confirm';
  }

  async function signOut() {
    if (client) await client.auth.signOut();
  }

  /* ── leitura do histórico ── */
  async function listSessions(limit = 30) {
    if (!client || !user) return [];
    const { data, error } = await client
      .from('sessions')
      .select('*, rounds(*)')
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  /* ── edição de sessões (precisa de internet) ── */
  function requireOnline() {
    if (!client || !user) throw Object.assign(new Error('not logged'), { code: 'not_logged' });
    if (!navigator.onLine) throw Object.assign(new Error('offline'), { code: 'offline' });
  }

  async function renameSession(id, name) {
    requireOnline();
    const { error } = await client.from('sessions').update({ name: name || null }).eq('id', id);
    if (error) throw error;
  }

  async function deleteSession(id) {
    requireOnline();
    // tira da fila qualquer envio pendente dessa sessão (senão ela "renasce")
    outbox = outbox.filter(it => it.row.id !== id && it.row.session_id !== id);
    saveOutbox();
    const { error } = await client.from('sessions').delete().eq('id', id); // rodadas saem junto (cascade)
    if (error) throw error;
    notify();
  }

  /* avisa a interface que o status mudou */
  function notify() {
    if (typeof renderCloudStatus === 'function') renderCloudStatus();
  }

  function status() {
    return {
      configured: configured() && !!client,
      loggedIn: !!user,
      email: user?.email || null,
      pending: outbox.length,
      online: navigator.onLine,
      error: lastError,
    };
  }

  return { init, enqueue, flush, signIn, signUp, signOut, listSessions, renameSession, deleteSession, status };
})();

/* ID único gerado no aparelho (funciona offline) */
function newId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}