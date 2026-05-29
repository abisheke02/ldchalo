const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Not configured — phone OTP auth will not work. See .env.example.');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Supabase] Client initialized');
}

module.exports = { supabase };
