# Project 05: RAG Codebase Q&A

## 目标

构建一个 RAG 系统，对代码库建立向量索引，支持自然语言问答。

## 核心流程

```
[索引阶段]
Codebase → Loader → Splitter → Embedder → Vector Store (JSON)

[查询阶段]
Query → Embedder → Retriever (Top-20) → Reranker (Top-5) → Generator → Answer
```

## 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| Embedding | OpenAI text-embedding-3-small | 便宜、效果够用 |
| Vector Store | 本地 JSON | 学习目的，不引入外部依赖 |
| 相似度计算 | 余弦相似度（手写） | 理解原理 |
| Reranker | LLM-as-Reranker | 复用现有 API，无需额外账号 |
| Generator | OpenAI Chat | 统一模型调用 |

## 模块职责

### loader.ts
- 递归遍历目录，读取 .ts 文件
- 过滤 node_modules、dist、测试文件
- 跳过超过 100KB 的大文件

### splitter.ts
- 按函数/类边界切分代码
- 使用正则匹配 `function`、`class`、箭头函数定义
- 过大的块（>2000字符）进一步拆分，保留 5 行重叠
- 过小的块（<100字符）被丢弃

### embedder.ts
- 批量调用 OpenAI Embedding API（每批 20 个）
- 输入格式：`File: xxx\ntype: xxx\n<code>`
- 提供 `embedChunks` 和 `embedQuery` 两个接口

### store.ts
- 本地 JSON 文件存储向量索引
- 包含版本号，不兼容时提示重建
- 结构：`{ version, createdAt, chunks: IndexedChunk[] }`

### retriever.ts
- 手写余弦相似度计算
- 返回相似度最高的 Top-N 候选（默认 20）

### reranker.ts
- LLM-as-Reranker：让 LLM 对每个候选打 0-10 分
- 并发评分（限制 5 并发）
- 返回评分最高的 Top-K（默认 5）

### generator.ts
- 基于 Top-K 代码片段构建上下文
- 系统提示词强调：只基于提供的代码回答，引用文件路径
- 温度 0.3，平衡准确性和流畅性

## 配置项

```env
OPENAI_API_KEY=xxx
OPENAI_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small
OPENAI_MODEL=gpt-4o-mini
RETRIEVAL_TOP_N=20
RERANK_TOP_K=5
```

## 使用方法

```bash
# 构建索引（默认对 packages 目录）
pnpm run build-index

# 构建索引（指定目录）
pnpm run build-index /path/to/code

# 查询
pnpm run query -- "这个项目的架构是什么？"
```

## 学习要点

1. **Embedding**：文本向量化，理解语义相似度的数学基础
2. **Chunking 策略**：代码不是普通文本，需要尊重函数/类边界
3. **两阶段检索**：粗筛（快但粗糙）+ 精排（慢但准确）
4. **LLM-as-Reranker**：用大模型做评分器，灵活但消耗 token
5. **RAG Prompt**：如何构建有效的上下文，避免幻觉

## 后续可扩展

- [ ] 增量索引（只更新变化的文件）
- [ ] 多语言支持（.js, .py 等）
- [ ] Hybrid Search（BM25 + Embedding）
- [ ] 使用专业 Rerank 模型（Cohere / BGE-Reranker）
- [ ] 向量数据库替换（Chroma / Qdrant）
