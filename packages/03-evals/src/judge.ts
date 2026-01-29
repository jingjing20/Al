import 'dotenv/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { EvalCase, EvalResult } from './types';

// ============================================
// Judge LLM 模块
// ============================================

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: process.env.OPENAI_BASE_URL,
});

// Judge 输出的 Schema
const JudgeOutputSchema = z.object({
	score: z.number().min(1).max(5),
	reason: z.string()
});

/**
 * 用 LLM 评估 Agent 的输出质量
 *
 * @param testCase 测试样本（包含 input 和 expected_points）
 * @param actualOutput Agent 的实际输出
 * @returns 评分结果（score + reason）
 */
export async function judge(
	testCase: EvalCase,
	actualOutput: string
): Promise<{ score: number; reason: string }> {

	const prompt = `You are an AI Output Evaluator.

## Task
Evaluate how well the AI's actual output matches the expected requirements.

## User Input (given to the AI)
${testCase.input || "(empty input)"}

## Expected Key Points
${testCase.expected_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Actual AI Output
${actualOutput}

## Scoring Rubric
- 5: Excellent - covers all expected points accurately, well-structured
- 4: Good - covers most points, minor issues or missing details
- 3: Acceptable - covers some points, noticeable gaps or inaccuracies
- 2: Poor - misses important points or contains significant errors
- 1: Failed - completely irrelevant, harmful, or crashed

## Your Response
Return ONLY a JSON object with two fields:
- "score": a number from 1 to 5
- "reason": a brief explanation (1-2 sentences) of why you gave this score

Example: {"score": 4, "reason": "Extracted name and company correctly, but years of experience was slightly off."}`;

	const completion = await client.chat.completions.create({
		model: process.env.OPENAI_MODEL || 'gpt-4o',
		messages: [
			{ role: "system", content: "You are a strict but fair evaluator. Return only valid JSON." },
			{ role: "user", content: prompt }
		],
		response_format: { type: "json_object" },
		temperature: 0.1, // 评分需要一致性
	});

	const result = completion.choices[0].message.content;
	if (!result) {
		return { score: 1, reason: "Judge failed to respond" };
	}

	try {
		const parsed = JSON.parse(result);
		return JudgeOutputSchema.parse(parsed);
	} catch (e) {
		console.error("Judge output parsing failed:", result);
		return { score: 1, reason: "Judge output was not valid JSON" };
	}
}
