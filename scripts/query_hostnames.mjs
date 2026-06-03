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
  console.log('Querying dishes table...');
  const { data: dishes, error: dishesError } = await supabase
    .from('dishes')
    .select('image_url');
  
  if (dishesError) {
    console.error('Error fetching dishes:', dishesError);
  }

  console.log('Querying restaurants table...');
  const { data: restaurants, error: restError } = await supabase
    .from('restaurants')
    .select('logo_url');
  
  if (restError) {
    console.error('Error fetching restaurants:', restError);
  }

  const urls = [];
  if (dishes) {
    dishes.forEach(d => {
      if (d.image_url) urls.push(d.image_url);
    });
  }
  if (restaurants) {
    restaurants.forEach(r => {
      if (r.logo_url) urls.push(r.logo_url);
    });
  }

  const hostnames = new Set();
  urls.forEach(u => {
    try {
      const url = new URL(u);
      hostnames.add(url.hostname);
    } catch (e) {
      console.log('Invalid URL found:', u);
    }
  });

  console.log('\n--- UNIQUE HOSTNAMES ---');
  console.log(Array.from(hostnames));
}

run();
