// generator.ts - 答案生成
// 职责：基于检索到的代码片段，生成对用户问题的回答

import OpenAI from 'openai';
import type { RerankResult } from './types.js';

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
 * 构建上下文
 */
function buildContext(results: RerankResult[]): string {
	return results
		.map((r, i) => {
			const { chunk } = r;
			return `### 代码片段 ${i + 1}
文件: ${chunk.filePath}
类型: ${chunk.type}${chunk.name ? ` (${chunk.name})` : ''}
行号: ${chunk.startLine}-${chunk.endLine}
相关性评分: ${r.relevanceScore}/10

\`\`\`typescript
${chunk.content}
\`\`\``;
		})
		.join('\n\n');
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(context: string): string {
	return `你是一个代码库专家助手。用户会问关于代码库的问题，你需要基于提供的代码片段来回答。

## 回答原则
1. 只基于提供的代码片段回答，不要编造不存在的代码
2. 如果代码片段不足以回答问题，明确说明
3. 引用代码时说明文件路径和行号
4. 回答要简洁、准确、有条理

## 相关代码片段
${context}`;
}

/**
 * 生成回答
 */
export async function generate(
	query: string,
	results: RerankResult[]
): Promise<string> {
	const client = createClient();
	const model = getModel();

	if (results.length === 0) {
		return '未找到相关代码片段，无法回答该问题。';
	}

	const context = buildContext(results);
	const systemPrompt = buildSystemPrompt(context);

	console.log(`[generator] 基于 ${results.length} 个代码片段生成回答...`);

	const response = await client.chat.completions.create({
		model,
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: query },
		],
		temperature: 0.3,
	});

	const answer = response.choices[0]?.message?.content || '生成回答失败';

	console.log(`[generator] 回答生成完成`);
	return answer;
}
