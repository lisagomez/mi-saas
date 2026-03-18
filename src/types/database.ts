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
  totalRevenueMxn: number
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
