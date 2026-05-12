'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { getAppGroups } from '../services/get-app-groups'
import type { AppItem } from '../types'

function AppTile({ item, onSelect }: { item: AppItem; onSelect: () => void }) {
  const inner = (
    <div className="flex flex-col items-center gap-1.5 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer text-center w-[76px]">
      <span className="text-2xl leading-none">{item.icon}</span>
      <span className="text-[11px] font-medium text-gray-600 leading-tight line-clamp-2">{item.label}</span>
    </div>
  )

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onSelect}>
        {inner}
      </a>
    )
  }

  return <Link href={item.href} onClick={onSelect}>{inner}</Link>
}

function GroupSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-[76px] h-[76px] rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export function AppLauncherPopover() {
  const [open, setOpen] = useState(false)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['app-launcher-registry'],
    queryFn: getAppGroups,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="App launcher"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <rect x="3"  y="3"  width="4" height="4" rx="1" />
            <rect x="10" y="3"  width="4" height="4" rx="1" />
            <rect x="17" y="3"  width="4" height="4" rx="1" />
            <rect x="3"  y="10" width="4" height="4" rx="1" />
            <rect x="10" y="10" width="4" height="4" rx="1" />
            <rect x="17" y="10" width="4" height="4" rx="1" />
            <rect x="3"  y="17" width="4" height="4" rx="1" />
            <rect x="10" y="17" width="4" height="4" rx="1" />
            <rect x="17" y="17" width="4" height="4" rx="1" />
          </svg>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={8} className="w-[320px] p-4 space-y-4">
        {isLoading ? (
          <>
            <GroupSkeleton />
            <GroupSkeleton />
          </>
        ) : (
          groups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {group.apps.map(app => (
                  <AppTile key={app.key} item={app} onSelect={() => setOpen(false)} />
                ))}
              </div>
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  )
}
