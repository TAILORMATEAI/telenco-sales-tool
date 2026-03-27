const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://lksvpkoavcmlwfkonowc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc3Zwa29hdmNtbHdma29ub3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE4NTczOSwiZXhwIjoyMDg5NzYxNzM5fQ.oyFn7lsmDaYnQhkHGgEqj7HxJJbnZ35zzf9fn89SKXI'
);
client.auth.admin.getUserById('0c6c7708-a973-4fec-8e36-ea9a85aeeca7')
  .then(r => console.log(JSON.stringify(r)))
  .catch(e => console.error("ERR:", e));
