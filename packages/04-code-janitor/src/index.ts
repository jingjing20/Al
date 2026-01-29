import { runJanitor } from './agent';

// ============================================
// 入口
// ============================================

async function main() {
	// 从命令行参数获取任务，或使用默认任务
	const task = process.argv.slice(2).join(' ') ||
		"Add a slugify function to src/utils.ts that converts a string to a URL-friendly slug. Also add a test for it.";

	await runJanitor(task);
}

if (require.main === module) {
	main();
}
