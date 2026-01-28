import 'dotenv/config';
import OpenAI from 'openai';
import { INITIAL_STATE, ResearchState } from './types';
import { searchGoogle, visitWebpage, SearchResult } from './tools';
import { ChatCompletionTool } from 'openai/resources/chat/completions';

// ============================================
// 初始化 OpenAI 客户端
// ============================================
const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: process.env.OPENAI_BASE_URL,
});

// ============================================
// 工具定义（暴露给 LLM 的 Function Calling Schema）
// ============================================
// 这是 Agent 的核心：我们不在代码里写死流程，
// 而是把工具暴露给 LLM，让它自己决定调用什么
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
			name: "visit",
			description: "Visit a URL and read its full content.",
			parameters: {
				type: "object",
				properties: {
					url: { type: "string", description: "The URL to visit" }
				},
				required: ["url"]
			}
		}
	}
];

// ============================================
// 核心函数：执行深度研究
// ============================================
/**
 * ReAct Loop 的主函数
 *
 * 流程：
 * 1. 初始化状态
 * 2. 进入循环：State -> Prompt -> LLM -> Tool Call -> Update State
 * 3. 当 LLM 认为信息足够时，输出最终答案
 * 4. 如果达到最大迭代次数，强制总结已有信息
 */
async function runResearch(goal: string) {
	// 1. 初始化状态
	// 状态对象用于持久化进度，方便崩溃重启（虽然目前没实现持久化到磁盘）
	let state: ResearchState = { ...INITIAL_STATE, goal };

	console.log(`\n🎯 Goal: "${goal}"`);
	console.log("-----------------------------------");

	// 2. 核心循环（ReAct Pattern）
	while (state.iteration < state.max_iterations) {
		state.iteration++;
		console.log(`\n🔄 [Step ${state.iteration}/${state.max_iterations}] Thinking...`);

		// 3. 构造上下文（Prompt Engineering 的关键）
		// 我们把状态压缩成自然语言喂给 LLM
		// 特别注意：明确告诉它哪些 query 和 URL 已经用过，防止重复
		const context = `
Current Goal: ${state.goal}

Already Searched Queries (DO NOT repeat these):
${state.searched_queries.length > 0 ? state.searched_queries.map(q => `- "${q}"`).join("\n") : "(none yet)"}

Already Visited URLs (DO NOT visit these again):
${state.visited_urls.length > 0 ? state.visited_urls.join("\n") : "(none yet)"}

Gathered Information:
${state.gathered_info.map((info, i) => `[Note ${i + 1}]: ${info.slice(0, 500)}...`).join("\n\n")}

Instructions:
1. If you need more info, use 'search' with a NEW query or 'visit' a NEW URL.
2. If you have enough info to answer the goal comprehensively, respond with your final answer (do not call tools).
3. Avoid repeating searches or visits.
`;

		// 4. 调用 LLM（带 Function Calling）
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
			tool_choice: "auto", // 让 LLM 自己决定是否调用工具
		});

		const message = completion.choices[0].message;

		// 5. 处理工具调用
		if (message.tool_calls && message.tool_calls.length > 0) {
			const toolCall = message.tool_calls[0];
			const funcName = toolCall.function.name;
			const args = JSON.parse(toolCall.function.arguments);

			console.log(`🛠️  Action: ${funcName}(${JSON.stringify(args)})`);

			let result = "";

			if (funcName === 'search') {
				const query = args.query;
				// 去重检查：如果这个 query 已经搜过，跳过
				if (state.searched_queries.includes(query)) {
					result = `[SKIP] Already searched for "${query}". Try a different query.`;
					console.log(`⚠️  Skipped duplicate search`);
				} else {
					// 记录已搜索的 query
					state.searched_queries.push(query);
					const searchResults = await searchGoogle(query);
					if (searchResults.length === 0) {
						result = `No results found for "${query}".`;
					} else {
						// 格式化搜索结果
						result = `Search Results for "${query}":\n` +
							searchResults.map((r: SearchResult) => `- ${r.title}: ${r.url}\n  ${r.snippet}`).join("\n\n");
					}
				}
			} else if (funcName === 'visit') {
				const url = args.url;
				// 去重检查：如果这个 URL 已经访问过，跳过
				if (state.visited_urls.includes(url)) {
					result = `[SKIP] Already visited ${url}. Try a different URL.`;
					console.log(`⚠️  Skipped duplicate visit`);
				} else {
					// 记录已访问的 URL
					state.visited_urls.push(url);
					const content = await visitWebpage(url);
					result = `Content of ${url}:\n${content}`;
				}
			}

			// 6. 更新状态：把结果存入 gathered_info
			state.gathered_info.push(result);
			console.log(`📝 Note Added (${result.length} chars)`);

			// 循环继续...

		} else {
			// 7. LLM 没有调用工具 -> 说明它认为信息足够了，这是最终答案
			const finalAnswer = message.content;
			console.log("\n✅ Mission Complete!");
			console.log("-----------------------------------");
			console.log(finalAnswer);
			return finalAnswer;
		}
	}

	// 8. 兜底逻辑：如果达到最大迭代次数还没给出答案，强制总结
	console.warn("\n🛑 Max iterations reached. Generating summary from gathered info...");
	const fallback = await client.chat.completions.create({
		model: process.env.OPENAI_MODEL || 'gpt-4o',
		messages: [
			{ role: "system", content: "Summarize the following research notes into a coherent answer." },
			{ role: "user", content: `Goal: ${state.goal}\n\nNotes:\n${state.gathered_info.join("\n\n")}` }
		],
	});
	console.log(fallback.choices[0].message.content);
	return fallback.choices[0].message.content;
}

// ============================================
// 入口：支持命令行参数
// ============================================
// 用法: npx ts-node src/index.ts "你的研究问题"
if (require.main === module) {
	const topic = process.argv[2] || "What are the key React.js trends in 2024?";
	runResearch(topic);
}
