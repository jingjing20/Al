import type { LLMProvider } from './provider.js'
import type { Interceptor } from './interceptor.js'
import type { UnifiedRequest, UnifiedResponse, UnifiedResponseChunk } from './types.js'

/**
 * 统一 LLM 客户端
 * 封装 Provider + 拦截器链
 */
export class UnifiedLLMClient {
	private provider: LLMProvider
	private interceptors: Interceptor[]
	private totalCost = 0
	private totalTokens = 0

	constructor(provider: LLMProvider, interceptors: Interceptor[] = []) {
		this.provider = provider
		this.interceptors = interceptors
	}

	async chat(request: UnifiedRequest): Promise<UnifiedResponse> {
		let req = { ...request }

		// 请求拦截 (正序)
		for (const interceptor of this.interceptors) {
			if (interceptor.onRequest) {
				req = await interceptor.onRequest(req)
			}
		}

		let response: UnifiedResponse
		try {
			response = await this.provider.chat(req)
		} catch (error) {
			// 错误通知 (正序)
			for (const interceptor of this.interceptors) {
				if (interceptor.onError) {
					interceptor.onError(error as Error)
				}
			}
			throw error
		}

		// 响应拦截 (逆序 - 洋葱模型)
		for (let i = this.interceptors.length - 1; i >= 0; i--) {
			const interceptor = this.interceptors[i]
			if (interceptor.onResponse) {
				response = await interceptor.onResponse(response)
			}
		}

		// 累计统计
		this.totalCost += response.cost.totalCost
		this.totalTokens += response.usage.totalTokens

		return response
	}

	async *chatStream(request: UnifiedRequest): AsyncIterable<UnifiedResponseChunk> {
		let req = { ...request }

		// Interceptors: onRequest
		for (const interceptor of this.interceptors) {
			if (interceptor.onRequest) {
				req = await interceptor.onRequest(req)
			}
		}

		if (!this.provider.chatStream) {
			throw new Error(`Provider ${this.provider.name} does not support streaming`)
		}

		try {
			const stream = this.provider.chatStream(req)

			for await (const chunk of stream) {
				// Track usage if available in the chunk (usually last chunk)
				if (chunk.cost) {
					this.totalCost += chunk.cost.totalCost
				}
				if (chunk.usage) {
					this.totalTokens += chunk.usage.totalTokens
				}
				yield chunk
			}
		} catch (error) {
			for (const interceptor of this.interceptors) {
				if (interceptor.onError) {
					interceptor.onError(error as Error)
				}
			}
			throw error
		}
	}

	/** 获取累计成本 (USD) */
	getTotalCost(): number {
		return this.totalCost
	}

	/** 获取累计 Token 消耗 */
	getTotalTokens(): number {
		return this.totalTokens
	}

	/** 重置统计 */
	resetStats(): void {
		this.totalCost = 0
		this.totalTokens = 0
	}
}
