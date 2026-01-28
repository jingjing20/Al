import { z } from 'zod'

// Message Schema
export const MessageSchema = z.object({
	role: z.enum(['system', 'user', 'assistant']),
	content: z.string(),
})

export type Message = z.infer<typeof MessageSchema>

// Unified Request
export const UnifiedRequestSchema = z.object({
	model: z.string(),
	messages: z.array(MessageSchema),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().positive().optional(),
	stream: z.boolean().optional().default(false),
})

export type UnifiedRequest = z.infer<typeof UnifiedRequestSchema>

// Token Usage
export interface TokenUsage {
	promptTokens: number
	completionTokens: number
	totalTokens: number
}

// Cost Estimate (USD)
export interface CostEstimate {
	inputCost: number
	outputCost: number
	totalCost: number
}

// Response Metadata
export interface ResponseMeta {
	traceId: string
	model: string
	provider: string
	latencyMs: number
}

// Unified Response
export interface UnifiedResponse {
	content: string
	usage: TokenUsage
	cost: CostEstimate
	meta: ResponseMeta
}

// Unified Response Chunk (Stream)
export interface UnifiedResponseChunk {
	content: string
	usage?: TokenUsage
	cost?: CostEstimate
	meta?: ResponseMeta
}

// Model Pricing (per 1M tokens)
export interface ModelPricing {
	inputPer1M: number
	outputPer1M: number
}
