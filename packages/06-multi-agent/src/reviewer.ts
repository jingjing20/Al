// reviewer.ts - Reviewer Agent
// 职责：审查代码质量，通过或提出改进建议

import OpenAI from 'openai';
import type { ReviewerOutput } from './types.js';

const SYSTEM_PROMPT = `你是一个严格但公正的代码审查专家。

你的任务是审查 TypeScript 代码，确保代码质量。

审查要点：
1. 功能正确性：代码是否满足需求
2. 边界情况：是否处理了空值、异常输入
3. 类型安全：类型注解是否完善
4. 代码风格：命名是否清晰、结构是否合理
5. 潜在 bug：是否有明显的逻辑错误

审查原则：
- 只关注真正的问题，不要吹毛求疵
- 3 轮内应该能通过审查
- 如果代码没有明显问题，就通过

输出格式：
- 如果代码通过审查，输出：APPROVED
- 如果有问题，列出具体问题（编号），每个问题说明原因和建议

示例输出（通过）：
APPROVED

示例输出（不通过）：
1. [边界情况] 未处理空字符串输入，建议添加空值检查
2. [类型安全] 返回类型应该是 string | null 而不是 string`;

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
 * 解析 Reviewer 的输出
 */
function parseReview(content: string): ReviewerOutput {
	const trimmed = content.trim();

	// 检查是否通过
	if (trimmed.startsWith('APPROVED') || trimmed === 'APPROVED') {
		return {
			approved: true,
			feedback: 'APPROVED',
		};
	}

	// 解析问题列表
	const issues: string[] = [];
	const lines = trimmed.split('\n');
	for (const line of lines) {
		const trimmedLine = line.trim();
		// 匹配编号开头的行，如 "1. xxx" 或 "- xxx"
		if (/^(\d+\.|-)/.test(trimmedLine)) {
			issues.push(trimmedLine);
		}
	}

	return {
		approved: false,
		feedback: trimmed,
		issues: issues.length > 0 ? issues : undefined,
	};
}

/**
 * Reviewer Agent：审查代码
 */
export async function reviewCode(
	task: string,
	code: string,
	round: number
): Promise<ReviewerOutput> {
	const client = createClient();
	const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

	const userMessage = `请审查以下代码：

需求：
${task}

代码（第 ${round} 轮）：
\`\`\`typescript
${code}
\`\`\`

请进行审查。如果代码满足需求且没有明显问题，输出 APPROVED。否则列出具体问题。`;

	const response = await client.chat.completions.create({
		model,
		messages: [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: userMessage },
		],
		temperature: 0.3,
	});

	const content = response.choices[0]?.message?.content || '';
	return parseReview(content);
}
