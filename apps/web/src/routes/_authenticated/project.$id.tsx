import { createFileRoute } from '@tanstack/solid-router'
import { WorkspaceView } from '@/views/workspace'

export const Route = createFileRoute('/_authenticated/project/$id')({ component: WorkspaceView })
