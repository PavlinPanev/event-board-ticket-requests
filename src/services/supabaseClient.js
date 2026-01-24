import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// VITE_SUPABASE_ANON_KEY = Publishable API Key (safe for client-side use)
// Supports both formats:
//   - New: sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (recommended)
//   - Legacy: eyJhbGc... (JWT-based anon key, still works)
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    const errorMsg = `
❌ Missing Supabase environment variables!

Please check:
1. .env file exists in project root
2. Contains: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
3. Dev server was restarted after creating/editing .env

Current values:
- VITE_SUPABASE_URL: ${supabaseUrl || '❌ NOT SET'}
- VITE_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ SET' : '❌ NOT SET'}

Get credentials from: Supabase Dashboard → Settings → API
    `;
    console.error(errorMsg);
    throw new Error('Supabase credentials not configured. Check console for details.');
}

/**
 * Supabase client instance
 * Singleton pattern - same instance across app
 */
export const supabase = createClient(supabaseUrl, supabaseKey);
