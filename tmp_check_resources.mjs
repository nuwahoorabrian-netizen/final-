import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: resources, error: resError } = await supabase
    .from('resource_types')
    .select('id, name, total_quantity, available_quantity');
    
  if (resError) console.error(resError);
  console.log('--- RESOURCE TYPES ---');
  console.table(resources);
  
  const { data: allocations, error: allocError } = await supabase
    .from('event_resources')
    .select('event_id, resource_type_id, quantity, hired_quantity');
    
  if (allocError) console.error(allocError);
  console.log('--- ALLOCATIONS ---');
  console.table(allocations);
}

check();
