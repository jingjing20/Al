import * as fs from 'fs';
import * as path from 'path';
import { ResearchState, INITIAL_STATE } from './types';

// ============================================
// 状态持久化模块
// ============================================
// 作用：让程序崩溃后能够断点续跑
// 原理：每次状态变更后写入 JSON 文件，启动时尝试加载

const STATE_FILE = path.join(__dirname, '../.research-state.json');

/**
 * 保存状态到磁盘
 * 在每次 Tool 执行完成后调用
 */
export function saveState(state: ResearchState): void {
	try {
		fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
		console.log(`💾 State saved (iteration ${state.iteration})`);
	} catch (e: any) {
		console.error("Failed to save state:", e.message);
	}
}

/**
 * 从磁盘加载状态
 * 程序启动时调用，如果文件存在则恢复进度
 *
 * @param goal 当前任务目标，用于判断是否是同一个任务
 * @returns 加载的状态，如果文件不存在或目标不匹配则返回 null
 */
export function loadState(goal: string): ResearchState | null {
	try {
		if (!fs.existsSync(STATE_FILE)) {
			return null;
		}
		const data = fs.readFileSync(STATE_FILE, 'utf-8');
		const state = JSON.parse(data) as ResearchState;

		// 只有目标相同才恢复状态，否则从头开始
		if (state.goal === goal) {
			console.log(`🔄 Resuming from saved state (iteration ${state.iteration})`);
			return state;
		} else {
			console.log(`🆕 Different goal detected. Starting fresh.`);
			return null;
		}
	} catch (e: any) {
		console.error("Failed to load state:", e.message);
		return null;
	}
}

/**
 * 清除状态文件
 * 任务成功完成后调用，避免下次启动误恢复
 */
export function clearState(): void {
	try {
		if (fs.existsSync(STATE_FILE)) {
			fs.unlinkSync(STATE_FILE);
			console.log(`🗑️  State file cleared`);
		}
	} catch (e: any) {
		console.error("Failed to clear state:", e.message);
	}
}

// ============================================
// 结果保存模块
// ============================================

const RESULT_DIR = path.join(__dirname, 'result');

/**
 * 将研究结果保存为 Markdown 文件
 *
 * @param goal 研究目标（用于生成文件名）
 * @param answer 最终答案
 * @param state 完整状态（用于生成元数据）
 */
export function saveResult(goal: string, answer: string, state: ResearchState): void {
	try {
		// 确保 result 目录存在
		if (!fs.existsSync(RESULT_DIR)) {
			fs.mkdirSync(RESULT_DIR, { recursive: true });
		}

		// 生成文件名：日期 + 目标前 30 字符
		const timestamp = new Date().toISOString().slice(0, 10);
		const safeGoal = goal.slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
		const filename = `${timestamp}_${safeGoal}.md`;
		const filepath = path.join(RESULT_DIR, filename);

		// 构建 Markdown 内容
		const content = `# Research Result

## Goal
${goal}

## Answer
${answer}

---

## Metadata
- **Date**: ${new Date().toISOString()}
- **Iterations**: ${state.iteration}
- **Queries Used**: ${state.searched_queries.length}
- **URLs Visited**: ${state.visited_urls.length}

### Searched Queries
${state.searched_queries.map(q => `- ${q}`).join('\n')}

### Visited URLs
${state.visited_urls.map(u => `- ${u}`).join('\n')}
`;

		fs.writeFileSync(filepath, content, 'utf-8');
		console.log(`📄 Result saved to: ${filepath}`);
	} catch (e: any) {
		console.error("Failed to save result:", e.message);
	}
}
