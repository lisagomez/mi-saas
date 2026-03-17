-- Leads: contactos desde WhatsApp (origen Facebook u otro)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  phone varchar(20) not null,
  source varchar(50) not null default 'facebook',
  qualification_status varchar(20) not null default 'pending'
    check (qualification_status in ('pending', 'calificado', 'no_calificado')),
  qualified_at timestamptz,
  first_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(phone)
);

comment on column public.leads.qualification_status is 'pending = aún no evaluado; calificado = sigue flujo; no_calificado = cierre gracia + nurturing';

alter table public.leads enable row level security;

create policy "Authenticated read leads"
  on public.leads for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('administrador', 'creativo', 'admin_pagos')
    )
  );

create policy "Service role full access leads"
  on public.leads for all
  to service_role
  using (true)
  with check (true);

-- Conversaciones: mensajes por lead (user / assistant)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  role varchar(10) not null check (role in ('user', 'assistant')),
  content_text text,
  content_audio_url text,
  message_id_whatsapp varchar(255),
  created_at timestamptz default now()
);

create index idx_conversations_lead_created on public.conversations(lead_id, created_at);

alter table public.conversations enable row level security;

create policy "Service role full access conversations"
  on public.conversations for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated read conversations"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('administrador', 'creativo', 'admin_pagos')
    )
  );

-- Lista de nutrición: leads no calificados para seguimiento manual
create table if not exists public.nurturing_list (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade unique,
  reason text,
  added_at timestamptz default now()
);

alter table public.nurturing_list enable row level security;

create policy "Authenticated read nurturing_list"
  on public.nurturing_list for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('administrador', 'creativo')
    )
  );

create policy "Service insert nurturing_list"
  on public.nurturing_list for insert
  to service_role
  with check (true);

-- Log de uso de IA (modelo, tokens, costo)
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  order_id uuid,
  model varchar(255) not null,
  tokens_input int,
  tokens_output int,
  cost_usd decimal(12, 6),
  created_at timestamptz default now()
);

create index idx_ai_usage_lead_created on public.ai_usage(lead_id, created_at);

alter table public.ai_usage enable row level security;

create policy "Service role full access ai_usage"
  on public.ai_usage for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated read ai_usage"
  on public.ai_usage for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'administrador'
    )
  );
