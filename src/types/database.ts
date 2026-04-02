export type UserRole = 'creativo' | 'admin_pagos' | 'administrador' | 'agente_investigador'

export type QualificationStatus = 'pending' | 'calificado' | 'no_calificado'

export type OrderStatus =
  | 'recopilando_historia'
  | 'recopilando_estilo'
  | 'generando_letra'
  | 'letra_generada'
  | 'pago_pendiente'
  | 'pago_confirmado'
  | 'recopilando_fotos'
  | 'generando_video'
  | 'video_listo'
  | 'video_pago_enviado'
  | 'video_pago_confirmado'
  | 'video_rechazado'
  | 'entregado'
  | 'requiere_procesamiento_manual'

export type VideoStatus = 'pendiente' | 'recopilando_fotos' | 'generando' | 'listo' | 'fallido'

export type VideoPaymentStatus = 'pendiente' | 'comprobante_enviado' | 'confirmado'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  phone: string
  source: string
  qualification_status: QualificationStatus
  qualified_at: string | null
  first_message_at: string | null
  origin: string | null
  residence: string | null
  created_at: string
}

export interface Conversation {
  id: string
  lead_id: string
  role: 'user' | 'assistant'
  content_text: string | null
  content_audio_url: string | null
  message_id_whatsapp: string | null
  created_at: string
}

export interface NurturingList {
  id: string
  lead_id: string
  reason: string | null
  added_at: string
}

export interface Order {
  id: string
  lead_id: string
  status: OrderStatus
  story_text: string | null
  musical_style: string | null
  ai_cost_usd: number | null
  payment_proof_url: string | null
  payment_confirmed_at: string | null
  payment_confirmed_by: string | null
  song_delivered_at: string | null
  created_at: string
  updated_at: string
}

export interface Song {
  id: string
  order_id: string
  lyrics_text: string
  model_used: string | null
  audio_url: string | null
  music_prompt: string | null
  created_at: string
}

