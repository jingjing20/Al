// orchestrator.ts - 编排器
// 职责：协调 Writer 和 Reviewer 的交互，管理迭代状态，保存对话日志

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { writeInitialCode, reviseCode } from './writer.js';
import { reviewCode } from './reviewer.js';
import type { ReviewSession, Iteration } from './types.js';

const MAX_ITERATIONS = Number(process.env.MAX_ITERATIONS) || 5;

/**
 * 生成时间戳字符串
 */
function getTimestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * 生成 Markdown 日志内容
 */
function generateMarkdownLog(session: ReviewSession): string {
	const lines: string[] = [];

	lines.push(`# Code Review Session`);
	lines.push('');
	lines.push(`- **任务**: ${session.task}`);
	lines.push(`- **时间**: ${new Date().toLocaleString('zh-CN')}`);
	lines.push(`- **状态**: ${session.status === 'approved' ? '通过' : '未通过（达到最大轮数）'}`);
	lines.push(`- **迭代次数**: ${session.iterations.length}`);
	lines.push('');
	lines.push('---');
	lines.push('');

	// 每轮迭代
	for (const iter of session.iterations) {
		lines.push(`## Round ${iter.round}`);
		lines.push('');

		lines.push(`### Writer 输出`);
		lines.push('');
		lines.push('```typescript');
		lines.push(iter.code);
		lines.push('```');
		lines.push('');

		lines.push(`### Reviewer 反馈`);
		lines.push('');
		if (iter.approved) {
			lines.push('**APPROVED**');
		} else {
			lines.push(iter.review);
		}
		lines.push('');
		lines.push('---');
		lines.push('');
	}

	// 最终代码
	lines.push(`## 最终代码`);
	lines.push('');
	lines.push('```typescript');
	lines.push(session.finalCode || '');
	lines.push('```');

	return lines.join('\n');
}

/**
 * 保存日志到文件
 */
function saveLog(session: ReviewSession): string {
	const logsDir = resolve(process.cwd(), 'logs');
	if (!existsSync(logsDir)) {
		mkdirSync(logsDir, { recursive: true });
	}

	const timestamp = getTimestamp();
	// 从任务中提取简短描述作为文件名的一部分
	const taskSlug = session.task
		.slice(0, 20)
		.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
		.replace(/_+/g, '_');
	const filename = `${timestamp}_${taskSlug}.md`;
	const filepath = resolve(logsDir, filename);

	const content = generateMarkdownLog(session);
	writeFileSync(filepath, content, 'utf-8');

	return filepath;
}

/**
 * 运行代码审查协作流程
 */
export async function runReviewSession(task: string): Promise<ReviewSession> {
	const session: ReviewSession = {
		task,
		iterations: [],
		status: 'in_progress',
	};

	console.log(`\n${'='.repeat(50)}`);
	console.log(`Code Review Team`);
	console.log(`${'='.repeat(50)}`);
	console.log(`任务: ${task}\n`);

	let currentCode = '';

	for (let round = 1; round <= MAX_ITERATIONS; round++) {
		console.log(`--- Round ${round} ---`);

		// 1. Writer 生成或修改代码
		if (round === 1) {
			console.log(`[Writer] 生成初始代码...`);
			const writerOutput = await writeInitialCode(task);
			currentCode = writerOutput.code;
		} else {
			const lastFeedback = session.iterations[round - 2].review;
			console.log(`[Writer] 根据反馈修改代码...`);
			const writerOutput = await reviseCode(task, currentCode, lastFeedback);
			currentCode = writerOutput.code;
		}

		console.log(`\n生成的代码:`);
		console.log('```typescript');
		console.log(currentCode);
		console.log('```\n');

		// 2. Reviewer 审查代码
		console.log(`[Reviewer] 审查中...`);
		const reviewOutput = await reviewCode(task, currentCode, round);

		// 记录本轮迭代
		const iteration: Iteration = {
			round,
			code: currentCode,
			review: reviewOutput.feedback,
			approved: reviewOutput.approved,
		};
		session.iterations.push(iteration);

		// 3. 判断是否通过
		if (reviewOutput.approved) {
			console.log(`审查结果: APPROVED\n`);
			session.status = 'approved';
			session.finalCode = currentCode;
			break;
		} else {
			console.log(`审查反馈:`);
			if (reviewOutput.issues) {
				reviewOutput.issues.forEach(issue => console.log(`  ${issue}`));
			} else {
				console.log(`  ${reviewOutput.feedback}`);
			}
			console.log('');

			// 检查是否达到最大轮数
			if (round === MAX_ITERATIONS) {
				console.log(`达到最大迭代次数 (${MAX_ITERATIONS})，强制结束\n`);
				session.status = 'max_iterations';
				session.finalCode = currentCode;
			}
		}
	}

	// 保存日志
	const logPath = saveLog(session);
	console.log(`日志已保存: ${logPath}\n`);

	return session;
}

/**
 * 打印会话总结
 */
export function printSummary(session: ReviewSession): void {
	console.log(`${'='.repeat(50)}`);
	console.log(`最终结果`);
	console.log(`${'='.repeat(50)}`);

	if (session.status === 'approved') {
		console.log(`状态: 通过审查`);
	} else {
		console.log(`状态: 未通过（达到最大轮数）`);
	}

	console.log(`迭代次数: ${session.iterations.length}`);
	console.log(`\n最终代码:`);
	console.log('```typescript');
	console.log(session.finalCode);
	console.log('```');
}

