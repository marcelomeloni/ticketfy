import { createClient } from '@supabase/supabase-js';


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica se as variáveis foram carregadas corretamente
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não foram encontradas. Verifique o seu ficheiro .env.local e reinicie o servidor.");
}

// Cria e exporta uma única instância do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

