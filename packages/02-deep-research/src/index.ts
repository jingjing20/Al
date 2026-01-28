import 'dotenv/config';
import OpenAI from 'openai';
import { INITIAL_STATE, ResearchState } from './types';
import { searchGoogle, visitWebpage, summarizeContent, SearchResult } from './tools';
import { saveState, loadState, clearState, saveResult } from './state';
import { ChatCompletionTool } from 'openai/resources/chat/completions';

// ============================================
// 初始化
// ============================================

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: process.env.OPENAI_BASE_URL,
});

// ============================================
// 简易并发控制器（替代 p-limit，避免 ESM 兼容问题）
// ============================================
async function runWithConcurrencyLimit<T>(
	tasks: (() => Promise<T>)[],
	limit: number
): Promise<T[]> {
	const results: T[] = [];
	const executing: Promise<void>[] = [];

	for (const task of tasks) {
		const p = task().then(result => {
			results.push(result);
		});
		executing.push(p as Promise<void>);

		if (executing.length >= limit) {
			await Promise.race(executing);
			// 移除已完成的 promise
			executing.splice(0, executing.findIndex(e => e === p) + 1);
		}
	}

	await Promise.all(executing);
	return results;
}

// ============================================
// 工具定义（暴露给 LLM 的 Function Calling Schema）
// ============================================

const tools: ChatCompletionTool[] = [
	{
		type: "function",
		function: {
			name: "search",
			description: "Search the web for information. Returns URLs with snippets.",
			parameters: {
				type: "object",
				properties: {
					query: { type: "string", description: "The search keywords" }
				},
				required: ["query"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "visit_multiple",
			description: "Visit multiple URLs and read their content. Use this after search to gather detailed information.",
			parameters: {
				type: "object",
				properties: {
					urls: {
						type: "array",
						items: { type: "string" },
						description: "List of URLs to visit (max 5)"
					}
				},
				required: ["urls"]
			}
		}
	}
];

// ============================================
// 核心函数：执行深度研究
// ============================================

async function runResearch(goal: string) {
	// 1. 尝试从磁盘加载状态（断点续跑）
	let state: ResearchState = loadState(goal) || { ...INITIAL_STATE, goal };

	console.log(`\n🎯 Goal: "${goal}"`);
	console.log("-----------------------------------");

	// 2. 核心循环
	while (state.iteration < state.max_iterations) {
		state.iteration++;
		console.log(`\n🔄 [Step ${state.iteration}/${state.max_iterations}] Thinking...`);

		// 3. 构造上下文
		const context = `
Current Goal: ${state.goal}

Already Searched Queries (DO NOT repeat these):
${state.searched_queries.length > 0 ? state.searched_queries.map(q => `- "${q}"`).join("\n") : "(none yet)"}

Already Visited URLs (DO NOT visit these again):
${state.visited_urls.length > 0 ? state.visited_urls.join("\n") : "(none yet)"}

Gathered Information (Summarized):
${state.gathered_info.map((info, i) => `[Note ${i + 1}]: ${info}`).join("\n\n")}

Instructions:
1. If you need more info, use 'search' with a NEW query.
2. After searching, use 'visit_multiple' with the promising URLs to get full content.
3. If you have enough info to answer the goal comprehensively, respond with your final answer (do not call tools).
4. Avoid repeating searches or visits.
`;

		// 4. 调用 LLM
		const completion = await client.chat.completions.create({
			model: process.env.OPENAI_MODEL || 'gpt-4o',
			messages: [
				{
					role: "system",
					content: "You are a Deep Research Worker. Be thorough but efficient. When you have enough information, synthesize and respond."
				},
				{ role: "user", content: context }
			],
			tools: tools,
			tool_choice: "auto",
		});

		const message = completion.choices[0].message;

		// 5. 处理工具调用
		if (message.tool_calls && message.tool_calls.length > 0) {
			const toolCall = message.tool_calls[0];
			const funcName = toolCall.function.name;
			const args = JSON.parse(toolCall.function.arguments);

			console.log(`🛠️  Action: ${funcName}`);

			if (funcName === 'search') {
				const query = args.query;
				if (state.searched_queries.includes(query)) {
					state.gathered_info.push(`[SKIP] Already searched for "${query}".`);
					console.log(`⚠️  Skipped duplicate search`);
				} else {
					state.searched_queries.push(query);
					const searchResults = await searchGoogle(query);
					if (searchResults.length === 0) {
						state.gathered_info.push(`No results found for "${query}".`);
					} else {
						const result = `Search Results for "${query}":\n` +
							searchResults.map((r: SearchResult) => `- ${r.title}: ${r.url}\n  ${r.snippet}`).join("\n\n");
						state.gathered_info.push(result);
					}
				}
			} else if (funcName === 'visit_multiple') {
				let urls: string[] = args.urls || [];
				// 限制最多 5 个 URL
				urls = urls.slice(0, 5);
				// 过滤掉已访问的 URL
				const newUrls = urls.filter(url => !state.visited_urls.includes(url));

				if (newUrls.length === 0) {
					state.gathered_info.push("[SKIP] All URLs have been visited already.");
					console.log(`⚠️  All URLs already visited`);
				} else {
					console.log(`🌐 Visiting ${newUrls.length} URLs in parallel (max 3 concurrent)...`);

					// 构造任务列表
					const tasks = newUrls.map(url => async () => {
						state.visited_urls.push(url);
						const content = await visitWebpage(url);
						// 对每个页面做总结，压缩 Token
						const summary = await summarizeContent(content, state.goal);
						return { url, summary };
					});

					// 并发访问（带限流）
					const results = await runWithConcurrencyLimit(tasks, 3);

					// 把结果存入 gathered_info
					for (const { url, summary } of results) {
						state.gathered_info.push(`Content of ${url}:\n${summary}`);
						console.log(`📝 Summarized: ${url}`);
					}
				}
			}

			// 6. 保存状态到磁盘（每次操作后都保存，方便断点续跑）
			saveState(state);

		} else {
			// 7. 最终答案
			const finalAnswer = message.content || '';
			console.log("\n✅ Mission Complete!");
			console.log("-----------------------------------");
			console.log(finalAnswer);

			// 保存结果到 md 文件
			saveResult(state.goal, finalAnswer, state);
			// 清除状态文件（任务完成）
			clearState();
			return finalAnswer;
		}
	}

	// 8. 兜底逻辑
	console.warn("\n🛑 Max iterations reached. Generating summary...");
	const fallback = await client.chat.completions.create({
		model: process.env.OPENAI_MODEL || 'gpt-4o',
		messages: [
			{ role: "system", content: "Summarize the following research notes into a coherent answer." },
			{ role: "user", content: `Goal: ${state.goal}\n\nNotes:\n${state.gathered_info.join("\n\n")}` }
		],
	});

	const fallbackAnswer = fallback.choices[0].message.content || '';
	// 保存结果到 md 文件
	saveResult(state.goal, fallbackAnswer, state);
	// 清除状态文件
	clearState();

	console.log(fallbackAnswer);
	return fallbackAnswer;
}

// ============================================
// 入口
// ============================================

if (require.main === module) {
	const topic = process.argv[2] || "What are the key React.js trends in 2024?";
	runResearch(topic);
}
