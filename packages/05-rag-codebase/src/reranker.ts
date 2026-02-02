// reranker.ts - 精排模块
// 职责：使用 LLM 对候选 chunks 进行精细评分，选出最相关的 Top-K

import OpenAI from 'openai';
import type { RetrievalResult, RerankResult, IndexedChunk } from './types.js';

/**
 * 创建 OpenAI 客户端
 */
function createClient(): OpenAI {
	return new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
		baseURL: process.env.OPENAI_BASE_URL,
	});
}

/**
 * 获取 Chat 模型名称
 */
function getModel(): string {
	return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

/**
 * 构建评分 prompt
 */
function buildPrompt(query: string, chunk: IndexedChunk): string {
	return `你是一个代码相关性评分专家。请评估以下代码片段与用户问题的相关性。

## 用户问题
${query}

## 代码片段
文件: ${chunk.filePath}
类型: ${chunk.type}${chunk.name ? ` (${chunk.name})` : ''}
行号: ${chunk.startLine}-${chunk.endLine}

\`\`\`typescript
${chunk.content}
\`\`\`

## 评分要求
请给出 0-10 的相关性评分：
- 0-2: 完全不相关
- 3-4: 略微相关，但不是直接答案
- 5-6: 中等相关，包含部分有用信息
- 7-8: 高度相关，能直接回答问题的一部分
- 9-10: 完美匹配，是回答问题的核心代码

请严格按照以下 JSON 格式回复，不要包含其他内容：
{"score": <分数>, "reason": "<简短理由>"}`;
}

/**
 * 解析 LLM 响应
 */
function parseResponse(content: string): { score: number; reason: string } {
	try {
		// 尝试直接解析 JSON
		const parsed = JSON.parse(content);
		return {
			score: Math.min(10, Math.max(0, Number(parsed.score) || 0)),
			reason: String(parsed.reason || ''),
		};
	} catch {
		// 如果解析失败，尝试提取数字
		const match = content.match(/(\d+)/);
		return {
			score: match ? Math.min(10, Math.max(0, Number(match[1]))) : 0,
			reason: '解析失败',
		};
	}
}

/**
 * 对单个 chunk 进行评分
 */
async function scoreChunk(
	client: OpenAI,
	model: string,
	query: string,
	chunk: IndexedChunk
): Promise<RerankResult> {
	try {
		const response = await client.chat.completions.create({
			model,
			messages: [{ role: 'user', content: buildPrompt(query, chunk) }],
			temperature: 0,
			max_tokens: 100,
		});

		const content = response.choices[0]?.message?.content || '';
		const { score, reason } = parseResponse(content);

		return {
			chunk,
			relevanceScore: score,
			reason,
		};
	} catch (error) {
		console.error(`[reranker] 评分失败 (${chunk.filePath}):`, error);
		return {
			chunk,
			relevanceScore: 0,
			reason: '评分出错',
		};
	}
}

/**
 * 对候选 chunks 进行重排序
 * @param query 用户问题
 * @param candidates 粗筛结果
 * @param topK 返回数量
 */
export async function rerank(
	query: string,
	candidates: RetrievalResult[],
	topK: number
): Promise<RerankResult[]> {
	const client = createClient();
	const model = getModel();

	console.log(`[reranker] 开始对 ${candidates.length} 个候选进行精排...`);

	// 并发评分（限制并发数避免 rate limit）
	const concurrency = 5;
	const results: RerankResult[] = [];

	for (let i = 0; i < candidates.length; i += concurrency) {
		const batch = candidates.slice(i, i + concurrency);
		const batchResults = await Promise.all(
			batch.map(c => scoreChunk(client, model, query, c.chunk))
		);
		results.push(...batchResults);
	}

	// 按评分降序排序
	results.sort((a, b) => b.relevanceScore - a.relevanceScore);

	// 返回 Top-K
	const topResults = results.slice(0, topK);

	console.log(`[reranker] 精排完成，Top-${topK} 评分: ${topResults.map(r => r.relevanceScore).join(', ')}`);

	return topResults;
}
