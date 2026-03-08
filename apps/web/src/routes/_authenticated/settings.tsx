import { createFileRoute } from '@tanstack/solid-router'
import { SettingsView } from '@/views/settings'

export const Route = createFileRoute('/_authenticated/settings')({ component: SettingsView })
