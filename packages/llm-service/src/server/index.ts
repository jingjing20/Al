import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { UnifiedLLMClient, OpenAIProvider, CostTracker, Logger, RetryInterceptor } from '../index.js'
import { UnifiedRequestSchema } from '../core/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = Number(process.env.PORT) || 3000
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL
const DEFAULT_MODEL = process.env.LLM_MODEL || 'mimo-v2-flash'

if (!OPENAI_API_KEY) {
	console.error('Error: OPENAI_API_KEY environment variable is required')
	process.exit(1)
}

// 初始化 LLM Client
const retryInterceptor = new RetryInterceptor({ maxRetries: 2, timeoutMs: 60000 })
const provider = new OpenAIProvider({
	apiKey: OPENAI_API_KEY,
	baseURL: OPENAI_BASE_URL
})
const costTracker = new CostTracker()

const client = new UnifiedLLMClient(
	retryInterceptor.wrapProvider(provider),
	[costTracker, new Logger()]
)

// 创建 Express 实例
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static(join(__dirname, '../../public')))

// Chat API
app.post('/v1/chat', async (req, res) => {
	try {
		// Filter out irrelevant roles and only keep user/assistant/system
		if (req.body.messages) {
			req.body.messages = req.body.messages.filter((m: any) =>
				['user', 'assistant', 'system'].includes(m.role)
			)
		}

		const body = UnifiedRequestSchema.parse(req.body)

		console.log(`[Chat Request] Model: ${body.model}, Stream: ${body.stream}`)
		console.log(`[Chat History] Message Count: ${body.messages.length}`)
		if (body.messages.length > 0) {
			const lastMsg = body.messages[body.messages.length - 1]
			console.log(`[Last Message] ${lastMsg.role}: ${lastMsg.content.slice(0, 50)}...`)
		}

		// Handle Streaming
		if (body.stream) {
			res.setHeader('Content-Type', 'text/event-stream')
			res.setHeader('Cache-Control', 'no-cache')
			res.setHeader('Connection', 'keep-alive')

			try {
				const stream = client.chatStream(body)
				for await (const chunk of stream) {
					res.write(`data: ${JSON.stringify(chunk)}\n\n`)
				}
				res.write('data: [DONE]\n\n')
				res.end()
			} catch (error) {
				const err = error as Error
				// Note: If headers sent, we can't send JSON error.
				// Best effort logging here.
				console.error('Stream error:', err)
				res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
				res.end()
			}
			return
		}

		// Normal Response
		const response = await client.chat(body)
		res.json(response)
	} catch (error) {
		const err = error as Error
		res.status(400).json({ error: err.message })
	}
})

// Stats API
app.get('/v1/stats', (_req, res) => {
	res.json(costTracker.getSummary())
})

// Config API
app.get('/v1/config', (_req, res) => {
	res.json({ defaultModel: DEFAULT_MODEL })
})

// 启动服务
app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`)
})
