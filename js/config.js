$c = @'
/* ═══════════════════════════════════════════════════
   JUDGE APP — config.js
   Dados do projeto Supabase (Project Settings → API).
   A chave publishable é pública por natureza: quem protege os dados
   são as regras de segurança (RLS) do schema.sql.
   NUNCA coloque aqui a chave "service_role" / "secret".
═══════════════════════════════════════════════════ */
const SUPABASE_URL      = 'https://ngycaqihrnynfzuirxmz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2wim0KPaxoMBQsW_xsIabA_vCm5aL71';
'@
[IO.File]::WriteAllText("$PWD\js\config.js", $c, (New-Object Text.UTF8Encoding $false))