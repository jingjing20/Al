/**
 * @ai-agent/llm-service 使用示例
 *
 * 运行方式:
 * 1. pnpm install
 * 2. pnpm build
 * 3. OPENAI_API_KEY=sk-xxx node --experimental-specifier-resolution=node examples/basic.js
 */

import { UnifiedLLMClient, OpenAIProvider, CostTracker, RateLimiter, Logger } from '../src/index.js'

async function main() {
	const apiKey = process.env.OPENAI_API_KEY
	if (!apiKey) {
		console.error('Error: OPENAI_API_KEY environment variable is required')
		process.exit(1)
	}

	// 创建拦截器
	const costTracker = new CostTracker()
	const rateLimiter = new RateLimiter({ maxRequestsPerMinute: 10 })
	const logger = new Logger()

	// 创建客户端
	const client = new UnifiedLLMClient(
		new OpenAIProvider({ apiKey }),
		[rateLimiter, costTracker, logger]
	)

	// 发送请求
	const response = await client.chat({
		model: 'mimo-v2-flash',
		messages: [
			{ role: 'user', content: 'Say hello in Chinese' }
		],
		temperature: 0.7,
		stream: false,
	})

	console.log('\n--- Response ---')
	console.log('Content:', response.content)
	console.log('Tokens:', response.usage.totalTokens)
	console.log('Cost: $' + response.cost.totalCost.toFixed(6))
	console.log('Latency:', response.meta.latencyMs + 'ms')
	console.log('TraceId:', response.meta.traceId)

	console.log('\n--- Cost Tracker Summary ---')
	console.log(costTracker.getSummary())
}

main().catch(console.error)
