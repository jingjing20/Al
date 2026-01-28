import OpenAI from 'openai'
import { nanoid } from 'nanoid'
import type { LLMProvider } from '../core/provider.js'
import type { UnifiedRequest, UnifiedResponse, UnifiedResponseChunk, ModelPricing } from '../core/types.js'

// OpenAI 模型定价 (USD per 1M tokens) - 2024 pricing
const PRICING: Record<string, ModelPricing> = {
	'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10 },
	'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
	'gpt-4-turbo': { inputPer1M: 10, outputPer1M: 30 },
	'gpt-3.5-turbo': { inputPer1M: 0.5, outputPer1M: 1.5 },
}

const DEFAULT_PRICING: ModelPricing = { inputPer1M: 10, outputPer1M: 30 }

export interface OpenAIProviderOptions {
	apiKey: string
	baseURL?: string
}

export class OpenAIProvider implements LLMProvider {
	readonly name = 'openai'
	private client: OpenAI

	constructor(options: OpenAIProviderOptions) {
		this.client = new OpenAI({
			apiKey: options.apiKey,
			baseURL: options.baseURL,
		})
	}

	async chat(request: UnifiedRequest): Promise<UnifiedResponse> {
		const startTime = Date.now()
		const traceId = nanoid(12)

		const completion = await this.client.chat.completions.create({
			model: request.model,
			messages: request.messages.map(m => ({
				role: m.role,
				content: m.content,
			})),
			temperature: request.temperature,
			max_tokens: request.maxTokens,
		})

		const latencyMs = Date.now() - startTime
		const usage = completion.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
		const pricing = this.getPricing(request.model)

		const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.inputPer1M
		const outputCost = (usage.completion_tokens / 1_000_000) * pricing.outputPer1M

		return {
			content: completion.choices[0]?.message?.content ?? '',
			usage: {
				promptTokens: usage.prompt_tokens,
				completionTokens: usage.completion_tokens,
				totalTokens: usage.total_tokens,
			},
			cost: {
				inputCost,
				outputCost,
				totalCost: inputCost + outputCost,
			},
			meta: {
				traceId,
				model: request.model,
				provider: this.name,
				latencyMs,
			},
		}
	}

	async *chatStream(request: UnifiedRequest): AsyncIterable<UnifiedResponseChunk> {
		const stream = await this.client.chat.completions.create({
			model: request.model,
			messages: request.messages.map(m => ({
				role: m.role,
				content: m.content,
			})),
			temperature: request.temperature,
			max_tokens: request.maxTokens,
			stream: true,
			stream_options: { include_usage: true },
		})

		const traceId = nanoid(12)
		const pricing = this.getPricing(request.model)
		let accumulatedContent = ''

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content ?? ''
			accumulatedContent += content

			const responseChunk: UnifiedResponseChunk = {
				content,
				meta: {
					traceId,
					model: request.model,
					provider: this.name,
					latencyMs: 0
				}
			}

			if (chunk.usage) {
				const usage = {
					promptTokens: chunk.usage.prompt_tokens,
					completionTokens: chunk.usage.completion_tokens,
					totalTokens: chunk.usage.total_tokens,
				}
				const inputCost = (usage.promptTokens / 1_000_000) * pricing.inputPer1M
				const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputPer1M

				responseChunk.usage = usage
				responseChunk.cost = {
					inputCost,
					outputCost,
					totalCost: inputCost + outputCost
				}
			}

			yield responseChunk
		}
	}

	listModels(): string[] {
		return Object.keys(PRICING)
	}

	getPricing(model: string): ModelPricing {
		const pricing = PRICING[model]
		// Use default pricing if model known, otherwise strict 0 to avoid null/NaN
		if (pricing) return pricing
		return { inputPer1M: 0, outputPer1M: 0 }
	}
}
