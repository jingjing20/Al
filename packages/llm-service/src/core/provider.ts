import type { UnifiedRequest, UnifiedResponse, UnifiedResponseChunk, ModelPricing } from './types.js'

/**
 * LLM Provider 抽象接口
 * 所有具体 Provider (OpenAI, Anthropic 等) 必须实现此接口
 */
export interface LLMProvider {
	/** Provider 名称 */
	readonly name: string

	/** 执行对话请求 */
	chat(request: UnifiedRequest): Promise<UnifiedResponse>

	/** 执行流式对话请求 */
	chatStream?(request: UnifiedRequest): AsyncIterable<UnifiedResponseChunk>

	/** 获取支持的模型列表 */
	listModels(): string[]

	/** 获取指定模型的定价 */
	getPricing(model: string): ModelPricing
}
