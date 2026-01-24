import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// VITE_SUPABASE_ANON_KEY = Publishable API Key (safe for client-side use)
// Supports both formats:
//   - New: sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (recommended)
//   - Legacy: eyJhbGc... (JWT-based anon key, still works)
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
    console.error('Use the PUBLISHABLE API key from Supabase Dashboard → Settings → API');
    console.error('Accepts: sb_publishable_xxx (new) or eyJ... JWT (legacy anon key)');
}

/**
 * Supabase client instance
 * Singleton pattern - same instance across app
 */
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
