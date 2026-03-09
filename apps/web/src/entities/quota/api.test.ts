import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  get: vi.fn(),
}))

import { get } from '@/shared/api/client'
import { getQuota } from './api'

const mockGet = vi.mocked(get)

describe('quota API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getQuota', () => {
    it('calls GET /v1/me/quota', async () => {
      const response = {
        data: {
          used: 10,
          limit: 50,
          remaining: 40,
          warning: false,
          exceeded: false,
          resetsAt: '2026-04-01T00:00:00Z',
        },
      }
      mockGet.mockResolvedValue(response)
      const result = await getQuota()
      expect(mockGet).toHaveBeenCalledWith('/v1/me/quota', undefined, undefined)
      expect(result.data.used).toBe(10)
    })

    it('passes abort signal', async () => {
      mockGet.mockResolvedValue({ data: {} })
      const signal = new AbortController().signal
      await getQuota(signal)
      expect(mockGet).toHaveBeenCalledWith('/v1/me/quota', undefined, signal)
    })

    it('returns all QuotaInfo fields', async () => {
      const quota = {
        used: 45,
        limit: 50,
        remaining: 5,
        warning: true,
        exceeded: false,
        resetsAt: '2026-04-01T00:00:00Z',
      }
      mockGet.mockResolvedValue({ data: quota })
      const result = await getQuota()
      expect(result.data).toEqual(quota)
    })
  })
})
