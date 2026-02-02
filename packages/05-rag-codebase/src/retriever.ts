// retriever.ts - 向量检索
// 职责：基于余弦相似度进行粗筛，返回 Top-N 候选

import type { IndexedChunk, RetrievalResult } from './types.js';

/**
 * 计算两个向量的余弦相似度
 * 余弦相似度 = (A·B) / (|A| * |B|)
 */
function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error(`向量维度不匹配: ${a.length} vs ${b.length}`);
	}

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
	if (magnitude === 0) return 0;

	return dotProduct / magnitude;
}

/**
 * 检索与查询最相似的 Top-N 个 chunks
 * @param queryEmbedding 查询向量
 * @param chunks 所有候选 chunks
 * @param topN 返回数量
 */
export function retrieve(
	queryEmbedding: number[],
	chunks: IndexedChunk[],
	topN: number
): RetrievalResult[] {
	// 计算所有 chunks 的相似度
	const scored: RetrievalResult[] = chunks.map(chunk => ({
		chunk,
		score: cosineSimilarity(queryEmbedding, chunk.embedding),
	}));

	// 按相似度降序排序
	scored.sort((a, b) => b.score - a.score);

	// 返回 Top-N
	const results = scored.slice(0, topN);

	console.log(`[retriever] 粗筛 Top-${topN}，相似度范围: ${results[results.length - 1]?.score.toFixed(4)} ~ ${results[0]?.score.toFixed(4)}`);

	return results;
}
