export interface AppItem {
  key: string
  label: string
  icon: string
  href: string
  external?: boolean
}

export interface AppGroup {
  label: string
  apps: AppItem[]
}
