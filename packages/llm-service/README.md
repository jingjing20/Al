# @ai-agent/llm-service

把 LLM API 封装成一个可控、可观测、可替换的工程组件。

## 安装

```bash
pnpm install
pnpm build
```

## 使用

```typescript
import {
  UnifiedLLMClient,
  OpenAIProvider,
  CostTracker,
  Logger
} from '@ai-agent/llm-service'

const client = new UnifiedLLMClient(
  new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  [new CostTracker(), new Logger()]
)

const response = await client.chat({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
})

console.log(response.content)
console.log(`Cost: $${response.cost.totalCost.toFixed(6)}`)
```

## 架构

```
UnifiedLLMClient
    ├── Provider (OpenAI, Anthropic...)
    └── Interceptors
        ├── CostTracker (累计消耗)
        ├── RateLimiter (限流)
        └── Logger (日志)
```

## API

### `UnifiedLLMClient`

- `chat(request)` - 发送对话请求
- `getTotalCost()` - 获取累计成本
- `getTotalTokens()` - 获取累计 Token

### Interceptors

- `CostTracker` - Token/成本追踪
- `RateLimiter` - 请求限流
- `Logger` - 调试日志
