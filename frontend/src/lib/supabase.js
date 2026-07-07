// Supabase client — config is fetched at runtime from the backend
// so no VITE_* env vars are needed in web-react/.env
import { createClient } from '@supabase/supabase-js';

function getConfig() {
  // Injected by GET /config/supabase.js served from Express
  if (window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
    return window.SUPABASE_CONFIG;
  }
  // Fallback: Vite build-time vars (only present if web-react/.env exists)
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

const { url, anonKey } = getConfig();

if (!url || !anonKey) {
  console.warn('[Dobium] Supabase config missing — auth will be unavailable.');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
