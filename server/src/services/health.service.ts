export interface HealthStatus { status:'ok'; service:string; timestamp:string }
export class HealthService { getStatus():HealthStatus { return {status:'ok',service:'smart-library-api',timestamp:new Date().toISOString()} } }
