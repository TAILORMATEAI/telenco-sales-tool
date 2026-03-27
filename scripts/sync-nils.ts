import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncNils() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) throw usersError;

  const nils = users.users.find(u => u.email === 'nils@telenco.be');
  if (!nils) {
    console.log('Nils not found in auth.users!');
    return;
  }

  console.log('Found Nils:', nils.id, nils.email);

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', nils.id)
    .single();

  if (profile) {
    console.log('Profile already exists!', profile);
    
    // Update the name just in case it was missing
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ first_name: 'Nils', last_name: 'Van Tilt' })
      .eq('id', nils.id);
      
    if (updateError) throw updateError;
    console.log('Profile updated successfully!');
  } else {
    console.log('Inserting profile...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: nils.id,
        first_name: 'Nils',
        last_name: 'Van Tilt',
      });
    if (insertError) throw insertError;
    console.log('Profile inserted successfully!');
  }
}

syncNils().catch(console.error);
