import { createFileRoute } from '@tanstack/solid-router'
import { LoginView } from '@/views/login'

export const Route = createFileRoute('/login')({ component: LoginView })
