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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('id, slug, name')
    .limit(1)
    .single();
  
  if (restError || !restaurant) {
    console.error('Error fetching restaurant:', restError);
    process.exit(1);
  }

  const { data: table, error: tableError } = await supabase
    .from('restaurant_tables')
    .select('id, table_number, qr_token')
    .eq('restaurant_id', restaurant.id)
    .limit(1)
    .single();

  if (tableError || !table) {
    console.error('Error fetching table:', tableError);
    process.exit(1);
  }

  console.log(`Restaurant: ${restaurant.name} (${restaurant.slug})`);
  console.log(`Table: ${table.table_number} (${table.id})`);
  console.log(`Customer URL path: /${restaurant.slug}/${table.id}?qr_token=${table.qr_token}`);
}

run();
