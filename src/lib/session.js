import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './supabase.js';

const COOKIE = 'wedding_demo_role';
function secret() { if (!process.env.DEMO_SESSION_SECRET) throw new Error('DEMO_SESSION_SECRET is not configured.'); return process.env.DEMO_SESSION_SECRET; }
export function makeDemoSession(employeeId) { const body = JSON.stringify({ employeeId }); const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url'); return Buffer.from(body).toString('base64url') + '.' + sig; }
export async function actor() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) throw Object.assign(new Error('Choose a Demonstration role first.'), { status: 401 });
  const [body64, signature] = token.split('.'); const body = Buffer.from(body64 || '', 'base64url').toString();
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw Object.assign(new Error('Invalid demonstration session.'), { status: 401 });
  const { employeeId } = JSON.parse(body); const { data, error } = await db().from('employees').select('*').eq('id', employeeId).single();
  if (error || !data) throw Object.assign(new Error('Selected employee no longer exists.'), { status: 401 });
  return data;
}
export const demoCookie = COOKIE;
