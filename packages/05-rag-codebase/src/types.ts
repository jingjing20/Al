// 代码块：从源文件切分出来的最小单元
export interface CodeChunk {
	id: string;
	filePath: string;      // 相对路径
	content: string;       // 代码内容
	startLine: number;     // 起始行号
	endLine: number;       // 结束行号
	type: 'function' | 'class' | 'other';  // 块类型
	name?: string;         // 函数/类名
}

// 带向量的代码块
export interface IndexedChunk extends CodeChunk {
	embedding: number[];
}

// 向量存储结构
export interface VectorStore {
	version: string;
	createdAt: string;
	chunks: IndexedChunk[];
}

// 检索结果
export interface RetrievalResult {
	chunk: IndexedChunk;
	score: number;         // 相似度分数
}

// Rerank 结果
export interface RerankResult {
	chunk: IndexedChunk;
	relevanceScore: number;  // LLM 打分 0-10
	reason?: string;         // 打分理由
}
