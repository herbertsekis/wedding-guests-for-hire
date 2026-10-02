import { NextResponse } from 'next/server';
import { actor } from '../../../lib/session';
import { db } from '../../../lib/supabase';

export async function POST(request) {
  try {
    if ((await actor()).role !== 'manager') return NextResponse.json({ error: 'Only Svetlana can link Telegram IDs.' }, { status: 403 });
    const { employeeId, telegramUserId } = await request.json();
    if (!/^\d+$/.test(String(telegramUserId))) return NextResponse.json({ error: 'Telegram user ID must be numeric.' }, { status: 400 });
    const { error } = await db().from('employees').update({ telegram_user_id: String(telegramUserId) }).eq('id', employeeId);
    if (error) throw error;
    const token = process.env.TELEGRAM_BOT_TOKEN, secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!token || !secret) throw new Error('Telegram server configuration is incomplete.');
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: `${request.nextUrl.origin}/api/telegram`, secret_token: secret, allowed_updates: ['message'] }) });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.description || 'Telegram webhook setup failed.');
    return NextResponse.json({ ok: true, webhook: body.description });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
}
