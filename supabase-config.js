/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — supabase-config.js

   INSTRUCTIONS (one-time setup):
   ─────────────────────────────
   1. Go to https://supabase.com and sign in
   2. Open your project -->  Click on "Connect" which is located top middle of screen with Green highlighted color 
                     --> Click on "Framework" --> Scroll-down page 
                     --> You can "Add Files" 
                     -->  Right side of "Add Files" section you can see two variables "NEXT_PUBLIC_SUPABASE_URL" & "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" 
                     --> Copy those two variables and place in equivalent variables ["SUPABASE_URL", "SUPABASE_ANON_KEY"] in this file.
   3. Copy "Project URL"  → paste below as SUPABASE_URL
   4. Copy "anon public"  → paste below as SUPABASE_ANON_KEY
   5. Save this file and re-upload to GitHub

   These two values are safe to expose in frontend code.
   They only allow actions permitted by your Row Level Security
   rules — they cannot bypass security or access other projects.
   ═══════════════════════════════════════════════════════════ */

var SUPABASE_URL      = 'https://vofonmiukimkjckjppbj.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_vWhO0REIM6vSQQJv1w3VVQ_oHmtwJQD';

/* ── Initialise the Supabase client ────────────────────────
   The supabase-js CDN script must be loaded BEFORE this file.
   It is included in every HTML <head> via:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
   ─────────────────────────────────────────────────────────── */
var _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Global helper used by all other JS files ──────────────
   Usage:  var { data, error } = await DAM.db().from('users')...
   ─────────────────────────────────────────────────────────── */
var DAM = {
  db:   function () { return _supabaseClient; },
  auth: function () { return _supabaseClient.auth; }
};
