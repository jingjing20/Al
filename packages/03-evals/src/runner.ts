import { EvalCase, EvalResult, EvalReport, AgentFn, SingleRunResult } from './types';
import { judge } from './judge';

// ============================================
// 评估运行器
// ============================================

/**
 * 计算标准差
 */
function calculateStd(values: number[]): number {
	if (values.length <= 1) return 0;
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
	return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * 运行完整的评估流程（支持 N-Shot 多次运行）
 *
 * @param cases 测试样本列表
 * @param agentFn 待评估的 Agent 函数
 * @param repeats 每个样本运行次数（默认 1）
 * @returns 完整的评估报告
 */
export async function runEval(
	cases: EvalCase[],
	agentFn: AgentFn,
	repeats: number = 1
): Promise<EvalReport> {
	console.log(`\n🧪 Starting Evaluation with ${cases.length} test cases...`);
	if (repeats > 1) {
		console.log(`🔄 Each case will be run ${repeats} times for stability\n`);
	} else {
		console.log('');
	}

	const results: EvalResult[] = [];

	for (const testCase of cases) {
		console.log(`📋 [${testCase.id}] Running${repeats > 1 ? ` (${repeats}x)` : ''}...`);

		const runs: SingleRunResult[] = [];

		for (let i = 0; i < repeats; i++) {
			const startTime = Date.now();
			let output = "";

			try {
				output = await agentFn(testCase.input);
			} catch (e: any) {
				output = `ERROR: ${e.message}`;
			}

			const latency = Date.now() - startTime;

			// 用 Judge 评分
			if (repeats > 1) {
				console.log(`   ⚖️  Run ${i + 1}/${repeats} judging...`);
			} else {
				console.log(`   ⚖️  Judging...`);
			}
			const { score, reason } = await judge(testCase, output);

			runs.push({
				run_index: i + 1,
				output,
				score,
				reason,
				latency_ms: latency
			});

			if (repeats > 1) {
				const emoji = score >= 4 ? '✅' : score >= 3 ? '⚠️' : '❌';
				console.log(`      ${emoji} Run ${i + 1}: ${score}/5`);
			}
		}

		// 汇总多次运行的结果
		const scores = runs.map(r => r.score);
		const latencies = runs.map(r => r.latency_ms);
		const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
		const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
		const scoreStd = calculateStd(scores);

		const result: EvalResult = {
			case_id: testCase.id,
			input: testCase.input,
			runs: runs,
			output: runs[runs.length - 1].output,
			score: Math.round(avgScore * 100) / 100, // 保留两位小数
			score_std: Math.round(scoreStd * 100) / 100,
			reason: runs[runs.length - 1].reason,
			latency_ms: Math.round(avgLatency),
			passed: avgScore >= 3
		};

		results.push(result);

		const emoji = avgScore >= 4 ? '✅' : avgScore >= 3 ? '⚠️' : '❌';
		if (repeats > 1) {
			const stabilityNote = scoreStd > 1 ? ' (unstable!)' : '';
			console.log(`   ${emoji} Avg Score: ${avgScore.toFixed(2)}/5 (std: ${scoreStd.toFixed(2)})${stabilityNote}\n`);
		} else {
			console.log(`   ${emoji} Score: ${avgScore}/5 - ${result.reason}\n`);
		}
	}

	// 生成报告
	const passedCases = results.filter(r => r.passed);
	const worstCases = results.filter(r => r.score <= 2);
	const unstableCases = results.filter(r => r.score_std > 1);
	const totalScore = results.reduce((sum, r) => sum + r.score, 0);
	const totalLatency = results.reduce((sum, r) => sum + r.latency_ms, 0);

	const report: EvalReport = {
		total_cases: cases.length,
		passed_cases: passedCases.length,
		failed_cases: cases.length - passedCases.length,
		pass_rate: passedCases.length / cases.length,
		average_score: totalScore / cases.length,
		average_latency_ms: totalLatency / cases.length,
		repeats_per_case: repeats,
		results: results,
		worst_cases: worstCases,
		unstable_cases: unstableCases,
		run_at: new Date().toISOString()
	};

	return report;
}

/**
 * 打印报告摘要到控制台
 */
export function printReportSummary(report: EvalReport): void {
	console.log("\n" + "=".repeat(50));
	console.log("📊 EVALUATION REPORT");
	console.log("=".repeat(50));
	console.log(`📅 Run at: ${report.run_at}`);
	console.log(`📋 Total Cases: ${report.total_cases}`);
	if (report.repeats_per_case > 1) {
		console.log(`🔄 Repeats per Case: ${report.repeats_per_case}`);
	}
	console.log(`✅ Passed: ${report.passed_cases} (${(report.pass_rate * 100).toFixed(1)}%)`);
	console.log(`❌ Failed: ${report.failed_cases}`);
	console.log(`⭐ Average Score: ${report.average_score.toFixed(2)} / 5`);
	console.log(`⏱️  Average Latency: ${report.average_latency_ms.toFixed(0)}ms`);

	if (report.worst_cases.length > 0) {
		console.log("\n🚨 Worst Cases (score <= 2):");
		for (const c of report.worst_cases) {
			console.log(`   - [${c.case_id}] Score ${c.score}: ${c.reason}`);
		}
	}

	if (report.unstable_cases.length > 0) {
		console.log("\n⚠️  Unstable Cases (std > 1):");
		for (const c of report.unstable_cases) {
			console.log(`   - [${c.case_id}] Avg ${c.score}, Std ${c.score_std}`);
		}
	}

	console.log("=".repeat(50) + "\n");
}
