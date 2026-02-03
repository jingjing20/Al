// index.ts - CLI 入口

import 'dotenv/config';
import { runReviewSession, printSummary } from './orchestrator.js';

/**
 * 打印帮助信息
 */
function printHelp(): void {
	console.log(`
Multi-Agent Code Review Team

用法:
  pnpm run start -- "你的编码需求"

示例:
  pnpm run start -- "写一个验证邮箱格式的函数"
  pnpm run start -- "写一个 debounce 工具函数"
  pnpm run start -- "写一个解析 URL 查询参数的函数"
`);
}

/**
 * 主入口
 */
async function main(): Promise<void> {
	// 解析参数，跳过 "--"
	const args = process.argv.slice(2).filter(arg => arg !== '--');
	const task = args.join(' ').trim();

	if (!task || task === 'help' || task === '--help') {
		printHelp();
		return;
	}

	try {
		const session = await runReviewSession(task);
		printSummary(session);
	} catch (error) {
		console.error('执行出错:', error);
		process.exit(1);
	}
}

main();
