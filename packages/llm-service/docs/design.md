# Phase 0: Unified LLM Service

> 把 LLM API 封装成一个可控、可观测、可替换的工程组件。

## 项目结构 (pnpm Monorepo)

```text
/Users/admin/Desktop/AI/
├── pnpm-workspace.yaml
├── package.json              # Root package.json
├── tsconfig.base.json        # 共享 TS 配置
└── packages/
    └── llm-service/          # Phase 0 项目
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── core/         # 核心抽象
            │   ├── types.ts          # 统一类型定义
            │   ├── provider.ts       # LLMProvider 接口
            │   └── client.ts         # UnifiedLLMClient
            ├── providers/    # 具体实现
            │   ├── openai.ts
            │   └── anthropic.ts
            ├── interceptors/ # 拦截器
            │   ├── cost-tracker.ts
            │   ├── rate-limiter.ts
            │   └── logger.ts
            └── index.ts
```

---

## 核心设计

### 1. 统一请求/响应类型 (`core/types.ts`)

```typescript
// 统一请求
interface UnifiedRequest {
  model: string
  messages: Message[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

// 统一响应
interface UnifiedResponse {
  content: string
  usage: TokenUsage
  cost: CostEstimate
  meta: ResponseMeta
}

// Token 消耗
interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// 成本预估
interface CostEstimate {
  inputCost: number   // USD
  outputCost: number  // USD
  totalCost: number   // USD
}
```

### 2. Provider 抽象 (`core/provider.ts`)

```typescript
interface LLMProvider {
  name: string

  // 核心方法
  chat(request: UnifiedRequest): Promise<UnifiedResponse>

  // 模型信息
  listModels(): string[]
  getPricing(model: string): ModelPricing
}
```

### 3. 拦截器机制 (`interceptors/`)

采用洋葱模型，请求/响应都可被拦截：

```typescript
interface Interceptor {
  name: string
  onRequest?(req: UnifiedRequest): UnifiedRequest | Promise<UnifiedRequest>
  onResponse?(res: UnifiedResponse): UnifiedResponse | Promise<UnifiedResponse>
  onError?(err: Error): void
}
```

**内置拦截器：**

| 拦截器 | 职责 |
|--------|------|
| `CostTracker` | 累计 Token 消耗，计算美元成本 |
| `RateLimiter` | 本地令牌桶，防止测试时刷爆 API |
| `Logger` | 请求/响应落盘，带 traceId |

### 4. 统一客户端 (`core/client.ts`)

```typescript
class UnifiedLLMClient {
  private provider: LLMProvider
  private interceptors: Interceptor[]

  constructor(provider: LLMProvider, interceptors?: Interceptor[])

  async chat(request: UnifiedRequest): Promise<UnifiedResponse>

  // 统计
  getTotalCost(): number
  getTotalTokens(): number
}
```

---

## 技术选型

| 依赖 | 用途 |
|------|------|
| `typescript` | 类型安全 |
| `zod` | 运行时 Schema 校验 |
| `openai` | OpenAI SDK |
| `@anthropic-ai/sdk` | Anthropic SDK |
| `nanoid` | traceId 生成 |

---

## 使用示例

```typescript
import { UnifiedLLMClient, OpenAIProvider, CostTracker, Logger } from '@ai-agent/llm-service'

const client = new UnifiedLLMClient(
  new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  [new CostTracker(), new Logger()]
)

const response = await client.chat({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
})

console.log(response.content)
console.log(`Cost: $${response.cost.totalCost.toFixed(4)}`)
```

---

## 验证计划

1. **单元测试**：Mock Provider，验证拦截器链路
2. **集成测试**：真实调用 OpenAI API，验证 Token 计费准确性
3. **手动验证**：运行示例脚本，检查日志输出

---

## 后续扩展点 (不在本阶段)

- Stream 支持
- Prompt Template
- 多 Provider 负载均衡
