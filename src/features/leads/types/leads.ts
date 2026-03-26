export interface LeadsFilter {
  residence: string
  origin: string
  minOrders: number
  dateFrom: string
  dateTo: string
}

export interface CampaignHistory {
  key: string
  promotionId: string
  promotionName: string
  sentAt: string
  total: number
  sent: number
  failed: number
}
