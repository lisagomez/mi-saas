-- Orders: pedidos post-calificacion (uno activo por lead en V1)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  status varchar(30) not null default 'recopilando_historia'
    check (status in (
      'recopilando_historia',
      'recopilando_estilo',
      'generando_letra',
      'letra_generada',
      'pago_pendiente',
      'pago_confirmado',
      'entregado',
      'requiere_procesamiento_manual'
    )),
  story_text text,
  musical_style varchar(100),
  ai_cost_usd decimal(12, 6),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(lead_id)
);

comment on column public.orders.status is 'recopilando_historia → recopilando_estilo → generando_letra → letra_generada → pago_pendiente → pago_confirmado → entregado';
comment on constraint orders_lead_id_key on public.orders is 'V1: un pedido activo por lead. En V2 remover para historial multiple.';

create index idx_orders_lead_id on public.orders(lead_id);
create index idx_orders_status on public.orders(status);

alter table public.orders enable row level security;

create policy "Service role full access orders"
  on public.orders for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated read orders"
  on public.orders for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('administrador', 'creativo', 'admin_pagos')
    )
  );

-- Songs: letras generadas por IA, vinculadas a un order
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  lyrics_text text not null,
  model_used varchar(255),
  created_at timestamptz default now()
);

create index idx_songs_order_id on public.songs(order_id);

alter table public.songs enable row level security;

create policy "Service role full access songs"
  on public.songs for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated read songs"
  on public.songs for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('administrador', 'creativo')
    )
  );

-- Agregar FK de ai_usage.order_id → orders.id (la columna ya existe como uuid nullable)
alter table public.ai_usage
  add constraint ai_usage_order_id_fkey
  foreign key (order_id) references public.orders(id) on delete set null;
