import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL as string)?.trim().replace(/\/$/, '');
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
}
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string)?.trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
