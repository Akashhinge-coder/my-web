import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testToken = "test_token_123456";

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { "x-session-token": testToken } },
});

async function run() {
  console.log("Calling public.current_session_token()...");
  
  // We can run a raw sql or query a table using RLS to see if it sees it, 
  // or use RPC if it's exposed. Since RPC current_session_token might not be exposed, 
  // we can do a query on a table that uses it, or execute raw SQL using RPC.
  // Wait, does Supabase have a built-in sql function or RPC?
  // Let's check sessions which uses current_session_token() in RLS policy:
  const { data, error } = await anonClient
    .from('sessions')
    .select('id');
  
  console.log("Query sessions result:", data, "Error:", error);
}

run();
