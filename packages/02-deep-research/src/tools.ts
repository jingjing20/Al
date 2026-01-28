import { z } from 'zod';
import { tavily } from '@tavily/core';

// 初始化 Tavily 客户端
// Tavily 是专门为 AI Agent 设计的搜索 API，返回的是干净的文本而非原始 HTML
const tavilyClient = tavily({ apiKey: process.env.TAVILY_KEY });

// ============================================
// Tool 1: 搜索工具
// ============================================

// Zod Schema 定义（用于类型校验和 Prompt 生成）
export const SearchToolSchema = z.object({
	query: z.string().describe("The search query to send to Google")
});

// 搜索结果的类型定义
export type SearchResult = {
	url: string;
	title: string;
	snippet: string;  // 内容摘要，已截断以节省 Token
};

/**
 * 执行真实的网络搜索
 *
 * 使用 Tavily API 进行搜索，返回格式化的结果列表
 * 注意：snippet 被截断到 300 字符，避免 Context Window 爆炸
 */
export async function searchGoogle(query: string): Promise<SearchResult[]> {
	console.log(`🔎 [Tavily] Searching for: "${query}"`);

	try {
		const response = await tavilyClient.search(query, {
			maxResults: 5,        // 最多返回 5 条结果
			searchDepth: "basic", // basic 更快，advanced 更全面
		});

		// 转换为我们定义的格式
		return response.results.map(r => ({
			url: r.url,
			title: r.title,
			snippet: r.content.slice(0, 300) // 截断以节省 Token
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
 *
 * 使用 Tavily Extract API 获取网页的纯文本内容
 * 相比 Puppeteer 等爬虫方案，Tavily 的优势是：
 * 1. 无需处理 JavaScript 渲染
 * 2. 返回的是已清洗的纯文本
 * 3. 自动跳过广告和导航栏
 *
 * 注意：内容被截断到 2000 字符，防止单次调用消耗过多 Token
 */
export async function visitWebpage(url: string): Promise<string> {
	console.log(`🌐 [Tavily Extract] Visiting: ${url}`);

	try {
		const response = await tavilyClient.extract([url]);
		if (response.results && response.results.length > 0) {
			// Tavily extract 返回干净的纯文本
			return response.results[0].rawContent.slice(0, 2000);
		}
		return "No content extracted.";
	} catch (e: any) {
		console.error("Tavily Extract Error:", e.message);
		return `Failed to extract content from ${url}`;
	}
}
