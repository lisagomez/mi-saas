
-- Reemplazar todas las policies que usan auth.uid() directamente
-- por (select auth.uid()) para evitar re-evaluación por fila

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'administrador'
    )
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id);

-- leads
DROP POLICY IF EXISTS "Authenticated read leads" ON public.leads;
CREATE POLICY "leads_select_authenticated" ON public.leads
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- conversations
DROP POLICY IF EXISTS "Authenticated read conversations" ON public.conversations;
CREATE POLICY "conversations_select_authenticated" ON public.conversations
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- nurturing_list
DROP POLICY IF EXISTS "Authenticated read nurturing_list" ON public.nurturing_list;
CREATE POLICY "nurturing_list_select_authenticated" ON public.nurturing_list
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ai_usage
DROP POLICY IF EXISTS "Authenticated read ai_usage" ON public.ai_usage;
CREATE POLICY "ai_usage_select_authenticated" ON public.ai_usage
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- orders
DROP POLICY IF EXISTS "Authenticated read orders" ON public.orders;
DROP POLICY IF EXISTS "Admin pagos update payment confirmation" ON public.orders;
CREATE POLICY "orders_select_authenticated" ON public.orders
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "orders_update_payment" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid())
        AND p.role IN ('admin_pagos', 'administrador')
    )
  );

-- push_subscriptions
DROP POLICY IF EXISTS "Users read own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users create subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users delete own subscriptions" ON public.push_subscriptions;
CREATE POLICY "push_subs_select_own" ON public.push_subscriptions
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "push_subs_insert_own" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "push_subs_delete_own" ON public.push_subscriptions
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- notifications
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

-- songs
DROP POLICY IF EXISTS "Authenticated read songs" ON public.songs;
CREATE POLICY "songs_select_authenticated" ON public.songs
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- promotions_catalog
DROP POLICY IF EXISTS "Admin read promotions_catalog" ON public.promotions_catalog;
DROP POLICY IF EXISTS "Admin write promotions_catalog" ON public.promotions_catalog;
CREATE POLICY "promotions_catalog_select_authenticated" ON public.promotions_catalog
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "promotions_catalog_write_admin" ON public.promotions_catalog
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- competitors
DROP POLICY IF EXISTS "Authenticated read competitors" ON public.competitors;
DROP POLICY IF EXISTS "Authenticated write competitors" ON public.competitors;
CREATE POLICY "competitors_select_authenticated" ON public.competitors
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "competitors_write_authenticated" ON public.competitors
  FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- videos
DROP POLICY IF EXISTS "Authenticated read videos" ON public.videos;
DROP POLICY IF EXISTS "Admin pagos update videos" ON public.videos;
CREATE POLICY "videos_select_authenticated" ON public.videos
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "videos_update_admin_pagos" ON public.videos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid())
        AND p.role IN ('admin_pagos', 'administrador')
    )
  );

-- order_photos
DROP POLICY IF EXISTS "Authenticated read order_photos" ON public.order_photos;
CREATE POLICY "order_photos_select_authenticated" ON public.order_photos
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- preferences_catalog
DROP POLICY IF EXISTS "Authenticated read preferences_catalog" ON public.preferences_catalog;
DROP POLICY IF EXISTS "Admin write preferences_catalog" ON public.preferences_catalog;
CREATE POLICY "preferences_catalog_select_authenticated" ON public.preferences_catalog
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "preferences_catalog_write_admin" ON public.preferences_catalog
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- budgets
DROP POLICY IF EXISTS "Admin read write budgets" ON public.budgets;
CREATE POLICY "budgets_all_admin" ON public.budgets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- expenses
DROP POLICY IF EXISTS "Admin read write expenses" ON public.expenses;
CREATE POLICY "expenses_all_admin" ON public.expenses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- business_domain
DROP POLICY IF EXISTS "Authenticated read business_domain" ON public.business_domain;
DROP POLICY IF EXISTS "Admin write business_domain" ON public.business_domain;
CREATE POLICY "business_domain_select_authenticated" ON public.business_domain
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "business_domain_write_admin" ON public.business_domain
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- agent_reports
DROP POLICY IF EXISTS "Admin read agent_reports" ON public.agent_reports;
DROP POLICY IF EXISTS "Admin write agent_reports" ON public.agent_reports;
CREATE POLICY "agent_reports_all_admin" ON public.agent_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- rebuys
DROP POLICY IF EXISTS "Admin access rebuys" ON public.rebuys;
CREATE POLICY "rebuys_all_admin" ON public.rebuys
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- facebook_campaigns
DROP POLICY IF EXISTS "Administradores: full access facebook_campaigns" ON public.facebook_campaigns;
CREATE POLICY "facebook_campaigns_all_admin" ON public.facebook_campaigns
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- campaign_spend
DROP POLICY IF EXISTS "Administradores: full access campaign_spend" ON public.campaign_spend;
CREATE POLICY "campaign_spend_all_admin" ON public.campaign_spend
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- storage_config
DROP POLICY IF EXISTS "Administradores: read storage_config" ON public.storage_config;
DROP POLICY IF EXISTS "Administradores: update storage_config" ON public.storage_config;
CREATE POLICY "storage_config_all_admin" ON public.storage_config
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- storage_cleanup_log
DROP POLICY IF EXISTS "Administradores: read storage_cleanup_log" ON public.storage_cleanup_log;
CREATE POLICY "storage_cleanup_log_select_admin" ON public.storage_cleanup_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'administrador')
  );

-- pricing_campaigns
DROP POLICY IF EXISTS "admin_pagos y administrador pueden gestionar campanas de precio" ON public.pricing_campaigns;
CREATE POLICY "pricing_campaigns_all_admin" ON public.pricing_campaigns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid())
        AND p.role IN ('admin_pagos', 'administrador')
    )
  );