export interface Video {
  id: string
  order_id: string
  status: VideoStatus
  price: number | null
  payment_status: VideoPaymentStatus
  payment_proof_url: string | null
  replicate_id: string | null
  video_storage_path: string | null
  youtube_url: string | null
  photo_count: number
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface OrderPhoto {
  id: string
  order_id: string
  storage_path: string
  public_url: string
  sort_order: number
  created_at: string
}

export interface Competitor {
  id: string
  name: string
  price: string | null
  proposal: string | null
  advantages: string | null
  disadvantages: string | null
  created_at: string
  updated_at: string
}

export interface FinancialMetrics {
  totalRevenueUsd: number
  totalAiCostUsd: number
  ordersDelivered: number
  leadsTotal: number
  leadsConverted: number
  cac: number | null
  ltv: number | null
  roi: number | null
  roas: number | null
  aiSpendUsd: number
  monthlyCashFlow: { month: string; revenue: number }[]
}

export interface AiUsage {
  id: string
  lead_id: string | null
  order_id: string | null
  model: string
  tokens_input: number | null
  tokens_output: number | null
  cost_usd: number | null
  created_at: string
}

export type BudgetCategory = 'ai_tokens' | 'marketing' | 'suscripciones' | 'operacion'
export type ExpenseCategory = 'marketing' | 'suscripciones' | 'operacion'
export type DomainCategory = 'rentabilidad' | 'experiencia' | 'operacion'

export interface PromotionsCatalog {
  id: string
  name: string
  occasion: string
  description: string | null
  discount_percent: number | null
  discount_fixed_mxn: number | null
  valid_from: string
  valid_to: string
  is_active: boolean
  whatsapp_template_name: string | null
  created_at: string
  updated_at: string
}

export interface PreferencesCatalog {
  id: string
  regions: string[]
  styles: string[]
  directives: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  category: BudgetCategory
  period_month: string
  limit_usd: number | null
  limit_mxn: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount_mxn: number
  expense_date: string
  created_by: string | null
  created_at: string
}

export interface BusinessDomain {
  id: string
  name: string
  formula: string
  description: string | null
  category: DomainCategory
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AgentType = 'investigator' | 'financial' | 'promotions'

export interface AgentReport {
  id: string
  agent_type: AgentType
  report_json: Record<string, unknown>
  generated_at: string
  ai_usage_id: string | null
}

export interface Rebuy {
  id: string
  lead_id: string
  promotion_id: string | null
  sent_at: string
  status: 'sent' | 'failed'
}

export interface FacebookCampaign {
  id: string
  name: string
  campaign_id_meta: string | null
  source_key: string
  start_date: string
  end_date: string | null
  budget_usd: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CampaignSpend {
  id: string
  campaign_id: string
  spend_date: string
  amount_usd: number
  notes: string | null
  created_by: string | null
  created_at: string
}

/** Campaña con métricas calculadas (leads, ingresos, ROAS) */
export interface CampaignWithMetrics extends FacebookCampaign {
  totalSpendUsd: number
  leadsTotal: number
  leadsQualified: number
  ordersDelivered: number
  revenueUsd: number
  roas: number | null
}

export interface StorageConfig {
  id: string
  bucket_name: string
  limit_mb: number
  cleanup_after_days: number
  created_at: string
  updated_at: string
}

export interface StorageCleanupLog {
  id: string
  ran_at: string
  deleted_files: number
  freed_mb: number | null
  triggered_by: string
  details: Record<string, unknown>[] | null
}

/** Métricas financieras enriquecidas por el Agente Financiero */
export interface EnrichedFinancialMetrics {
  totalRevenueUsd: number
  totalExpensesUsd: number
  totalAiCostUsd: number
  ordersDelivered: number
  leadsTotal: number
  leadsQualified: number
  roi: number | null
  roas: number | null // null cuando no hay datos de campañas Facebook Ads
  cac: number | null
  ltv: number | null
  puntoEquilibrio: number | null
  flujoCaja: number | null
  monthlyCashFlow: { month: string; revenue: number }[]
  insufficientData: string[] // métricas sin datos suficientes
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      leads: {
        Row: Lead
        Insert: Partial<Omit<Lead, 'id' | 'created_at'>> & Pick<Lead, 'phone'>
        Update: Partial<Omit<Lead, 'id' | 'created_at'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at'>
        Update: Partial<Omit<Conversation, 'id' | 'created_at'>>
      }
      nurturing_list: {
        Row: NurturingList
        Insert: Omit<NurturingList, 'id' | 'added_at'>
        Update: Partial<Omit<NurturingList, 'id' | 'added_at'>>
      }
      ai_usage: {
        Row: AiUsage
        Insert: Omit<AiUsage, 'id' | 'created_at'>
        Update: Partial<Omit<AiUsage, 'id' | 'created_at'>>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'> & { lead_id: string }
        Update: Partial<Omit<Order, 'id' | 'created_at' | 'lead_id'>>
      }
      songs: {
        Row: Song
        Insert: Omit<Song, 'id' | 'created_at'>
        Update: Partial<Omit<Song, 'id' | 'created_at' | 'order_id'>>
      }
      competitors: {
        Row: Competitor
        Insert: Omit<Competitor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Competitor, 'id' | 'created_at'>>
      }
      videos: {
        Row: Video
        Insert: Omit<Video, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Video, 'id' | 'created_at' | 'order_id'>>
      }
      order_photos: {
        Row: OrderPhoto
        Insert: Omit<OrderPhoto, 'id' | 'created_at'>
        Update: Partial<Omit<OrderPhoto, 'id' | 'created_at' | 'order_id'>>
      }
      promotions_catalog: {
        Row: PromotionsCatalog
        Insert: Omit<PromotionsCatalog, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PromotionsCatalog, 'id' | 'created_at'>>
      }
      preferences_catalog: {
        Row: PreferencesCatalog
        Insert: Omit<PreferencesCatalog, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PreferencesCatalog, 'id' | 'created_at'>>
      }
      budgets: {
        Row: Budget
        Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Budget, 'id' | 'created_at'>>
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at'>
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>
      }
      business_domain: {
        Row: BusinessDomain
        Insert: Omit<BusinessDomain, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BusinessDomain, 'id' | 'created_at'>>
      }
      agent_reports: {
        Row: AgentReport
        Insert: Omit<AgentReport, 'id' | 'generated_at'>
        Update: never
      }
      rebuys: {
        Row: Rebuy
        Insert: Omit<Rebuy, 'id' | 'sent_at'>
        Update: Partial<Omit<Rebuy, 'id' | 'sent_at' | 'lead_id'>>
      }
      facebook_campaigns: {
        Row: FacebookCampaign
        Insert: Omit<FacebookCampaign, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FacebookCampaign, 'id' | 'created_at'>>
      }
      campaign_spend: {
        Row: CampaignSpend
        Insert: Omit<CampaignSpend, 'id' | 'created_at'>
        Update: Partial<Omit<CampaignSpend, 'id' | 'created_at' | 'campaign_id'>>
      }
      storage_config: {
        Row: StorageConfig
        Insert: Omit<StorageConfig, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<StorageConfig, 'id' | 'created_at' | 'bucket_name'>>
      }
      storage_cleanup_log: {
        Row: StorageCleanupLog
        Insert: Omit<StorageCleanupLog, 'id' | 'ran_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
