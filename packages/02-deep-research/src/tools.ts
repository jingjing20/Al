import { z } from 'zod';
import { tavily } from '@tavily/core';
import OpenAI from 'openai';

// ============================================
// 初始化客户端
// ============================================

// Tavily 客户端：用于搜索和网页内容提取
const tavilyClient = tavily({ apiKey: process.env.TAVILY_KEY });

// OpenAI 客户端：用于内容总结
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: process.env.OPENAI_BASE_URL,
});

// ============================================
// Tool 1: 搜索工具
// ============================================

export const SearchToolSchema = z.object({
	query: z.string().describe("The search query to send to Google")
});

export type SearchResult = {
	url: string;
	title: string;
	snippet: string;
};

/**
 * 执行真实的网络搜索
 */
export async function searchGoogle(query: string): Promise<SearchResult[]> {
	console.log(`🔎 [Tavily] Searching for: "${query}"`);

	try {
		const response = await tavilyClient.search(query, {
			maxResults: 5,
			searchDepth: "basic",
		});

		return response.results.map(r => ({
			url: r.url,
			title: r.title,
			snippet: r.content.slice(0, 300)
		}));
	} catch (e: any) {
		console.error("Tavily Error:", e.message);
		return [];
	}
}

// ============================================
// Tool 2: 网页访问工具
// ============================================

export const VisitToolSchema = z.object({
	url: z.string().describe("The URL to visit and read")
});

/**
 * 访问网页并提取内容
 */
export async function visitWebpage(url: string): Promise<string> {
	console.log(`🌐 [Tavily Extract] Visiting: ${url}`);

	try {
		const response = await tavilyClient.extract([url]);
		if (response.results && response.results.length > 0) {
			return response.results[0].rawContent.slice(0, 4000); // 取更多内容用于总结
		}
		return "No content extracted.";
	} catch (e: any) {
		console.error("Tavily Extract Error:", e.message);
		return `Failed to extract content from ${url}`;
	}
}

// ============================================
// Tool 3: 内容总结工具（新增）
// ============================================

/**
 * 对长文本进行 LLM 总结
 *
 * 目的：把 2000-4000 字的网页内容压缩成 200-300 字的摘要
 * 这样可以显著降低后续 Token 消耗，并让 Context 更聚焦
 *
 * @param content 原始内容
 * @param goal 研究目标，用于指导总结方向
 * @returns 压缩后的摘要
 */
export async function summarizeContent(content: string, goal: string): Promise<string> {
	// 如果内容已经很短，不需要总结
	if (content.length < 500) {
		return content;
	}

	console.log(`📝 [Summarizing] ${content.length} chars -> ~300 chars`);

	try {
		const completion = await openai.chat.completions.create({
			model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // 用便宜的模型做总结
			messages: [
				{
					role: "system",
					content: `You are a research assistant. Summarize the following content in 2-3 paragraphs, focusing on information relevant to: "${goal}". Be concise but keep key facts and numbers.`
				},
				{ role: "user", content: content }
			],
			max_tokens: 500,
			temperature: 0.3,
		});

		return completion.choices[0].message.content || content;
	} catch (e: any) {
		console.error("Summarization Error:", e.message);
		// 如果总结失败，返回截断的原文
		return content.slice(0, 500) + "... (truncated)";
	}
}
