/**
 * Check if a user exists in Supabase
 * Usage: npx ts-node check-user.ts test@example.com
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkUser(email: string) {
  console.log(`Checking for user: ${email}\n`);

  try {
    // List all users (requires service role key)
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return;
    }

    const user = users.users.find((u) => u.email === email);

    if (user) {
      console.log('✅ User found!');
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Created:', user.created_at);
      console.log('Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
      console.log('Last sign in:', user.last_sign_in_at || 'Never');
    } else {
      console.log('❌ User not found');
      console.log('\nTo create this user, use the mobile app signup screen.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx ts-node check-user.ts <email>');
  process.exit(1);
}

checkUser(email);
