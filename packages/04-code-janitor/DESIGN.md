# Project 4: Code Janitor - 代码维护 Agent 设计文档

> **Goal**: 构建一个能读写代码文件、执行命令、并根据错误反馈自动修复的编程助手。

---

## 1. Context & Prerequisites

### 1.1 为什么这个 Project 最难？

前三个项目的 Agent 都只和 LLM 交互。
这个项目的 Agent 要和 **真实世界** 交互：
*   读写文件系统
*   执行 shell 命令
*   解析编译器/测试框架的输出
*   根据错误反馈修复代码

一旦 Agent 能操作文件系统，**安全性**就成为问题。
我们会引入 **Sandbox** 概念，限制 Agent 只能操作特定目录。

### 1.2 核心场景

```
用户: "给 src/utils.ts 加一个 slugify 函数，并写单元测试"

Agent:
1. [read_file] 读取 src/utils.ts
2. [think] 理解现有代码结构
3. [write_file] 追加 slugify 函数
4. [write_file] 创建 src/utils.test.ts
5. [run_command] npm test
6. [观察结果] 如果失败，回到步骤 3 修复
```

---

## 2. Architecture: Tools + ReAct Loop

### 2.1 Tools 定义

| Tool | Description | Risk Level |
|------|-------------|------------|
| `read_file(path)` | 读取文件内容 | Low |
| `write_file(path, content)` | 写入/覆盖文件 | **High** |
| `list_dir(path)` | 列出目录内容 | Low |
| `run_command(cmd)` | 执行 shell 命令 | **High** |

### 2.2 安全机制

1. **Sandbox 目录**：只允许操作 `packages/04-code-janitor/sandbox/` 下的文件。
2. **命令白名单**：只允许执行 `npm test`, `npm run build` 等安全命令。
3. **确认机制**：高风险操作（写文件）前可以要求用户确认（可选）。

### 2.3 状态管理

```typescript
type JanitorState = {
    task: string;           // 原始任务
    iteration: number;
    max_iterations: number;
    files_read: string[];   // 已读取的文件
    files_written: string[];// 已修改的文件
    command_history: { cmd: string; output: string; success: boolean }[];
    last_error: string | null;
};
```

---

## 3. Implementation Plan

### Phase 1: Tools 实现
*   `read_file`, `write_file`, `list_dir` (带 Sandbox 检查)
*   `run_command` (带命令白名单)

### Phase 2: Agent Loop
*   复用 Project 2 的 ReAct 模式
*   构造 Prompt 包含文件内容 + 命令输出

### Phase 3: Error Recovery
*   解析 TypeScript 编译错误
*   解析测试框架输出
*   让 LLM 生成修复方案

### Phase 4: 实战测试
*   创建一个 Sandbox 项目
*   让 Agent 自动添加功能并通过测试

---

## 4. Sandbox 项目结构

我们会在 `sandbox/` 下创建一个简单的 TypeScript 项目：

```
packages/04-code-janitor/
├── src/
│   ├── tools.ts        # File/Command Tools
│   ├── agent.ts        # ReAct Loop
│   └── index.ts        # Entry point
├── sandbox/            # Agent 只能操作这个目录
│   ├── src/
│   │   └── utils.ts    # 待修改的代码
│   ├── package.json
│   └── tsconfig.json
└── DESIGN.md
```

---

## 5. Key Risks

| Risk | Mitigation |
|------|------------|
| Agent 删除重要文件 | Sandbox 限制 + 只允许追加/覆盖 |
| 无限循环修复 | max_iterations 限制 |
| 执行危险命令 | 命令白名单 |
| Token 爆炸（大文件） | 文件内容截断/摘要 |

---

## 6. Next Step

确认设计后，进入 Phase 1：实现 Tools。
