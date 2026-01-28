# Node / TypeScript · AI Engineer 实战路线（实用主义版）

> **写给前端/Node 工程师的硬核转型指南**
> 核心理念：拒绝过早抽象，拒绝 Demo 废品，以**生产级工程标准**构建 AI 应用。

---

## 🛑 修正后的核心原则

1.  **Code First, Abstraction Later**：别上来就写 `LLMService` 或 `framework`。先写死业务逻辑，痛了再重构。
2.  **Evals > Features**：没法评估好坏的 AI 功能，一行代码都别合入。
3.  **Visible Internals**：作为工程师，你要控制的是 Prompt、Context Window 和 Token Cost，而不是把它们藏在黑盒里。

---

## 阶段 1：可控的智能（从 Structured Output 开始）

### ✅ 项目 1：Structured Data Extractor
**目标**：打破 "AI 就是聊天" 的幻觉，让 AI 变成函数调用。

### 核心任务
做一个 CLI 工具，输入是一段杂乱的文本（如简历、财报、日志），输出是**严格符合 TypeScript Interface 的 JSON**。

### 必须掌握的技术点
*   **No Framework**：直接使用 OpenAI / Anthropic SDK。
*   **Zod / Typebox**：定义输出 Schema。
*   **Prompt Engineering**：如何把 Zod Schema 转换成 System Prompt。
*   **Validation Loop**：解析失败怎么自动 Retry 并把错误喂回给 LLM 让它修正。

### 关键产出
*   一个足够健壮的 `extract(text, schema)` 函数。
*   **此时再重构**：当你发现 retry 逻辑重复了，封装一个轻量级的 `completionWithRetry` 函数（这就是你的雏形 Service）。

---

## 阶段 2：长程任务编排（Workflow）

### ✅ 项目 2：Deep Research Worker
**目标**：解决“一步到位”无法解决的复杂问题，学习状态管理和容错。

### 核心任务
输入一个话题（如“分析 2024 年 React 生态变化”），程序自动：
1.  拆解关键词
2.  Google Search (SerpAPI)
3.  并发抓取网页内容 (Puppeteer/Fetch)
4.  清洗 + 总结单页
5.  汇总生成最终报告

### 必须掌握的技术点
*   **State Persistence**：程序崩溃后，下次运行能从第 3 步继续，而不是重头开始。（用文件 JSON 或 SQLite 存状态）。
*   **Concurrency Control**：控制并发数，避免 Rate Limit。
*   **Context Management**：网页太长怎么切？Context Window 爆了怎么办？(RAG 的雏形)。
*   **Refactoring**：*这时* 你会发现代码乱了。引入 **State Machine (XState)** 或简单的 **DAG** 结构来管理流程。**不要写通用引擎，写死这个业务的流程。**

---

## 阶段 3：工程化护城河（Evals & Testing）

### ✅ 项目 3：The Judge (自动评估系统)
**目标**：这是 AI 工程最缺的一环。你怎么证明你改了 Prompt 后效果更好了？

### 核心任务
为项目 2 建立一套自动化测试管线。

### 必须掌握的技术点
*   **Dataset Management**：准备 20 个测试 Case（输入 + 期望的输出要点）。
*   **LLM-as-a-Judge**：写一个“判卷老师 Agent”，给项目 2 的输出打分（1-5分）并给出理由。
*   **Regression Testing**：每次修改 Prompt 或逻辑，自动跑一遍测试集，算出平均分变化。
*   **Cost Tracking**：记录每次运行消耗了多少 Token / 美金。

---

## 阶段 4：综合大考（Agentic System）

### ✅ 项目 4：Code Janitor (代码维护 Agent)
**目标**：发挥你懂代码的优势，做一个真正能改代码的 Agent。

### 核心任务
一个 CLI 工具，指向一个本地 git 仓库，给出一个 Issue 描述，它自动：
1.  **Explore**：分析文件结构，找到相关代码。
2.  **Plan**：提出修改计划。
3.  **Code**：**真实修改文件** (fs 模块)。
4.  **Verify**：运行 `npm test`，如果挂了，自动读报错 -> 修复代码 -> 重试。

### 必须掌握的技术点
*   **Tool Use (Function Calling)**：`read_file`, `write_patch`, `run_command`。
*   **ReAct Loop**：`Thought` -> `Action` -> `Observation` 循环。
*   **Safety**：什么文件不能改？怎么回滚？(Git integration)。

---

## 阶段 5：生产级运维（Ops & Observability）

### ✅ 项目 5：AI Ops Dashboard (发挥前端优势)
**目标**：看得见，才能调优。

### 核心任务
为你的 Agent 做一个简单的 Web 看板 (Next.js/React)。

### 功能点
*   **Trace View**：可视化展示一次任务的完整执行链（User -> Reason -> Tool -> Output）。
*   **Cost Analysis**：哪些 Token 是浪费的？
*   **Prompt Management**：在界面上修改 Prompt，无需发版即可生效（简单的 CMS）。
*   **Human-in-the-loop**：关键步骤（如修改文件前）在界面上弹窗请求人工“批准”。

---

## 6 个月行动节奏

| Month | Focus | Project | 关键指标 |
| :--- | :--- | :--- | :--- |
| **M1** | **以“结果”为导向** | Project 1 (Extractor) | 100% 类型安全的 JSON 输出 |
| **M2** | **以“过程”为导向** | Project 2 (Research) | 任务中断可恢复 (Resumable) |
| **M3** | **信心构建** | Project 3 (Evals) | 建立一键回归测试脚本 |
| **M4-5**| **全能力整合** | Project 4 (Coder Agent)| 能够自动修复简单的 Bug 即算成功 |
| **M6** | **可见性** | Project 5 (Ops UI) | 对接 Trace，哪怕只是本地 Log |

---

## 给前端/Node 开发者的特别叮嘱

1.  **TypeScript 是你的神兵利器**：用 Zod/Typebox 强约束 LLM 的输出，这是 Python 栈（LangChain Py 早期）比较痛苦但 TS 极度顺手的地方。
2.  **Serverless/Edge 需谨慎**：LLM 任务通常耗时久（几秒到几分钟），Vercel 等平台的 Serverless Function timeout 是大坑。学会用 Node 进程、Queue (BullMQ) 或者 Docker 跑长任务。
3.  **流式传输 (Streaming) 是标配**：前端用户没耐心等转圈。在 Project 2 开始，必须实现全链路的 Streaming UI (Text stream, Step stream)。

**Next Action:**
不用想太远。从 **Project 1** 开始，建一个文件夹 `ai-structured-extractor`，用 `ts-node` 跑通第一个 OpenAI API 调用。
