import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { z } from 'zod';
import { EvalCase } from './types';
import { runEval, printReportSummary } from './runner';

// ============================================
// 加载测试数据
// ============================================

const casesPath = path.join(__dirname, '../data/cases.json');
const casesData = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
const testCases: EvalCase[] = casesData.cases;

// ============================================
// 待评估的 Agent（来自 Project 1 的简化版）
// ============================================

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: process.env.OPENAI_BASE_URL,
});

// 定义提取的 Schema
const ProfileSchema = z.object({
	name: z.string().nullable().describe("Person's full name"),
	title: z.string().nullable().describe("Job title or role"),
	company: z.string().nullable().describe("Company or organization name"),
	years: z.number().nullable().describe("Years of experience")
});

/**
 * 简化版的结构化提取器（待评估对象）
 * 这是我们要测试的 Agent
 */
async function extractorAgent(input: string): Promise<string> {
	if (!input || input.trim() === "") {
		return JSON.stringify({ name: null, title: null, company: null, years: null });
	}

	const completion = await client.chat.completions.create({
		model: process.env.OPENAI_MODEL || 'gpt-4o',
		messages: [
			{
				role: "system",
				content: `You are a structured data extractor.
Extract the following fields from the user input:
- name: Person's full name (string or null)
- title: Job title or role (string or null)
- company: Company or organization name (string or null)
- years: Years of experience as a number (number or null)

Return ONLY valid JSON with these 4 fields. If a field cannot be determined, use null.`
			},
			{ role: "user", content: input }
		],
		response_format: { type: "json_object" },
		temperature: 0,
	});

	const result = completion.choices[0].message.content;
	if (!result) {
		return JSON.stringify({ error: "No response from LLM" });
	}

	// 清洗 markdown
	const clean = result.replace(/```json/g, '').replace(/```/g, '').trim();

	try {
		// 验证格式
		JSON.parse(clean);
		return clean;
	} catch {
		return JSON.stringify({ error: "Invalid JSON from LLM", raw: clean });
	}
}

// ============================================
// 主入口
// ============================================

// 每个 Case 运行次数（用于降低随机波动）
// 设为 1 则单次运行，设为 3 则每个 Case 跑 3 次取平均
const REPEATS = parseInt(process.env.EVAL_REPEATS || '1', 10);

async function main() {
	const modelName = process.env.OPENAI_MODEL || 'gpt-4o';

	console.log("🚀 Project 3: Evaluation System");
	console.log(`🤖 Model: ${modelName}`);
	console.log(`📂 Loaded ${testCases.length} test cases`);
	if (REPEATS > 1) {
		console.log(`🔄 Repeats per case: ${REPEATS}`);
	}

	// 运行评估
	const report = await runEval(testCases, extractorAgent, REPEATS);

	// 打印报告
	printReportSummary(report);

	// 生成文件名：时间戳 + 模型名
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const safeModelName = modelName.replace(/[^a-zA-Z0-9-]/g, '_');
	const baseFilename = `${timestamp}_${safeModelName}`;

	// 确保 reports 目录存在
	const reportsDir = path.join(__dirname, '../data/reports');
	if (!fs.existsSync(reportsDir)) {
		fs.mkdirSync(reportsDir, { recursive: true });
	}

	// 保存 JSON 报告
	const jsonPath = path.join(reportsDir, `${baseFilename}.json`);
	fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
	console.log(`📄 JSON report saved to: ${jsonPath}`);

	// 生成 Markdown 报告
	const mdContent = generateMarkdownReport(report, modelName);
	const mdPath = path.join(reportsDir, `${baseFilename}.md`);
	fs.writeFileSync(mdPath, mdContent, 'utf-8');
	console.log(`📝 Markdown report saved to: ${mdPath}`);
}

/**
 * 生成 Markdown 格式的评估报告
 */
function generateMarkdownReport(report: import('./types').EvalReport, modelName: string): string {
	const passEmoji = report.pass_rate >= 0.8 ? '✅' : report.pass_rate >= 0.5 ? '⚠️' : '❌';

	let md = `# Evaluation Report

## Summary

| Metric | Value |
|--------|-------|
| **Model** | ${modelName} |
| **Run Time** | ${report.run_at} |
| **Total Cases** | ${report.total_cases} |
| **Repeats per Case** | ${report.repeats_per_case} |
| **Passed** | ${report.passed_cases} (${(report.pass_rate * 100).toFixed(1)}%) ${passEmoji} |
| **Failed** | ${report.failed_cases} |
| **Average Score** | ${report.average_score.toFixed(2)} / 5 |
| **Average Latency** | ${report.average_latency_ms.toFixed(0)}ms |

`;

	if (report.unstable_cases && report.unstable_cases.length > 0) {
		md += `## Unstable Cases (Std > 1)

| Case ID | Avg Score | Std Dev |
|---------|-----------|--------|
`;
		for (const c of report.unstable_cases) {
			md += `| ${c.case_id} | ${c.score}/5 | ${c.score_std} |\n`;
		}
		md += '\n';
	}

	if (report.worst_cases.length > 0) {
		md += `## Worst Cases (Score <= 2)

| Case ID | Score | Reason |
|---------|-------|--------|
`;
		for (const c of report.worst_cases) {
			md += `| ${c.case_id} | ${c.score}/5 | ${c.reason} |\n`;
		}
		md += '\n';
	}

	const hasMultipleRuns = report.repeats_per_case > 1;

	if (hasMultipleRuns) {
		md += `## All Results

| Case ID | Avg Score | Std | Latency | Reason |
|---------|-----------|-----|---------|--------|
`;
		for (const r of report.results) {
			const emoji = r.score >= 4 ? '✅' : r.score >= 3 ? '⚠️' : '❌';
			const stdNote = r.score_std > 1 ? ' ⚠️' : '';
			md += `| ${r.case_id} | ${r.score}/5 ${emoji} | ${r.score_std}${stdNote} | ${r.latency_ms}ms | ${r.reason} |\n`;
		}
	} else {
		md += `## All Results

| Case ID | Score | Latency | Reason |
|---------|-------|---------|--------|
`;
		for (const r of report.results) {
			const emoji = r.score >= 4 ? '✅' : r.score >= 3 ? '⚠️' : '❌';
			md += `| ${r.case_id} | ${r.score}/5 ${emoji} | ${r.latency_ms}ms | ${r.reason} |\n`;
		}
	}

	return md;
}

if (require.main === module) {
	main();
}
