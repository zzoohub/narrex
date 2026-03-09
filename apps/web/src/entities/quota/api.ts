import { get } from '@/shared/api/client'
import type { DataEnvelope } from '@/shared/api/types'
import type { QuotaInfo } from './model'

export function getQuota(signal?: AbortSignal): Promise<DataEnvelope<QuotaInfo>> {
  return get('/v1/me/quota', undefined, signal)
}
