import { post, patch, del } from '@/shared/api/client'
import type { DataEnvelope } from '@/shared/api/types'
import type { Track, CreateTrackRequest, UpdateTrackRequest } from './model'

export function createTrack(
  projectId: string,
  body: CreateTrackRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<Track>> {
  return post(`/v1/projects/${projectId}/tracks`, body, signal)
}

export function updateTrack(
  projectId: string,
  trackId: string,
  body: UpdateTrackRequest,
  signal?: AbortSignal,
): Promise<DataEnvelope<Track>> {
  return patch(`/v1/projects/${projectId}/tracks/${trackId}`, body, signal)
}

export function deleteTrack(
  projectId: string,
  trackId: string,
  signal?: AbortSignal,
): Promise<void> {
  return del(`/v1/projects/${projectId}/tracks/${trackId}`, signal)
}
