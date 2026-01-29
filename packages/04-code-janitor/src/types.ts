// ============================================
// Code Janitor 类型定义
// ============================================

/**
 * Agent 状态
 */
export type JanitorState = {
	task: string;
	iteration: number;
	max_iterations: number;
	files_read: string[];
	files_written: string[];
	command_history: CommandResult[];
	last_error: string | null;
	completed: boolean;
};

/**
 * 命令执行结果
 */
export type CommandResult = {
	cmd: string;
	output: string;
	success: boolean;
};

/**
 * 初始状态
 */
export const INITIAL_STATE: JanitorState = {
	task: "",
	iteration: 0,
	max_iterations: 10,
	files_read: [],
	files_written: [],
	command_history: [],
	last_error: null,
	completed: false
};
