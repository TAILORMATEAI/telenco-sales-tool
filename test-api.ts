import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://lksvpkoavcmlwfkonowc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc3Zwa29hdmNtbHdma29ub3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE4NTczOSwiZXhwIjoyMDg5NzYxNzM5fQ.oyFn7lsmDaYnQhkHGgEqj7HxJJbnZ35zzf9fn89SKXI';
const client = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await client.auth.admin.getUserById('0c6c7708-a973-4fec-8e36-ea9a85aeeca7');
  console.log(JSON.stringify({ data, error }, null, 2));
}
test();
