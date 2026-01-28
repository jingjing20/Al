import type { Interceptor } from '../core/interceptor.js'
import type { UnifiedRequest, UnifiedResponse } from '../core/types.js'

export interface LoggerOptions {
	/** 是否打印请求内容 */
	logRequest?: boolean
	/** 是否打印响应内容 */
	logResponse?: boolean
	/** 自定义日志函数 */
	logFn?: (message: string) => void
}

/**
 * 日志拦截器
 * 记录请求/响应，方便调试
 */
export class Logger implements Interceptor {
	readonly name = 'logger'

	private logRequest: boolean
	private logResponse: boolean
	private log: (message: string) => void

	constructor(options: LoggerOptions = {}) {
		this.logRequest = options.logRequest ?? true
		this.logResponse = options.logResponse ?? true
		this.log = options.logFn ?? console.log
	}

	onRequest(request: UnifiedRequest): UnifiedRequest {
		if (this.logRequest) {
			this.log(`[LLM Request] model=${request.model} messages=${request.messages.length}`)
		}
		return request
	}

	onResponse(response: UnifiedResponse): UnifiedResponse {
		if (this.logResponse) {
			const { meta, usage, cost } = response
			this.log(
				`[LLM Response] traceId=${meta.traceId} ` +
				`latency=${meta.latencyMs}ms ` +
				`tokens=${usage.totalTokens} ` +
				`cost=$${cost.totalCost.toFixed(6)}`
			)
		}
		return response
	}

	onError(error: Error): void {
		this.log(`[LLM Error] ${error.message}`)
	}
}
