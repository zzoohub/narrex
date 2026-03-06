import { createFileRoute } from '@tanstack/solid-router'
import { WorkspaceView } from '@/views/workspace'

export const Route = createFileRoute('/project/$id')({ component: WorkspaceView })
