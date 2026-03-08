import { createFileRoute } from '@tanstack/solid-router'
import { ProjectCreationView } from '@/views/project-creation'

export const Route = createFileRoute('/_authenticated/new')({ component: ProjectCreationView })
