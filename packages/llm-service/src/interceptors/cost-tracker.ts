import type { Interceptor } from '../core/interceptor.js'
import type { UnifiedResponse } from '../core/types.js'

/**
 * 成本追踪拦截器
 * 累计所有请求的 Token 消耗和成本
 */
export class CostTracker implements Interceptor {
	readonly name = 'cost-tracker'

	private totalInputTokens = 0
	private totalOutputTokens = 0
	private totalCost = 0
	private requestCount = 0

	onResponse(response: UnifiedResponse): UnifiedResponse {
		this.totalInputTokens += response.usage.promptTokens
		this.totalOutputTokens += response.usage.completionTokens
		this.totalCost += response.cost.totalCost
		this.requestCount++
		return response
	}

	/** 获取统计摘要 */
	getSummary() {
		return {
			requestCount: this.requestCount,
			totalInputTokens: this.totalInputTokens,
			totalOutputTokens: this.totalOutputTokens,
			totalTokens: this.totalInputTokens + this.totalOutputTokens,
			totalCost: this.totalCost,
		}
	}

	/** 重置统计 */
	reset(): void {
		this.totalInputTokens = 0
		this.totalOutputTokens = 0
		this.totalCost = 0
		this.requestCount = 0
	}
}
