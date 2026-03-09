export interface QuotaInfo {
  used: number
  limit: number
  remaining: number
  warning: boolean
  exceeded: boolean
  resetsAt: string
}
