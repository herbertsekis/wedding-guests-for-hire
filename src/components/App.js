'use client';
import { useEffect, useState } from 'react';
import { canSubmitExpense, canSubmitSale, isManager as hasManagerRole } from '../lib/roles';

const fmt = n => `€${(Number(n || 0) / 100).toFixed(2)}`;
const api = async (path, body) => {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json();
  if (!response.ok) throw Error(json.error);
  return json;
};

function Field({ label, ...props }) { return <label>{label}<input required {...props} /></label>; }

function SaleForm({ reload }) {
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await api('/api/transactions', { type: 'sale', reference: values.get('reference'), customer: values.get('customer'), project: values.get('project'), description: values.get('description'), amount: values.get('amount'), proposedSplit: { richard: values.get('richard'), anastasia: values.get('anastasia'), jean_claude: values.get('jean') } });
      setMessage('Sale saved.'); form.reset(); reload();
    } catch (error) { setMessage(error.message); }
  }
  return <form onSubmit={submit}><h3>Sales entry</h3><Field label="Reference" name="reference" placeholder="S01" /><Field label="Customer" name="customer" /><label>Project<select name="project"><option>A</option><option>B</option></select></label><Field label="Description" name="description" /><Field label="Amount EUR" name="amount" type="number" min="0.01" step="0.01" /><div className="split"><Field label="Richard %" name="richard" type="number" min="0" max="100" /><Field label="Anastasia %" name="anastasia" type="number" min="0" max="100" /><Field label="Jean-Claude %" name="jean" type="number" min="0" max="100" /></div><button>Submit sale</button><output>{message}</output></form>;
}

function ExpenseForm({ reload }) {
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await api('/api/transactions', { type: 'expense', reference: values.get('reference'), description: values.get('description'), category: values.get('category'), amount: values.get('amount'), proposedAllocation: values.get('allocation') });
      setMessage('Expense saved.'); form.reset(); reload();
    } catch (error) { setMessage(error.message); }
  }
  return <form onSubmit={submit}><h3>Expense entry</h3><Field label="Reference" name="reference" placeholder="E01" /><Field label="Description" name="description" /><label>Category<select name="category"><option>Materials</option><option>Travel</option><option>Other</option></select></label><Field label="Amount EUR" name="amount" type="number" min="0.01" step="0.01" /><label>Proposed allocation<select name="allocation"><option value="A">A</option><option value="B">B</option><option value="company_overhead">Company overhead</option></select></label><button>Submit expense</button><output>{message}</output></form>;
}

function Card({ title, value }) { return <div className="card"><span>{title}</span><strong>{value}</strong></div>; }
function Details({ transaction }) { return transaction.type === 'sale' ? `${transaction.customer}; ${transaction.project}; ${fmt(transaction.amount_cents)}` : `${transaction.description}; proposed ${transaction.proposed_allocation}; ${fmt(transaction.amount_cents)}`; }

function ManagerDecisionForm({ transaction, close, reload, setMessage }) {
  const isSale = transaction.type === 'sale';
  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const decision = isSale
      ? { split: { richard: values.get('richard'), anastasia: values.get('anastasia'), jean_claude: values.get('jean_claude') } }
      : { allocation: values.get('allocation') };
    try {
      await api('/api/decisions', { reference: transaction.reference, decision });
      setMessage(`Decision saved for ${transaction.reference}.`);
      close();
      reload();
    } catch (error) { setMessage(error.message); }
  }
  return <section className="decision-panel" aria-labelledby="manager-decision-heading">
    <h2 id="manager-decision-heading">Manager decision for {transaction.reference}</h2>
    <p>Enter the final values below, then select Save decision.</p>
    <form onSubmit={submit}>
      {isSale ? <div className="split"><Field label="Final Richard %" name="richard" type="number" min="0" max="100" defaultValue={transaction.proposed_split.richard} /><Field label="Final Anastasia %" name="anastasia" type="number" min="0" max="100" defaultValue={transaction.proposed_split.anastasia} /><Field label="Final Jean-Claude %" name="jean_claude" type="number" min="0" max="100" defaultValue={transaction.proposed_split.jean_claude} /></div> : <label>Final allocation<select name="allocation" defaultValue={transaction.proposed_allocation}><option value="A">A</option><option value="B">B</option><option value="company_overhead">Company overhead</option></select></label>}
      <button>Save decision</button><button type="button" onClick={close}>Cancel</button>
    </form>
  </section>;
}

