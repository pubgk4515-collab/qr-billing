import { createClient } from '@supabase/supabase-js';

// .env.local se keys le rahe hain
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Ek single Supabase client bana rahe hain jo poore app mein use hoga
export const supabase = createClient(supabaseUrl, supabaseKey);
