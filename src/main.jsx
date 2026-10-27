import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Bulletproof self-healing: automatically purge dead/stale Supabase project URLs
try {
  const stale = localStorage.getItem('rp_supabase_config_v1');
  if (stale && (stale.includes('jhgedjjnxsimgsfornmn') || !stale.includes('tedwgnybnkfzijvhvssx'))) {
    localStorage.removeItem('rp_supabase_config_v1');
    localStorage.removeItem('rp_offline_auth_session');
    console.warn('[SelfHealing] Purged obsolete Supabase project from localStorage.');
  }
} catch (_) {}

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
