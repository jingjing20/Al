import type { Interceptor } from '../core/interceptor.js'
import type { UnifiedRequest, UnifiedResponse, UnifiedResponseChunk } from '../core/types.js'
import type { LLMProvider } from '../core/provider.js'

export interface RetryOptions {
	/** 最大重试次数 */
	maxRetries?: number
	/** 请求超时 (ms) */
	timeoutMs?: number
	/** 重试延迟基数 (ms)，实际延迟 = baseDelayMs * 2^attempt */
	baseDelayMs?: number
	/** 可重试的错误类型 */
	retryableErrors?: string[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxRetries: 3,
	timeoutMs: 30000,
	baseDelayMs: 1000,
	retryableErrors: ['rate_limit_exceeded', 'timeout', 'ECONNRESET', 'ETIMEDOUT'],
}

/**
 * Retry 拦截器
 * 包装 Provider 的 chat 方法，提供超时和重试能力
 */
export class RetryInterceptor implements Interceptor {
	readonly name = 'retry'
	private options: Required<RetryOptions>

	constructor(options: RetryOptions = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options }
	}

	/**
	 * 包装 Provider，返回带重试能力的新 Provider
	 */
	wrapProvider(provider: LLMProvider): LLMProvider {
		const self = this
		const wrapper: LLMProvider = {
			name: provider.name,
			// Bind context or invoke directly
			listModels: () => provider.listModels(),
			getPricing: (model: string) => provider.getPricing(model),

			async chat(request: UnifiedRequest): Promise<UnifiedResponse> {
				return self.executeWithRetry(() => provider.chat(request))
			},
		}

		if (provider.chatStream) {
			wrapper.chatStream = (request: UnifiedRequest) => provider.chatStream!(request)
		}

		return wrapper
	}

	private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
		let lastError: Error | null = null

		for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
			try {
				return await this.withTimeout(fn(), this.options.timeoutMs)
			} catch (error) {
				lastError = error as Error

				if (!this.isRetryable(lastError) || attempt === this.options.maxRetries) {
					throw lastError
				}

				const delay = this.options.baseDelayMs * Math.pow(2, attempt)
				await this.sleep(delay)
			}
		}

		throw lastError
	}

	private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Request timeout after ${ms}ms`))
			}, ms)

			promise
				.then(result => {
					clearTimeout(timer)
					resolve(result)
				})
				.catch(error => {
					clearTimeout(timer)
					reject(error)
				})
		})
	}

	private isRetryable(error: Error): boolean {
		const message = error.message.toLowerCase()
		return this.options.retryableErrors.some(e => message.includes(e.toLowerCase()))
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}
}
