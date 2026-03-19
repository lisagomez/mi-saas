-- ============================================================
-- Agentes Automáticos: agent_reports + rebuys
-- ============================================================

-- Histórico de reportes generados por los agentes
create table public.agent_reports (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null check (agent_type in ('investigator', 'financial', 'promotions')),
  report_json jsonb not null,
  generated_at timestamptz default now(),
  ai_usage_id uuid references public.ai_usage(id)
);

alter table public.agent_reports enable row level security;

create policy "Service role full access agent_reports"
  on public.agent_reports for all to service_role
  using (true) with check (true);

create policy "Admin read agent_reports"
  on public.agent_reports for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'administrador'
    )
  );

create policy "Admin write agent_reports"
  on public.agent_reports for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'administrador'
    )
  );

-- Recompras enviadas a clientes
create table public.rebuys (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id),
  promotion_id uuid references public.promotions_catalog(id),
  sent_at timestamptz default now(),
  status text not null default 'sent' check (status in ('sent', 'failed'))
);

alter table public.rebuys enable row level security;

create policy "Service role full access rebuys"
  on public.rebuys for all to service_role
  using (true) with check (true);

create policy "Admin access rebuys"
  on public.rebuys for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'administrador'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'administrador'
    )
  );
