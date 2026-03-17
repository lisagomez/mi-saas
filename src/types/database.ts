export type UserRole = 'creativo' | 'admin_pagos' | 'administrador'

export type QualificationStatus = 'pending' | 'calificado' | 'no_calificado'

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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
