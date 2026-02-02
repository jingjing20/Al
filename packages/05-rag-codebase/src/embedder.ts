// embedder.ts - 向量化模块（本地模型版本）
// 职责：使用本地 Transformer 模型将文本转换为向量
// 模型：Xenova/all-MiniLM-L6-v2（首次运行会自动下载，约 80MB）

import type { CodeChunk, IndexedChunk } from './types.js';

// 动态导入 transformers（ESM 模块）
let pipeline: any = null;
let extractor: any = null;

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

/**
 * 初始化 embedding pipeline
 * 首次调用会下载模型，后续调用使用缓存
 */
async function initPipeline(): Promise<void> {
	if (extractor) return;

	console.log(`[embedder] 加载本地模型: ${MODEL_NAME}（首次运行需下载）...`);

	// 动态导入
	const { pipeline: pipelineFn } = await import('@xenova/transformers');
	pipeline = pipelineFn;

	// 创建 feature-extraction pipeline
	extractor = await pipeline('feature-extraction', MODEL_NAME, {
		quantized: true,  // 使用量化版本，更小更快
	});

	console.log(`[embedder] 模型加载完成`);
}

/**
 * 获取单个文本的 embedding
 */
async function getEmbedding(text: string): Promise<number[]> {
	await initPipeline();

	// 截断过长的文本（模型最大支持 512 tokens）
	const truncatedText = text.slice(0, 2000);

	const output = await extractor(truncatedText, {
		pooling: 'mean',      // 使用 mean pooling
		normalize: true,      // 归一化向量
	});

	// 转换为普通数组
	return Array.from(output.data as Float32Array);
}

/**
 * 批量获取 embeddings
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
	const results: number[][] = [];

	for (const text of texts) {
		const embedding = await getEmbedding(text);
		results.push(embedding);
	}

	return results;
}

/**
 * 为代码块生成 embedding
 * 使用文件路径 + 名称 + 内容作为输入，增加语义信息
 */
function prepareText(chunk: CodeChunk): string {
	const parts: string[] = [];

	// 添加文件路径信息
	parts.push(`File: ${chunk.filePath}`);

	// 添加类型和名称
	if (chunk.name) {
		parts.push(`${chunk.type}: ${chunk.name}`);
	}

	// 添加代码内容
	parts.push(chunk.content);

	return parts.join('\n');
}

/**
 * 为所有 chunks 生成 embeddings
 */
export async function embedChunks(chunks: CodeChunk[]): Promise<IndexedChunk[]> {
	const indexedChunks: IndexedChunk[] = [];
	const total = chunks.length;

	console.log(`[embedder] 开始处理 ${total} 个 chunks（本地模型）...`);

	// 初始化模型
	await initPipeline();

	for (let i = 0; i < total; i++) {
		const chunk = chunks[i];
		const text = prepareText(chunk);
		const embedding = await getEmbedding(text);

		indexedChunks.push({
			...chunk,
			embedding,
		});

		// 每 10 个打印一次进度
		if ((i + 1) % 10 === 0 || i === total - 1) {
			console.log(`[embedder] 进度: ${i + 1}/${total}`);
		}
	}

	console.log(`[embedder] 完成，生成了 ${indexedChunks.length} 个带向量的 chunks`);
	return indexedChunks;
}

/**
 * 为单个查询生成 embedding
 */
export async function embedQuery(query: string): Promise<number[]> {
	await initPipeline();
	return getEmbedding(query);
}
