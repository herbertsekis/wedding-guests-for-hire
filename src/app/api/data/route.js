import { NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';
import { computeDashboard } from '../../../lib/calculations';
import { actor } from '../../../lib/session';

const employeeFields = 'id,name,role';
const transactionFields = '*, submitted:employees!transactions_submitted_by_fkey(id,name,role)';

export async function GET() {
  try {
    const { data: employees, error: employeeError } = await db().from('employees').select(employeeFields).order('name');
    if (employeeError) throw employeeError;

    let currentEmployee = null;
    try { currentEmployee = await actor(); } catch (error) { if (error.status !== 401) throw error; }
    if (!currentEmployee) return NextResponse.json({ employees, currentEmployee: null, transactions: [], dashboard: null });

    const transactionQuery = db().from('transactions').select(transactionFields).order('submitted_at', { ascending: false });
    if (currentEmployee.role !== 'manager') transactionQuery.eq('submitted_by', currentEmployee.id);
    const { data: transactions, error: transactionError } = await transactionQuery;
    if (transactionError) throw transactionError;

    return NextResponse.json({
      employees,
      currentEmployee: { id: currentEmployee.id, name: currentEmployee.name, role: currentEmployee.role },
      transactions,
      dashboard: currentEmployee.role === 'manager' ? computeDashboard(transactions) : null,
    });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
