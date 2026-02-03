// 单次迭代记录
export interface Iteration {
	round: number;
	code: string;       // Writer 产出的代码
	review: string;     // Reviewer 的反馈
	approved: boolean;  // 是否通过
}

// 协作会话状态
export interface ReviewSession {
	task: string;                                          // 原始需求
	iterations: Iteration[];                               // 迭代历史
	status: 'in_progress' | 'approved' | 'max_iterations'; // 当前状态
	finalCode?: string;                                    // 最终代码
}

// Writer 的输出
export interface WriterOutput {
	code: string;
	explanation?: string;
}

// Reviewer 的输出
export interface ReviewerOutput {
	approved: boolean;
	feedback: string;
	issues?: string[];
}
