import { apiRequest } from '../lib/api'
import type { AnalyticsSummary } from './analytics.types'
export function getAdminAnalytics():Promise<AnalyticsSummary>{return apiRequest('/api/admin/analytics')}
