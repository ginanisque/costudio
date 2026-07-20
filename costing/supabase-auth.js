(function () {
  'use strict';
  const url = 'https://krbedficypujbukslgif.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYmVkZmljeXB1amJ1a3NsZ2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NjM2MzgsImV4cCI6MjEwMDEzOTYzOH0.BSHiK0GMqFMk_Go0vmWuQ4FuIf4p0MPlUYAK5cINGwU';
  if (!window.supabase) throw new Error('Supabase client failed to load.');
  window.costudioAuth = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
})();
