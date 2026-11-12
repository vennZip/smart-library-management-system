import type { AnalyticsSummary } from '../analytics/analytics.types.js'
import type { AnalyticsRepository } from '../repositories/analytics.repository.js'
export class AnalyticsService{
  readonly #repository:AnalyticsRepository
  constructor(repository:AnalyticsRepository){this.#repository=repository}
  getSummary():Promise<AnalyticsSummary>{return this.#repository.getSummary()}
}
