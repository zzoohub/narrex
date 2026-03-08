import { createFileRoute } from '@tanstack/solid-router'
import { DashboardView } from '@/views/dashboard'

export const Route = createFileRoute('/_authenticated/')({ component: DashboardView })
