import type { UnifiedRequest, UnifiedResponse } from './types.js'

/**
 * 拦截器接口
 * 采用洋葱模型，可拦截请求和响应
 */
export interface Interceptor {
	/** 拦截器名称 */
	readonly name: string

	/** 请求拦截 (可修改请求) */
	onRequest?(request: UnifiedRequest): UnifiedRequest | Promise<UnifiedRequest>

	/** 响应拦截 (可修改响应) */
	onResponse?(response: UnifiedResponse): UnifiedResponse | Promise<UnifiedResponse>

	/** 流式响应拦截 (可修改流) - Not implemented yet for simplicity */

	/** 错误处理 */
	onError?(error: Error): void
}
