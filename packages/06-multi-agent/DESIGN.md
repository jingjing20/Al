# Project 06: Multi-Agent Code Review Team

## 目标

构建一个多 Agent 协作系统：Writer 写代码，Reviewer 审查，循环迭代直到代码通过审查。

## 核心流程

```
[User Task: "写一个验证邮箱的函数"]
              ↓
       ┌─────────────┐
       │ Writer Agent │ ──→ 生成初始代码
       └─────────────┘
              ↓
       ┌──────────────┐
       │ Reviewer Agent│ ──→ 审查代码，输出 APPROVED 或反馈
       └──────────────┘
              ↓
         ┌────┴────┐
         │APPROVED?│
         └────┬────┘
        Yes   │   No
         ↓    │    ↓
      [输出]  └─→ [Writer 根据反馈修改] ──→ 回到 Reviewer
```

## Agent 定义

### Writer Agent

**职责**：根据需求编写 TypeScript 代码

**System Prompt 要点**：
- 你是一个高级 TypeScript 开发者
- 根据需求编写完整、可运行的代码
- 如果收到 Reviewer 反馈，针对性地修改代码
- 输出格式：纯代码块，不要多余解释

### Reviewer Agent

**职责**：审查代码质量，提出改进建议

**System Prompt 要点**：
- 你是一个严格的代码审查专家
- 检查：功能正确性、边界情况、类型安全、代码风格、潜在 bug
- 如果代码没有明显问题，输出 `APPROVED`
- 如果有问题，列出具体问题和修改建议
- 不要过度苛刻，3 轮内应该通过

## 数据结构

```typescript
// 协作状态
interface ReviewSession {
  task: string;              // 原始需求
  iterations: Iteration[];   // 迭代历史
  status: 'in_progress' | 'approved' | 'max_iterations';
  finalCode?: string;        // 最终代码
}

// 单次迭代
interface Iteration {
  round: number;
  code: string;              // Writer 产出的代码
  review: string;            // Reviewer 的反馈
  approved: boolean;
}
```

## 目录结构

```
packages/06-multi-agent/
├── src/
│   ├── types.ts        # 类型定义
│   ├── writer.ts       # Writer Agent
│   ├── reviewer.ts     # Reviewer Agent
│   ├── orchestrator.ts # 编排器：协调两个 Agent 的交互
│   └── index.ts        # CLI 入口
├── package.json
├── tsconfig.json
├── .env
└── DESIGN.md
```

## 模块职责

### writer.ts
- 封装 Writer Agent 的 LLM 调用
- 处理初始需求和修改反馈两种场景
- 从 LLM 响应中提取代码块

### reviewer.ts
- 封装 Reviewer Agent 的 LLM 调用
- 检测响应中是否包含 `APPROVED`
- 解析具体的审查意见

### orchestrator.ts
- 核心编排逻辑
- 控制 Writer 和 Reviewer 的交替执行
- 管理迭代状态
- 判断终止条件（APPROVED 或达到最大轮数）

### index.ts
- CLI 入口
- 接收用户任务描述
- 输出迭代过程和最终代码

## 配置项

```env
OPENAI_API_KEY=xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
MAX_ITERATIONS=5
```

## 使用方法

```bash
# 运行代码审查协作
pnpm run start -- "写一个验证邮箱格式的函数"
pnpm run start -- "写一个 debounce 工具函数"
pnpm run start -- "写一个解析 URL 查询参数的函数"
```

## 预期输出示例

```
=== Code Review Team ===
任务: 写一个验证邮箱格式的函数

--- Round 1 ---
[Writer] 生成代码...
[Reviewer] 审查中...
反馈:
  1. 正则表达式过于简单，无法处理带 + 号的邮箱
  2. 缺少对空字符串的处理

--- Round 2 ---
[Writer] 根据反馈修改...
[Reviewer] 审查中...
反馈: APPROVED

=== 最终代码 ===
function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return regex.test(email.trim());
}

完成！共 2 轮迭代
```

## 学习要点

1. **Agent 角色设计**：如何通过 System Prompt 定义清晰的职责
2. **协作模式**：循环迭代是最简单的多 Agent 模式
3. **消息传递**：Agent 之间通过文本传递信息
4. **终止条件**：避免无限循环，设置最大轮数
5. **状态管理**：跟踪迭代历史，支持回溯分析

## 后续可扩展

- [ ] 添加 Tester Agent：自动生成测试用例
- [ ] 添加 Architect Agent：先设计接口再实现
- [ ] 支持多文件协作
- [ ] 集成到 Code Janitor（04 项目）
