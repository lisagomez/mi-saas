'use client'

import { useState, useMemo } from 'react'
import type { ConvertedLead } from '../services/get-converted-leads'
import type { LeadsFilter } from '../types/leads'

const DEFAULT_FILTER: LeadsFilter = {
  residence: '',
  origin: '',
  minOrders: 0,
  dateFrom: '',
  dateTo: '',
}

export function useLeadsFilters(leads: ConvertedLead[]) {
  const [filter, setFilter] = useState<LeadsFilter>(DEFAULT_FILTER)

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (filter.residence && lead.residence !== filter.residence) return false
      if (filter.origin && lead.origin !== filter.origin) return false
      if (filter.minOrders > 0 && lead.ordersDelivered < filter.minOrders) return false
      if (filter.dateFrom && lead.lastOrderAt < filter.dateFrom) return false
      if (filter.dateTo && lead.lastOrderAt > `${filter.dateTo}T23:59:59`) return false
      return true
    })
  }, [leads, filter])

  const uniqueResidences = useMemo(
    () => [...new Set(leads.map((l) => l.residence).filter(Boolean))].sort() as string[],
    [leads]
  )

  const uniqueOrigins = useMemo(
    () => [...new Set(leads.map((l) => l.origin).filter(Boolean))].sort() as string[],
    [leads]
  )

  const isFiltered =
    filter.residence !== '' ||
    filter.origin !== '' ||
    filter.minOrders > 0 ||
    filter.dateFrom !== '' ||
    filter.dateTo !== ''

  function resetFilters() {
    setFilter(DEFAULT_FILTER)
  }

  return { filter, setFilter, filtered, uniqueResidences, uniqueOrigins, isFiltered, resetFilters }
}
