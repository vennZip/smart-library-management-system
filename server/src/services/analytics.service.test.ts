import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnalyticsSummary } from '../analytics/analytics.types.js'
import type { AnalyticsRepository } from '../repositories/analytics.repository.js'
import { AnalyticsService } from './analytics.service.js'
const summary:AnalyticsSummary={generatedAt:'2026-11-13T00:00:00.000Z',collection:{titles:10,copies:15,available:9,onLoan:5,reserved:1,availabilityPercent:60},circulation:{activeLoans:5,overdueLoans:1,returnedLoans:20,pendingReservations:2,readyReservations:1},accounts:{members:12,openFines:1,outstandingCents:1000},recentActivity:[]}
test('analytics service exposes its repository read model without mutation',async()=>{let reads=0;const repository:AnalyticsRepository={getSummary:async()=>{reads+=1;return summary}};const result=await new AnalyticsService(repository).getSummary();assert.equal(reads,1);assert.deepEqual(result,summary)})
