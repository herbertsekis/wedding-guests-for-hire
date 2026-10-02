import { createClient } from '@supabase/supabase-js';

export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment variables are not configured.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function transactionByReference(reference) {
  const { data, error } = await db().from('transactions').select('*, submitted:employees!transactions_submitted_by_fkey(*), decided:employees!transactions_decision_by_fkey(*)').eq('reference', reference).single();
  if (error) throw error;
  return data;
}
