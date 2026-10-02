import { db, transactionByReference } from './supabase.js';
import { requirePositive } from './money.js';
import { calculateCommissions, validateSplit } from './calculations.js';
import { syncTransaction } from './sheets.js';
import { sendDecisionNotification } from './telegram.js';

const salespeople = new Set(['Richard Call Me Dick Darling', 'Anastasia Ferrari', 'Jean-Claude Bērziņš']);
const allocations = new Set(['A', 'B', 'company_overhead']);
const projects = new Set(['A', 'B']);
const categories = new Set(['Materials', 'Travel', 'Other']);
const bad = (message, status = 400) => Object.assign(new Error(message), { status });

function normalizeReference(value, expected) { const r = String(value || '').trim().toUpperCase(); if (!new RegExp(`^${expected}[0-9]{2,}$`).test(r)) throw bad(`Reference must look like ${expected}01.`); return r; }
function assertRole(actor, allowed) { if (!allowed.includes(actor.role)) throw bad('This employee is not permitted to perform this action.', 403); }

// Called by both website routes and the Telegram webhook. It commits once, then performs
// best-effort external synchronization so an outage cannot lose the authoritative record.
export async function submitTransaction({ actor, source, chatId = null, input }) {
  const type = input.type;
  if (type === 'sale') {
    assertRole(actor, ['salesperson']); if (!salespeople.has(actor.name)) throw bad('Only named salespeople can submit sales.', 403);
    const reference = normalizeReference(input.reference, 'S'); const amount_cents = requirePositive(input.amount);
    if (!String(input.customer || '').trim() || !String(input.description || '').trim() || !projects.has(input.project)) throw bad('Customer, description, and project are required.');
    const proposed_split = validateSplit(input.proposedSplit);
    const { error } = await db().from('transactions').insert({ reference, type, submitted_by: actor.id, source, submitting_telegram_chat_id: chatId, customer: input.customer.trim(), project: input.project, description: input.description.trim(), amount_cents, proposed_split, status: 'pending_approval', notification_status: 'not_required' });
    if (error) { if (error.code === '23505') throw bad(`Reference ${reference} already exists.`, 409); throw error; }
    const record = await transactionByReference(reference); await attemptSheet(record); return record;
  }
  if (type === 'expense') {
    assertRole(actor, ['expense_reporter']); const reference = normalizeReference(input.reference, 'E'); const amount_cents = requirePositive(input.amount);
    if (!String(input.description || '').trim() || !categories.has(input.category) || !allocations.has(input.proposedAllocation)) throw bad('Description, category, and valid proposed allocation are required.');
    const automatic = input.proposedAllocation === 'company_overhead';
    const { error } = await db().from('transactions').insert({ reference, type, submitted_by: actor.id, source, submitting_telegram_chat_id: chatId, description: input.description.trim(), category: input.category, amount_cents, proposed_allocation: input.proposedAllocation, final_allocation: automatic ? 'company_overhead' : null, status: automatic ? 'allocated' : 'awaiting_allocation', notification_status: 'not_required' });
    if (error) { if (error.code === '23505') throw bad(`Reference ${reference} already exists.`, 409); throw error; }
    const record = await transactionByReference(reference); await attemptSheet(record); return record;
  }
  throw bad('Transaction type must be sale or expense.');
}

export async function decideTransaction({ actor, reference, decision }) {
  assertRole(actor, ['manager']); const old = await transactionByReference(reference);
  if (old.status === 'approved' || (old.type === 'expense' && old.status === 'allocated')) throw bad('This transaction has already been decided; totals cannot be changed.', 409);
  let updates;
  if (old.type === 'sale') {
    const split = validateSplit(decision.split); const final = calculateCommissions(old.amount_cents / 100, split);
    updates = { final_split: final.percentages, final_commission_amounts: final.amounts, status: 'approved', decision_by: actor.id, decided_at: new Date().toISOString(), notification_status: 'pending' };
  } else {
    if (!allocations.has(decision.allocation)) throw bad('Choose A, B, or company overhead.');
    updates = { final_allocation: decision.allocation, status: 'allocated', decision_by: actor.id, decided_at: new Date().toISOString(), notification_status: 'pending' };
  }
  const { error } = await db().from('transactions').update(updates).eq('id', old.id).in('status', old.type === 'sale' ? ['pending_approval'] : ['awaiting_allocation']);
  if (error) throw error;
  const record = await transactionByReference(reference); await attemptSheet(record); await attemptNotification(record); return await transactionByReference(reference);
}
export async function attemptSheet(record) { try { const rowNumber=await syncTransaction(record); await db().from('transactions').update({ sheet_sync_status:'synced', sheet_row_number:rowNumber, sheet_sync_error:null }).eq('id',record.id); } catch (e) { await db().from('transactions').update({ sheet_sync_status:'failed', sheet_sync_error:String(e.message).slice(0,500) }).eq('id',record.id); } }
export async function attemptNotification(record) { if (record.notification_status === 'not_required') return; try { await sendDecisionNotification(record); await db().from('transactions').update({ notification_status:'sent', notification_error:null }).eq('id',record.id); } catch (e) { const noRecipient = e.code === 'NO_RECIPIENT'; await db().from('transactions').update({ notification_status:noRecipient?'no_recipient':'failed', notification_error:String(e.message).slice(0,500) }).eq('id',record.id); } }
export async function retryExternal({ actor, reference, target }) { assertRole(actor, ['manager']); const record = await transactionByReference(reference); if (target === 'sheet') await attemptSheet(record); else if (target === 'notification') await attemptNotification(record); else throw bad('Unknown retry target.'); return transactionByReference(reference); }
