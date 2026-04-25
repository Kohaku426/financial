import { createClient } from '@supabase/supabase-js';

// Sanitization function to remove quotes, trailing slashes, and common API suffixes
const sanitize = (val: string | undefined) => {
    if (!val) return '';
    return val.trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/\/$/, '')           // Remove trailing slash
        .replace(/\/rest\/v1$/, '')   // Remove REST API suffix if accidentally included
        .replace(/\/auth\/v1$/, '');  // Remove Auth API suffix if accidentally included
};

let supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
}
const supabaseAnonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
