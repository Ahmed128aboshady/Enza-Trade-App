// ============================================================================
// ENZA MOBILE — SUPABASE CONFIGURATION
// Configured with Public Anon Key for Enza Inventory project
// ============================================================================

try {
  const cachedKey = window.localStorage.getItem('enza_supabase_anon_key');
  if (cachedKey && cachedKey.startsWith('sb_secret_')) {
    window.localStorage.removeItem('enza_supabase_anon_key');
  }
} catch (e) {}

window.ENZA_SUPABASE_CONFIG = {
  supabaseUrl: 'https://dcezhqnzontmqwijysbu.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZXpocW56b250bXF3aWp5c2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MjY1ODQsImV4cCI6MjEwOTIwMjU4NH0.Crr5_hLd5NQtRQgjnxMHcYbCszphXXeILkPKMRv-7eE',
  
  save: function(url, anonKey) {
    if (url) window.localStorage.setItem('enza_supabase_url', url.trim());
    if (anonKey) window.localStorage.setItem('enza_supabase_anon_key', anonKey.trim());
    this.supabaseUrl = window.localStorage.getItem('enza_supabase_url') || this.supabaseUrl;
    this.supabaseAnonKey = window.localStorage.getItem('enza_supabase_anon_key') || this.supabaseAnonKey;
  },

  clear: function() {
    window.localStorage.removeItem('enza_supabase_url');
    window.localStorage.removeItem('enza_supabase_anon_key');
    this.supabaseUrl = 'https://dcezhqnzontmqwijysbu.supabase.co';
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZXpocW56b250bXF3aWp5c2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MjY1ODQsImV4cCI6MjEwOTIwMjU4NH0.Crr5_hLd5NQtRQgjnxMHcYbCszphXXeILkPKMRv-7eE';
  },

  isConfigured: function() {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey && this.supabaseUrl.startsWith('https://'));
  }
};
