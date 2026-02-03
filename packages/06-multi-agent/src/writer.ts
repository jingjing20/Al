// writer.ts - Writer Agent
// 职责：根据需求编写代码，根据反馈修改代码

import OpenAI from 'openai';
import type { WriterOutput } from './types.js';

const SYSTEM_PROMPT = `你是一个高级 TypeScript 开发者。

你的任务是根据用户需求编写高质量的 TypeScript 代码。

规则：
1. 编写完整、可运行的代码
2. 包含必要的类型注解
3. 处理边界情况（空值、异常输入等）
4. 代码简洁、可读
5. 如果收到 Reviewer 的反馈，针对性地修改代码

输出格式：
- 只输出代码，使用 markdown 代码块包裹
- 不要解释代码，Reviewer 会审查
- 不要输出测试用例

示例输出：
\`\`\`typescript
function example(input: string): string {
  return input.trim();
}
\`\`\``;

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
 * 从响应中提取代码块
 */
function extractCode(content: string): string {
	// 匹配 ```typescript 或 ``` 代码块
	const match = content.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
	if (match) {
		return match[1].trim();
	}
	// 如果没有代码块，返回原始内容
	return content.trim();
}

/**
 * Writer Agent：生成初始代码
 */
export async function writeInitialCode(task: string): Promise<WriterOutput> {
	const client = createClient();
	const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

	const response = await client.chat.completions.create({
		model,
		messages: [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: `请编写代码完成以下需求：\n\n${task}` },
		],
		temperature: 0.3,
	});

	const content = response.choices[0]?.message?.content || '';
	const code = extractCode(content);

	return { code };
}

/**
 * Writer Agent：根据反馈修改代码
 */
export async function reviseCode(
	task: string,
	currentCode: string,
	feedback: string
): Promise<WriterOutput> {
	const client = createClient();
	const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

	const userMessage = `原始需求：
${task}

当前代码：
\`\`\`typescript
${currentCode}
\`\`\`

Reviewer 反馈：
${feedback}

请根据反馈修改代码。只输出修改后的完整代码。`;

	const response = await client.chat.completions.create({
		model,
		messages: [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: userMessage },
		],
		temperature: 0.3,
	});

	const content = response.choices[0]?.message?.content || '';
	const code = extractCode(content);

	return { code };
}
