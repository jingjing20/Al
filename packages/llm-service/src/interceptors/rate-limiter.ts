import type { Interceptor } from '../core/interceptor.js'
import type { UnifiedRequest } from '../core/types.js'

export interface RateLimiterOptions {
	/** 每分钟最大请求数 */
	maxRequestsPerMinute: number
}

/**
 * 本地速率限制拦截器
 * 简单的滑动窗口实现，防止测试时刷爆 API
 */
export class RateLimiter implements Interceptor {
	readonly name = 'rate-limiter'

	private timestamps: number[] = []
	private maxRequests: number
	private windowMs = 60_000 // 1 minute

	constructor(options: RateLimiterOptions) {
		this.maxRequests = options.maxRequestsPerMinute
	}

	async onRequest(request: UnifiedRequest): Promise<UnifiedRequest> {
		const now = Date.now()

		// 清理过期的时间戳
		this.timestamps = this.timestamps.filter(t => now - t < this.windowMs)

		if (this.timestamps.length >= this.maxRequests) {
			const oldestTimestamp = this.timestamps[0]
			const waitMs = this.windowMs - (now - oldestTimestamp)
			throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitMs / 1000)}s`)
		}

		this.timestamps.push(now)
		return request
	}
}
