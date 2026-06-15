
CREATE INDEX IF NOT EXISTS idx_agent_reports_ai_usage_id   ON public.agent_reports (ai_usage_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_order_id           ON public.ai_usage (order_id);
CREATE INDEX IF NOT EXISTS idx_campaign_spend_created_by   ON public.campaign_spend (created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by         ON public.expenses (created_by);
CREATE INDEX IF NOT EXISTS idx_orders_payment_confirmed_by ON public.orders (payment_confirmed_by);
CREATE INDEX IF NOT EXISTS idx_pricing_campaigns_created_by ON public.pricing_campaigns (created_by);
CREATE INDEX IF NOT EXISTS idx_rebuys_lead_id              ON public.rebuys (lead_id);
CREATE INDEX IF NOT EXISTS idx_rebuys_promotion_id         ON public.rebuys (promotion_id);
