// store.ts - 向量存储
// 职责：保存和加载向量索引，使用本地 JSON 文件

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { IndexedChunk, VectorStore } from './types.js';

const STORE_VERSION = '1.0';

/**
 * 保存向量索引到文件
 */
export function saveStore(chunks: IndexedChunk[], filePath: string): void {
	const store: VectorStore = {
		version: STORE_VERSION,
		createdAt: new Date().toISOString(),
		chunks,
	};

	// 确保目录存在
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
	console.log(`[store] 保存了 ${chunks.length} 个 chunks 到 ${filePath}`);
}

/**
 * 从文件加载向量索引
 */
export function loadStore(filePath: string): VectorStore | null {
	if (!existsSync(filePath)) {
		console.log(`[store] 索引文件不存在: ${filePath}`);
		return null;
	}

	try {
		const content = readFileSync(filePath, 'utf-8');
		const store = JSON.parse(content) as VectorStore;

		// 版本检查
		if (store.version !== STORE_VERSION) {
			console.log(`[store] 索引版本不匹配 (${store.version} vs ${STORE_VERSION})，需要重建`);
			return null;
		}

		console.log(`[store] 加载了 ${store.chunks.length} 个 chunks (创建于 ${store.createdAt})`);
		return store;
	} catch (error) {
		console.error(`[store] 加载索引失败:`, error);
		return null;
	}
}
