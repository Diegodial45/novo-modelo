
import { createClient } from '@supabase/supabase-js';

// Credenciais fornecidas pelo usuário
const supabaseUrl = 'https://tvyivsndquudzykpqzak.supabase.co';
const supabaseKey = 'sb_publishable_za_vyFHrzVJ2s_1MOT4sNw_OpPMK1Q3';

export const supabase = createClient(supabaseUrl, supabaseKey);
