// ============================================
// 评估系统类型定义
// ============================================

/**
 * 测试样本
 * 每个样本包含输入和期望的输出要点
 */
export type EvalCase = {
	id: string;
	input: string;               // 输入给 Agent 的内容
	expected_points: string[];   // 期望输出应包含的要点
	category?: string;           // 可选：分类（用于分组统计）
};

/**
 * 单次运行的评分记录
 */
export type SingleRunResult = {
	run_index: number;
	output: string;
	score: number;
	reason: string;
	latency_ms: number;
};

/**
 * 单个样本的评估结果（支持多次运行）
 */
export type EvalResult = {
	case_id: string;
	input: string;
	runs: SingleRunResult[];     // 每次运行的详细记录
	output: string;              // 最后一次运行的输出（用于展示）
	score: number;               // 最终分数（所有运行的平均）
	score_std: number;           // 分数标准差（衡量稳定性）
	reason: string;              // 最后一次评分理由
	latency_ms: number;          // 平均响应时间
	passed: boolean;             // 平均 score >= 3 即为通过
};

/**
 * 汇总报告
 */
export type EvalReport = {
	total_cases: number;
	passed_cases: number;
	failed_cases: number;
	pass_rate: number;           // 0-1
	average_score: number;       // 1-5
	average_latency_ms: number;
	repeats_per_case: number;    // 每个 Case 跑了几次
	results: EvalResult[];
	worst_cases: EvalResult[];   // score <= 2 的 Case
	unstable_cases: EvalResult[]; // score_std > 1 的 Case（不稳定）
	run_at: string;              // ISO 时间戳
};

/**
 * Agent 函数类型
 * 输入文本，输出 JSON 字符串
 */
export type AgentFn = (input: string) => Promise<string>;
