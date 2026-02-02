// index.ts - CLI 入口
// 提供两个命令：
// - build: 构建向量索引
// - query: 查询代码库

import 'dotenv/config';
import { resolve } from 'path';
import { loadFiles } from './loader.js';
import { splitFiles } from './splitter.js';
import { embedChunks, embedQuery } from './embedder.js';
import { saveStore, loadStore } from './store.js';
import { retrieve } from './retriever.js';
import { rerank } from './reranker.js';
import { generate } from './generator.js';

// 默认配置
const DEFAULT_ROOT = resolve(process.cwd(), '..');  // packages 目录
const STORE_PATH = resolve(process.cwd(), 'data/vectors.json');
const RETRIEVAL_TOP_N = Number(process.env.RETRIEVAL_TOP_N) || 20;
const RERANK_TOP_K = Number(process.env.RERANK_TOP_K) || 5;

/**
 * 构建向量索引
 */
async function buildIndex(rootDir: string): Promise<void> {
	console.log(`\n=== 构建向量索引 ===`);
	console.log(`根目录: ${rootDir}`);

	// 1. 加载文件
	const files = await loadFiles(rootDir);
	if (files.length === 0) {
		console.log('未找到任何文件，请检查目录路径');
		return;
	}

	// 2. 切分代码
	const chunks = splitFiles(files);
	if (chunks.length === 0) {
		console.log('未切分出任何代码块');
		return;
	}

	// 3. 生成 embeddings
	const indexedChunks = await embedChunks(chunks);

	// 4. 保存索引
	saveStore(indexedChunks, STORE_PATH);

	console.log(`\n=== 索引构建完成 ===`);
}

/**
 * 查询代码库
 */
async function queryCodebase(question: string): Promise<void> {
	console.log(`\n=== 查询代码库 ===`);
	console.log(`问题: ${question}`);

	// 1. 加载索引
	const store = loadStore(STORE_PATH);
	if (!store) {
		console.log('请先运行 build 命令构建索引');
		return;
	}

	// 2. 查询向量化
	console.log(`\n[1/4] 生成查询向量...`);
	const queryEmbedding = await embedQuery(question);

	// 3. 粗筛
	console.log(`\n[2/4] 向量检索 Top-${RETRIEVAL_TOP_N}...`);
	const candidates = retrieve(queryEmbedding, store.chunks, RETRIEVAL_TOP_N);

	// 4. 精排
	console.log(`\n[3/4] LLM 精排 Top-${RERANK_TOP_K}...`);
	const topResults = await rerank(question, candidates, RERANK_TOP_K);

	// 5. 生成回答
	console.log(`\n[4/4] 生成回答...`);
	const answer = await generate(question, topResults);

	// 输出结果
	console.log(`\n${'='.repeat(50)}`);
	console.log(`回答:\n`);
	console.log(answer);
	console.log(`\n${'='.repeat(50)}`);

	// 输出引用的代码片段
	console.log(`\n引用的代码片段:`);
	for (const result of topResults) {
		const { chunk, relevanceScore } = result;
		console.log(`  - ${chunk.filePath}:${chunk.startLine}-${chunk.endLine} (${chunk.name || chunk.type}) [${relevanceScore}/10]`);
	}
}

/**
 * 打印帮助信息
 */
function printHelp(): void {
	console.log(`
RAG Codebase Q&A

用法:
  npm run build-index [rootDir]   构建向量索引
  npm run query -- "问题"         查询代码库

示例:
  npm run build-index             对 packages 目录建立索引
  npm run build-index /path/to    对指定目录建立索引
  npm run query -- "这个项目的架构是什么？"
`);
}

// 主入口
async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const command = args[0];

	if (!command || command === 'help' || command === '--help') {
		printHelp();
		return;
	}

	if (command === 'build') {
		const rootDir = args[1] ? resolve(args[1]) : DEFAULT_ROOT;
		await buildIndex(rootDir);
		return;
	}

	if (command === 'query') {
		// 跳过 "--" 分隔符（pnpm run query -- "xxx" 会传入 "--" 作为第一个参数）
		let question = args[1];
		if (question === '--') {
			question = args[2];
		}
		if (!question) {
			console.log('请提供查询问题');
			printHelp();
			return;
		}
		await queryCodebase(question);
		return;
	}

	console.log(`未知命令: ${command}`);
	printHelp();
}

main().catch(console.error);
