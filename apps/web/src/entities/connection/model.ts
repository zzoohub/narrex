export type ConnectionType = 'branch' | 'merge'

export interface SceneConnection {
  id: string
  projectId: string
  sourceSceneId: string
  targetSceneId: string
  connectionType: ConnectionType
  createdAt: string
}

export interface CreateConnectionRequest {
  sourceSceneId: string
  targetSceneId: string
  connectionType: ConnectionType
}
