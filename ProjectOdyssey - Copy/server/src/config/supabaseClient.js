const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SB_PROJECT_URL;
// Use Service Role Key if available (for Admin write access), otherwise fallback to Anon Key
const supabaseKey = process.env.SB_SERVICE_ROLE_KEY || process.env.SB_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