export default function App() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [decisionTransaction, setDecisionTransaction] = useState(null);
  const reload = () => api('/api/data').then(setData).catch(error => setMessage(error.message));
  useEffect(reload, []);
  if (!data) return <main>Loading finance system… {message}</main>;

  const { employees, currentEmployee, transactions, dashboard } = data;
  const isManager = hasManagerRole(currentEmployee?.role);

  async function role(employeeId) {
    try { await api('/api/demo-role', { employeeId }); await reload(); setMessage('Demonstration role selected.'); } catch (error) { setMessage(error.message); }
  }
  async function retry(transaction, target) { try { await api('/api/retry', { reference: transaction.reference, target }); reload(); } catch (error) { setMessage(error.message); } }
  async function link(event) {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    try { await api('/api/telegram-link', { employeeId: values.get('employeeId'), telegramUserId: values.get('telegramUserId') }); setMessage('Telegram ID linked.'); event.currentTarget.reset(); reload(); } catch (error) { setMessage(error.message); }
  }

  return <main>
    <header><p className="eyebrow">Friends Included Ltd</p><h1>Wedding Guests for Hire</h1><p>Finance system implemented by <b>Herberts Ēķis</b>. All friendships expire at checkout.</p></header>
    <section className="role"><h2>Demonstration role</h2><p>{currentEmployee ? `Signed in as ${currentEmployee.name}.` : 'Choose an employee to start the demonstration.'}</p>{employees.map(employee => <button key={employee.id} onClick={() => role(employee.id)}>{employee.name}</button>)}<output>{message}</output></section>
    {!currentEmployee ? <section><p>Select a role above. Employee views show only their own submitted records; Svetlana sees the full manager ledger.</p></section> : <>
      {!isManager && <section><h2>Your submissions</h2><p>You can view only your own records and their current statuses.</p></section>}
      <section className="forms">{canSubmitSale(currentEmployee.role) && <SaleForm reload={reload} />}{canSubmitExpense(currentEmployee.role) && <ExpenseForm reload={reload} />}</section>
      {isManager && <section><h2>Financial dashboard</h2><div className="cards">{['A', 'B'].map(project => <Card key={project} title={`Project ${project} result`} value={fmt(dashboard[project].result)} />)}<Card title="Company result" value={fmt(dashboard.company.result)} /><Card title="Company overhead" value={fmt(dashboard.company.overhead)} /><Card title="Awaiting allocation" value={fmt(dashboard.company.awaiting)} /></div><table><thead><tr><th>Measure</th><th>A</th><th>B</th><th>Company</th></tr></thead><tbody>{[['Approved income', 'income'], ['Commission expense', 'commissions'], ['Allocated expenses', 'expenses'], ['Result', 'result']].map(([label, key]) => <tr key={key}><td>{label}</td><td>{fmt(dashboard.A[key])}</td><td>{fmt(dashboard.B[key])}</td><td>{fmt(dashboard.company[key])}</td></tr>)}</tbody></table><p>Commission earned: Richard {fmt(dashboard.earned.richard)}, Anastasia {fmt(dashboard.earned.anastasia)}, Jean-Claude {fmt(dashboard.earned.jean_claude)}.</p></section>}
      {isManager && decisionTransaction && <ManagerDecisionForm transaction={decisionTransaction} close={() => setDecisionTransaction(null)} reload={reload} setMessage={setMessage} />}
      <section><h2>{isManager ? 'Records and manager controls' : 'Your record status'}</h2><table><thead><tr><th>Reference</th>{isManager && <th>Submitter</th>}<th>Details</th><th>Status</th>{isManager && <><th>Sheets</th><th>Notification</th><th>Actions</th></>}</tr></thead><tbody>{transactions.map(transaction => <tr key={transaction.id}><td>{transaction.reference}</td>{isManager && <td>{transaction.submitted.name}</td>}<td><Details transaction={transaction} /></td><td>{transaction.status}</td>{isManager && <><td>{transaction.sheet_sync_status}{transaction.sheet_sync_status !== 'synced' && <button onClick={() => retry(transaction, 'sheet')}>Retry Sheets sync</button>}</td><td>{transaction.notification_status}{['failed', 'no_recipient'].includes(transaction.notification_status) && <button onClick={() => retry(transaction, 'notification')}>Retry notification</button>}</td><td>{(transaction.status === 'pending_approval' || transaction.status === 'awaiting_allocation') && <button onClick={() => setDecisionTransaction(transaction)}>Approve / correct</button>}</td></>}</tr>)}</tbody></table></section>
      {isManager && <section><h2>Manager setup</h2><form onSubmit={link}><label>Employee<select name="employeeId">{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><Field label="Telegram numeric user ID" name="telegramUserId" /><button>Link Telegram ID</button></form></section>}
    </>}
    <footer><h2>Instructions and reviewer links</h2><p>Salespeople submit sales; Kevin submits expenses; Svetlana approves or corrects pending records. Website and Telegram use the same processing code. Start the bot before notifications.</p><a href={process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || '#'}>Telegram bot</a>{isManager && <> · <a href={process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL || '#'}>Google Sheets</a></>} · <a href={process.env.NEXT_PUBLIC_GITHUB_URL || '#'}>GitHub repository</a></footer>
  </main>;
}
