import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking database tables...");

  const { data: restaurants, error: restError } = await supabase
    .from('restaurants')
    .select('*');
  console.log('RESTAURANTS:', JSON.stringify(restaurants, null, 2));

  const { data: tables, error: tableError } = await supabase
    .from('restaurant_tables')
    .select('*');
  console.log('TABLES:', JSON.stringify(tables, null, 2));

  const { data: sessions, error: sessError } = await supabase
    .from('sessions')
    .select('*');
  console.log('SESSIONS:', JSON.stringify(sessions, null, 2));

  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*');
  console.log('ORDERS:', JSON.stringify(orders, null, 2));

  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*');
  console.log('ORDER ITEMS:', JSON.stringify(orderItems, null, 2));
}

run();
