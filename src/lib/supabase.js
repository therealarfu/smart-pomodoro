import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY " +
      "no arquivo .env.local (veja .env.example)."
  );
}

// persistSession (padrão: true) guarda a sessão de login no localStorage do
// navegador, então diferente da versão em artefato, aqui você continua
// logado mesmo depois de fechar a aba ou o navegador.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
