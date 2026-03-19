-- ============================================================
-- Catálogos: promotions_catalog, preferences_catalog,
--            budgets, expenses, business_domain
-- ============================================================

-- ── Promociones por ocasión y fechas ──────────────────────────
create table public.promotions_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  occasion text not null,
  description text,
  discount_percent decimal(5,2),
  discount_fixed_mxn decimal(10,2),
  valid_from date not null,
  valid_to date not null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.promotions_catalog enable row level security;

create policy "Service role full access promotions_catalog"
  on public.promotions_catalog for all to service_role
  using (true) with check (true);

create policy "Admin read promotions_catalog"
  on public.promotions_catalog for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role::text = 'administrador'
    )
  );

create policy "Admin write promotions_catalog"
  on public.promotions_catalog for all to authenticated
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

-- ── Preferencias musicales ─────────────────────────────────────
create table public.preferences_catalog (
  id uuid primary key default gen_random_uuid(),
  regions text[] not null default '{}',
  styles text[] not null,
  directives text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.preferences_catalog enable row level security;

create policy "Service role full access preferences_catalog"
  on public.preferences_catalog for all to service_role
  using (true) with check (true);

create policy "Authenticated read preferences_catalog"
  on public.preferences_catalog for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role::text in ('administrador', 'creativo')
    )
  );

create policy "Admin write preferences_catalog"
  on public.preferences_catalog for all to authenticated
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

-- Seed preferencias musicales (10 entradas)
insert into public.preferences_catalog (regions, styles, directives, sort_order) values
  (
    array['sinaloa','culiacán','culiacan','mazatlán','mazatlan','los mochis','guasave','sonora','hermosillo','navojoa'],
    array['banda','grupero','sinaloense'],
    'banda sinaloense, tuba prominente, clarinete, tambora, tempo 130-145 BPM, feel de fiesta norteña',
    10
  ),
  (
    array['jalisco','guadalajara','zapopan','colima','nayarit','tepic','michoacán','michoacan','morelia'],
    array['banda','grupero'],
    'banda jalisciense, metales brillantes, trombón, tambora jaliscience, tempo 125-135 BPM',
    20
  ),
  (
    array['jalisco','guadalajara','zapopan','michoacán','michoacan','morelia','guanajuato','cdmx','ciudad de méxico','ciudad de mexico'],
    array['mariachi','ranchera','ranchero','corrido'],
    'mariachi tradicional mexicano, trompetas brillantes, guitarrón, vihuela, guitarra de golpe, compás 3/4 o 2/4, emotivo y romántico',
    30
  ),
  (
    array['nuevo león','nuevo leon','monterrey','tamaulipas','coahuila','chihuahua','durango','zacatecas'],
    array['norteño','norteno','corrido','grupero','banda'],
    'norteño regiomontano, bajo sexto, acordeón diatónico, polka rhythm, tempo 110-130 BPM, estilo fronterizo',
    40
  ),
  (
    array[]::text[],
    array['corrido tumbado','corridos tumbados','regional mexicano','sierreño','sierreno'],
    'corrido tumbado moderno, guitarras eléctricas con distorsión leve, bajo profundo, acordeón, trap 808 sutil, tempo 75-85 BPM, mood oscuro y épico',
    50
  ),
  (
    array[]::text[],
    array['pop','balada','pop balada','romántico','romantico','romántica','romantica'],
    'pop balada en español, piano emocional, cuerdas suaves, producción limpia, tempo 70-90 BPM, emotivo y cinematográfico',
    60
  ),
  (
    array[]::text[],
    array['reggaeton','urbano','trap','perreo'],
    'reggaeton moderno, dembow beat, sintetizadores, 808 bass, hi-hats en loop, tempo 90-95 BPM',
    70
  ),
  (
    array['veracruz','tabasco','villahermosa','coatzacoalcos','campeche','yucatán','yucatan','mérida','merida'],
    array['cumbia','tropical','salsa'],
    'cumbia tropical mexicana, marimba, percusiones latinas, bajo eléctrico, tempo 110-120 BPM, festivo y bailable',
    80
  ),
  (
    array[]::text[],
    array['cumbia','tropical'],
    'cumbia pop, acordeón, percusiones, bajo eléctrico, tempo 110-120 BPM',
    90
  ),
  (
    array[]::text[],
    array['rock','alternativo','rock alternativo','metal','punk'],
    'rock en español, guitarras eléctricas, batería en vivo, bajo, tempo 120-160 BPM según intensidad',
    100
  );

-- ── Presupuestos por categoría y período ──────────────────────
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (category in ('ai_tokens', 'marketing', 'suscripciones', 'operacion')),
  period_month date not null,
  limit_usd decimal(12,2),
  limit_mxn decimal(12,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(category, period_month)
);

alter table public.budgets enable row level security;

create policy "Service role full access budgets"
  on public.budgets for all to service_role
  using (true) with check (true);

create policy "Admin read write budgets"
  on public.budgets for all to authenticated
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

-- ── Gastos operativos ──────────────────────────────────────────
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (category in ('marketing', 'suscripciones', 'operacion')),
  description text not null,
  amount_mxn decimal(12,2) not null,
  expense_date date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.expenses enable row level security;

create policy "Service role full access expenses"
  on public.expenses for all to service_role
  using (true) with check (true);

create policy "Admin read write expenses"
  on public.expenses for all to authenticated
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

-- ── Dominio de negocio: fórmulas ──────────────────────────────
create table public.business_domain (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  formula text not null,
  description text,
  category text not null default 'rentabilidad'
    check (category in ('rentabilidad', 'experiencia', 'operacion')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.business_domain enable row level security;

create policy "Service role full access business_domain"
  on public.business_domain for all to service_role
  using (true) with check (true);

create policy "Authenticated read business_domain"
  on public.business_domain for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role::text in ('administrador', 'agente_investigador')
    )
  );

create policy "Admin write business_domain"
  on public.business_domain for all to authenticated
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

-- Seed fórmulas dominio de negocio (§5 BUSINESS_LOGIC)
insert into public.business_domain (name, formula, description, category) values
  ('Margen neto', '(Ingresos - Todos los gastos) / Ingresos × 100', 'Porcentaje de ganancia sobre los ingresos totales después de todos los costos', 'rentabilidad'),
  ('Punto de equilibrio', 'Gastos fijos / Margen de contribución promedio', 'Número de ventas necesarias para cubrir todos los costos fijos', 'rentabilidad'),
  ('Flujo de caja', 'Efectivo disponible + Ingresos esperados - Gastos comprometidos', 'Proyección de efectivo disponible en un período', 'rentabilidad'),
  ('Retención de clientes', '(Clientes que regresan / Total clientes únicos) × 100', 'Porcentaje de clientes que realizan una recompra', 'experiencia'),
  ('CAC', 'Gasto total en adquisición / Nuevos clientes adquiridos', 'Costo de Adquisición de Cliente', 'rentabilidad'),
  ('LTV', 'Ticket promedio × Frecuencia × Tiempo de retención × Margen', 'Lifetime Value — valor total que aporta un cliente', 'rentabilidad'),
  ('Ratio LTV/CAC', 'LTV / CAC', 'Relación entre valor del cliente y costo de adquirirlo. >3 es saludable', 'rentabilidad'),
  ('ROAS', 'Ingresos atribuidos a campaña / Gasto en campaña', 'Return On Ad Spend', 'rentabilidad'),
  ('ROI', '(Ganancia neta / Inversión total) × 100', 'Return On Investment', 'rentabilidad'),
  ('NPS', '% Promotores (score 9-10) - % Detractores (score 0-6)', 'Net Promoter Score', 'experiencia');
