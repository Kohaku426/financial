import { createClient } from '@supabase/supabase-js';

// Sanitization function to remove quotes and trailing slashes
const sanitize = (val: string | undefined) => {
    if (!val) return '';
    return val.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
};

let supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
}
const supabaseAnonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
