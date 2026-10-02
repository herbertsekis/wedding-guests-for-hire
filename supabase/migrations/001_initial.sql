-- Supabase remains the sole writable source of truth. Sheets is synchronized after commit.
create extension if not exists pgcrypto;
create type public.employee_role as enum ('manager', 'salesperson', 'expense_reporter');
create type public.transaction_kind as enum ('sale', 'expense');
create type public.transaction_status as enum ('pending_approval', 'approved', 'awaiting_allocation', 'allocated');
create type public.project_code as enum ('A', 'B');
create type public.expense_allocation as enum ('A', 'B', 'company_overhead');
create type public.sync_state as enum ('pending', 'synced', 'failed');
create type public.delivery_state as enum ('not_required', 'pending', 'sent', 'failed', 'no_recipient');

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role public.employee_role not null,
  telegram_user_id bigint unique,
  linked_telegram_chat_id bigint,
  created_at timestamptz not null default now()
);
insert into public.employees(name, role) values
 ('Svetlana de Monte Carlo', 'manager'), ('Richard Call Me Dick Darling', 'salesperson'),
 ('Anastasia Ferrari', 'salesperson'), ('Jean-Claude Bērziņš', 'salesperson'), ('Kevin von Whatever', 'expense_reporter');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^[SE][0-9]{2,}$'),
  type public.transaction_kind not null,
  submitted_by uuid not null references public.employees(id),
  source text not null check (source in ('website','telegram')),
  submitting_telegram_chat_id bigint,
  submitted_at timestamptz not null default now(),
  customer text,
  project public.project_code,
  description text not null,
  category text check (category in ('Materials','Travel','Other')),
  amount_cents integer not null check (amount_cents > 0),
  proposed_split jsonb,
  final_split jsonb,
  final_commission_amounts jsonb,
  proposed_allocation public.expense_allocation,
  final_allocation public.expense_allocation,
  status public.transaction_status not null,
  decision_by uuid references public.employees(id),
  decided_at timestamptz,
  sheet_sync_status public.sync_state not null default 'pending',
  sheet_row_number integer,
  sheet_sync_error text,
  notification_status public.delivery_state not null default 'not_required',
  notification_error text,
  notification_payload jsonb,
  constraint sale_fields check ((type = 'sale' and customer is not null and project is not null and proposed_split is not null and category is null and proposed_allocation is null) or (type = 'expense' and customer is null and project is null and category is not null and proposed_allocation is not null))
);
create index transactions_submitted_by_idx on public.transactions(submitted_by);
create index transactions_sync_idx on public.transactions(sheet_sync_status);

-- Browser clients have no direct access. All actions occur through server routes with a signed
-- demo session; the service key is only used on the server and role checks are repeated there.
alter table public.employees enable row level security;
alter table public.transactions enable row level security;

